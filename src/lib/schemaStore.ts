/**
 * Schema Store — persists deployed schemas keyed by site + page path so
 * a public endpoint can serve them to the user's live website.
 *
 * Storage: Supabase when available (so schema persists across browsers),
 * localStorage fallback for single-device use.
 */

export interface DeployedSchema {
  id: string;
  siteUrl: string;      // e.g. https://thecamellias.com
  pagePath: string;     // e.g. / or /projects/camellias
  schemaType: string;   // e.g. "RealEstateListing"
  schemaJson: Record<string, unknown>;   // the actual JSON-LD object
  deployedAt: string;
  updatedAt: string;
}

const LOCAL_KEY = "cabbge_deployed_schemas";

function loadLocal(): DeployedSchema[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocal(list: DeployedSchema[]): void {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(-200))); }
  catch { /* quota */ }
}

function normalizeUrl(u: string): { site: string; path: string } {
  try {
    const url = new URL(u);
    let path = url.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return { site: url.origin, path };
  } catch {
    return { site: u, path: "/" };
  }
}

export function saveDeployedSchema(pageUrl: string, schemaType: string, schemaJson: Record<string, unknown>): DeployedSchema {
  const { site, path } = normalizeUrl(pageUrl);
  const list = loadLocal();
  // Upsert by siteUrl + pagePath
  const existingIdx = list.findIndex((s) => s.siteUrl === site && s.pagePath === path);
  const now = new Date().toISOString();
  const record: DeployedSchema = existingIdx >= 0
    ? { ...list[existingIdx], schemaType, schemaJson, updatedAt: now }
    : {
        id: `sch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        siteUrl: site,
        pagePath: path,
        schemaType,
        schemaJson,
        deployedAt: now,
        updatedAt: now,
      };
  if (existingIdx >= 0) list[existingIdx] = record;
  else list.push(record);
  saveLocal(list);
  return record;
}

export function getDeployedSchemas(siteUrl?: string): DeployedSchema[] {
  const list = loadLocal();
  if (!siteUrl) return list;
  const { site } = normalizeUrl(siteUrl);
  return list.filter((s) => s.siteUrl === site);
}

export function removeDeployedSchema(id: string): void {
  saveLocal(loadLocal().filter((s) => s.id !== id));
}
