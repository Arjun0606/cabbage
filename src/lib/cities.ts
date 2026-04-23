/**
 * Multi-city helpers.
 *
 * A developer like DLF (NCR, Bangalore, Chennai) or Prestige (Bangalore,
 * Chennai, Hyderabad, Mumbai) has projects across multiple cities. The
 * data model stores the primary city on the company row and the full
 * address on each project ("Gachibowli, Hyderabad"). These helpers
 * extract per-project cities and roll them up into the unique set the
 * company actually serves, so scans and UI can slice by city.
 */

export interface ProjectLike {
  name?: string;
  location?: string | null;
  city?: string | null;
}

/**
 * Extract the city from a free-text `location` string. Indian project
 * addresses are consistently formatted "Locality, City" but developers
 * frequently type just "Tellapur" when the company is single-city and
 * the context is obvious. Rule: a comma-less token that differs from
 * the company's primary city is a locality, not a city — we return
 * the fallback so "Tellapur" (in a Hyderabad company) is city =
 * Hyderabad, not "Tellapur".
 */
export function extractCityFromLocation(
  location: string | null | undefined,
  fallback: string = ""
): string {
  if (!location) return fallback.trim();
  const parts = location.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return fallback.trim();
  if (parts.length === 1) {
    const only = parts[0];
    if (fallback && only.toLowerCase() !== fallback.toLowerCase()) {
      // Looks like a locality the user shorthanded. Honour the
      // fallback primary city.
      return fallback.trim();
    }
    return only;
  }
  return parts[parts.length - 1];
}

/**
 * Best-effort city for a single project. Prefers the explicit
 * `project.city` column when set, falling back to parsing the
 * location. Older rows saved before the parser fix may have
 * `city = "Tellapur"` for single-city developers — when that happens
 * and the primary city differs, we trust the fallback primary city
 * (because it's the one the user explicitly configured at company level).
 */
export function getProjectCity(project: ProjectLike, fallback: string = ""): string {
  const parsed = extractCityFromLocation(project.location, fallback);
  const explicit = project.city?.trim();
  // Only honour the explicit city column when it agrees with what we
  // parse from the location (or when the parser gave up). This guards
  // against stale rows where the city field was auto-filled from a
  // single-token location before the parser fix landed.
  if (explicit) {
    if (parsed && parsed.toLowerCase() !== explicit.toLowerCase() && fallback
        && parsed.toLowerCase() === fallback.toLowerCase()) {
      // Parsed says primary city, explicit says something else → trust
      // parsed because the user-configured primary city wins.
      return parsed;
    }
    return explicit;
  }
  return parsed;
}

/**
 * Roll up the unique cities this company serves. Cities are detected
 * from each project's location, and the company's primary city is
 * always included even if no project references it (useful when the
 * customer has just onboarded without projects yet).
 */
export function getCompanyCities(
  projects: ProjectLike[] | null | undefined,
  primaryCity: string = ""
): string[] {
  const seen = new Map<string, string>(); // lowercase key -> display case
  const add = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (!seen.has(key)) seen.set(key, clean);
  };

  if (primaryCity) add(primaryCity);
  for (const p of projects || []) {
    add(getProjectCity(p, primaryCity));
  }
  return Array.from(seen.values());
}

/**
 * Does the project belong to the given city? Case-insensitive compare.
 * Used to filter the project switcher when the user picks a city.
 */
export function projectMatchesCity(
  project: ProjectLike,
  city: string,
  fallback: string = ""
): boolean {
  if (!city) return true;
  return getProjectCity(project, fallback).toLowerCase() === city.toLowerCase();
}
