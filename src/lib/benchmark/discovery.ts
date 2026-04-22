import { queryForVisibility } from "@/lib/ai";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * Live, dynamic benchmark discovery.
 *
 * Nothing about this list is hardcoded. The universe of cities comes
 * from real users' companies + projects; the top developers per city
 * come from a live ChatGPT web-search query. Once a month's discovery
 * runs, the result is cached in benchmark_discovery so we don't re-ask
 * the model on every render — but the source is dynamic and the list
 * refreshes each month the cron runs.
 */

export interface DiscoveredDeveloper {
  brand: string;
  tier: "national" | "regional";
}

/**
 * Every city that appears anywhere in the customer data (company.city
 * or any project.city). Deduplicated, lowercased for comparison but
 * returned in Title Case.
 */
export async function getBenchmarkCities(): Promise<string[]> {
  const db = getServiceClient();
  const [{ data: companies }, { data: projects }] = await Promise.all([
    db.from("companies").select("city"),
    db.from("projects").select("city"),
  ]);

  const seen = new Map<string, string>();
  const add = (city: unknown) => {
    if (typeof city !== "string") return;
    const trimmed = city.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      // Title-case the display value so "bangalore" and "Bangalore"
      // don't become two cities.
      seen.set(
        key,
        trimmed
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ")
      );
    }
  };

  (companies || []).forEach((row) => add(row.city));
  (projects || []).forEach((row) => add(row.city));

  return Array.from(seen.values()).sort();
}

/**
 * Discover the top residential real-estate developers in a given
 * Indian city via live web search. Returns a deduped list of brand
 * names. On failure or when no ChatGPT key is present, returns [] —
 * callers treat that as "no data for this city this month" rather
 * than falling through to a hardcoded alternative.
 */
export async function discoverDevelopersForCity(city: string): Promise<DiscoveredDeveloper[]> {
  const prompt = `List the top 10 residential real estate developers operating in ${city}, India, ranked by recent project activity and reputation in 2026.

Respond ONLY with valid JSON matching this schema. No prose, no markdown fences:

{"developers": [{"brand": "Exact brand name", "tier": "national" | "regional"}]}

Rules:
- "national" = operates in 3+ Indian metros
- "regional" = mainly local to this city or state
- Only include companies you can verify with web search results
- Order by market prominence (biggest / most-recent first)
- Omit the field entirely rather than fabricate if you can't find a legitimate top 10`;

  try {
    const { text, source } = await queryForVisibility("openai", prompt);
    if (!text || source === "failed" || source === "missing_key" || source === "fallback_chat") {
      return [];
    }

    // Pull the first JSON object out of the response.
    const match = text.match(/\{[\s\S]*"developers"[\s\S]*\}/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.developers)) return [];

    const out: DiscoveredDeveloper[] = [];
    const seen = new Set<string>();
    for (const raw of parsed.developers) {
      const brand = typeof raw?.brand === "string" ? raw.brand.trim() : "";
      if (!brand || brand.length > 120) continue;
      const key = brand.toLowerCase();
      if (seen.has(key)) continue;
      const tier = raw?.tier === "national" ? "national" : "regional";
      out.push({ brand, tier });
      seen.add(key);
      if (out.length >= 10) break;
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Stable month tag (e.g. "2026-04") used as the cache/snapshot bucket.
 */
export function currentMonthTag(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * slug: deterministic but source-dependent identifier for the
 * (brand, city) pair so the UNIQUE(developer_slug, captured_month)
 * constraint in geo_benchmark_snapshots still works.
 */
export function slugFor(brand: string, city: string): string {
  return `${brand}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}
