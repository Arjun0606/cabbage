import { queryForVisibility, aiLight, type VisibilitySource } from "@/lib/ai";
import type { QueryWithMeta } from "@/lib/agents/localityEngine";

// ---------- Types ----------

/**
 * Health summary for a single platform across all queries in this scan.
 * "live"     = real web/grounded search returned results for ≥1 query.
 * "degraded" = fallback path (no web search) returned results — scores will be unreliable.
 * "broken"   = every query failed or returned empty. Scores are meaningless.
 */
export type PlatformStatus = "live" | "degraded" | "broken";

export interface PlatformHealth {
  status: PlatformStatus;
  liveQueries: number;
  fallbackQueries: number;
  failedQueries: number;
  lastError?: string;
}

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
  platformHealth: {
    chatgpt: PlatformHealth;
    gemini: PlatformHealth;
  };
}

interface QueryResult {
  query: string;
  // Metadata propagated from the query generator so downstream UI can
  // segment by city / config / price tier without re-classifying anything.
  level: "locality" | "city" | "country";
  city?: string;
  config?: string;
  priceTier?: string;
  intent?: QueryWithMeta["intent"];
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
  citationSources: Array<{ url: string; type: "own_site" | "competitor" | "portal" | "ugc" | "news" | "government" | "unknown" }>;
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
  citationSources: Array<{ url: string; type: string }>;
}

async function analyzeMention(
  response: string,
  brand: string,
  projects: string[]
): Promise<LLMResult> {
  if (!response || response.trim().length < 20) {
    return { mentioned: false, position: 0, context: "", sentiment: "absent", coCitations: [], citationSources: [] };
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
  "coCitations": ["<other brands/companies mentioned in the response, excluding the target>"],
  "citationSources": [{"url": "<source URL if visible in the response>", "type": "own_site|competitor|portal|ugc|news|government|unknown"}]
}

RULES FOR citationSources:
- Extract any URLs or source references mentioned in the AI response
- Classify each: 99acres/MagicBricks/Housing.com = "portal", Reddit/Quora = "ugc", news sites = "news", rera.gov.in = "government", the target brand's site = "own_site", other builder sites = "competitor"
- If no URLs are visible, return empty array
- Max 10 sources

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
      citationSources: Array.isArray(parsed.citationSources)
        ? parsed.citationSources.slice(0, 10).map((s: any) => ({
            url: String(s.url || ""),
            type: (["own_site", "competitor", "portal", "ugc", "news", "government", "unknown"].includes(s.type) ? s.type : "unknown") as LLMResult["citationSources"][number]["type"],
          }))
        : [],
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
      citationSources: [],
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
  let robotsOk = false;
  let llmsOk = false;
  let sitemapOk = false;

  try {
    const res = await fetch(url, { headers: { "User-Agent": "Cabbge/1.0" } });
    if (res.ok) html = await res.text();
    else console.error(`AI readiness: main page fetch failed (${res.status}) ${url}`);
  } catch (err) {
    console.error(`AI readiness: main page fetch error for ${url}:`, err instanceof Error ? err.message : err);
  }

  const baseUrl = new URL(url).origin;

  // robots.txt — strict validation (HTTP 200 + text content-type + valid directives)
  try {
    const res = await fetch(`${baseUrl}/robots.txt`, { headers: { "User-Agent": "Cabbge/1.0" } });
    if (res.ok && res.headers.get("content-type")?.includes("text")) {
      robotsTxt = await res.text();
      robotsOk = /^\s*(user-agent|disallow|allow|sitemap)\s*:/im.test(robotsTxt);
    }
  } catch (err) {
    console.error(`AI readiness: robots.txt fetch error:`, err instanceof Error ? err.message : err);
  }

  // llms.txt — strict validation (HTTP 200 + text/plain or text/markdown + markdown structure)
  try {
    const res = await fetch(`${baseUrl}/llms.txt`, { headers: { "User-Agent": "Cabbge/1.0" } });
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/plain") || contentType.includes("text/markdown")) {
        llmsTxt = await res.text();
        llmsOk = /^#\s+/m.test(llmsTxt) && llmsTxt.length > 100;
      }
    }
  } catch (err) {
    console.error(`AI readiness: llms.txt fetch error:`, err instanceof Error ? err.message : err);
  }

  // sitemap.xml — strict validation (HTTP 200 + xml content-type + XML structure)
  try {
    const res = await fetch(`${baseUrl}/sitemap.xml`, { headers: { "User-Agent": "Cabbge/1.0" } });
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("xml")) {
        sitemapXml = await res.text();
        sitemapOk = /^\s*<\?xml/.test(sitemapXml) && (sitemapXml.includes("<urlset") || sitemapXml.includes("<sitemapindex"));
      }
    }
  } catch (err) {
    console.error(`AI readiness: sitemap.xml fetch error:`, err instanceof Error ? err.message : err);
  }

  // Parse HTML meta description content (not just presence)
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const metaDescContent = metaDescMatch?.[1]?.trim() || "";
  const metaDescValid = metaDescContent.length >= 50 && metaDescContent.length <= 160;

  // Parse schema JSON-LD — must actually parse as valid JSON
  const schemaMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  let hasValidSchema = false;
  let schemaTypes: string[] = [];
  for (const m of schemaMatches) {
    try {
      const jsonText = m.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
      const parsed = JSON.parse(jsonText);
      if (parsed["@type"] || parsed["@graph"]) {
        hasValidSchema = true;
        if (parsed["@type"]) schemaTypes.push(parsed["@type"]);
      }
    } catch { /* invalid JSON, skip */ }
  }

  // Heading structure — count actual h1/h2 tags
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  const h2Count = (html.match(/<h2[\s>]/gi) || []).length;
  const headingsValid = h1Count === 1 && h2Count >= 2;

  // Content depth — strip HTML and count real words
  const visibleText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = visibleText.split(/\s+/).filter(w => w.length > 1).length;
  const contentDepthValid = wordCount >= 500;

  // Canonical URL — must have valid href
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  const canonicalValid = !!canonicalMatch && canonicalMatch[1].startsWith("http");

  // Language attribute on html tag
  const langMatch = html.match(/<html[^>]*\slang=["']([a-z-]+)["']/i);
  const langValid = !!langMatch;

  // Content readability — quick check for long-sentence issues + passage structure
  const paragraphs = visibleText.split(/\n\n|\. {2,}/);
  const shortParagraphs = paragraphs.filter(p => p.split(/\s+/).length < 250).length;
  const readabilityValid = wordCount > 200 && shortParagraphs / Math.max(paragraphs.length, 1) > 0.6;

  return [
    {
      check: "Structured Data (Schema.org)",
      passed: hasValidSchema,
      details: hasValidSchema
        ? `Valid JSON-LD found${schemaTypes.length > 0 ? ` (${schemaTypes.slice(0, 3).join(", ")})` : ""}`
        : "No valid JSON-LD schema — critical for AI citation. AI models use schema.org to understand page context.",
    },
    {
      check: "Meta Description",
      passed: metaDescValid,
      details: metaDescValid
        ? `Present and well-sized (${metaDescContent.length} chars)`
        : metaDescContent.length === 0
          ? "Missing meta description — AI uses this for summaries"
          : metaDescContent.length < 50
            ? `Too short (${metaDescContent.length} chars, need ≥50)`
            : `Too long (${metaDescContent.length} chars, max 160)`,
    },
    {
      check: "Clear Heading Structure",
      passed: headingsValid,
      details: headingsValid
        ? `1 H1 and ${h2Count} H2 tags found — good structure`
        : h1Count === 0
          ? "No H1 tag — AI can't identify primary topic"
          : h1Count > 1
            ? `${h1Count} H1 tags — should be exactly 1`
            : `Only ${h2Count} H2 tags — need ≥2 for topic structure`,
    },
    {
      check: "Sufficient Content Depth",
      passed: contentDepthValid,
      details: contentDepthValid
        ? `${wordCount} words of visible content`
        : `Only ${wordCount} visible words — AI prefers comprehensive pages (≥500 words)`,
    },
    {
      check: "Canonical URL",
      passed: canonicalValid,
      details: canonicalValid
        ? "Canonical URL properly set"
        : "Missing canonical — risks duplicate content issues in AI answers",
    },
    {
      check: "robots.txt",
      passed: robotsOk,
      details: robotsOk
        ? "Valid robots.txt with directives"
        : "No valid robots.txt — AI crawlers may be blocked or unsure what to index",
    },
    {
      check: "llms.txt",
      passed: llmsOk,
      details: llmsOk
        ? `Valid llms.txt with proper structure (${llmsTxt.length} chars)`
        : "No valid llms.txt — add one to explicitly guide AI crawlers",
    },
    {
      check: "Sitemap.xml",
      passed: sitemapOk,
      details: sitemapOk
        ? "Valid XML sitemap present"
        : "No valid sitemap.xml — critical for AI models to discover all pages",
    },
    {
      check: "Language Attribute",
      passed: langValid,
      details: langValid
        ? `<html lang="${langMatch![1]}"> set correctly`
        : "Missing lang attribute — AI needs it to understand your target audience",
    },
    {
      check: "Content Readability",
      passed: readabilityValid,
      details: readabilityValid
        ? `Readable passage structure (${paragraphs.length} paragraphs, most concise)`
        : wordCount < 200
          ? "Not enough content to analyze readability"
          : "Paragraphs too long — AI struggles to extract citeable passages. Break into chunks of ~134-167 words.",
    },
  ];
}

// ---------- Main Function ----------

export async function runAIVisibility(
  websiteUrl: string,
  brand: string,
  projects: string[],
  queries: QueryWithMeta[]
): Promise<AIVisibilityResult> {
  // Run AI readiness checks
  const aiReadiness = await checkAIReadiness(websiteUrl);

  // Only scan ChatGPT + Gemini — the two platforms real buyers use
  const configuredLLMs: string[] = ["ChatGPT"];
  if (process.env.GOOGLE_GEMINI_API_KEY) configuredLLMs.push("Gemini");

  const emptyResult: LLMResult = { mentioned: false, position: 0, context: "", sentiment: "absent", coCitations: [], citationSources: [] };
  const queryResults: QueryResult[] = [];

  // Track per-platform health so we can tell live vs degraded vs broken in the UI.
  const chatgptSources: VisibilitySource[] = [];
  const geminiSources: VisibilitySource[] = [];
  let chatgptLastError: string | undefined;
  let geminiLastError: string | undefined;

  for (const qm of queries) {
    const [chatgptRes, geminiRes] = await Promise.all([
      queryForVisibility("openai", qm.query).catch((err): { text: string; source: VisibilitySource; error?: string } => ({
        text: "",
        source: "failed",
        error: err instanceof Error ? err.message : String(err),
      })),
      queryForVisibility("gemini", qm.query).catch((err): { text: string; source: VisibilitySource; error?: string } => ({
        text: "",
        source: "failed",
        error: err instanceof Error ? err.message : String(err),
      })),
    ]);

    chatgptSources.push(chatgptRes.source);
    geminiSources.push(geminiRes.source);
    if (chatgptRes.error) chatgptLastError = chatgptRes.error;
    if (geminiRes.error) geminiLastError = geminiRes.error;

    // AI-powered analysis of each response (sentiment + co-citations done by LLM)
    const [chatgptAnalysis, geminiAnalysis] = await Promise.all([
      analyzeMention(chatgptRes.text, brand, projects),
      analyzeMention(geminiRes.text, brand, projects),
    ]);

    queryResults.push({
      query: qm.query,
      level: qm.level,
      city: qm.city,
      config: qm.config,
      priceTier: qm.priceTier,
      intent: qm.intent,
      chatgpt: chatgptAnalysis,
      gemini: geminiAnalysis,
      claude: emptyResult,
      perplexity: emptyResult,
    });

    await new Promise((r) => setTimeout(r, 500));
  }

  const summarize = (sources: VisibilitySource[], lastError?: string): PlatformHealth => {
    const liveQueries = sources.filter((s) => s === "web_search" || s === "grounded").length;
    const fallbackQueries = sources.filter((s) => s === "fallback_chat" || s === "ungrounded").length;
    const failedQueries = sources.filter((s) => s === "failed" || s === "missing_key").length;
    const status: PlatformStatus =
      liveQueries > 0 ? "live" :
      fallbackQueries > 0 ? "degraded" :
      "broken";
    return { status, liveQueries, fallbackQueries, failedQueries, lastError };
  };
  const platformHealth = {
    chatgpt: summarize(chatgptSources, chatgptLastError),
    gemini: summarize(geminiSources, geminiLastError),
  };

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
    platformHealth,
  };
}
