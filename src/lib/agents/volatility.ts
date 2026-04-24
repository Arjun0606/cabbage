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

// ---------- Citation drift ----------
//
// Volatility answers "is the score stable?" — drift answers "did the
// ingredients change?". For each query, which external domains + which
// competitor brands just started (or stopped) getting cited? That's what
// actually moves a ranking. A score drop of 5pp with no citation change
// is noise; a score drop because Moneycontrol swapped to a competitor
// is a specific fixable incident.

export interface QueryCitationDrift {
  query: string;
  /** Domains newly cited in the latest scan vs the previous one. */
  gainedDomains: string[];
  /** Domains that were cited before but not in the latest. */
  lostDomains: string[];
  /** Competitor brands (co-citations) newly appearing. */
  gainedCompetitors: string[];
  /** Competitor brands that dropped off. */
  lostCompetitors: string[];
  /** True if the brand itself flipped mentioned↔absent vs last scan. */
  flippedToMentioned: boolean;
  flippedToAbsent: boolean;
}

interface CitationLooseQueryResult extends LooseQueryResult {
  chatgpt?: LooseLLMResult & {
    citationSources?: Array<{ url?: string }>;
    coCitations?: string[];
  };
  gemini?: LooseLLMResult & {
    citationSources?: Array<{ url?: string }>;
    coCitations?: string[];
  };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function domainsFromQR(qr: CitationLooseQueryResult): Set<string> {
  const out = new Set<string>();
  for (const llm of [qr.chatgpt, qr.gemini]) {
    if (!llm) continue;
    for (const c of llm.citationSources || []) {
      const h = hostOf(String(c?.url || ""));
      if (h) out.add(h);
    }
  }
  return out;
}

function competitorsFromQR(qr: CitationLooseQueryResult): Set<string> {
  const out = new Set<string>();
  for (const llm of [qr.chatgpt, qr.gemini]) {
    if (!llm) continue;
    for (const c of llm.coCitations || []) {
      const clean = String(c || "").trim();
      if (clean && clean.length >= 2) out.add(clean);
    }
  }
  return out;
}

function mentionedInQR(qr: CitationLooseQueryResult): boolean {
  return Boolean(qr.chatgpt?.mentioned || qr.gemini?.mentioned);
}

/**
 * Compare the two most-recent scans (current vs previous) and return
 * per-query drift. Only queries that appear in BOTH scans are compared —
 * a brand-new query can't drift because there's nothing to compare to.
 */
export function computeCitationDrift(
  scans: Array<{ created_at: string; results: unknown }>
): QueryCitationDrift[] {
  if (scans.length < 2) return [];

  const ordered = [...scans].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const current = ordered[0];
  const previous = ordered[1];

  const currentByQ = new Map<string, CitationLooseQueryResult>();
  const previousByQ = new Map<string, CitationLooseQueryResult>();

  for (const qr of (current.results as LooseScanResults | null)?.queryResults || []) {
    if (qr?.query) currentByQ.set(qr.query.trim(), qr as CitationLooseQueryResult);
  }
  for (const qr of (previous.results as LooseScanResults | null)?.queryResults || []) {
    if (qr?.query) previousByQ.set(qr.query.trim(), qr as CitationLooseQueryResult);
  }

  const out: QueryCitationDrift[] = [];
  for (const [query, curQR] of currentByQ.entries()) {
    const prevQR = previousByQ.get(query);
    if (!prevQR) continue;

    const curDomains = domainsFromQR(curQR);
    const prevDomains = domainsFromQR(prevQR);
    const curCompetitors = competitorsFromQR(curQR);
    const prevCompetitors = competitorsFromQR(prevQR);
    const curMentioned = mentionedInQR(curQR);
    const prevMentioned = mentionedInQR(prevQR);

    const gainedDomains = [...curDomains].filter((d) => !prevDomains.has(d));
    const lostDomains = [...prevDomains].filter((d) => !curDomains.has(d));
    const gainedCompetitors = [...curCompetitors].filter((c) => !prevCompetitors.has(c));
    const lostCompetitors = [...prevCompetitors].filter((c) => !curCompetitors.has(c));

    const hasChange =
      gainedDomains.length > 0 ||
      lostDomains.length > 0 ||
      gainedCompetitors.length > 0 ||
      lostCompetitors.length > 0 ||
      curMentioned !== prevMentioned;

    if (!hasChange) continue;

    out.push({
      query,
      gainedDomains,
      lostDomains,
      gainedCompetitors,
      lostCompetitors,
      flippedToMentioned: !prevMentioned && curMentioned,
      flippedToAbsent: prevMentioned && !curMentioned,
    });
  }

  // Ordering: flipped-to-absent first (red flag), then flipped-to-mentioned,
  // then by size of change (domains lost + competitors gained is the most
  // concerning combination)
  return out.sort((a, b) => {
    if (a.flippedToAbsent !== b.flippedToAbsent) return a.flippedToAbsent ? -1 : 1;
    if (a.flippedToMentioned !== b.flippedToMentioned) return a.flippedToMentioned ? -1 : 1;
    const aScore = a.lostDomains.length + a.gainedCompetitors.length;
    const bScore = b.lostDomains.length + b.gainedCompetitors.length;
    return bScore - aScore;
  });
}

export async function loadCitationDriftFromDb(
  supabase: SupabaseClient,
  companyId: string,
): Promise<QueryCitationDrift[]> {
  const { data, error } = await supabase
    .from("scan_history")
    .select("created_at, results")
    .eq("company_id", companyId)
    .eq("scan_type", "ai_visibility")
    .order("created_at", { ascending: false })
    .limit(2);

  if (error || !data) return [];
  return computeCitationDrift(data as ScanRow[]);
}
