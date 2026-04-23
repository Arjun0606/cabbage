/**
 * Portal submission tracker.
 *
 * Cabbge generates portal-specific copy (99acres, Magicbricks, Housing,
 * NoBroker, Commonfloor, GBP) but the actual "paste and submit" is a
 * manual step on each portal. This lib records which project × portal
 * combos the user has marked as submitted, so the Authority tab can
 * show a real coverage matrix ("4 of 15 listings submitted") instead
 * of leaving that status invisible.
 *
 * Persistence: localStorage first for instant UX. Mirrored to the
 * `integrations` table (or a dedicated table) later once Supabase is
 * fully wired — a TODO left for the next pass.
 */

const STORAGE_KEY = "cabbge_portal_submissions";

export interface PortalSubmissions {
  // keyed by (project name || "__company__") -> { portalKey -> submitted-iso-timestamp }
  [projectKey: string]: { [portalKey: string]: string };
}

function read(): PortalSubmissions {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(next: PortalSubmissions) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota — fine to drop */
  }
}

const PROJECT_FALLBACK = "__company__";

export function getPortalSubmissions(): PortalSubmissions {
  return read();
}

export function isPortalSubmitted(
  projectName: string | null | undefined,
  portalKey: string
): boolean {
  const all = read();
  const key = projectName || PROJECT_FALLBACK;
  return !!all[key]?.[portalKey];
}

export function togglePortalSubmitted(
  projectName: string | null | undefined,
  portalKey: string
): boolean {
  const all = read();
  const key = projectName || PROJECT_FALLBACK;
  const row = all[key] || {};
  const next = { ...all };
  if (row[portalKey]) {
    const { [portalKey]: _omit, ...rest } = row;
    void _omit;
    if (Object.keys(rest).length === 0) {
      const { [key]: _omit2, ...without } = next;
      void _omit2;
      write(without);
    } else {
      next[key] = rest;
      write(next);
    }
    return false;
  }
  next[key] = { ...row, [portalKey]: new Date().toISOString() };
  write(next);
  return true;
}

/**
 * Summarise coverage across a project portfolio. For each project and
 * each portal, did the user mark submission? Returns totals for the
 * badge at the top of Authority ("4 of 15 listings live").
 */
export function computeCoverage(
  projectNames: Array<string | null | undefined>,
  portalKeys: string[]
): { total: number; submitted: number; perProject: Array<{ project: string; submitted: number; portals: string[] }> } {
  const all = read();
  const projects = (projectNames.length > 0 ? projectNames : [null]);
  const perProject: Array<{ project: string; submitted: number; portals: string[] }> = [];
  let total = 0;
  let submitted = 0;
  for (const p of projects) {
    const key = p || PROJECT_FALLBACK;
    const row = all[key] || {};
    const hits = portalKeys.filter((pk) => !!row[pk]);
    total += portalKeys.length;
    submitted += hits.length;
    perProject.push({ project: p || "Company-level", submitted: hits.length, portals: hits });
  }
  return { total, submitted, perProject };
}
