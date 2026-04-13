import { NextRequest, NextResponse } from "next/server";
import { sanitizeUrl } from "@/lib/security";

// ---------- Types ----------

interface CrawlerResult {
  crawler: string;
  tier: number;
  status: "allowed" | "blocked" | "not_mentioned";
  rule: string | null;
}

interface AiFileCheck {
  exists: boolean;
  size?: number;
}

interface CrawlerAccessResult {
  url: string;
  robotsTxtFound: boolean;
  robotsTxtContent: string;
  crawlerAccess: CrawlerResult[];
  metaRobotsIssues: string[];
  aiFiles: {
    llmsTxt: AiFileCheck;
    aiTxt: AiFileCheck;
    aiPlugin: AiFileCheck;
    sitemapXml: AiFileCheck;
  };
  score: number;
  criticalIssues: string[];
  recommendations: string[];
}

// ---------- Crawler definitions ----------

const AI_CRAWLERS: { name: string; tier: number; owner: string }[] = [
  // Tier 1 — blocking these kills AI visibility
  { name: "GPTBot", tier: 1, owner: "OpenAI/ChatGPT" },
  { name: "OAI-SearchBot", tier: 1, owner: "OpenAI/ChatGPT" },
  { name: "ChatGPT-User", tier: 1, owner: "OpenAI/ChatGPT" },
  { name: "ClaudeBot", tier: 1, owner: "Anthropic/Claude" },
  { name: "PerplexityBot", tier: 1, owner: "Perplexity" },
  { name: "Google-Extended", tier: 1, owner: "Google AI/Gemini" },
  // Tier 2 — important
  { name: "Amazonbot", tier: 2, owner: "Amazon" },
  { name: "FacebookBot", tier: 2, owner: "Meta" },
  { name: "Applebot-Extended", tier: 2, owner: "Apple" },
  // Tier 3 — training only
  { name: "CCBot", tier: 3, owner: "Common Crawl" },
  { name: "anthropic-ai", tier: 3, owner: "Anthropic (training)" },
  { name: "Bytespider", tier: 3, owner: "ByteDance" },
  { name: "cohere-ai", tier: 3, owner: "Cohere" },
];

// ---------- Helpers ----------

/**
 * Parse robots.txt and check if a specific user-agent is blocked.
 * Returns { blocked, rule } where rule is the matching Disallow line.
 */
function checkRobotsTxt(
  robotsTxt: string,
  userAgent: string
): { blocked: boolean; rule: string | null } {
  const lines = robotsTxt.split("\n").map((l) => l.trim());
  const uaLower = userAgent.toLowerCase();

  let inMatchingBlock = false;
  let inWildcardBlock = false;
  let specificResult: { blocked: boolean; rule: string | null } | null = null;
  let wildcardResult: { blocked: boolean; rule: string | null } | null = null;

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.startsWith("#") || line === "") {
      // An empty line ends the current block
      if (line === "") {
        inMatchingBlock = false;
        inWildcardBlock = false;
      }
      continue;
    }

    const lowerLine = line.toLowerCase();

    if (lowerLine.startsWith("user-agent:")) {
      const agent = lowerLine.replace("user-agent:", "").trim();
      if (agent === uaLower) {
        inMatchingBlock = true;
        inWildcardBlock = false;
      } else if (agent === "*") {
        inWildcardBlock = true;
        inMatchingBlock = false;
      } else {
        inMatchingBlock = false;
        inWildcardBlock = false;
      }
      continue;
    }

    if (lowerLine.startsWith("disallow:")) {
      const path = lowerLine.replace("disallow:", "").trim();
      if (path === "/" || path === "/*") {
        if (inMatchingBlock) {
          specificResult = { blocked: true, rule: line };
        } else if (inWildcardBlock && !wildcardResult) {
          wildcardResult = { blocked: true, rule: line };
        }
      }
    }

    if (lowerLine.startsWith("allow:")) {
      const path = lowerLine.replace("allow:", "").trim();
      if (path === "/" || path === "/*" || path === "") {
        if (inMatchingBlock) {
          specificResult = { blocked: false, rule: line };
        }
      }
    }
  }

  // Specific user-agent rules take priority over wildcard
  if (specificResult) return specificResult;
  if (wildcardResult) return wildcardResult;
  return { blocked: false, rule: null };
}

/**
 * Safely fetch a URL with timeout, returning the response or null.
 */
async function safeFetch(
  url: string,
  options?: { timeout?: number }
): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options?.timeout ?? 8000
    );
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    clearTimeout(timeout);
    return res;
  } catch {
    return null;
  }
}

// ---------- Route Handler ----------

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const { valid, url: safeUrl, error } = sanitizeUrl(url);
    if (!valid) return NextResponse.json({ error }, { status: 400 });

    const origin = new URL(safeUrl).origin;

    // Run all fetches in parallel
    const [robotsRes, homepageRes, llmsRes, aiTxtRes, aiPluginRes, sitemapRes] =
      await Promise.all([
        safeFetch(`${origin}/robots.txt`),
        safeFetch(origin, { timeout: 10000 }),
        safeFetch(`${origin}/llms.txt`),
        safeFetch(`${origin}/ai.txt`),
        safeFetch(`${origin}/.well-known/ai-plugin.json`),
        safeFetch(`${origin}/sitemap.xml`),
      ]);

    // ---------- Parse robots.txt ----------

    const robotsTxtFound = robotsRes !== null && robotsRes.ok;
    const robotsTxtContent = robotsTxtFound
      ? await robotsRes!.text()
      : "";

    const crawlerAccess: CrawlerResult[] = AI_CRAWLERS.map((crawler) => {
      if (!robotsTxtFound) {
        return {
          crawler: crawler.name,
          tier: crawler.tier,
          status: "not_mentioned" as const,
          rule: null,
        };
      }
      const { blocked, rule } = checkRobotsTxt(robotsTxtContent, crawler.name);
      if (rule === null) {
        return {
          crawler: crawler.name,
          tier: crawler.tier,
          status: "not_mentioned" as const,
          rule: null,
        };
      }
      return {
        crawler: crawler.name,
        tier: crawler.tier,
        status: blocked ? ("blocked" as const) : ("allowed" as const),
        rule,
      };
    });

    // ---------- Check meta robots tags ----------

    const metaRobotsIssues: string[] = [];
    let homepageHtml = "";

    if (homepageRes && homepageRes.ok) {
      // Check X-Robots-Tag header
      const xRobotsTag = homepageRes.headers.get("x-robots-tag") || "";
      if (xRobotsTag.toLowerCase().includes("noai")) {
        metaRobotsIssues.push(
          `X-Robots-Tag header contains "noai" — AI crawlers are instructed not to use this content`
        );
      }
      if (xRobotsTag.toLowerCase().includes("noimageai")) {
        metaRobotsIssues.push(
          `X-Robots-Tag header contains "noimageai" — AI systems cannot use images from this site`
        );
      }

      homepageHtml = await homepageRes.text();

      // Check meta robots tags in HTML
      const metaNoai = homepageHtml.match(
        /<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noai[^"']*["'][^>]*>/i
      );
      if (metaNoai) {
        metaRobotsIssues.push(
          `Found <meta name="robots" content="noai"> — AI systems are instructed not to use this content`
        );
      }

      const metaNoImageAi = homepageHtml.match(
        /<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noimageai[^"']*["'][^>]*>/i
      );
      if (metaNoImageAi) {
        metaRobotsIssues.push(
          `Found <meta name="robots" content="noimageai"> — AI systems cannot use images from this site`
        );
      }
    }

    // ---------- Check AI-specific files ----------

    const llmsTxtExists = llmsRes !== null && llmsRes.ok;
    const llmsTxtSize = llmsTxtExists
      ? parseInt(llmsRes!.headers.get("content-length") || "0", 10) ||
        (await llmsRes!.text()).length
      : 0;

    const aiTxtExists = aiTxtRes !== null && aiTxtRes.ok;
    const aiPluginExists = aiPluginRes !== null && aiPluginRes.ok;
    const sitemapExists = sitemapRes !== null && sitemapRes.ok;
    const sitemapSize = sitemapExists
      ? parseInt(sitemapRes!.headers.get("content-length") || "0", 10) || 0
      : 0;

    const aiFiles = {
      llmsTxt: { exists: llmsTxtExists, size: llmsTxtSize },
      aiTxt: { exists: aiTxtExists },
      aiPlugin: { exists: aiPluginExists },
      sitemapXml: { exists: sitemapExists, size: sitemapSize },
    };

    // ---------- Score calculation ----------

    let score = 100;
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];

    // Tier 1 blocked: -15 each
    for (const c of crawlerAccess) {
      if (c.status === "blocked" && c.tier === 1) {
        score -= 15;
        const owner = AI_CRAWLERS.find((cr) => cr.name === c.crawler)?.owner || "";
        criticalIssues.push(
          `${c.crawler} is blocked — your site will NEVER appear in ${owner} answers`
        );
        recommendations.push(
          `Remove the Disallow rule for ${c.crawler} in robots.txt, or add "Allow: /" for ${c.crawler}`
        );
      }
    }

    // Tier 2 blocked: -5 each
    for (const c of crawlerAccess) {
      if (c.status === "blocked" && c.tier === 2) {
        score -= 5;
        recommendations.push(
          `Consider allowing ${c.crawler} in robots.txt for broader AI visibility`
        );
      }
    }

    // No llms.txt: -10
    if (!llmsTxtExists) {
      score -= 10;
      recommendations.push(
        `Create an /llms.txt file — this helps AI models understand your site structure and content`
      );
    }

    // No sitemap.xml: -10
    if (!sitemapExists) {
      score -= 10;
      recommendations.push(
        `Add a /sitemap.xml — AI crawlers use sitemaps to discover your content efficiently`
      );
    }

    // Meta noai tag: -20
    if (metaRobotsIssues.length > 0) {
      score -= 20;
      criticalIssues.push(
        `Meta robots tags are blocking AI systems from using your content`
      );
      recommendations.push(
        `Remove "noai" and "noimageai" directives from meta robots tags and X-Robots-Tag headers`
      );
    }

    score = Math.max(0, score);

    const result: CrawlerAccessResult = {
      url: safeUrl,
      robotsTxtFound,
      robotsTxtContent: robotsTxtContent.substring(0, 5000), // Cap at 5KB
      crawlerAccess,
      metaRobotsIssues,
      aiFiles,
      score,
      criticalIssues,
      recommendations,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Crawler access check error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Crawler access check failed",
      },
      { status: 500 }
    );
  }
}
