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
  level: "locality" | "city" | "country";  // Multi-level GEO tier
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
  // Freshness
  daysSinceLastScan: number;
  isStale: boolean;             // >= 7 days
  isVeryStale: boolean;         // >= 14 days
  // Weekly delta (compared to scan closest to 7 days ago)
  weeklyScan: GEOScanRecord | null;
  weeklyMentionRateChange: number;
  weeklyNewlyFound: string[];
  weeklyNewlyLost: string[];
}

// ---------- Storage ----------

const GEO_STORAGE_KEY = "cabbge_geo_history";
const GEO_QUERIES_KEY = "cabbge_geo_queries";  // Persisted query set

function getGEOHistory(): GEOScanRecord[] {
  try {
    const raw = localStorage.getItem(GEO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGEOHistory(records: GEOScanRecord[]) {
  const trimmed = records.slice(-50);
  localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(trimmed));
}

/**
 * Get saved query set for a brand. If none exists, returns null.
 * This ensures we track the SAME queries over time for accurate comparison.
 */
export function getSavedQueries(brand: string): string[] | null {
  try {
    const raw = localStorage.getItem(GEO_QUERIES_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string[]>;
    return map[brand.toLowerCase()] || null;
  } catch {
    return null;
  }
}

/**
 * Save a query set for a brand (first scan locks the queries).
 */
export function saveQueries(brand: string, queries: string[]) {
  try {
    const raw = localStorage.getItem(GEO_QUERIES_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[brand.toLowerCase()] = queries;
    localStorage.setItem(GEO_QUERIES_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

/**
 * Reset saved queries for a brand (when user wants fresh queries).
 */
export function resetSavedQueries(brand: string) {
  try {
    const raw = localStorage.getItem(GEO_QUERIES_KEY);
    if (!raw) return;
    const map = JSON.parse(raw);
    delete map[brand.toLowerCase()];
    localStorage.setItem(GEO_QUERIES_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

// ---------- Record a scan ----------

function inferQueryLevel(query: string, city: string): "locality" | "city" | "country" {
  const q = query.toLowerCase();
  const cityLower = city.toLowerCase();

  // COUNTRY: mentions country or "best cities" / national patterns
  // Must be clear national intent, not just "india" as a word
  const countrySignals = [
    "best cities", "top cities", "best states", "which city",
    "in india", "across india", "top 10 cities",
    "national", "pan-india", "country",
    "best country", "smart cities",
  ];
  if (countrySignals.some((t) => q.includes(t))) return "country";

  // LOCALITY: compares two areas, or mentions "vs" between places, or has specific landmarks
  // Comparisons and hyper-local queries (IT park names, metro stations, neighborhoods)
  if (q.includes(" vs ") || q.includes(" versus ")) return "locality";

  // CITY: mentions the city name without a specific locality/landmark context
  // Only category city-level if it's a broad "best X in [city]" pattern
  const cityBroadPatterns = [
    `in ${cityLower}`,
    `top builders in ${cityLower}`,
    `top developers in ${cityLower}`,
    `best areas in ${cityLower}`,
    `best areas to buy in ${cityLower}`,
    `upcoming projects in ${cityLower}`,
  ];
  if (cityLower && cityBroadPatterns.some((p) => q.includes(p))) {
    // But if it ALSO contains a specific landmark/neighborhood, it's locality
    const localityHints = /\b(near|around|walking distance|metro|station|park|school|hospital|mall|hub|it park|tech park)\b/;
    if (localityHints.test(q)) return "locality";
    return "city";
  }

  // Default: locality (most specific)
  return "locality";
}

export function recordGEOScan(
  brand: string,
  city: string,
  scores: GEOScanRecord["scores"],
  queryResults: any[]  // Raw queryResults from AI visibility API
): GEOScanRecord {
  const queries: GEOQuerySnapshot[] = queryResults.map((q) => ({
    query: q.query,
    // Infer level from query content rather than position
    level: inferQueryLevel(q.query, city) as GEOQuerySnapshot["level"],
    chatgpt: { mentioned: q.chatgpt?.mentioned || false, position: q.chatgpt?.position || 0, sentiment: q.chatgpt?.sentiment || "absent" },
    gemini: { mentioned: q.gemini?.mentioned || false, position: q.gemini?.position || 0, sentiment: q.gemini?.sentiment || "absent" },
    perplexity: { mentioned: q.perplexity?.mentioned || false, position: q.perplexity?.position || 0, sentiment: q.perplexity?.sentiment || "absent" },
    claude: { mentioned: q.claude?.mentioned || false, position: q.claude?.position || 0, sentiment: q.claude?.sentiment || "absent" },
  }));

  const mentionedCount = queries.filter((q) =>
    q.chatgpt.mentioned || q.gemini.mentioned
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
      daysSinceLastScan: 0,
      isStale: false,
      isVeryStale: false,
      weeklyScan: null,
      weeklyMentionRateChange: 0,
      weeklyNewlyFound: [],
      weeklyNewlyLost: [],
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
      const found = q.chatgpt.mentioned || q.gemini.mentioned;
      prevMap.set(q.query.toLowerCase(), found);
    });

    currentScan.queries.forEach((q) => {
      const currentlyFound = q.chatgpt.mentioned || q.gemini.mentioned;
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
      const found = q.chatgpt.mentioned || q.gemini.mentioned;
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

  // Freshness
  const currentTime = new Date(currentScan.timestamp).getTime();
  const daysSinceLastScan = Math.floor((Date.now() - currentTime) / (1000 * 60 * 60 * 24));
  const isStale = daysSinceLastScan >= 7;
  const isVeryStale = daysSinceLastScan >= 14;

  // Weekly delta: find scan closest to 7 days before current
  const sevenDaysAgoTarget = currentTime - (7 * 24 * 60 * 60 * 1000);
  let weeklyScan: GEOScanRecord | null = null;
  let closestDiff = Infinity;
  for (const scan of allScans) {
    const scanTime = new Date(scan.timestamp).getTime();
    if (scanTime >= currentTime) continue; // Must be before current
    const diff = Math.abs(scanTime - sevenDaysAgoTarget);
    if (diff < closestDiff) {
      closestDiff = diff;
      weeklyScan = scan;
    }
  }

  let weeklyMentionRateChange = 0;
  let weeklyNewlyFound: string[] = [];
  let weeklyNewlyLost: string[] = [];

  if (weeklyScan) {
    const weeklyRate = weeklyScan.totalQueries > 0
      ? Math.round((weeklyScan.mentionedCount / weeklyScan.totalQueries) * 100)
      : 0;
    weeklyMentionRateChange = mentionRate - weeklyRate;

    const weeklyMap = new Map<string, boolean>();
    weeklyScan.queries.forEach((q) => {
      const found = q.chatgpt.mentioned || q.gemini.mentioned;
      weeklyMap.set(q.query.toLowerCase(), found);
    });
    currentScan.queries.forEach((q) => {
      const currentlyFound = q.chatgpt.mentioned || q.gemini.mentioned;
      const wasWeeklyFound = weeklyMap.get(q.query.toLowerCase()) ?? false;
      if (currentlyFound && !wasWeeklyFound) weeklyNewlyFound.push(q.query);
      if (!currentlyFound && wasWeeklyFound) weeklyNewlyLost.push(q.query);
    });
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
    daysSinceLastScan,
    isStale,
    isVeryStale,
    weeklyScan,
    weeklyMentionRateChange,
    weeklyNewlyFound,
    weeklyNewlyLost,
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
