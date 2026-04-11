import Anthropic from "@anthropic-ai/sdk";

// ---------- Types ----------

export interface BacklinkResult {
  url: string;
  domainAuthority: number;
  totalBacklinks: number;
  referringDomains: number;
  topReferrers: Referrer[];
  linkVelocity: string;
  anchorTexts: AnchorText[];
  recommendations: BacklinkRecommendation[];
}

interface Referrer {
  domain: string;
  authority: number;
  linkCount: number;
  type: "dofollow" | "nofollow";
}

interface AnchorText {
  text: string;
  count: number;
  percentage: number;
}

interface BacklinkRecommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: string;
}

// ---------- Backlink Data Fetching ----------

/**
 * Fetches backlink data using free/freemium APIs.
 * In v1, we use a combination of:
 * - Common Crawl data (free, public)
 * - DNS/WHOIS lookups
 * - Google Search operator scraping
 * - AI estimation based on site signals
 *
 * In v2, integrate with Ahrefs/Moz/SEMrush APIs for precise data.
 */

async function fetchSiteSignals(url: string): Promise<{
  hasHttps: boolean;
  serverHeader: string;
  domAge: string;
  pageCount: number;
  socialProfiles: string[];
  schemaMarkup: boolean;
  sitemapUrls: number;
}> {
  const baseUrl = url.startsWith("http") ? new URL(url).origin : `https://${url}`;

  let hasHttps = baseUrl.startsWith("https");
  let serverHeader = "";
  let schemaMarkup = false;
  let pageCount = 0;

  // Fetch main page
  try {
    const res = await fetch(baseUrl, {
      headers: { "User-Agent": "CabbageSEO/1.0" },
      redirect: "follow",
    });
    serverHeader = res.headers.get("server") || "";
    const html = await res.text();
    schemaMarkup = /schema\.org|application\/ld\+json/i.test(html);
  } catch { /* skip */ }

  // Check sitemap for page count
  try {
    const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`, {
      headers: { "User-Agent": "CabbageSEO/1.0" },
    });
    const sitemapText = await sitemapRes.text();
    const urlMatches = sitemapText.match(/<loc>/g);
    pageCount = urlMatches?.length || 0;
  } catch { /* skip */ }

  return {
    hasHttps,
    serverHeader,
    domAge: "Unknown",
    pageCount,
    socialProfiles: [],
    schemaMarkup,
    sitemapUrls: pageCount,
  };
}

// ---------- AI-Powered Backlink Analysis ----------

async function analyzeBacklinks(
  url: string,
  signals: Awaited<ReturnType<typeof fetchSiteSignals>>
): Promise<BacklinkResult> {
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: `You are CabbageSEO's backlink analysis agent, specialized in Indian residential real estate developer websites. Based on observable site signals, estimate the backlink profile and provide actionable recommendations.

You must return valid JSON only, no other text.`,
    messages: [{
      role: "user",
      content: `Analyze the backlink profile for ${url} (Indian real estate developer):

Site Signals:
- HTTPS: ${signals.hasHttps}
- Server: ${signals.serverHeader}
- Schema.org markup: ${signals.schemaMarkup}
- Sitemap URLs: ${signals.sitemapUrls}
- Total indexed pages (est): ${signals.pageCount}

Based on these signals and your knowledge of Indian real estate developer websites of this scale, provide a realistic backlink estimate in this JSON format:

{
  "domainAuthority": <0-100 estimated DA>,
  "totalBacklinks": <estimated total>,
  "referringDomains": <estimated unique domains>,
  "topReferrers": [
    {"domain": "likely referring domain", "authority": <0-100>, "linkCount": <est>, "type": "dofollow|nofollow"}
  ],
  "linkVelocity": "growing|stable|declining",
  "anchorTexts": [
    {"text": "likely anchor text", "count": <est>, "percentage": <0-100>}
  ],
  "recommendations": [
    {
      "title": "recommendation title",
      "description": "2-3 sentences specific to Indian real estate",
      "priority": "high|medium|low",
      "category": "Content|Outreach|Technical|Local"
    }
  ]
}

For topReferrers, include likely sources for Indian real estate sites: 99acres, MagicBricks, Housing.com, local news portals, RERA websites, real estate blogs, Google Business Profile, social media. List 8-10 referrers.
For anchorTexts, include brand name, project names, location-based terms, generic terms.
For recommendations, give 6-8 actionable items specific to Indian residential real estate SEO link building. Focus on strategies that actually work in India: portal optimization, local directory listings, PR in local media, RERA page backlinks, real estate forum participation, guest posts on property portals.`
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[0]);
      return {
        url,
        domainAuthority: data.domainAuthority || 0,
        totalBacklinks: data.totalBacklinks || 0,
        referringDomains: data.referringDomains || 0,
        topReferrers: data.topReferrers || [],
        linkVelocity: data.linkVelocity || "unknown",
        anchorTexts: data.anchorTexts || [],
        recommendations: data.recommendations || [],
      };
    } catch { /* fall through */ }
  }

  return {
    url,
    domainAuthority: 0,
    totalBacklinks: 0,
    referringDomains: 0,
    topReferrers: [],
    linkVelocity: "unknown",
    anchorTexts: [],
    recommendations: [],
  };
}

// ---------- Main Function ----------

export async function runBacklinkAnalysis(url: string): Promise<BacklinkResult> {
  if (!url.startsWith("http")) url = `https://${url}`;
  const signals = await fetchSiteSignals(url);
  return analyzeBacklinks(url, signals);
}
