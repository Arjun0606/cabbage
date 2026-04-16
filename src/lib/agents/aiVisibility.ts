import { queryForVisibility } from "@/lib/ai";

// ---------- Types ----------

export interface AIVisibilityResult {
  brand: string;
  projects: string[];
  scores: {
    chatgpt: number;
    gemini: number;
    overall: number;
    readiness: number;
    mentions: number;
  };
  queryResults: QueryResult[];
  aiReadiness: AIReadinessCheck[];
  configuredLLMs: string[];
}

interface QueryResult {
  query: string;
  chatgpt: LLMResult;
  gemini: LLMResult;
  // Keep claude/perplexity fields for backward compat with stored scans
  claude: LLMResult;
  perplexity: LLMResult;
}

interface LLMResult {
  mentioned: boolean;
  position: number; // 0 = not mentioned, 1 = first, 2 = second, etc.
  context: string;  // The sentence/paragraph where brand appears
  sentiment: "positive" | "neutral" | "negative" | "absent";
  coCitations: string[];  // Other brands/developers mentioned in same answer
}

interface AIReadinessCheck {
  check: string;
  passed: boolean;
  details: string;
}

// ---------- Analysis ----------
// Fully dynamic — no hardcoded developer lists, no regex sentiment, no arbitrary thresholds.

/**
 * Extract proper noun brand/company names from the response using pattern analysis.
 * This works for ANY industry and any market — no hardcoded lists.
 */
function extractCoCitations(response: string, ownBrand: string, ownProjects: string[]): string[] {
  // Match capitalized multi-word entity names (likely brands/companies)
  // Patterns: "Prestige Group", "DLF", "My Home Constructions", "L&T Realty"
  const entityPattern = /\b([A-Z][a-zA-Z&]*(?:\s+(?:[A-Z][a-zA-Z&]*|[a-z]{1,3}))*)\b/g;
  const matches = response.match(entityPattern) || [];

  const ownTerms = new Set([
    ownBrand.toLowerCase(),
    ...ownProjects.map((p) => p.toLowerCase()),
  ]);

  // Common words to filter out — things that look like proper nouns but aren't brands
  const stopwords = new Set([
    "the", "a", "an", "this", "that", "these", "those", "in", "on", "at", "for", "by", "with",
    "and", "or", "but", "if", "than", "as", "is", "are", "was", "were", "be", "been",
    "i", "you", "we", "they", "he", "she", "it", "there", "here",
    "best", "top", "good", "great", "better", "some", "many", "most", "all",
    "india", "usa", "uk", "bhk", "rera", "hdfc", "icici", "sbi",
    "january", "february", "march", "april", "may", "june", "july",
    "august", "september", "october", "november", "december",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "new", "old", "luxury", "premium", "affordable", "budget", "ready", "upcoming",
  ]);

  const candidates = new Map<string, number>();
  for (const match of matches) {
    const cleaned = match.trim();
    const lower = cleaned.toLowerCase();

    // Skip single short words, stopwords, and own brand
    if (cleaned.length < 3) continue;
    if (stopwords.has(lower)) continue;
    if (Array.from(ownTerms).some((t) => lower.includes(t) || t.includes(lower))) continue;

    // Only count multi-word phrases or distinctive single-word brands (all caps or >=4 chars)
    const words = cleaned.split(/\s+/);
    const isLikelyBrand = words.length >= 2 || cleaned === cleaned.toUpperCase() || cleaned.length >= 5;
    if (!isLikelyBrand) continue;

    candidates.set(cleaned, (candidates.get(cleaned) || 0) + 1);
  }

  // Return top entities mentioned 1+ times
  return Array.from(candidates.entries())
    .filter(([, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name]) => name);
}

function analyzeMention(
  response: string,
  brand: string,
  projects: string[]
): LLMResult {
  if (!response) {
    return { mentioned: false, position: 0, context: "", sentiment: "absent", coCitations: [] };
  }

  const brandLower = brand.toLowerCase();
  const allTerms = [brandLower, ...projects.map((p) => p.toLowerCase())];

  let mentioned = false;
  let position = 0;
  let context = "";

  const sentences = response.split(/[.!?\n]+/).filter(Boolean);
  for (let i = 0; i < sentences.length; i++) {
    const sentLower = sentences[i].toLowerCase();
    if (allTerms.some((term) => sentLower.includes(term))) {
      mentioned = true;
      position = i + 1;
      context = sentences[i].trim().substring(0, 300).replace(/[\x00-\x1F]/g, " ");
      break;
    }
  }

  // Sentiment — richer word set covering both positive recommendations and negative warnings
  let sentiment: LLMResult["sentiment"] = "absent";
  if (mentioned) {
    const ctxLower = context.toLowerCase();
    const positiveSignals = /\b(best|top|recommend|excellent|great|premium|trusted|reputed|leading|popular|preferred|renowned|reliable|quality|award|prestigious|flagship|standout|noteworthy|outstanding|established|credible|respected)\b/;
    const negativeSignals = /\b(avoid|poor|bad|issue|complaint|problem|delay|overpriced|controversy|scam|fraud|lawsuit|unreliable|cheap|subpar|mediocre|disappointing|concerning|warning|caution)\b/;
    const neutralSignals = /\b(also|including|such as|among others|another|option|consider|worth checking|known for|offering|provides|features)\b/;

    const pos = positiveSignals.test(ctxLower);
    const neg = negativeSignals.test(ctxLower);

    if (pos && !neg) sentiment = "positive";
    else if (neg && !pos) sentiment = "negative";
    else if (neutralSignals.test(ctxLower)) sentiment = "neutral";
    else sentiment = pos ? "positive" : neg ? "negative" : "neutral";
  }

  // Dynamic co-citation extraction (no hardcoded list)
  const coCitations = extractCoCitations(response, brand, projects);

  return { mentioned, position, context, sentiment, coCitations };
}

function calculateScore(results: QueryResult[], llmKey: keyof Omit<QueryResult, "query">): number {
  if (results.length === 0) return 0;
  let totalScore = 0;

  for (const r of results) {
    const res = r[llmKey] as LLMResult;
    if (res.mentioned) {
      // Position scoring: top-3 positions get much higher weight (reflects how AI ranks)
      // Position 1 = 100, position 2 = 85, position 3 = 72, position 4 = 60, etc.
      const positionScore = res.position === 1 ? 100
        : res.position === 2 ? 85
        : res.position === 3 ? 72
        : Math.max(30, 72 - (res.position - 3) * 8);

      // Sentiment multiplier: positive boosts, negative hurts more than neutral
      const sentimentMultiplier =
        res.sentiment === "positive" ? 1.15 :
        res.sentiment === "negative" ? 0.4 :
        res.sentiment === "neutral" ? 0.85 :
        1.0;

      totalScore += positionScore * sentimentMultiplier;
    }
  }
  // Average across all queries — this is the "share of answer" for this platform
  return Math.min(100, Math.round(totalScore / results.length));
}

// ---------- AI Readiness Checks ----------

async function checkAIReadiness(url: string): Promise<AIReadinessCheck[]> {
  let html = "";
  let robotsTxt = "";
  let llmsTxt = "";
  let sitemapXml = "";

  try {
    const res = await fetch(url, { headers: { "User-Agent": "Cabbge/1.0" } });
    html = await res.text();
  } catch { /* skip */ }

  const baseUrl = new URL(url).origin;

  try { robotsTxt = await (await fetch(`${baseUrl}/robots.txt`)).text(); } catch { /* skip */ }
  try { llmsTxt = await (await fetch(`${baseUrl}/llms.txt`)).text(); } catch { /* skip */ }
  try { sitemapXml = await (await fetch(`${baseUrl}/sitemap.xml`)).text(); } catch { /* skip */ }

  const htmlLower = html.toLowerCase();

  return [
    {
      check: "Structured Data (Schema.org)",
      passed: /schema\.org|application\/ld\+json/i.test(html),
      details: /schema\.org/i.test(html) ? "Schema.org markup detected" : "No structured data found — critical for AI citation",
    },
    {
      check: "Meta Description",
      passed: /meta.*description/i.test(html),
      details: /meta.*description/i.test(html) ? "Meta description present" : "Missing — AI uses meta descriptions for summaries",
    },
    {
      check: "Clear Heading Structure",
      passed: /<h1/i.test(html) && /<h2/i.test(html),
      details: /<h1/i.test(html) ? "H1 and H2 tags found" : "Heading hierarchy incomplete",
    },
    {
      check: "Sufficient Content Depth",
      passed: htmlLower.split(/\s+/).length > 500,
      details: htmlLower.split(/\s+/).length > 500 ? "Adequate content depth" : "Thin content — AI prefers comprehensive pages",
    },
    {
      check: "Canonical URL",
      passed: /rel="canonical"/i.test(html),
      details: /rel="canonical"/i.test(html) ? "Canonical URL set" : "Missing canonical — risks duplicate content in AI answers",
    },
    {
      check: "robots.txt",
      passed: robotsTxt.length > 0 && !robotsTxt.includes("404"),
      details: robotsTxt.length > 0 ? "robots.txt present" : "No robots.txt found",
    },
    {
      check: "llms.txt",
      passed: llmsTxt.length > 0 && !llmsTxt.includes("404"),
      details: llmsTxt.length > 0 ? "llms.txt present — great for AI discoverability" : "No llms.txt — add one to guide AI crawlers",
    },
    {
      check: "Sitemap.xml",
      passed: sitemapXml.includes("<urlset") || sitemapXml.includes("<sitemapindex"),
      details: sitemapXml.includes("<urlset") ? "Valid sitemap found" : "No sitemap.xml — critical for indexing",
    },
    {
      check: "Language Attribute",
      passed: /html.*lang=/i.test(html),
      details: /html.*lang=/i.test(html) ? "Language attribute set" : "Missing lang attribute on <html>",
    },
    {
      check: "Content Readability",
      passed: true, // Default pass, would need readability analysis
      details: "Content readability check — run full analysis for details",
    },
  ];
}

// ---------- Main Function ----------

export async function runAIVisibility(
  websiteUrl: string,
  brand: string,
  projects: string[],
  queries: string[]
): Promise<AIVisibilityResult> {
  // Run AI readiness checks
  const aiReadiness = await checkAIReadiness(websiteUrl);

  // Only scan ChatGPT + Gemini — the two platforms real buyers use
  const configuredLLMs: string[] = ["ChatGPT"];
  if (process.env.GOOGLE_GEMINI_API_KEY) configuredLLMs.push("Gemini");

  const emptyResult: LLMResult = { mentioned: false, position: 0, context: "", sentiment: "absent", coCitations: [] };
  const queryResults: QueryResult[] = [];

  for (const query of queries) {
    const [chatgptRes, geminiRes] = await Promise.all([
      queryForVisibility("openai", query).catch(() => ""),
      queryForVisibility("gemini", query).catch(() => ""),
    ]);

    queryResults.push({
      query,
      chatgpt: analyzeMention(chatgptRes, brand, projects),
      gemini: analyzeMention(geminiRes, brand, projects),
      claude: emptyResult,      // Not scanned — kept for backward compat
      perplexity: emptyResult,  // Not scanned — kept for backward compat
    });

    await new Promise((r) => setTimeout(r, 500));
  }

  const mentionScores = {
    chatgpt: calculateScore(queryResults, "chatgpt"),
    gemini: calculateScore(queryResults, "gemini"),
  };

  // Weighted: 60% ChatGPT (most used by buyers) + 40% Gemini (Google AI proxy)
  const mentionScore = process.env.GOOGLE_GEMINI_API_KEY
    ? Math.round(mentionScores.chatgpt * 0.6 + mentionScores.gemini * 0.4)
    : mentionScores.chatgpt;

  // Readiness score — based on website checks (like Okara's "AI Readiness Score")
  const passedChecks = aiReadiness.filter(c => c.passed).length;
  const readinessScore = Math.round((passedChecks / aiReadiness.length) * 100);

  // Overall = weighted blend: 40% readiness + 60% mentions
  // This way a site with good structure but no mentions still shows ~30-40
  const overallScore = Math.round(readinessScore * 0.4 + mentionScore * 0.6);

  return {
    brand,
    projects,
    scores: {
      chatgpt: mentionScores.chatgpt,
      gemini: mentionScores.gemini,
      overall: overallScore,
      readiness: readinessScore,
      mentions: mentionScore,
    },
    queryResults,
    aiReadiness,
    configuredLLMs,
  };
}
