import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * Article freshness cron — auto-queues stale articles for refresh.
 *
 * Runs weekly. For each company, walks tracked_articles and finds
 * published items below the freshness threshold (age + GSC click decay).
 * Instead of fully regenerating + republishing autonomously (risky:
 * customer hasn't approved the new draft), this cron writes a
 * `refresh_queue` row tagged with reason. The dashboard's Refresh
 * Queue widget picks them up and the customer gets one-click
 * regenerate + approve.
 *
 * Why not full auto-regenerate-and-republish: every article we ship
 * now passes brand-context + QA gates and lands as a draft for
 * approval. Auto-publishing refreshed copy would skip that gate and
 * risk shipping off-voice or factually drifting content. This cron
 * is the surfacing mechanism, not the replacement for human approval.
 */

const REFRESH_THRESHOLD = 40;
const RECENT_WINDOW_DAYS = 14;
const BASELINE_WINDOW_DAYS = 28;

interface GSCPage { page?: string; clicks?: number }
interface GSCSnapshotRow { captured_at: string; pages: unknown }

function ageScoreFor(days: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - days * 0.5)));
}
function decayScoreFor(decayPct: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - decayPct * 1.5)));
}

function clicksForUrl(snapshot: GSCSnapshotRow, url: string): number | null {
  if (!Array.isArray(snapshot.pages)) return null;
  const target = url.replace(/\/$/, "").toLowerCase();
  for (const raw of snapshot.pages as GSCPage[]) {
    if (!raw?.page) continue;
    const cmp = String(raw.page).replace(/\/$/, "").toLowerCase();
    if (cmp === target) return typeof raw.clicks === "number" ? raw.clicks : 0;
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

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceClient();

  // Pull every company we'd consider running freshness on. Cap to
  // protect cron runtime — companies process oldest-first, so over
  // multiple weekly runs every customer eventually rotates through.
  const { data: companies, error: cErr } = await db
    .from("companies")
    .select("id, name, website")
    .order("created_at", { ascending: true })
    .limit(200);

  if (cErr) {
    console.error("freshness-cron: companies fetch failed", cErr);
    return NextResponse.json({ error: "companies fetch failed" }, { status: 500 });
  }

  if (!companies || companies.length === 0) {
    return NextResponse.json({ message: "No companies", queued: 0 });
  }

  const now = Date.now();
  const since = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
  let totalQueued = 0;
  const perCompany: Array<{ company: string; queued: number; refreshed: string[] }> = [];

  for (const company of companies) {
    const result = { company: company.name as string, queued: 0, refreshed: [] as string[] };

    const { data: articles } = await db
      .from("tracked_articles")
      .select("id, query, title, publish_url, published_at, status")
      .eq("company_id", company.id)
      .not("published_at", "is", null)
      .neq("status", "draft");

    if (!articles || articles.length === 0) {
      perCompany.push(result);
      continue;
    }

    const { data: gscRows } = await db
      .from("gsc_snapshots")
      .select("captured_at, pages")
      .eq("company_id", company.id)
      .gte("captured_at", since)
      .order("captured_at", { ascending: false });

    const snapshots: GSCSnapshotRow[] = (gscRows || []).map((r) => ({
      captured_at: r.captured_at as string,
      pages: r.pages,
    }));
    const gscConnected = snapshots.length > 0;

    for (const art of articles) {
      const publishedMs = new Date(art.published_at as string).getTime();
      const days = Math.max(0, Math.round((now - publishedMs) / (24 * 60 * 60 * 1000)));
      const ageScore = ageScoreFor(days);

      let decayScore: number | null = null;
      const url = art.publish_url as string | null;
      if (gscConnected && url) {
        const recent = pickClosest(snapshots, now - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000, url);
        const baseline = pickClosest(snapshots, now - BASELINE_WINDOW_DAYS * 24 * 60 * 60 * 1000, url);
        if (recent !== null && baseline !== null && baseline > 0) {
          const decayPct = Math.max(0, Math.round(((baseline - recent) / baseline) * 100));
          decayScore = decayScoreFor(decayPct);
        }
      }
      const freshness = decayScore !== null ? Math.round((ageScore + decayScore) / 2) : ageScore;

      if (freshness < REFRESH_THRESHOLD) {
        // Queue insert is idempotent on (company_id, article_id) so
        // weekly re-runs don't pile duplicates.
        const { error: queueErr } = await db
          .from("refresh_queue")
          .upsert(
            {
              company_id: company.id,
              article_id: art.id,
              query: art.query,
              title: art.title,
              freshness_score: freshness,
              days_since_publish: days,
              reason:
                decayScore !== null && decayScore < ageScore
                  ? `Click decay drove freshness to ${freshness}`
                  : `${days}d old — freshness ${freshness}`,
              queued_at: new Date().toISOString(),
              status: "pending",
            },
            { onConflict: "company_id,article_id", ignoreDuplicates: false }
          );
        if (!queueErr) {
          result.queued += 1;
          result.refreshed.push((art.title as string) || (art.query as string));
        }
      }
    }

    totalQueued += result.queued;
    perCompany.push(result);
  }

  return NextResponse.json({
    message: `Freshness sweep complete — ${totalQueued} articles queued for refresh across ${companies.length} companies`,
    totalQueued,
    perCompany: perCompany.filter((r) => r.queued > 0),
  });
}
