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
}

export interface KeywordResearchResult {
  seed: string;
  city?: string;
  totalKeywords: number;
  keywords: KeywordResult[];
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
 * Expand a seed keyword into variants. Uses AI to generate related
 * queries covering different buyer intents.
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

  try {
    const text = await aiLight("Return JSON array of search queries. No other text.", prompt, 1000);
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) {
        return parsed.filter((s: unknown) => typeof s === "string").slice(0, 20);
      }
    }
  } catch (err) {
    console.error("keywordResearch: expansion failed:", err instanceof Error ? err.message : err);
  }
  return [seed];
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

  return result;
}

/**
 * Derive an opportunity score: high volume + low difficulty = best.
 */
function calculateOpportunity(volume: number | null, difficulty: number | null): "high" | "medium" | "low" {
  if (volume === null || difficulty === null) return "low";
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
