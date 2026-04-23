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
 * Persistence is local-first + Supabase mirror when the signed-in user
 * has a company_id. Toggles update localStorage synchronously for UX
 * speed, then fire-and-forget to the `portal_submissions` table so the
 * state survives across devices. On dashboard mount we call
 * hydratePortalSubmissions(companyId) to pull remote state into the
 * local cache.
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
  portalKey: string,
  companyId?: string
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
    deleteInSupabase(companyId, key, portalKey);
    return false;
  }
  const ts = new Date().toISOString();
  next[key] = { ...row, [portalKey]: ts };
  write(next);
  pushToSupabase(companyId, key, portalKey, ts);
  return true;
}

// ---------------------------------------------------------------------------
// Supabase sync — optional, fire-and-forget. Local cache stays the
// authoritative UX source; remote is the durable mirror.
// ---------------------------------------------------------------------------

async function supabaseClient() {
  try {
    const mod = await import("@/lib/db/supabase-browser");
    return mod.getBrowserSupabase();
  } catch {
    return null;
  }
}

function pushToSupabase(
  companyId: string | undefined,
  projectName: string,
  portalKey: string,
  ts: string
) {
  if (!companyId) return;
  void (async () => {
    const sb = await supabaseClient();
    if (!sb) return;
    try {
      await sb.from("portal_submissions").upsert(
        {
          company_id: companyId,
          project_name: projectName === PROJECT_FALLBACK ? "" : projectName,
          portal_key: portalKey,
          submitted_at: ts,
        },
        { onConflict: "company_id,project_name,portal_key" }
      );
    } catch {
      /* swallow — local cache is still correct */
    }
  })();
}

function deleteInSupabase(
  companyId: string | undefined,
  projectName: string,
  portalKey: string
) {
  if (!companyId) return;
  void (async () => {
    const sb = await supabaseClient();
    if (!sb) return;
    try {
      await sb.from("portal_submissions")
        .delete()
        .eq("company_id", companyId)
        .eq("project_name", projectName === PROJECT_FALLBACK ? "" : projectName)
        .eq("portal_key", portalKey);
    } catch {
      /* swallow */
    }
  })();
}

/**
 * Pull the company's portal submissions from Supabase and merge them
 * into localStorage. Call on dashboard mount so state follows the
 * user across devices. Purely-local toggles made before sign-in
 * survive the merge.
 */
export async function hydratePortalSubmissions(companyId: string): Promise<void> {
  if (!companyId || typeof window === "undefined") return;
  const sb = await supabaseClient();
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from("portal_submissions")
      .select("project_name, portal_key, submitted_at")
      .eq("company_id", companyId);
    if (error || !data) return;
    const local = read();
    for (const row of data) {
      const key = row.project_name || PROJECT_FALLBACK;
      local[key] = local[key] || {};
      // Local wins on conflict (user just toggled); remote fills gaps.
      if (!local[key][row.portal_key]) {
        local[key][row.portal_key] = row.submitted_at;
      }
    }
    write(local);
  } catch {
    /* swallow — local cache stands */
  }
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
