import Anthropic from "@anthropic-ai/sdk";

// ---------- Types ----------

export interface CompetitorAnalysisResult {
  competitor: { name: string; website: string };
  snapshot: CompetitorSnapshot;
  insights: CompetitorInsight[];
}

interface CompetitorSnapshot {
  title: string;
  description: string;
  projectCount: number;
  projects: CompetitorProject[];
  seoSignals: {
    hasHttps: boolean;
    hasSitemap: boolean;
    hasSchema: boolean;
    hasRobotsTxt: boolean;
    metaTitle: string;
    metaDescription: string;
    h1Count: number;
    wordCount: number;
  };
  techStack: string[];
  socialPresence: { platform: string; found: boolean }[];
}

interface CompetitorProject {
  name: string;
  location: string;
  url: string;
}

interface CompetitorInsight {
  type: "advantage" | "gap" | "opportunity";
  title: string;
  description: string;
}

// ---------- Scraping ----------

async function scrapeCompetitorSite(url: string): Promise<{
  html: string;
  title: string;
  metaDescription: string;
  headers: Record<string, string>;
}> {
  const baseUrl = url.startsWith("http") ? url : `https://${url}`;

  try {
    const res = await fetch(baseUrl, {
      headers: { "User-Agent": "CabbageSEO/1.0 (Competitive Analysis)" },
      redirect: "follow",
    });

    const html = await res.text();
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });

    // Extract meta
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i);

    return {
      html,
      title: titleMatch?.[1]?.trim() || "",
      metaDescription: metaDescMatch?.[1]?.trim() || "",
      headers,
    };
  } catch {
    return { html: "", title: "", metaDescription: "", headers: {} };
  }
}

function extractSeoSignals(html: string, _headers: Record<string, string>) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i);

  return {
    hasHttps: true,
    hasSitemap: false, // checked separately
    hasSchema: /schema\.org|application\/ld\+json/i.test(html),
    hasRobotsTxt: false, // checked separately
    metaTitle: titleMatch?.[1]?.trim() || "",
    metaDescription: metaDescMatch?.[1]?.trim() || "",
    h1Count: (html.match(/<h1/gi) || []).length,
    wordCount: html.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length,
  };
}

function detectTechStack(html: string, headers: Record<string, string>): string[] {
  const stack: string[] = [];

  if (headers["x-powered-by"]?.includes("Next")) stack.push("Next.js");
  if (headers["server"]?.includes("nginx")) stack.push("Nginx");
  if (headers["server"]?.includes("Apache")) stack.push("Apache");
  if (/wp-content|wordpress/i.test(html)) stack.push("WordPress");
  if (/wix\.com|wixsite/i.test(html)) stack.push("Wix");
  if (/squarespace/i.test(html)) stack.push("Squarespace");
  if (/react/i.test(html)) stack.push("React");
  if (/angular/i.test(html)) stack.push("Angular");
  if (/bootstrap/i.test(html)) stack.push("Bootstrap");
  if (/jquery/i.test(html)) stack.push("jQuery");
  if (/gtag|google-analytics|googletagmanager/i.test(html)) stack.push("Google Analytics");
  if (/fbq|facebook.*pixel/i.test(html)) stack.push("Facebook Pixel");
  if (/hotjar/i.test(html)) stack.push("Hotjar");
  if (/cloudflare/i.test(html) || headers["server"]?.includes("cloudflare")) stack.push("Cloudflare");

  return stack;
}

function detectSocial(html: string): { platform: string; found: boolean }[] {
  return [
    { platform: "Facebook", found: /facebook\.com\//i.test(html) },
    { platform: "Instagram", found: /instagram\.com\//i.test(html) },
    { platform: "LinkedIn", found: /linkedin\.com\//i.test(html) },
    { platform: "Twitter/X", found: /twitter\.com\/|x\.com\//i.test(html) },
    { platform: "YouTube", found: /youtube\.com\//i.test(html) },
    { platform: "WhatsApp", found: /wa\.me|whatsapp/i.test(html) },
  ];
}

function extractProjects(html: string, baseUrl: string): CompetitorProject[] {
  const projects: CompetitorProject[] = [];
  // Look for project-related links
  const projectLinks = html.match(/<a[^>]*href=["']([^"']*(?:project|property|villa|apartment|residence)[^"']*)["'][^>]*>([^<]*)/gi);

  if (projectLinks) {
    for (const link of projectLinks.slice(0, 10)) {
      const hrefMatch = link.match(/href=["']([^"']*)/);
      const textMatch = link.match(/>([^<]*)/);
      if (hrefMatch && textMatch && textMatch[1].trim()) {
        let href = hrefMatch[1];
        if (href.startsWith("/")) href = baseUrl + href;
        projects.push({
          name: textMatch[1].trim(),
          location: "",
          url: href,
        });
      }
    }
  }

  return projects;
}

// ---------- AI Analysis ----------

async function generateInsights(
  _companyName: string,
  competitorName: string,
  competitorSnapshot: CompetitorSnapshot
): Promise<CompetitorInsight[]> {
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: `You are CabbageSEO's competitive intelligence agent for Indian real estate. Analyze a competitor and provide actionable insights. Return valid JSON array only.`,
    messages: [{
      role: "user",
      content: `Analyze competitor "${competitorName}" against our client in Indian real estate:

Competitor signals:
- Title: ${competitorSnapshot.title}
- Meta Description: ${competitorSnapshot.description}
- Has Schema.org: ${competitorSnapshot.seoSignals.hasSchema}
- H1 count: ${competitorSnapshot.seoSignals.h1Count}
- Word count: ${competitorSnapshot.seoSignals.wordCount}
- Tech stack: ${competitorSnapshot.techStack.join(", ")}
- Social: ${competitorSnapshot.socialPresence.filter(s => s.found).map(s => s.platform).join(", ")}
- Projects found: ${competitorSnapshot.projectCount}

Return a JSON array of 5-8 insights:
[{"type": "advantage|gap|opportunity", "title": "...", "description": "2-3 sentences..."}]

Types:
- "advantage": something the competitor does better that our client should learn from
- "gap": something the competitor is missing that our client can exploit
- "opportunity": a market opportunity neither is addressing well`
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "[]";
  const jsonMatch = text.match(/\[[\s\S]*\]/);

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch { /* fall through */ }
  }
  return [];
}

// ---------- Main Function ----------

export async function analyzeCompetitor(
  companyName: string,
  competitor: { name: string; website: string }
): Promise<CompetitorAnalysisResult> {
  const baseUrl = competitor.website.startsWith("http")
    ? competitor.website
    : `https://${competitor.website}`;

  const { html, title, metaDescription, headers } = await scrapeCompetitorSite(baseUrl);

  const seoSignals = extractSeoSignals(html, headers);
  const techStack = detectTechStack(html, headers);
  const socialPresence = detectSocial(html);
  const projects = extractProjects(html, new URL(baseUrl).origin);

  // Check sitemap and robots.txt
  let hasSitemap = false;
  let hasRobotsTxt = false;
  try {
    const sitemapRes = await fetch(`${new URL(baseUrl).origin}/sitemap.xml`);
    hasSitemap = sitemapRes.ok && (await sitemapRes.text()).includes("<urlset");
  } catch { /* skip */ }
  try {
    const robotsRes = await fetch(`${new URL(baseUrl).origin}/robots.txt`);
    hasRobotsTxt = robotsRes.ok && !(await robotsRes.text()).includes("404");
  } catch { /* skip */ }

  const snapshot: CompetitorSnapshot = {
    title,
    description: metaDescription,
    projectCount: projects.length,
    projects,
    seoSignals: { ...seoSignals, hasSitemap, hasRobotsTxt },
    techStack,
    socialPresence,
  };

  const insights = await generateInsights(companyName, competitor.name, snapshot);

  return {
    competitor,
    snapshot,
    insights,
  };
}

export async function analyzeAllCompetitors(
  companyName: string,
  competitors: { name: string; website: string }[]
): Promise<CompetitorAnalysisResult[]> {
  // Run sequentially to avoid rate limits
  const results: CompetitorAnalysisResult[] = [];
  for (const competitor of competitors) {
    try {
      const result = await analyzeCompetitor(companyName, competitor);
      results.push(result);
    } catch (err) {
      console.error(`Failed to analyze ${competitor.name}:`, err);
    }
  }
  return results;
}
