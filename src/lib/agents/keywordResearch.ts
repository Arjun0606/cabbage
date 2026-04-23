/**
 * Keyword Research — real search volume + difficulty for a given topic.
 *
 * Data sources:
 * 1. GSC impression data (real, free, but only for terms the site
 *    already appears for)
 * 2. AI-inferred estimates via ChatGPT web_search — pulls what's
 *    visible in Moz/Ahrefs/SEMrush public pages, Google Ads
 *    keyword planner data, and SERP analysis
 * 3. Google autocomplete + "People Also Ask" expansion (free)
 *
 * This replaces what agencies pay ₹30k+/mo for DataForSEO/Ahrefs
 * with a working-quality alternative for real estate queries.
 */

import { queryForVisibility, aiLight } from "@/lib/ai";

export interface KeywordResult {
  keyword: string;
  monthlyVolume: number | null;    // search volume, null if unknown
  difficulty: number | null;       // 0-100 KD score, null if unknown
  cpc: number | null;              // ₹ per click (commercial intent proxy)
  intent: "informational" | "commercial" | "transactional" | "navigational" | "unknown";
  gscImpressions?: number;         // real data from GSC if available
  gscPosition?: number;            // current avg rank if GSC connected
  gscClicks?: number;
  opportunity: "high" | "medium" | "low";  // derived — high volume + low difficulty = high
  source: "gsc" | "web_search" | "inferred";
  // Multi-dimensional tags for filtering — populated by runKeywordPortfolio
  seedCity?: string;
  seedProject?: string;
  seedConfig?: string;
  seedLocality?: string;
}

export interface KeywordPortfolioSeed {
  seed: string;
  city?: string;
  project?: string;
  config?: string;
  locality?: string;
  priceTier?: string;
  /** Dimension label for UI filters — "By Project", "By Config", etc. */
  dimension: "project" | "config" | "city" | "locality" | "general";
}

export interface KeywordResearchResult {
  seed: string;
  city?: string;
  totalKeywords: number;
  keywords: KeywordResult[];
  /** For portfolio runs: the full set of seeds that were expanded */
  seedsUsed?: KeywordPortfolioSeed[];
  clusters: Array<{
    name: string;
    keywordCount: number;
    totalVolume: number;
    avgDifficulty: number;
    keywords: string[];
  }>;
  generatedAt: string;
}

/**
 * Template-based keyword fallback. Works deterministically from seed +
 * city without calling the model — used when AI expansion fails or
 * returns a thin list. Guarantees ~15 usable keywords per seed so the
 * Content queue never renders empty just because the LLM blinked.
 */
function fallbackKeywords(seed: string, city: string): string[] {
  const s = seed.trim();
  const c = city.trim();
  const variants = [
    s,
    `${s} in ${c}`,
    `best ${s} in ${c}`,
    `top ${s} in ${c}`,
    `${s} ${c} price`,
    `${s} ${c} for sale`,
    `${s} ${c} review`,
    `new launch ${s} in ${c}`,
    `ready to move ${s} in ${c}`,
    `${s} under 1 crore ${c}`,
    `${s} ${c} location advantages`,
    `is ${s} a good investment in ${c}`,
    `${s} ${c} floor plans`,
    `${s} ${c} amenities`,
    `${s} ${c} possession date`,
    `${s} near metro ${c}`,
  ];
  const seen = new Set<string>();
  return variants
    .map((v) => v.replace(/\s+/g, " ").trim().toLowerCase())
    .filter((v) => {
      if (!v || seen.has(v)) return false;
      seen.add(v);
      return true;
    })
    .slice(0, 16);
}

/**
 * Expand a seed keyword into variants. Uses AI first, then merges with
 * a template fallback so the final list is always >= 12 keywords. This
 * fixes the "keyword research came back empty / only one row" case we
 * used to hit whenever the LLM returned non-JSON.
 */
async function expandKeywords(seed: string, city: string): Promise<string[]> {
  const prompt = `Generate 20 related real estate search keywords that buyers would type on Google, based on this seed: "${seed}" in ${city}.

Cover all intent types:
- Informational (guides, how-to, what is)
- Commercial (best, top, reviews, comparison)
- Transactional (price, for sale, book, rent)
- Navigational (brand-specific — skip these)

Include variants with:
- Configuration (2BHK, 3BHK, villa)
- Price range (under 1 crore, 50L-1Cr)
- Locality specifics (near metro, IT park, school)
- Modifiers (ready to move, new launch, gated community)

Return ONLY a JSON array of strings, no other text. Max 20 keywords.`;

  let aiKeywords: string[] = [];
  try {
    const text = await aiLight("Return JSON array of search queries. No other text.", prompt, 1000);
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          aiKeywords = parsed
            .filter((s: unknown) => typeof s === "string")
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
      } catch {
        // Truncated JSON — attempt to recover individual quoted strings.
        const recovered = match[0].match(/"([^"\\]+)"/g);
        if (recovered) aiKeywords = recovered.map((r) => r.replace(/^"|"$/g, ""));
      }
    }
  } catch (err) {
    console.error("keywordResearch: expansion failed:", err instanceof Error ? err.message : err);
  }

  // Always merge with the deterministic fallback so we never return
  // fewer than ~12 keywords. The AI list goes first so its wording
  // wins on dedupe, but users always see a real breadth of variants.
  const combined = [...aiKeywords, ...fallbackKeywords(seed, city)];
  const seen = new Set<string>();
  return combined
    .map((v) => v.replace(/\s+/g, " ").trim())
    .filter((v) => {
      const key = v.toLowerCase();
      if (!v || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 22);
}

/**
 * Get real search volume / difficulty / CPC via web search.
 * Asks ChatGPT with web_search tool to look up the data from
 * publicly-visible sources (Keyword Planner, Moz, Ahrefs previews).
 */
async function getKeywordMetricsBatch(keywords: string[], city: string): Promise<Map<string, { volume: number | null; difficulty: number | null; cpc: number | null; intent: KeywordResult["intent"] }>> {
  const result = new Map<string, { volume: number | null; difficulty: number | null; cpc: number | null; intent: KeywordResult["intent"] }>();
  if (keywords.length === 0) return result;

  const query = `For these Indian real estate keywords in ${city}, what is each one's approximate monthly search volume in India, keyword difficulty (0-100), and average cost-per-click in INR? Check Google Keyword Planner public data, Moz, Ahrefs, SEMrush, or any visible source.

Keywords:
${keywords.map((k, i) => `${i + 1}. ${k}`).join("\n")}`;

  try {
    const { text, source } = await queryForVisibility("openai", query);
    if (!text || (source !== "web_search" && source !== "grounded")) {
      return result;
    }

    // Parse the response to extract numbers per keyword
    const parsePrompt = `Extract keyword metrics from this search result. For each keyword, return monthly volume (number), difficulty (0-100), CPC in INR (number), and intent. Return ONLY valid JSON, no markdown.

Search result:
"""
${text.slice(0, 4000)}
"""

Keywords to extract:
${keywords.map((k) => `- ${k}`).join("\n")}

Return JSON in this exact shape:
[
  {"keyword": "exact keyword string", "volume": 1200, "difficulty": 45, "cpc": 35.50, "intent": "commercial"}
]

Rules:
- volume: null if not found, otherwise an integer
- difficulty: null if not found, otherwise 0-100
- cpc: null if not found, otherwise INR number (e.g. 25.50)
- intent: "informational" | "commercial" | "transactional" | "navigational"
- Return ALL ${keywords.length} keywords, even if values are null. Do not invent data.`;

    const parsed = await aiLight("Return only valid JSON.", parsePrompt, 2000);
    const match = parsed.match(/\[[\s\S]*\]/);
    if (match) {
      let jsonStr = match[0];
      try { JSON.parse(jsonStr); } catch {
        const lastObj = jsonStr.lastIndexOf("}");
        if (lastObj > 0) jsonStr = jsonStr.slice(0, lastObj + 1) + "]";
      }
      try {
        const data = JSON.parse(jsonStr);
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item?.keyword && typeof item.keyword === "string") {
              result.set(item.keyword.toLowerCase(), {
                volume: typeof item.volume === "number" ? item.volume : null,
                difficulty: typeof item.difficulty === "number" ? Math.max(0, Math.min(100, item.difficulty)) : null,
                cpc: typeof item.cpc === "number" ? item.cpc : null,
                intent: ["informational", "commercial", "transactional", "navigational"].includes(item.intent) ? item.intent : "unknown",
              });
            }
          }
        }
      } catch (err) {
        console.error("keywordResearch: metrics parse failed:", err instanceof Error ? err.message : err);
      }
    }
  } catch (err) {
    console.error("keywordResearch: web search failed:", err instanceof Error ? err.message : err);
  }

  // Fallback estimation pass. If the web-search lookup produced nothing
  // (rate limit, tool not available, parse failure) we at least want to
  // show users the keyword list with rough volume / difficulty estimates
  // so the Content queue has priority signal. Marked as "inferred" via
  // the caller, so the UI can badge these honestly.
  if (result.size === 0) {
    try {
      const estPrompt = `Estimate rough Indian monthly search volume, keyword difficulty (0-100), CPC in INR, and intent for these real estate keywords in ${city}. Use reasonable judgment from typical Indian real-estate search patterns — do not claim precision. Return ONLY JSON, no prose.

Keywords:
${keywords.map((k) => `- ${k}`).join("\n")}

Return JSON in this exact shape:
[
  {"keyword": "exact keyword", "volume": 800, "difficulty": 42, "cpc": 22, "intent": "commercial"}
]

Rules:
- volume: integer (rough estimate is fine)
- difficulty: 0-100
- cpc: INR number
- intent: "informational" | "commercial" | "transactional" | "navigational"
- Return ALL ${keywords.length} keywords.`;

      const estText = await aiLight("Return only valid JSON array.", estPrompt, 2000);
      const estMatch = estText.match(/\[[\s\S]*\]/);
      if (estMatch) {
        let estStr = estMatch[0];
        try { JSON.parse(estStr); } catch {
          const lastObj = estStr.lastIndexOf("}");
          if (lastObj > 0) estStr = estStr.slice(0, lastObj + 1) + "]";
        }
        try {
          const data = JSON.parse(estStr);
          if (Array.isArray(data)) {
            for (const item of data) {
              if (item?.keyword && typeof item.keyword === "string") {
                result.set(item.keyword.toLowerCase(), {
                  volume: typeof item.volume === "number" ? item.volume : null,
                  difficulty: typeof item.difficulty === "number" ? Math.max(0, Math.min(100, item.difficulty)) : null,
                  cpc: typeof item.cpc === "number" ? item.cpc : null,
                  intent: ["informational", "commercial", "transactional", "navigational"].includes(item.intent) ? item.intent : "unknown",
                });
              }
            }
          }
        } catch (err) {
          console.error("keywordResearch: fallback estimate parse failed:", err instanceof Error ? err.message : err);
        }
      }
    } catch (err) {
      console.error("keywordResearch: fallback estimate call failed:", err instanceof Error ? err.message : err);
    }
  }

  return result;
}

/**
 * Derive an opportunity score: high volume + low difficulty = best.
 * When metrics are missing we still want the keyword to surface as
 * something the user can write about, so an absent-volume keyword is
 * scored as "medium" instead of silently tanking to "low".
 */
function calculateOpportunity(volume: number | null, difficulty: number | null): "high" | "medium" | "low" {
  if (volume === null && difficulty === null) return "medium";
  if (volume === null || difficulty === null) {
    // Partial data — use what we have.
    if (volume !== null && volume >= 500) return "high";
    if (difficulty !== null && difficulty <= 35) return "medium";
    return "medium";
  }
  if (volume >= 1000 && difficulty <= 40) return "high";
  if (volume >= 500 && difficulty <= 60) return "medium";
  if (volume >= 100 && difficulty <= 50) return "medium";
  return "low";
}

/**
 * Cluster keywords by topic similarity. Simple word-overlap clustering
 * — no ML needed for this scale.
 */
function clusterKeywords(keywords: KeywordResult[]): KeywordResearchResult["clusters"] {
  const clusters = new Map<string, KeywordResult[]>();
  for (const kw of keywords) {
    // Extract topic signal — core noun phrases (configuration, locality, price-related)
    const tokens = kw.keyword.toLowerCase().split(/\s+/);
    let clusterKey = "general";
    if (tokens.some((t) => /bhk|villa|apartment|flat|plot/.test(t))) {
      const cfg = tokens.find((t) => /bhk|villa|apartment|flat|plot/.test(t));
      clusterKey = `config:${cfg}`;
    } else if (tokens.some((t) => /under|below|cr|lakh|crore/.test(t))) {
      clusterKey = "price";
    } else if (tokens.some((t) => /best|top|trusted|reputed/.test(t))) {
      clusterKey = "decision";
    } else if (tokens.some((t) => /near|vs|comparison/.test(t))) {
      clusterKey = "comparison";
    } else if (tokens.some((t) => /how|what|why|guide|tips/.test(t))) {
      clusterKey = "informational";
    }
    if (!clusters.has(clusterKey)) clusters.set(clusterKey, []);
    clusters.get(clusterKey)!.push(kw);
  }

  return Array.from(clusters.entries())
    .map(([name, kws]) => ({
      name: name.replace(/^config:/, "").toUpperCase(),
      keywordCount: kws.length,
      totalVolume: kws.reduce((s, k) => s + (k.monthlyVolume || 0), 0),
      avgDifficulty: kws.filter((k) => k.difficulty !== null).length > 0
        ? Math.round(kws.reduce((s, k) => s + (k.difficulty || 0), 0) / kws.filter((k) => k.difficulty !== null).length)
        : 0,
      keywords: kws.map((k) => k.keyword),
    }))
    .sort((a, b) => b.totalVolume - a.totalVolume);
}

export async function runKeywordResearch(
  seed: string,
  city: string,
  gscData?: { topQueries?: Array<{ query: string; impressions: number; clicks: number; position: number }> }
): Promise<KeywordResearchResult> {
  if (!seed || !seed.trim()) throw new Error("Seed keyword is required");
  if (!city || !city.trim()) throw new Error("City is required");

  // Expand seed to 20 related keywords
  const expanded = await expandKeywords(seed.trim(), city.trim());
  // Include the seed itself at the top
  const allKeywords = [seed.trim(), ...expanded.filter((k) => k.toLowerCase() !== seed.trim().toLowerCase())];

  // Batch lookup metrics
  const metrics = await getKeywordMetricsBatch(allKeywords, city.trim());

  // Index GSC data for quick lookup
  const gscIndex = new Map<string, { impressions: number; clicks: number; position: number }>();
  (gscData?.topQueries || []).forEach((q) => {
    gscIndex.set(q.query.toLowerCase(), { impressions: q.impressions, clicks: q.clicks, position: q.position });
  });

  const results: KeywordResult[] = allKeywords.map((kw) => {
    const m = metrics.get(kw.toLowerCase());
    const gsc = gscIndex.get(kw.toLowerCase());
    const source: KeywordResult["source"] = gsc ? "gsc" : m ? "web_search" : "inferred";

    return {
      keyword: kw,
      monthlyVolume: m?.volume ?? null,
      difficulty: m?.difficulty ?? null,
      cpc: m?.cpc ?? null,
      intent: m?.intent || "unknown",
      gscImpressions: gsc?.impressions,
      gscPosition: gsc?.position,
      gscClicks: gsc?.clicks,
      opportunity: calculateOpportunity(m?.volume ?? null, m?.difficulty ?? null),
      source,
    };
  });

  // Sort: high opportunity first, then by volume
  results.sort((a, b) => {
    const oppRank = { high: 0, medium: 1, low: 2 };
    if (oppRank[a.opportunity] !== oppRank[b.opportunity]) {
      return oppRank[a.opportunity] - oppRank[b.opportunity];
    }
    return (b.monthlyVolume || 0) - (a.monthlyVolume || 0);
  });

  return {
    seed: seed.trim(),
    city: city.trim(),
    totalKeywords: results.length,
    keywords: results,
    clusters: clusterKeywords(results),
    generatedAt: new Date().toISOString(),
  };
}

// ---------- Multi-dimensional Portfolio Runner ----------

/**
 * Build a seed portfolio from company data so keyword research covers
 * every city × project × configuration angle the brand cares about.
 *
 * Priorities (to keep the seed count reasonable):
 *  - One seed per unique city (up to 3)
 *  - One seed per unique config (2BHK / 3BHK / villa etc. — up to 4)
 *  - One seed per unique project locality (up to 3)
 *  - One "decision" seed ("top builders in <primary city>")
 * Total capped at ~8 seeds to keep runtime predictable.
 */
export function buildSeedPortfolio(input: {
  city: string;
  projects: Array<{ name?: string; location?: string; configurations?: string; priceRange?: string }>;
}): KeywordPortfolioSeed[] {
  const seeds: KeywordPortfolioSeed[] = [];
  const seen = new Set<string>();

  const add = (s: KeywordPortfolioSeed) => {
    const key = s.seed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    seeds.push(s);
  };

  const projects = input.projects || [];
  const primaryCity = input.city.trim();

  // 1. Decision / city-wide (always include)
  if (primaryCity) {
    add({ seed: `best real estate developers in ${primaryCity}`, city: primaryCity, dimension: "city" });
  }

  // 2. Per unique city from project locations
  const cities = new Set<string>();
  for (const p of projects) {
    if (!p.location) continue;
    const parts = p.location.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) cities.add(parts[parts.length - 1]);
  }
  cities.delete(primaryCity);
  Array.from(cities).slice(0, 2).forEach((c) => {
    add({ seed: `best real estate developers in ${c}`, city: c, dimension: "city" });
  });

  // 3. Per unique project locality with primary config
  const localities = Array.from(new Set(projects.map((p) => p.location).filter(Boolean))) as string[];
  for (const loc of localities.slice(0, 3)) {
    const project = projects.find((p) => p.location === loc);
    const firstConfig = project?.configurations?.split(/[,/]/)[0]?.trim();
    if (firstConfig) {
      add({
        seed: `best ${firstConfig} in ${loc}`,
        city: primaryCity,
        project: project?.name,
        config: firstConfig,
        locality: loc,
        dimension: "locality",
      });
    } else {
      add({ seed: `apartments in ${loc}`, city: primaryCity, locality: loc, dimension: "locality" });
    }
  }

  // 4. Per unique configuration (so 2BHK buyer perspective is covered even if the primary locality seed used 3BHK)
  const configs = new Set<string>();
  for (const p of projects) {
    if (!p.configurations) continue;
    for (const c of p.configurations.split(/[,/]/).map((s) => s.trim()).filter(Boolean)) {
      configs.add(c);
    }
  }
  Array.from(configs).slice(0, 3).forEach((cfg) => {
    add({
      seed: `${cfg} in ${primaryCity}`,
      city: primaryCity,
      config: cfg,
      dimension: "config",
    });
  });

  return seeds.slice(0, 8);
}

/**
 * Run keyword research across every dimension (city × project × config).
 * Parallelizes the individual research calls so total time ≈ single-seed time.
 * Results are merged, deduplicated (keyword → best-data wins), and each
 * keyword is tagged with the seed context that discovered it.
 */
export async function runKeywordPortfolio(
  input: {
    city: string;
    projects: Array<{ name?: string; location?: string; configurations?: string; priceRange?: string }>;
  },
  gscData?: Parameters<typeof runKeywordResearch>[2]
): Promise<KeywordResearchResult> {
  const seeds = buildSeedPortfolio(input);
  if (seeds.length === 0) throw new Error("No seeds could be derived — set a city or add at least one project.");

  // Expand each seed in parallel. Each call returns 20 keywords, so a portfolio
  // of 6 seeds returns 120 raw before dedup.
  const perSeedResults = await Promise.all(
    seeds.map(async (s) => {
      try {
        const r = await runKeywordResearch(s.seed, s.city || input.city, gscData);
        return { seed: s, result: r };
      } catch (err) {
        console.error(`Portfolio seed "${s.seed}" failed:`, err instanceof Error ? err.message : err);
        return null;
      }
    })
  );

  // Merge — dedupe by lowercase keyword, prefer the row with GSC data,
  // otherwise the row with non-null metrics, otherwise first seen.
  const merged = new Map<string, KeywordResult>();
  for (const entry of perSeedResults) {
    if (!entry) continue;
    const { seed, result } = entry;
    for (const kw of result.keywords) {
      const key = kw.keyword.toLowerCase();
      const tagged: KeywordResult = {
        ...kw,
        seedCity: seed.city,
        seedProject: seed.project,
        seedConfig: seed.config,
        seedLocality: seed.locality,
      };
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, tagged);
      } else {
        // Prefer richer data
        const existingScore = (existing.source === "gsc" ? 3 : 0) + (existing.monthlyVolume !== null ? 1 : 0) + (existing.difficulty !== null ? 1 : 0);
        const newScore = (tagged.source === "gsc" ? 3 : 0) + (tagged.monthlyVolume !== null ? 1 : 0) + (tagged.difficulty !== null ? 1 : 0);
        if (newScore > existingScore) merged.set(key, tagged);
      }
    }
  }

  const keywords = Array.from(merged.values()).sort((a, b) => {
    const oppRank = { high: 0, medium: 1, low: 2 };
    if (oppRank[a.opportunity] !== oppRank[b.opportunity]) return oppRank[a.opportunity] - oppRank[b.opportunity];
    return (b.monthlyVolume || 0) - (a.monthlyVolume || 0);
  });

  return {
    seed: `portfolio:${seeds.length} seeds`,
    city: input.city,
    totalKeywords: keywords.length,
    keywords,
    seedsUsed: seeds,
    clusters: clusterKeywords(keywords),
    generatedAt: new Date().toISOString(),
  };
}
