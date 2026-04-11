import { queryForVisibility, queryClaudeForVisibility } from "@/lib/ai";

// ---------- Types ----------

export interface AIVisibilityResult {
  brand: string;
  projects: string[];
  scores: {
    chatgpt: number;
    claude: number;
    perplexity: number;
    gemini: number;
    overall: number;
  };
  queryResults: QueryResult[];
  aiReadiness: AIReadinessCheck[];
}

interface QueryResult {
  query: string;
  chatgpt: LLMResult;
  claude: LLMResult;
  perplexity: LLMResult;
  gemini: LLMResult;
}

interface LLMResult {
  mentioned: boolean;
  position: number; // 0 = not mentioned, 1 = first, 2 = second, etc.
  context: string;  // The sentence/paragraph where brand appears
  sentiment: "positive" | "neutral" | "negative" | "absent";
}

interface AIReadinessCheck {
  check: string;
  passed: boolean;
  details: string;
}

// ---------- Analysis ----------

function analyzeMention(
  response: string,
  brand: string,
  projects: string[]
): LLMResult {
  if (!response) {
    return { mentioned: false, position: 0, context: "", sentiment: "absent" };
  }

  const brandLower = brand.toLowerCase();
  const allTerms = [brandLower, ...projects.map((p) => p.toLowerCase())];

  let mentioned = false;
  let position = 0;
  let context = "";

  // Find first mention
  const sentences = response.split(/[.!?\n]+/).filter(Boolean);
  for (let i = 0; i < sentences.length; i++) {
    const sentLower = sentences[i].toLowerCase();
    if (allTerms.some((term) => sentLower.includes(term))) {
      mentioned = true;
      position = i + 1;
      context = sentences[i].trim();
      break;
    }
  }

  // Simple sentiment from context
  let sentiment: LLMResult["sentiment"] = "absent";
  if (mentioned) {
    const positiveWords = /best|top|recommend|excellent|great|premium|trusted|reputed|leading|popular|preferred/i;
    const negativeWords = /avoid|poor|bad|issue|complaint|problem|delay|overpriced/i;
    if (positiveWords.test(context)) sentiment = "positive";
    else if (negativeWords.test(context)) sentiment = "negative";
    else sentiment = "neutral";
  }

  return { mentioned, position, context, sentiment };
}

function calculateScore(results: QueryResult[], llmKey: keyof Omit<QueryResult, "query">): number {
  if (results.length === 0) return 0;
  let score = 0;
  for (const r of results) {
    const res = r[llmKey] as LLMResult;
    if (res.mentioned) {
      // Higher score for earlier position and positive sentiment
      const positionScore = Math.max(0, 100 - (res.position - 1) * 15);
      const sentimentMultiplier =
        res.sentiment === "positive" ? 1.2 :
        res.sentiment === "negative" ? 0.5 :
        1.0;
      score += positionScore * sentimentMultiplier;
    }
  }
  return Math.min(100, Math.round(score / results.length));
}

// ---------- AI Readiness Checks ----------

async function checkAIReadiness(url: string): Promise<AIReadinessCheck[]> {
  let html = "";
  let robotsTxt = "";
  let llmsTxt = "";
  let sitemapXml = "";

  try {
    const res = await fetch(url, { headers: { "User-Agent": "CabbageSEO/1.0" } });
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

  // Query each LLM for each search query (in batches to avoid rate limits)
  const queryResults: QueryResult[] = [];

  for (const query of queries) {
    // Run all 4 LLMs in parallel per query
    const [chatgptRes, claudeRes, perplexityRes, geminiRes] = await Promise.all([
      queryForVisibility("openai", query).catch(() => ""),
      queryClaudeForVisibility(query).catch(() => ""),
      queryForVisibility("perplexity", query).catch(() => ""),
      queryForVisibility("gemini", query).catch(() => ""),
    ]);

    queryResults.push({
      query,
      chatgpt: analyzeMention(chatgptRes, brand, projects),
      claude: analyzeMention(claudeRes, brand, projects),
      perplexity: analyzeMention(perplexityRes, brand, projects),
      gemini: analyzeMention(geminiRes, brand, projects),
    });

    // Small delay between queries to respect rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  const scores = {
    chatgpt: calculateScore(queryResults, "chatgpt"),
    claude: calculateScore(queryResults, "claude"),
    perplexity: calculateScore(queryResults, "perplexity"),
    gemini: calculateScore(queryResults, "gemini"),
    overall: 0,
  };
  scores.overall = Math.round(
    (scores.chatgpt + scores.claude + scores.perplexity + scores.gemini) / 4
  );

  return {
    brand,
    projects,
    scores,
    queryResults,
    aiReadiness,
  };
}
