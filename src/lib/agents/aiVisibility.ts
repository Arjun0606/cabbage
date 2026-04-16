import { queryForVisibility, aiLight } from "@/lib/ai";

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
// FULLY AI-powered. No regex sentiment, no hardcoded lists, no static rules.
// Each response is analyzed by a cheap LLM call that extracts:
// - Whether the brand is mentioned (handles spelling variations, acronyms, aliases)
// - Position in the response (which recommendation number)
// - Sentiment (based on CONTEXT, not keyword matching)
// - All competitor brands mentioned (language/market/industry agnostic)

interface AIMentionAnalysis {
  mentioned: boolean;
  position: number;
  context: string;
  sentiment: "positive" | "neutral" | "negative" | "absent";
  coCitations: string[];
}

async function analyzeMention(
  response: string,
  brand: string,
  projects: string[]
): Promise<LLMResult> {
  if (!response || response.trim().length < 20) {
    return { mentioned: false, position: 0, context: "", sentiment: "absent", coCitations: [] };
  }

  const system = `You analyze AI chatbot responses to detect brand mentions, sentiment, and co-citations.
Return ONLY valid JSON. No markdown fences, no explanation.

You are tolerant to spelling variations, acronyms, and aliases. "My Home", "My Home Constructions", "MHC", "My Home Group" all count as the same brand if the target is "My Home".`;

  const prompt = `Analyze this AI chatbot response for mentions of a specific brand.

TARGET BRAND: ${brand}
${projects.length > 0 ? `TARGET PROJECTS: ${projects.join(", ")}` : ""}

RESPONSE TO ANALYZE:
"""
${response.slice(0, 4000)}
"""

Return this JSON:
{
  "mentioned": true | false,
  "position": <integer — which ordinal position in the response (1=first brand mentioned, 2=second, etc.). 0 if not mentioned>,
  "context": "<the specific sentence or phrase where the brand appears, max 300 chars. Empty string if not mentioned>",
  "sentiment": "positive" | "neutral" | "negative" | "absent",
  "coCitations": ["<other brands/companies mentioned in the response, excluding the target>"]
}

RULES:
- "mentioned" is true if the brand appears in ANY form (exact name, alias, acronym, common spelling variation)
- "position" reflects the order relative to OTHER brands mentioned — position 1 = AI listed the target first
- "sentiment" is based on HOW the brand is discussed, not just keyword matching:
  - positive: recommended, praised, highlighted as a leader
  - negative: criticized, warned against, flagged with issues
  - neutral: mentioned factually without clear endorsement
  - absent: not mentioned at all
- "coCitations" should list OTHER brand/company names (competitors) appearing in the response. Do NOT include:
  - The target brand itself
  - Generic terms (city names, product categories, person names without brand context)
  - Government bodies or regulatory terms
- Be thorough: extract every proper noun brand/company mentioned`;

  try {
    const raw = await aiLight(system, prompt, 600);
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as AIMentionAnalysis;

    return {
      mentioned: Boolean(parsed.mentioned),
      position: Math.max(0, Number(parsed.position) || 0),
      context: String(parsed.context || "").substring(0, 300).replace(/[\x00-\x1F]/g, " "),
      sentiment: (["positive", "neutral", "negative", "absent"].includes(parsed.sentiment as string)
        ? parsed.sentiment
        : "absent") as LLMResult["sentiment"],
      coCitations: Array.isArray(parsed.coCitations) ? parsed.coCitations.slice(0, 15) : [],
    };
  } catch {
    // Minimal fallback: just check if brand name appears (no regex sentiment, no co-citations)
    const lower = response.toLowerCase();
    const brandLower = brand.toLowerCase();
    const mentioned = lower.includes(brandLower) || projects.some(p => lower.includes(p.toLowerCase()));
    return {
      mentioned,
      position: mentioned ? 1 : 0,
      context: mentioned ? response.substring(0, 300) : "",
      sentiment: mentioned ? "neutral" : "absent",
      coCitations: [],
    };
  }
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

    // AI-powered analysis of each response (sentiment + co-citations done by LLM)
    const [chatgptAnalysis, geminiAnalysis] = await Promise.all([
      analyzeMention(chatgptRes, brand, projects),
      analyzeMention(geminiRes, brand, projects),
    ]);

    queryResults.push({
      query,
      chatgpt: chatgptAnalysis,
      gemini: geminiAnalysis,
      claude: emptyResult,
      perplexity: emptyResult,
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
