/**
 * GEO Progress History — tracks AI visibility at the query level over time.
 *
 * This is the core value prop: provable, trackable GEO improvement.
 * Every AI visibility scan saves per-query results so we can show:
 * - Which queries found the brand (and which didn't)
 * - Progress over time (0/20 → 8/20 → 15/20)
 * - Per-query journey (not found → found on ChatGPT → found on Google AI too)
 * - Competitor comparison snapshots
 */

// ---------- Types ----------

export interface GEOQuerySnapshot {
  query: string;
  chatgpt: { mentioned: boolean; position: number; sentiment: string };
  gemini: { mentioned: boolean; position: number; sentiment: string };
  perplexity: { mentioned: boolean; position: number; sentiment: string };
  claude: { mentioned: boolean; position: number; sentiment: string };
}

export interface GEOScanRecord {
  id: string;
  timestamp: string;
  brand: string;
  city: string;
  scores: {
    overall: number;
    readiness: number;
    mentions: number;
  };
  totalQueries: number;
  mentionedCount: number;  // How many queries found the brand
  queries: GEOQuerySnapshot[];
}

export interface GEOProgress {
  currentScan: GEOScanRecord | null;
  previousScan: GEOScanRecord | null;
  allScans: GEOScanRecord[];
  // Derived metrics
  mentionRate: number;          // Current: mentionedCount / totalQueries
  previousMentionRate: number;  // Previous scan
  mentionRateChange: number;    // Delta
  newlyFound: string[];         // Queries that went from not-found to found
  newlyLost: string[];          // Queries that went from found to not-found
  neverFound: string[];         // Queries never found across all scans
  alwaysFound: string[];        // Queries found in every scan
  trajectory: "improving" | "declining" | "stable" | "new";
}

// ---------- Storage ----------

const GEO_STORAGE_KEY = "cabbageseo_geo_history";

function getGEOHistory(): GEOScanRecord[] {
  try {
    const raw = localStorage.getItem(GEO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGEOHistory(records: GEOScanRecord[]) {
  // Keep last 50 scans (roughly 1 year of weekly scans)
  const trimmed = records.slice(-50);
  localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(trimmed));
}

// ---------- Record a scan ----------

export function recordGEOScan(
  brand: string,
  city: string,
  scores: GEOScanRecord["scores"],
  queryResults: any[]  // Raw queryResults from AI visibility API
): GEOScanRecord {
  const queries: GEOQuerySnapshot[] = queryResults.map((q) => ({
    query: q.query,
    chatgpt: { mentioned: q.chatgpt?.mentioned || false, position: q.chatgpt?.position || 0, sentiment: q.chatgpt?.sentiment || "absent" },
    gemini: { mentioned: q.gemini?.mentioned || false, position: q.gemini?.position || 0, sentiment: q.gemini?.sentiment || "absent" },
    perplexity: { mentioned: q.perplexity?.mentioned || false, position: q.perplexity?.position || 0, sentiment: q.perplexity?.sentiment || "absent" },
    claude: { mentioned: q.claude?.mentioned || false, position: q.claude?.position || 0, sentiment: q.claude?.sentiment || "absent" },
  }));

  const mentionedCount = queries.filter((q) =>
    q.chatgpt.mentioned || q.gemini.mentioned || q.perplexity.mentioned || q.claude.mentioned
  ).length;

  const record: GEOScanRecord = {
    id: `geo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    brand,
    city,
    scores,
    totalQueries: queries.length,
    mentionedCount,
    queries,
  };

  const history = getGEOHistory();
  history.push(record);
  saveGEOHistory(history);

  return record;
}

// ---------- Get progress ----------

export function getGEOProgress(brand?: string): GEOProgress {
  const allScans = getGEOHistory()
    .filter((r) => !brand || r.brand.toLowerCase() === brand.toLowerCase())
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (allScans.length === 0) {
    return {
      currentScan: null,
      previousScan: null,
      allScans: [],
      mentionRate: 0,
      previousMentionRate: 0,
      mentionRateChange: 0,
      newlyFound: [],
      newlyLost: [],
      neverFound: [],
      alwaysFound: [],
      trajectory: "new",
    };
  }

  const currentScan = allScans[allScans.length - 1];
  const previousScan = allScans.length > 1 ? allScans[allScans.length - 2] : null;

  const mentionRate = currentScan.totalQueries > 0
    ? Math.round((currentScan.mentionedCount / currentScan.totalQueries) * 100)
    : 0;

  const previousMentionRate = previousScan && previousScan.totalQueries > 0
    ? Math.round((previousScan.mentionedCount / previousScan.totalQueries) * 100)
    : 0;

  const mentionRateChange = previousScan ? mentionRate - previousMentionRate : 0;

  // Query-level diff between current and previous
  let newlyFound: string[] = [];
  let newlyLost: string[] = [];

  if (previousScan) {
    const prevMap = new Map<string, boolean>();
    previousScan.queries.forEach((q) => {
      const found = q.chatgpt.mentioned || q.gemini.mentioned || q.perplexity.mentioned || q.claude.mentioned;
      prevMap.set(q.query.toLowerCase(), found);
    });

    currentScan.queries.forEach((q) => {
      const currentlyFound = q.chatgpt.mentioned || q.gemini.mentioned || q.perplexity.mentioned || q.claude.mentioned;
      const wasPrevFound = prevMap.get(q.query.toLowerCase()) ?? false;

      if (currentlyFound && !wasPrevFound) newlyFound.push(q.query);
      if (!currentlyFound && wasPrevFound) newlyLost.push(q.query);
    });
  }

  // Queries never found in any scan
  const allQueryMentions = new Map<string, number>();
  allScans.forEach((scan) => {
    scan.queries.forEach((q) => {
      const key = q.query.toLowerCase();
      const found = q.chatgpt.mentioned || q.gemini.mentioned || q.perplexity.mentioned || q.claude.mentioned;
      allQueryMentions.set(key, (allQueryMentions.get(key) || 0) + (found ? 1 : 0));
    });
  });

  const neverFound = Array.from(allQueryMentions.entries())
    .filter(([, count]) => count === 0)
    .map(([query]) => query);

  const alwaysFound = Array.from(allQueryMentions.entries())
    .filter(([, count]) => count === allScans.length && allScans.length > 1)
    .map(([query]) => query);

  // Trajectory
  let trajectory: GEOProgress["trajectory"] = "new";
  if (allScans.length >= 2) {
    if (mentionRateChange > 5) trajectory = "improving";
    else if (mentionRateChange < -5) trajectory = "declining";
    else trajectory = "stable";
  }

  return {
    currentScan,
    previousScan,
    allScans,
    mentionRate,
    previousMentionRate,
    mentionRateChange,
    newlyFound,
    newlyLost,
    neverFound,
    alwaysFound,
    trajectory,
  };
}

// ---------- Format helpers ----------

export function formatScanDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
