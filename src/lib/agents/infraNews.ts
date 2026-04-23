/**
 * Infrastructure-news agent.
 *
 * When a new metro line opens in Gachibowli, every Gachibowli project
 * should publish a "metro connectivity to {project}" article within
 * days. Catching this timing window is how content teams beat SEO
 * agencies that update quarterly. We use the ChatGPT web_search tool
 * to surface recent infrastructure + connectivity news per locality
 * and emit Content-queue opportunities the developer can act on.
 *
 * Scope (Indian residential context):
 *   - Metro / monorail / suburban rail expansions
 *   - Ring roads / expressways / flyover openings
 *   - Airport expansions
 *   - IT-park / SEZ / business-district launches
 *   - Major employer announcements (new campus in X locality)
 *
 * Cached 24h per (city + locality) so we don't spend web_search on
 * every dashboard load.
 */

import { queryForVisibility, aiLight } from "@/lib/ai";

export interface InfraItem {
  headline: string;       // short label, e.g. "Hyderabad Metro Phase 2 extension to Kukatpally"
  summary: string;        // 1-2 sentence summary of the news
  impact: string;         // why this matters for residential demand
  category: "metro" | "road" | "airport" | "it_park" | "employer" | "other";
  locality: string;       // locality this news is relevant to
  suggestedArticle: string; // the Content queue opportunity keyword
  url?: string;
  date?: string;
}

interface CacheEntry {
  value: InfraItem[];
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();
const TTL = 24 * 60 * 60 * 1000;

const CATEGORIES = ["metro", "road", "airport", "it_park", "employer", "other"] as const;

/**
 * Check for meaningful infrastructure / employer news affecting a
 * locality. Returns a compact list the Content queue can consume.
 */
export async function fetchInfraNews(city: string, locality: string): Promise<InfraItem[]> {
  if (!city || !locality) return [];
  const k = `${city.toLowerCase()}::${locality.toLowerCase()}`;
  const hit = cache.get(k);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const searchQuery = `What infrastructure news from the last 6 months affects real estate demand in ${locality}, ${city}? Include metro / suburban-rail expansions, ring roads, expressways, flyover openings, airport upgrades, IT-park / SEZ launches, and major employer campus announcements. Skip unrelated news. Cite sources when available.`;

  let raw = "";
  try {
    const { text, source } = await queryForVisibility("openai", searchQuery);
    if (!text || (source !== "web_search" && source !== "grounded")) {
      cache.set(k, { value: [], expiresAt: Date.now() + TTL });
      return [];
    }
    raw = text;
  } catch {
    return [];
  }

  const extractPrompt = `Extract infrastructure / employer news items affecting ${locality}, ${city} from this search result. Return JSON.

Search result:
"""
${raw.slice(0, 5000)}
"""

Return JSON, no markdown:
{
  "items": [
    {
      "headline": "short label",
      "summary": "1-2 sentence summary of the news",
      "impact": "1 sentence on why this matters for residential demand in ${locality}",
      "category": "metro|road|airport|it_park|employer|other",
      "url": "source URL if visible, else empty",
      "date": "free-text date string or empty"
    }
  ]
}

Rules:
- Max 5 items, prefer the most impactful for residential buyers.
- Skip speculation — only actual announcements, openings, or funded projects.
- If nothing meaningful in the search result, return an empty items array.
- Never invent URLs.`;

  try {
    const parsed = await aiLight("Return only valid JSON.", extractPrompt, 1200);
    const match = parsed.match(/\{[\s\S]*\}/);
    if (!match) return [];
    const obj = JSON.parse(match[0]);
    const items = Array.isArray(obj?.items) ? obj.items : [];
    const out: InfraItem[] = [];
    for (const it of items.slice(0, 5)) {
      if (!it?.headline || !it?.summary) continue;
      const category: InfraItem["category"] = CATEGORIES.includes(it.category as any)
        ? it.category
        : "other";
      out.push({
        headline: String(it.headline).slice(0, 140),
        summary: String(it.summary).slice(0, 400),
        impact: String(it.impact || "").slice(0, 300),
        category,
        locality,
        suggestedArticle: `${category === "metro" ? "metro connectivity" : category === "it_park" ? "IT park proximity" : "infrastructure boost"} for ${locality} real estate — ${String(it.headline).slice(0, 60)}`,
        url: typeof it.url === "string" && it.url ? it.url : undefined,
        date: typeof it.date === "string" && it.date ? it.date.slice(0, 40) : undefined,
      });
    }
    cache.set(k, { value: out, expiresAt: Date.now() + TTL });
    return out;
  } catch {
    return [];
  }
}

/**
 * Batch version: fetch infra news for a set of (city, locality)
 * pairs concurrently, deduping by locality.
 */
export async function fetchInfraNewsForLocalities(
  items: Array<{ city: string; locality: string }>
): Promise<InfraItem[]> {
  const dedup = new Map<string, { city: string; locality: string }>();
  for (const it of items) {
    if (!it.city || !it.locality) continue;
    const key = `${it.city.toLowerCase()}::${it.locality.toLowerCase()}`;
    if (!dedup.has(key)) dedup.set(key, it);
  }
  const targets = Array.from(dedup.values());
  const CONCURRENCY = 4;
  const out: InfraItem[] = [];
  let i = 0;
  while (i < targets.length) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const rows = await Promise.all(
      batch.map((t) => fetchInfraNews(t.city, t.locality).catch(() => [] as InfraItem[]))
    );
    for (const row of rows) out.push(...row);
    i += CONCURRENCY;
  }
  return out;
}
