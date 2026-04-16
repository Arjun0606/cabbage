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
  city?: string;  // Which city this query targets (for multi-city developers)
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
  // Per-city breakdown (for multi-city developers)
  perCityBreakdown: Array<{
    city: string;
    totalQueries: number;
    mentionedCount: number;
    mentionRate: number;
    missingQueries: string[];
  }>;
}

// ---------- Storage ----------

const GEO_STORAGE_KEY = "cabbge_geo_history";
const GEO_QUERIES_KEY = "cabbge_geo_queries";
const GEO_SCHEMA_VERSION_KEY = "cabbge_geo_schema_version";

// Bump this whenever the scoring algorithm changes in a way that makes old
// scans incomparable or misleading. All old data is auto-wiped on next load.
// v1 = initial, v2 = post web-search-enabled AI visibility (Nov 2026+).
const CURRENT_SCHEMA_VERSION = 2;

/**
 * Auto-clean stale/incompatible scan data.
 * Called whenever we access scan storage.
 * Silently wipes data from before the current schema version or all-zero
 * scans (which indicate the scan ran against broken API calls).
 */
function autoCleanScanData(): void {
  if (typeof window === "undefined") return;

  try {
    const storedVersion = parseInt(localStorage.getItem(GEO_SCHEMA_VERSION_KEY) || "0", 10);

    // Version mismatch — wipe and bump
    if (storedVersion < CURRENT_SCHEMA_VERSION) {
      localStorage.removeItem(GEO_STORAGE_KEY);
      localStorage.removeItem(GEO_QUERIES_KEY);
      localStorage.removeItem("cabbge_scan_history");
      localStorage.removeItem("cabbge_has_scanned");
      localStorage.setItem(GEO_SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
      return;
    }

    // Also wipe if existing scans have suspicious pattern: ALL zeros
    // (indicates they ran against the broken web-search-less code).
    const raw = localStorage.getItem(GEO_STORAGE_KEY);
    if (raw) {
      const scans = JSON.parse(raw) as GEOScanRecord[];
      if (scans.length > 0) {
        // If EVERY scan in history shows 0 mentions across ALL queries,
        // that's almost certainly corrupt data from the broken period.
        const allZeros = scans.every((s) => s.mentionedCount === 0);
        if (allZeros && scans.length >= 1) {
          localStorage.removeItem(GEO_STORAGE_KEY);
          localStorage.removeItem(GEO_QUERIES_KEY);
          localStorage.removeItem("cabbge_has_scanned");
        }
      }
    }
  } catch { /* ignore */ }
}

function getGEOHistory(): GEOScanRecord[] {
  if (typeof window === "undefined") return [];
  autoCleanScanData();
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
  // Ensure schema version is current
  localStorage.setItem(GEO_SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
}

/**
 * Get saved query set for a brand. If none exists, returns null.
 * This ensures we track the SAME queries over time for accurate comparison.
 */
export function getSavedQueries(brand: string): string[] | null {
  if (typeof window === "undefined") return null;
  autoCleanScanData();
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

/**
 * Get query level classification.
 * Priority: AI-classified map from query generation → default "locality".
 * NO hardcoded regex/keyword lists.
 */
function inferQueryLevel(query: string, _city: string): "locality" | "city" | "country" {
  // Try the AI-classified map first (populated during generateSearchQueries)
  try {
    // Dynamic import to avoid circular dependency at module load
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AI_QUERY_LEVELS } = require("./agents/localityEngine") as { AI_QUERY_LEVELS: Map<string, "locality" | "city" | "country"> };
    const cached = AI_QUERY_LEVELS?.get(query.toLowerCase());
    if (cached) return cached;
  } catch { /* ignore */ }

  // If not AI-classified (e.g. loaded from old scan, or fallback), default to locality.
  // Locality is the SAFEST default because it's the most specific level —
  // treating a city-level query as locality just means it's tracked slightly narrower.
  return "locality";
}

export function recordGEOScan(
  brand: string,
  city: string,
  scores: GEOScanRecord["scores"],
  queryResults: any[]  // Raw queryResults from AI visibility API
): GEOScanRecord {
  // Try to load the AI-generated city tags from the localityEngine module cache
  let aiCityMap: Map<string, string> | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./agents/localityEngine") as { AI_QUERY_CITIES?: Map<string, string> };
    aiCityMap = mod.AI_QUERY_CITIES || null;
  } catch { /* ignore */ }

  const queries: GEOQuerySnapshot[] = queryResults.map((q) => ({
    query: q.query,
    level: inferQueryLevel(q.query, city) as GEOQuerySnapshot["level"],
    city: aiCityMap?.get(q.query.toLowerCase()) || city || undefined,
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
      perCityBreakdown: [],
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

  // Per-city breakdown (for multi-city developers)
  const cityGroups = new Map<string, { total: number; mentioned: number; missing: string[] }>();
  currentScan.queries.forEach((q) => {
    const cityKey = q.city || "Unknown";
    if (!cityGroups.has(cityKey)) {
      cityGroups.set(cityKey, { total: 0, mentioned: 0, missing: [] });
    }
    const group = cityGroups.get(cityKey)!;
    group.total += 1;
    const found = q.chatgpt.mentioned || q.gemini.mentioned;
    if (found) {
      group.mentioned += 1;
    } else {
      group.missing.push(q.query);
    }
  });
  const perCityBreakdown = Array.from(cityGroups.entries())
    .map(([cityName, stats]) => ({
      city: cityName,
      totalQueries: stats.total,
      mentionedCount: stats.mentioned,
      mentionRate: stats.total > 0 ? Math.round((stats.mentioned / stats.total) * 100) : 0,
      missingQueries: stats.missing,
    }))
    .sort((a, b) => b.totalQueries - a.totalQueries);

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
    perCityBreakdown,
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
