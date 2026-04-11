/**
 * Scan History — local persistence layer.
 *
 * Stores every scan result with timestamp in localStorage.
 * Shows trends: "Your score was X on April 1, now Y on April 11."
 *
 * Migrates to Supabase when database is connected — same API shape.
 */

export interface ScanRecord {
  id: string;
  timestamp: string;
  type: "audit" | "technical" | "ai_visibility" | "backlinks";
  url: string;
  score: number;
  summary: string;
}

export interface TrendData {
  current: number;
  previous: number | null;
  change: number;
  direction: "improving" | "declining" | "stable" | "new";
  history: { date: string; score: number }[];
}

const STORAGE_KEY = "cabbageseo_scan_history";

function getHistory(): ScanRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(records: ScanRecord[]) {
  // Keep last 200 records max
  const trimmed = records.slice(-200);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/**
 * Record a new scan result.
 */
export function recordScan(
  type: ScanRecord["type"],
  url: string,
  score: number,
  summary: string
) {
  const records = getHistory();
  records.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    type,
    url,
    score,
    summary,
  });
  saveHistory(records);
}

/**
 * Get trend data for a specific scan type and URL.
 * Returns current score, previous score, change, direction, and history.
 */
export function getTrend(type: ScanRecord["type"], url?: string): TrendData {
  const records = getHistory()
    .filter(r => r.type === type && (!url || r.url === url))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (records.length === 0) {
    return { current: 0, previous: null, change: 0, direction: "new", history: [] };
  }

  const current = records[records.length - 1].score;
  const previous = records.length > 1 ? records[records.length - 2].score : null;
  const change = previous !== null ? current - previous : 0;
  const direction: TrendData["direction"] =
    previous === null ? "new" :
    change > 2 ? "improving" :
    change < -2 ? "declining" :
    "stable";

  const history = records.map(r => ({
    date: new Date(r.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    score: r.score,
  }));

  return { current, previous, change, direction, history };
}

/**
 * Get all trends for a URL — all scan types at once.
 */
export function getAllTrends(url?: string): Record<ScanRecord["type"], TrendData> {
  return {
    audit: getTrend("audit", url),
    technical: getTrend("technical", url),
    ai_visibility: getTrend("ai_visibility", url),
    backlinks: getTrend("backlinks", url),
  };
}

/**
 * Get recent scan records for display.
 */
export function getRecentScans(limit: number = 20): ScanRecord[] {
  return getHistory()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
