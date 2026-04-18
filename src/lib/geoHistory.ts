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
  city?: string;       // Which city this query targets (for multi-city developers)
  config?: string;     // Configuration if applicable (e.g. "2BHK", "villa")
  priceTier?: string;  // Price tier if applicable (e.g. "₹50L-1Cr", "₹3Cr+")
  intent?: string;     // Buyer intent: "research" | "comparison" | "shortlist" | etc.
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
  // Per-config breakdown (e.g. 2BHK: 3/8, villa: 1/5)
  perConfigBreakdown: Array<{
    config: string;
    totalQueries: number;
    mentionedCount: number;
    mentionRate: number;
    missingQueries: string[];
  }>;
  // Per-price-tier breakdown (e.g. ₹50L-1Cr: 5/10, ₹3Cr+: 2/5)
  perPriceTierBreakdown: Array<{
    priceTier: string;
    totalQueries: number;
    mentionedCount: number;
    mentionRate: number;
    missingQueries: string[];
  }>;
  // Per-funnel-stage breakdown (awareness → consideration → conversion)
  perFunnelBreakdown: Array<{
    stage: "awareness" | "consideration" | "conversion";
    label: string;
    totalQueries: number;
    mentionedCount: number;
    mentionRate: number;
    missingQueries: string[];
  }>;
  // Competitive citation alerts — queries where competitors appear but brand doesn't
  competitorAlerts: Array<{
    query: string;
    competitors: string[];
    yourStatus: "invisible" | "mentioned";
  }>;
}

// ---------- Storage ----------

const GEO_STORAGE_KEY = "cabbge_geo_history";
const GEO_QUERIES_KEY = "cabbge_geo_queries";
const GEO_SCHEMA_VERSION_KEY = "cabbge_geo_schema_version";

// Bump this whenever the scoring algorithm changes in a way that makes old
// scans incomparable or misleading. All old data is auto-wiped on next load.
// v1 = initial, v2 = post web-search-enabled AI visibility (Nov 2026+).
// v3 = query metadata (config, priceTier, intent) persisted in snapshots.
const CURRENT_SCHEMA_VERSION = 3;

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
 * Saved query shape. Can be either `QueryWithMeta[]` (current) or legacy
 * `string[]` from before metadata was added. `getSavedQueries` normalizes.
 */
interface SavedQueryEntry {
  queries: Array<{ query: string; level?: string; city?: string; config?: string; priceTier?: string; intent?: string }>;
  /** Hash of company.projects when these queries were generated.
   *  Used for C (auto-refresh when projects change). */
  projectsFingerprint?: string;
}

/**
 * Get saved query set for a brand. If none exists, returns null.
 * This ensures we track the SAME queries over time for accurate comparison.
 * Normalizes legacy `string[]` format to `QueryWithMeta[]` on read.
 */
export function getSavedQueries(brand: string): Array<{ query: string; level?: string; city?: string; config?: string; priceTier?: string; intent?: string }> | null {
  if (typeof window === "undefined") return null;
  autoCleanScanData();
  try {
    const raw = localStorage.getItem(GEO_QUERIES_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, unknown>;
    const entry = map[brand.toLowerCase()];
    if (!entry) return null;

    // Legacy: string[]
    if (Array.isArray(entry) && entry.length > 0 && typeof entry[0] === "string") {
      return (entry as string[]).map((q: string) => ({ query: q, level: "locality" }));
    }
    // Legacy: QueryWithMeta[] stored bare (before SavedQueryEntry wrapper)
    if (Array.isArray(entry) && entry.length > 0 && typeof entry[0] === "object") {
      return entry as Array<{ query: string; level?: string; city?: string; config?: string; priceTier?: string; intent?: string }>;
    }
    // Current: SavedQueryEntry
    if (typeof entry === "object" && !Array.isArray(entry) && (entry as SavedQueryEntry).queries) {
      return (entry as SavedQueryEntry).queries;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get the projects fingerprint stored alongside saved queries.
 * Returns null if none stored or no saved queries for this brand.
 */
export function getSavedQueriesFingerprint(brand: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GEO_QUERIES_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, unknown>;
    const entry = map[brand.toLowerCase()];
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      return (entry as SavedQueryEntry).projectsFingerprint || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save a query set for a brand (first scan locks the queries).
 * Stores as `SavedQueryEntry` with metadata and projects fingerprint.
 */
export function saveQueries(
  brand: string,
  queries: Array<{ query: string; level?: string; city?: string; config?: string; priceTier?: string; intent?: string }>,
  projectsFingerprint?: string
) {
  try {
    const raw = localStorage.getItem(GEO_QUERIES_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[brand.toLowerCase()] = { queries, projectsFingerprint } satisfies SavedQueryEntry;
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
 * Record a GEO scan. Metadata (level, city, config, priceTier, intent) now
 * comes directly from the queryResults — no more relying on module-level
 * Maps that die on cold start.
 *
 * Falls back to the old `inferQueryLevel` path for backward compat when
 * query results don't include metadata (e.g. old cron code).
 */
export function recordGEOScan(
  brand: string,
  city: string,
  scores: GEOScanRecord["scores"],
  queryResults: any[]  // Raw queryResults from AI visibility API
): GEOScanRecord {
  const queries: GEOQuerySnapshot[] = queryResults.map((q) => {
    // Prefer metadata embedded in the queryResult (new path).
    // Fall back to module-level Maps (old path, works only within same request).
    let level: GEOQuerySnapshot["level"] = "locality";
    let tagCity: string | undefined = city || undefined;
    if (q.level && ["locality", "city", "country"].includes(q.level)) {
      level = q.level;
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { AI_QUERY_LEVELS } = require("./agents/localityEngine") as { AI_QUERY_LEVELS: Map<string, "locality" | "city" | "country"> };
        level = AI_QUERY_LEVELS?.get(q.query?.toLowerCase()) || "locality";
      } catch { /* ignore */ }
    }
    if (q.city && typeof q.city === "string") {
      tagCity = q.city;
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { AI_QUERY_CITIES } = require("./agents/localityEngine") as { AI_QUERY_CITIES: Map<string, string> };
        tagCity = AI_QUERY_CITIES?.get(q.query?.toLowerCase()) || city || undefined;
      } catch { /* ignore */ }
    }

    return {
      query: q.query,
      level,
      city: tagCity,
      config: typeof q.config === "string" ? q.config : undefined,
      priceTier: typeof q.priceTier === "string" ? q.priceTier : undefined,
      intent: typeof q.intent === "string" ? q.intent : undefined,
      chatgpt: { mentioned: q.chatgpt?.mentioned || false, position: q.chatgpt?.position || 0, sentiment: q.chatgpt?.sentiment || "absent" },
      gemini: { mentioned: q.gemini?.mentioned || false, position: q.gemini?.position || 0, sentiment: q.gemini?.sentiment || "absent" },
      perplexity: { mentioned: q.perplexity?.mentioned || false, position: q.perplexity?.position || 0, sentiment: q.perplexity?.sentiment || "absent" },
      claude: { mentioned: q.claude?.mentioned || false, position: q.claude?.position || 0, sentiment: q.claude?.sentiment || "absent" },
    };
  });

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
      perConfigBreakdown: [],
      perPriceTierBreakdown: [],
      perFunnelBreakdown: [],
      competitorAlerts: [],
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

  // Per-config breakdown (e.g. "2BHK: 3/8", "villa: 1/5")
  // Only populated when queries have config metadata (v3+).
  const segmentBreakdown = (
    keyFn: (q: GEOQuerySnapshot) => string | undefined,
    labelKey: "config" | "priceTier"
  ) => {
    const groups = new Map<string, { total: number; mentioned: number; missing: string[] }>();
    currentScan.queries.forEach((q) => {
      const key = keyFn(q);
      if (!key) return; // skip queries without this metadata
      if (!groups.has(key)) groups.set(key, { total: 0, mentioned: 0, missing: [] });
      const g = groups.get(key)!;
      g.total += 1;
      if (q.chatgpt.mentioned || q.gemini.mentioned) {
        g.mentioned += 1;
      } else {
        g.missing.push(q.query);
      }
    });
    return Array.from(groups.entries())
      .map(([k, s]) => ({
        [labelKey]: k,
        totalQueries: s.total,
        mentionedCount: s.mentioned,
        mentionRate: s.total > 0 ? Math.round((s.mentioned / s.total) * 100) : 0,
        missingQueries: s.missing,
      }))
      .sort((a, b) => b.totalQueries - a.totalQueries) as Array<{
        config?: string; priceTier?: string;
        totalQueries: number; mentionedCount: number; mentionRate: number; missingQueries: string[];
      }>;
  };

  const perConfigBreakdown = segmentBreakdown((q) => q.config, "config") as GEOProgress["perConfigBreakdown"];
  const perPriceTierBreakdown = segmentBreakdown((q) => q.priceTier, "priceTier") as GEOProgress["perPriceTierBreakdown"];

  // Per-funnel-stage breakdown: map intent → funnel stage
  const intentToFunnel: Record<string, "awareness" | "consideration" | "conversion"> = {
    research: "awareness",
    comparison: "consideration",
    shortlist: "consideration",
    investment: "conversion",
    rental: "conversion",
  };
  const funnelGroups = new Map<string, { total: number; mentioned: number; missing: string[] }>();
  currentScan.queries.forEach((q) => {
    const stage = q.intent ? intentToFunnel[q.intent] : null;
    if (!stage) return;
    if (!funnelGroups.has(stage)) funnelGroups.set(stage, { total: 0, mentioned: 0, missing: [] });
    const g = funnelGroups.get(stage)!;
    g.total += 1;
    if (q.chatgpt.mentioned || q.gemini.mentioned) {
      g.mentioned += 1;
    } else {
      g.missing.push(q.query);
    }
  });
  const funnelLabels: Record<string, string> = {
    awareness: "Top of funnel — discovery",
    consideration: "Mid funnel — comparing",
    conversion: "Bottom funnel — ready to buy",
  };
  const perFunnelBreakdown: GEOProgress["perFunnelBreakdown"] = (["awareness", "consideration", "conversion"] as const)
    .filter((stage) => funnelGroups.has(stage))
    .map((stage) => {
      const g = funnelGroups.get(stage)!;
      return {
        stage,
        label: funnelLabels[stage],
        totalQueries: g.total,
        mentionedCount: g.mentioned,
        mentionRate: g.total > 0 ? Math.round((g.mentioned / g.total) * 100) : 0,
        missingQueries: g.missing,
      };
    });

  // Competitive citation alerts — queries where brand is invisible but competitors appear
  const competitorAlerts: GEOProgress["competitorAlerts"] = [];
  currentScan.queries.forEach((q) => {
    const found = q.chatgpt.mentioned || q.gemini.mentioned;
    // Collect competitor names from coCitations (if available in the stored data)
    const coCitations: string[] = [
      ...((q.chatgpt as any).coCitations || []),
      ...((q.gemini as any).coCitations || []),
    ];
    const uniqueCompetitors = Array.from(new Set(coCitations)).slice(0, 5);
    if (!found && uniqueCompetitors.length > 0) {
      competitorAlerts.push({
        query: q.query,
        competitors: uniqueCompetitors,
        yourStatus: "invisible",
      });
    }
  });

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
    perConfigBreakdown,
    perPriceTierBreakdown,
    perFunnelBreakdown,
    competitorAlerts,
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

// ---------- Article tracking (publish→rescan loop) ----------

const ARTICLES_KEY = "cabbge_generated_articles";

export interface TrackedArticle {
  id: string;
  query: string;         // The blind-spot query this article targets
  title: string;
  generatedAt: string;
  status: "draft" | "published";
  publishedAt?: string;
  publishUrl?: string;
  /** Score at the time of article generation (for before/after comparison) */
  preScore?: { chatgptMentioned: boolean; geminiMentioned: boolean };
  /** Score after rescan post-publish */
  postScore?: { chatgptMentioned: boolean; geminiMentioned: boolean; rescannedAt: string };
}

export function getTrackedArticles(): TrackedArticle[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ARTICLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTrackedArticles(articles: TrackedArticle[]) {
  localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles.slice(-100)));
}

/**
 * Record that an article was generated for a specific blind-spot query.
 * Call this right after the article-writer API returns successfully.
 */
export function trackArticleGenerated(
  query: string,
  title: string,
  preScore?: TrackedArticle["preScore"]
): TrackedArticle {
  const articles = getTrackedArticles();
  const article: TrackedArticle = {
    id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    query,
    title,
    generatedAt: new Date().toISOString(),
    status: "draft",
    preScore,
  };
  articles.push(article);
  saveTrackedArticles(articles);
  return article;
}

/**
 * Mark an article as published. Called by the PublishButton's onPublished callback.
 */
export function markArticlePublished(articleId: string, publishUrl?: string): void {
  const articles = getTrackedArticles();
  const article = articles.find((a) => a.id === articleId);
  if (article) {
    article.status = "published";
    article.publishedAt = new Date().toISOString();
    article.publishUrl = publishUrl;
    saveTrackedArticles(articles);
  }
}

/**
 * Record the post-publish rescan result for an article.
 */
export function recordArticleRescan(
  articleId: string,
  chatgptMentioned: boolean,
  geminiMentioned: boolean
): void {
  const articles = getTrackedArticles();
  const article = articles.find((a) => a.id === articleId);
  if (article) {
    article.postScore = {
      chatgptMentioned,
      geminiMentioned,
      rescannedAt: new Date().toISOString(),
    };
    saveTrackedArticles(articles);
  }
}

/**
 * Get articles for a specific query (to show in the query-by-query breakdown).
 */
export function getArticlesForQuery(query: string): TrackedArticle[] {
  return getTrackedArticles().filter(
    (a) => a.query.toLowerCase() === query.toLowerCase()
  );
}
