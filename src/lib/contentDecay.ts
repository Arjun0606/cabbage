/**
 * Content Decay Detection — tracks GSC per-page rankings over time
 * and flags pages that have dropped in position.
 *
 * Agencies charge retainers to monitor this manually. We do it
 * automatically using GSC data we already have.
 *
 * Each time the dashboard fetches GSC data, we save a snapshot
 * (date + per-page impressions/clicks/position). Decay detection
 * compares current state against ~30-day-ago state.
 */

const SNAPSHOTS_KEY = "cabbge_gsc_snapshots";
const MAX_SNAPSHOTS_PER_SITE = 90;  // ~3 months of daily snapshots

export interface GSCPageSnapshot {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCSnapshot {
  siteUrl: string;
  capturedAt: string;
  pages: GSCPageSnapshot[];
}

export interface DecayingPage {
  url: string;
  currentPosition: number;
  previousPosition: number;
  positionDrop: number;       // positive = dropped (got worse)
  currentClicks: number;
  previousClicks: number;
  clickDrop: number;           // positive = lost clicks
  severity: "critical" | "high" | "medium" | "low";
  daysSincePrevious: number;
}

export interface ContentDecayReport {
  siteUrl: string;
  comparisonDays: number;       // how many days between the two snapshots
  decayingPages: DecayingPage[];
  risingPages: Array<{ url: string; currentPosition: number; previousPosition: number; positionGain: number }>;
  totalPagesCompared: number;
  newPages: string[];           // pages that appeared in current but not previous
}

function getAllSnapshots(): Record<string, GSCSnapshot[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveAllSnapshots(snapshots: Record<string, GSCSnapshot[]>): void {
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
  } catch { /* quota exceeded, drop oldest */ }
}

/**
 * Save a GSC snapshot for a site. Automatically prunes to last 90 snapshots
 * per site and deduplicates same-day captures (keeps newest).
 */
export function recordGSCSnapshot(siteUrl: string, topPages: GSCPageSnapshot[]): void {
  if (typeof window === "undefined") return;
  if (!siteUrl || !Array.isArray(topPages) || topPages.length === 0) return;

  const snapshots = getAllSnapshots();
  const siteKey = siteUrl.toLowerCase();
  const todayKey = new Date().toISOString().slice(0, 10);

  // Remove any existing snapshot from today
  const existing = (snapshots[siteKey] || []).filter((s) => !s.capturedAt.startsWith(todayKey));
  existing.push({
    siteUrl,
    capturedAt: new Date().toISOString(),
    pages: topPages.map((p) => ({
      page: p.page,
      clicks: p.clicks,
      impressions: p.impressions,
      ctr: p.ctr,
      position: p.position,
    })),
  });

  // Keep last N snapshots, chronologically
  existing.sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
  snapshots[siteKey] = existing.slice(-MAX_SNAPSHOTS_PER_SITE);
  saveAllSnapshots(snapshots);
}

function severityOf(positionDrop: number, clickDrop: number, previousPosition: number): DecayingPage["severity"] {
  // Dropping out of page 1 (from ≤10 to >10) is critical
  if (previousPosition <= 10 && positionDrop >= 5) return "critical";
  // Big drop in top 20 is high
  if (previousPosition <= 20 && positionDrop >= 5) return "high";
  if (clickDrop >= 50) return "high";
  if (positionDrop >= 3 || clickDrop >= 20) return "medium";
  return "low";
}

/**
 * Detect pages that have declined in position or clicks.
 * Compares the most recent snapshot against one ~N days old (default 30).
 * Falls back to earliest available snapshot if 30 days not yet accumulated.
 */
export function detectContentDecay(siteUrl: string, targetDaysAgo: number = 30): ContentDecayReport {
  const empty: ContentDecayReport = {
    siteUrl,
    comparisonDays: 0,
    decayingPages: [],
    risingPages: [],
    totalPagesCompared: 0,
    newPages: [],
  };

  if (typeof window === "undefined") return empty;
  const snapshots = getAllSnapshots();
  const site = (snapshots[siteUrl.toLowerCase()] || []).slice().sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );
  if (site.length < 2) return empty;

  const current = site[site.length - 1];
  const currentTime = new Date(current.capturedAt).getTime();
  const targetTime = currentTime - targetDaysAgo * 86400_000;

  // Find snapshot closest to targetTime (but not later than current)
  let previous: GSCSnapshot | null = null;
  let bestDiff = Infinity;
  for (const snap of site.slice(0, -1)) {
    const t = new Date(snap.capturedAt).getTime();
    const diff = Math.abs(t - targetTime);
    if (diff < bestDiff) {
      bestDiff = diff;
      previous = snap;
    }
  }
  if (!previous) previous = site[0];

  const comparisonDays = Math.round((currentTime - new Date(previous.capturedAt).getTime()) / 86400_000);
  if (comparisonDays < 1) return empty;

  // Build lookup maps
  const prevMap = new Map<string, GSCPageSnapshot>();
  previous.pages.forEach((p) => prevMap.set(p.page, p));

  const decaying: DecayingPage[] = [];
  const rising: ContentDecayReport["risingPages"] = [];
  const newPages: string[] = [];

  for (const curr of current.pages) {
    const prev = prevMap.get(curr.page);
    if (!prev) {
      newPages.push(curr.page);
      continue;
    }
    // Positions: lower number = better rank. Drop = current - previous > 0.
    const positionDrop = curr.position - prev.position;
    const clickDrop = prev.clicks - curr.clicks;

    if (positionDrop >= 2 || clickDrop >= 10) {
      decaying.push({
        url: curr.page,
        currentPosition: curr.position,
        previousPosition: prev.position,
        positionDrop: Math.round(positionDrop * 10) / 10,
        currentClicks: curr.clicks,
        previousClicks: prev.clicks,
        clickDrop: Math.max(0, clickDrop),
        severity: severityOf(positionDrop, clickDrop, prev.position),
        daysSincePrevious: comparisonDays,
      });
    } else if (positionDrop <= -2) {
      rising.push({
        url: curr.page,
        currentPosition: curr.position,
        previousPosition: prev.position,
        positionGain: Math.round(-positionDrop * 10) / 10,
      });
    }
  }

  // Sort by severity then position drop
  const severityRank = { critical: 0, high: 1, medium: 2, low: 3 };
  decaying.sort((a, b) => {
    if (severityRank[a.severity] !== severityRank[b.severity]) {
      return severityRank[a.severity] - severityRank[b.severity];
    }
    return b.positionDrop - a.positionDrop;
  });

  rising.sort((a, b) => b.positionGain - a.positionGain);

  return {
    siteUrl,
    comparisonDays,
    decayingPages: decaying,
    risingPages: rising.slice(0, 10),
    totalPagesCompared: current.pages.length,
    newPages: newPages.slice(0, 10),
  };
}

/**
 * Count how many snapshots we have for a site — used by UI to decide
 * whether decay analysis is viable (need ≥ 2).
 */
export function getSnapshotCount(siteUrl: string): number {
  if (typeof window === "undefined") return 0;
  const snapshots = getAllSnapshots();
  return (snapshots[siteUrl.toLowerCase()] || []).length;
}
