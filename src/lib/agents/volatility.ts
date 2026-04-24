/**
 * Query-level visibility volatility.
 *
 * Foundation Inc's GEO research finds that AI-search visibility for the
 * same brand swings 20-30% across back-to-back scans even when nothing
 * has changed — different random-temperature samples, different citation
 * sets, different re-rankings. Showing a single-run number to a CMO is
 * misleading. We need to surface the distribution and label each query
 * stable / moderate / volatile so drift reads as signal vs noise.
 *
 * We compute volatility from the last N scans already saved in
 * scan_history — no extra storage, just math.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface QueryScorePoint {
  /** ISO timestamp of the scan */
  at: string;
  /** 0-100 — share of LLMs that mentioned the brand for this query */
  score: number;
}

export interface QueryVolatility {
  query: string;
  /** Most-recent scan score */
  current: number;
  /** Chronologically ordered scores, oldest first */
  history: QueryScorePoint[];
  mean: number;
  stddev: number;
  /** delta between the last two runs, in percentage points */
  lastDelta: number;
  /**
   * - stable:    stddev <= 10  — numbers can be trusted as-is
   * - moderate:  10 < stddev <= 20 — within Foundation's 20-30% baseline
   * - volatile:  stddev > 20  — drift is the story, not the number
   */
  label: "stable" | "moderate" | "volatile" | "insufficient-data";
}

interface ScanRow {
  created_at: string;
  results: unknown;
}

// Tolerant shape — we want this to survive schema drift in saved scans.
interface LooseLLMResult { mentioned?: boolean }
interface LooseQueryResult {
  query?: string;
  chatgpt?: LooseLLMResult;
  gemini?: LooseLLMResult;
  claude?: LooseLLMResult;
  perplexity?: LooseLLMResult;
}
interface LooseScanResults {
  queryResults?: LooseQueryResult[];
}

function scoreForQuery(qr: LooseQueryResult): number {
  const llms = [qr.chatgpt, qr.gemini, qr.claude, qr.perplexity].filter(
    (x): x is LooseLLMResult => !!x && typeof x === "object"
  );
  if (llms.length === 0) return 0;
  const mentioned = llms.filter((l) => l.mentioned === true).length;
  return Math.round((mentioned / llms.length) * 100);
}

function meanOf(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stddevOf(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = meanOf(nums);
  const variance = nums.reduce((acc, n) => acc + (n - m) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

function labelFor(stddev: number, runs: number): QueryVolatility["label"] {
  if (runs < 3) return "insufficient-data";
  if (stddev <= 10) return "stable";
  if (stddev <= 20) return "moderate";
  return "volatile";
}

/**
 * Pure computation — takes chronologically ordered scans (oldest first
 * OR newest first; we sort internally) and returns per-query volatility.
 * Used by both DB-backed and localStorage-backed paths.
 */
export function computeVolatility(
  scans: Array<{ created_at: string; results: unknown }>
): QueryVolatility[] {
  // Sort oldest → newest so history reads left-to-right chronologically
  const ordered = [...scans].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const perQuery = new Map<string, QueryScorePoint[]>();

  for (const scan of ordered) {
    const r = scan.results as LooseScanResults | null;
    const qrs = r?.queryResults;
    if (!Array.isArray(qrs)) continue;

    for (const qr of qrs) {
      if (!qr?.query) continue;
      const key = qr.query.trim();
      if (!key) continue;
      const arr = perQuery.get(key) || [];
      arr.push({ at: scan.created_at, score: scoreForQuery(qr) });
      perQuery.set(key, arr);
    }
  }

  const out: QueryVolatility[] = [];
  for (const [query, history] of perQuery.entries()) {
    const scores = history.map((p) => p.score);
    const mean = meanOf(scores);
    const stddev = stddevOf(scores);
    const current = scores[scores.length - 1] ?? 0;
    const lastDelta =
      scores.length >= 2 ? current - (scores[scores.length - 2] ?? 0) : 0;
    out.push({
      query,
      current,
      history,
      mean: Math.round(mean * 10) / 10,
      stddev: Math.round(stddev * 10) / 10,
      lastDelta,
      label: labelFor(stddev, scores.length),
    });
  }

  // Stable ordering: volatile first (they're the story), then by most recent score desc
  return out.sort((a, b) => {
    const rank = (v: QueryVolatility) =>
      v.label === "volatile" ? 0 : v.label === "moderate" ? 1 : v.label === "stable" ? 2 : 3;
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return b.current - a.current;
  });
}

/**
 * Load the last N AI-visibility scans for a company and return per-query
 * volatility. N defaults to 10 — Foundation's research recommends 20-50
 * runs for full statistical power, but 10 is enough to separate signal
 * from noise and keeps the query cheap.
 */
export async function loadVolatilityFromDb(
  supabase: SupabaseClient,
  companyId: string,
  opts: { limit?: number } = {}
): Promise<QueryVolatility[]> {
  const limit = opts.limit ?? 10;
  const { data, error } = await supabase
    .from("scan_history")
    .select("created_at, results")
    .eq("company_id", companyId)
    .eq("scan_type", "ai_visibility")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return computeVolatility(data as ScanRow[]);
}
