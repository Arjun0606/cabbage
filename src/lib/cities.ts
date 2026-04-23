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
 * addresses are consistently formatted "Locality, City" — we take the
 * last comma-segment. If `location` is empty or missing a comma we fall
 * back to the explicit `project.city` or the `fallback` (company.city).
 */
export function extractCityFromLocation(
  location: string | null | undefined,
  fallback: string = ""
): string {
  if (!location) return fallback.trim();
  const parts = location.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return fallback.trim();
  // "Whitefield, Bangalore" -> "Bangalore"
  // "Bangalore" alone -> "Bangalore"
  return parts[parts.length - 1];
}

/** Best-effort city for a single project. */
export function getProjectCity(project: ProjectLike, fallback: string = ""): string {
  if (project.city && project.city.trim()) return project.city.trim();
  return extractCityFromLocation(project.location, fallback);
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
