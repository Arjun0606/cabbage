import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { isDemoRequest } from "@/lib/demo";
import { demoFreshness } from "@/lib/demoFixtures";

/**
 * Article freshness.
 *
 * Per-article decay score combining age (days since publish) with GSC
 * click trend (clicks last 14d vs clicks days 14-28 ago). Articles
 * scoring under the threshold land in the refresh queue — same content,
 * regenerated through the article-writer to capture current data and
 * structure. Refresh costs credits, so this is monetisation-aligned:
 * the more articles a customer publishes, the more they need this.
 *
 * Graceful when GSC isn't connected — falls back to age-only scoring.
 */

const REFRESH_THRESHOLD = 40;
const RECENT_WINDOW_DAYS = 14;
const BASELINE_WINDOW_DAYS = 28;

interface GSCPage { page: string; clicks?: number }
interface GSCSnapshotRow {
  captured_at: string;
  pages: unknown;
}

interface ArticleFreshness {
  articleId: string;
  query: string;
  title: string | null;
  publishedAt: string;
  publishUrl: string | null;
  daysSincePublish: number;
  ageScore: number;
  /** null when GSC isn't connected or the article URL never had clicks */
  decayScore: number | null;
  /** % of clicks lost between baseline and recent window */
  clickDecayPct: number | null;
  recentClicks: number | null;
  baselineClicks: number | null;
  freshness: number;
  needsRefresh: boolean;
  reason: string;
}

function ageScoreFor(days: number): number {
  // Linear decline: 0d → 100, 60d → 70, 100d → 50, 200d → 0
  return Math.max(0, Math.min(100, Math.round(100 - days * 0.5)));
}

function decayScoreFor(decayPct: number): number {
  // 0% decline → 100, 30% → 55, 67% → 0
  return Math.max(0, Math.min(100, Math.round(100 - decayPct * 1.5)));
}

function clicksForUrl(snapshot: GSCSnapshotRow, url: string): number | null {
  if (!Array.isArray(snapshot.pages)) return null;
  const target = url.replace(/\/$/, "").toLowerCase();
  for (const raw of snapshot.pages as GSCPage[]) {
    if (!raw?.page) continue;
    const cmp = String(raw.page).replace(/\/$/, "").toLowerCase();
    if (cmp === target) {
      return typeof raw.clicks === "number" ? raw.clicks : 0;
    }
  }
  return null;
}

function pickClosest(snapshots: GSCSnapshotRow[], targetMs: number, url: string): number | null {
  let best: { ms: number; clicks: number } | null = null;
  for (const snap of snapshots) {
    const clicks = clicksForUrl(snap, url);
    if (clicks === null) continue;
    const ms = new Date(snap.captured_at).getTime();
    if (!best || Math.abs(ms - targetMs) < Math.abs(best.ms - targetMs)) {
      best = { ms, clicks };
    }
  }
  return best?.clicks ?? null;
}

function buildReason(ageDays: number, clickDecayPct: number | null, freshness: number): string {
  if (freshness >= 70) return "Fresh — no action needed";
  if (clickDecayPct !== null && clickDecayPct >= 30) {
    return `Clicks down ${Math.round(clickDecayPct)}% from baseline · ${ageDays}d old`;
  }
  if (ageDays >= 90) return `${ageDays}d since publish — content likely stale`;
  if (ageDays >= 60) return `${ageDays}d old — refresh to keep ranking`;
  return `Score ${freshness} — refresh recommended`;
}

async function userOwnsCompany(userId: string, companyId: string): Promise<boolean> {
  const db = getServiceClient();
  const { data } = await db
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_id", userId)
    .maybeSingle();
  return !!data;
}

export async function GET(req: NextRequest) {
  // Demo mode short-circuit — pre-baked refresh queue so the sales
  // dashboard always has an actionable card to point at.
  if (isDemoRequest(req)) {
    return NextResponse.json(demoFreshness());
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  if (!(await userOwnsCompany(user.id, companyId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = getServiceClient();

  const { data: articles, error: artErr } = await db
    .from("tracked_articles")
    .select("id, query, title, publish_url, published_at")
    .eq("company_id", companyId)
    .not("published_at", "is", null);

  if (artErr) {
    console.error("freshness: tracked_articles fetch failed", artErr);
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json({
      articles: [],
      summary: { total: 0, refreshNeeded: 0, gscConnected: false },
    });
  }

  // Pull last 90d of GSC snapshots — enough to define both windows
  // even if data is sparse.
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: gscRows } = await db
    .from("gsc_snapshots")
    .select("captured_at, pages")
    .eq("company_id", companyId)
    .gte("captured_at", since)
    .order("captured_at", { ascending: false });

  const gscConnected = Array.isArray(gscRows) && gscRows.length > 0;
  const snapshots: GSCSnapshotRow[] = (gscRows || []).map((r) => ({
    captured_at: r.captured_at as string,
    pages: r.pages,
  }));

  const now = Date.now();
  const result: ArticleFreshness[] = articles.map((art) => {
    const publishedAtIso = art.published_at as string;
    const publishedMs = new Date(publishedAtIso).getTime();
    const daysSincePublish = Math.max(0, Math.round((now - publishedMs) / (24 * 60 * 60 * 1000)));
    const ageScore = ageScoreFor(daysSincePublish);

    let recentClicks: number | null = null;
    let baselineClicks: number | null = null;
    let clickDecayPct: number | null = null;
    let decayScore: number | null = null;

    const url = (art.publish_url as string | null) || null;
    if (gscConnected && url) {
      recentClicks = pickClosest(snapshots, now - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000, url);
      baselineClicks = pickClosest(snapshots, now - BASELINE_WINDOW_DAYS * 24 * 60 * 60 * 1000, url);

      if (recentClicks !== null && baselineClicks !== null && baselineClicks > 0) {
        clickDecayPct = Math.max(0, Math.round(((baselineClicks - recentClicks) / baselineClicks) * 100));
        decayScore = decayScoreFor(clickDecayPct);
      }
    }

    const freshness =
      decayScore !== null
        ? Math.round((ageScore + decayScore) / 2)
        : ageScore;
    const needsRefresh = freshness < REFRESH_THRESHOLD;

    return {
      articleId: art.id as string,
      query: art.query as string,
      title: (art.title as string | null) ?? null,
      publishedAt: publishedAtIso,
      publishUrl: url,
      daysSincePublish,
      ageScore,
      decayScore,
      clickDecayPct,
      recentClicks,
      baselineClicks,
      freshness,
      needsRefresh,
      reason: buildReason(daysSincePublish, clickDecayPct, freshness),
    };
  });

  result.sort((a, b) => a.freshness - b.freshness);

  const summary = {
    total: result.length,
    refreshNeeded: result.filter((r) => r.needsRefresh).length,
    avgFreshness: result.length
      ? Math.round(result.reduce((acc, r) => acc + r.freshness, 0) / result.length)
      : 0,
    gscConnected,
  };

  return NextResponse.json({ articles: result, summary });
}
