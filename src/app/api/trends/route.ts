import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { isDemoRequest } from "@/lib/demo";
import { demoTrends } from "@/lib/demoFixtures";

/**
 * AI Visibility Trends.
 *
 * Aggregates the per-query mention data stored in scan_history.results
 * into a time series the dashboard can chart: how mention rate (share
 * of queries where the brand was named) moved over the window, split
 * per channel (ChatGPT, Gemini), with a per-query breakdown for callouts
 * like "+8 queries gained mentions in last 30 days".
 *
 * The whole product story hangs on this: snapshots are useless, trends
 * are sellable.
 */

const DEFAULT_DAYS = 90;
const MAX_DAYS = 365;

interface LooseLLM { mentioned?: boolean }
interface LooseQuery {
  query?: string;
  chatgpt?: LooseLLM;
  gemini?: LooseLLM;
  claude?: LooseLLM;
  perplexity?: LooseLLM;
}
interface LooseResults { queryResults?: LooseQuery[] }

type Channel = "chatgpt" | "gemini" | "combined";

interface ScanPoint {
  at: string;
  chatgpt: number;     // 0-100 mention rate this scan
  gemini: number;
  combined: number;
  totalQueries: number;
}

interface QueryTrendPoint {
  at: string;
  mentioned: boolean;
}

interface QueryTrend {
  query: string;
  /** Per-scan mention history (oldest first) */
  history: QueryTrendPoint[];
  /** Mention rate over the window (0-100) */
  rate: number;
  /** Whether the most recent scan mentioned this query */
  currentlyMentioned: boolean;
  /** Was this query mentioned in the first scan of the window? */
  initiallyMentioned: boolean;
  /** "gained" — went from absent → mentioned during window
   *  "lost"   — went from mentioned → absent
   *  "stable" — no change in coverage status across window
   */
  movement: "gained" | "lost" | "stable";
}

function rateForChannel(
  qrs: LooseQuery[],
  channel: Exclude<Channel, "combined">
): number {
  if (qrs.length === 0) return 0;
  const mentioned = qrs.filter((q) => q[channel]?.mentioned === true).length;
  return Math.round((mentioned / qrs.length) * 100);
}

function combinedRate(qrs: LooseQuery[]): number {
  if (qrs.length === 0) return 0;
  // A query "scores" if any configured channel mentioned it. Mirrors the
  // dashboard's "got mentioned somewhere" framing.
  const mentioned = qrs.filter(
    (q) =>
      q.chatgpt?.mentioned === true ||
      q.gemini?.mentioned === true ||
      q.claude?.mentioned === true ||
      q.perplexity?.mentioned === true
  ).length;
  return Math.round((mentioned / qrs.length) * 100);
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
  // Demo mode short-circuit — no auth, no DB, just synthetic curve
  // for the sales pitch. Real users always go through the auth path
  // below and read from scan_history.
  if (isDemoRequest(req)) {
    return NextResponse.json(demoTrends());
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

  const daysParam = parseInt(req.nextUrl.searchParams.get("days") || String(DEFAULT_DAYS));
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 7), MAX_DAYS) : DEFAULT_DAYS;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const db = getServiceClient();
  const { data, error } = await db
    .from("scan_history")
    .select("created_at, results")
    .eq("company_id", companyId)
    .eq("scan_type", "ai_visibility")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("trends fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 });
  }

  // Filter to scans that actually have queryResults populated. Older
  // rows or thin client-fired writes have empty/missing results and
  // would zero-out the chart.
  const usableScans = (data || []).filter((row) => {
    const r = row.results as LooseResults | null;
    return Array.isArray(r?.queryResults) && r!.queryResults!.length > 0;
  });

  const series: ScanPoint[] = usableScans.map((row) => {
    const qrs = (row.results as LooseResults).queryResults!;
    return {
      at: row.created_at as string,
      chatgpt: rateForChannel(qrs, "chatgpt"),
      gemini: rateForChannel(qrs, "gemini"),
      combined: combinedRate(qrs),
      totalQueries: qrs.length,
    };
  });

  // Per-query breakdown — chronological mention history for each query
  // we've ever scanned in the window. Lets the UI list "gained" / "lost"
  // queries between first and last scan.
  const perQuery = new Map<string, QueryTrendPoint[]>();
  for (const row of usableScans) {
    const qrs = (row.results as LooseResults).queryResults!;
    for (const qr of qrs) {
      if (!qr?.query) continue;
      const key = qr.query.trim();
      if (!key) continue;
      const mentioned =
        qr.chatgpt?.mentioned === true ||
        qr.gemini?.mentioned === true ||
        qr.claude?.mentioned === true ||
        qr.perplexity?.mentioned === true;
      const arr = perQuery.get(key) || [];
      arr.push({ at: row.created_at as string, mentioned });
      perQuery.set(key, arr);
    }
  }

  const queryTrends: QueryTrend[] = [];
  for (const [query, history] of perQuery.entries()) {
    if (history.length === 0) continue;
    const initiallyMentioned = history[0].mentioned;
    const currentlyMentioned = history[history.length - 1].mentioned;
    const hits = history.filter((h) => h.mentioned).length;
    const rate = Math.round((hits / history.length) * 100);
    const movement: QueryTrend["movement"] =
      initiallyMentioned === currentlyMentioned
        ? "stable"
        : currentlyMentioned
          ? "gained"
          : "lost";
    queryTrends.push({ query, history, rate, currentlyMentioned, initiallyMentioned, movement });
  }

  // Top-level summary — what the dashboard renders as the headline number.
  const first = series[0];
  const last = series[series.length - 1];
  const summary = {
    scans: series.length,
    days,
    current: last
      ? { chatgpt: last.chatgpt, gemini: last.gemini, combined: last.combined }
      : { chatgpt: 0, gemini: 0, combined: 0 },
    delta:
      first && last
        ? {
            chatgpt: last.chatgpt - first.chatgpt,
            gemini: last.gemini - first.gemini,
            combined: last.combined - first.combined,
          }
        : { chatgpt: 0, gemini: 0, combined: 0 },
    queriesGained: queryTrends.filter((q) => q.movement === "gained").length,
    queriesLost: queryTrends.filter((q) => q.movement === "lost").length,
  };

  return NextResponse.json({
    summary,
    series,
    queryTrends,
  });
}
