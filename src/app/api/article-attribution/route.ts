import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { isDemoRequest } from "@/lib/demo";
import { demoAttributions } from "@/lib/demoFixtures";

/**
 * Article attribution.
 *
 * Closes the loop on "did this article actually move the needle?". For
 * each published article, we look at scan_history.results.queryResults
 * for the article's targeted query — what was the mention status the
 * scan BEFORE published_at, what is it in the LATEST scan after — and
 * report the delta. Computed on the fly; no extra storage needed beyond
 * the data we already write on every scan.
 */

interface LooseLLM { mentioned?: boolean }
interface LooseQuery {
  query?: string;
  chatgpt?: LooseLLM;
  gemini?: LooseLLM;
  claude?: LooseLLM;
  perplexity?: LooseLLM;
}
interface LooseResults { queryResults?: LooseQuery[] }

interface MentionState {
  chatgpt: boolean;
  gemini: boolean;
  combined: boolean;
  capturedAt: string;
}

interface ArticleAttribution {
  articleId: string;
  query: string;
  title: string | null;
  publishedAt: string;
  daysSincePublish: number;
  pre: MentionState | null;
  post: MentionState | null;
  /** "lifted" — wasn't mentioned before, mentioned now (the win)
   *  "stable_mentioned" — already mentioned before, still mentioned
   *  "stable_absent" — wasn't mentioned before, still not mentioned
   *  "regressed" — was mentioned before, no longer mentioned
   *  "no_data"  — not enough scans to compute
   */
  outcome: "lifted" | "stable_mentioned" | "stable_absent" | "regressed" | "no_data";
}

function mentionStateFor(qr: LooseQuery, capturedAt: string): MentionState {
  const chatgpt = qr.chatgpt?.mentioned === true;
  const gemini = qr.gemini?.mentioned === true;
  const combined =
    chatgpt ||
    gemini ||
    qr.claude?.mentioned === true ||
    qr.perplexity?.mentioned === true;
  return { chatgpt, gemini, combined, capturedAt };
}

function findQueryInScan(
  results: LooseResults | null,
  targetQuery: string,
  capturedAt: string
): MentionState | null {
  if (!results?.queryResults) return null;
  const target = targetQuery.trim().toLowerCase();
  const match = results.queryResults.find((qr) => qr.query?.trim().toLowerCase() === target);
  return match ? mentionStateFor(match, capturedAt) : null;
}

function classifyOutcome(pre: MentionState | null, post: MentionState | null): ArticleAttribution["outcome"] {
  if (!post) return "no_data";
  if (!pre) {
    // No pre-scan data — the article was published before we started scanning.
    // We can't claim a lift but we can still report current state.
    return post.combined ? "stable_mentioned" : "stable_absent";
  }
  if (!pre.combined && post.combined) return "lifted";
  if (pre.combined && !post.combined) return "regressed";
  return pre.combined ? "stable_mentioned" : "stable_absent";
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
  // Demo mode short-circuit — synthetic article attribution data so
  // the sales dashboard renders an impressive "lifted" panel without
  // touching real customer rows.
  if (isDemoRequest(req)) {
    return NextResponse.json(demoAttributions());
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

  // Pull published articles. Drafts have no publish date so attribution
  // is meaningless — they're not in the AI's index yet either way.
  const { data: articles, error: artErr } = await db
    .from("tracked_articles")
    .select("id, query, title, published_at")
    .eq("company_id", companyId)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (artErr) {
    console.error("attribution: tracked_articles fetch failed", artErr);
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json({ attributions: [], summary: { lifted: 0, regressed: 0, total: 0 } });
  }

  // Pull every ai_visibility scan with usable per-query data. Cap at 60
  // scans (~4 months at weekly cadence, ~2 months at daily) — enough
  // history for any plausible attribution window without bloating memory.
  const { data: scans, error: scanErr } = await db
    .from("scan_history")
    .select("created_at, results")
    .eq("company_id", companyId)
    .eq("scan_type", "ai_visibility")
    .order("created_at", { ascending: true })
    .limit(60);

  if (scanErr) {
    console.error("attribution: scan_history fetch failed", scanErr);
    return NextResponse.json({ error: "Failed to fetch scan history" }, { status: 500 });
  }

  const usableScans = (scans || []).filter((s) => {
    const r = s.results as LooseResults | null;
    return Array.isArray(r?.queryResults) && r!.queryResults!.length > 0;
  });

  const now = Date.now();
  const attributions: ArticleAttribution[] = articles.map((art) => {
    const publishedAtIso = art.published_at as string;
    const publishedMs = new Date(publishedAtIso).getTime();
    const daysSincePublish = Math.max(0, Math.round((now - publishedMs) / (24 * 60 * 60 * 1000)));

    // Pre = last scan strictly BEFORE publish date.
    // Post = latest scan strictly AFTER publish date.
    let pre: MentionState | null = null;
    let post: MentionState | null = null;
    for (const scan of usableScans) {
      const scanMs = new Date(scan.created_at as string).getTime();
      const found = findQueryInScan(scan.results as LooseResults | null, art.query as string, scan.created_at as string);
      if (!found) continue;
      if (scanMs < publishedMs) {
        pre = found; // keep overwriting so we end on the latest pre-publish scan
      } else if (scanMs > publishedMs) {
        post = found; // overwriting too — last assignment is latest scan
      }
    }

    return {
      articleId: art.id as string,
      query: art.query as string,
      title: (art.title as string | null) ?? null,
      publishedAt: publishedAtIso,
      daysSincePublish,
      pre,
      post,
      outcome: classifyOutcome(pre, post),
    };
  });

  const summary = {
    total: attributions.length,
    lifted: attributions.filter((a) => a.outcome === "lifted").length,
    regressed: attributions.filter((a) => a.outcome === "regressed").length,
    stableMentioned: attributions.filter((a) => a.outcome === "stable_mentioned").length,
    stableAbsent: attributions.filter((a) => a.outcome === "stable_absent").length,
    noData: attributions.filter((a) => a.outcome === "no_data").length,
  };

  return NextResponse.json({ attributions, summary });
}
