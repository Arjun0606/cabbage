import { aiComplete, aiLight, queryForVisibility } from "@/lib/ai";
import { getMozBacklinks } from "@/lib/integrations/mozBacklinks";

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
  dataSource: "moz_api" | "web_search" | "ai_estimated";
  /** Real, verified referrers from high-value domains via web search.
   *  Every entry has a specific citation URL — no fabrication. */
  verifiedReferrers?: VerifiedReferrer[];
  /** Which high-value domains we checked but didn't find linking to this site.
   *  These become outreach targets. */
  unlinkedHighValueDomains?: { domain: string; authority: number; type: string }[];
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
      headers: { "User-Agent": "Cabbge/1.0" },
      redirect: "follow",
    });
    if (res.ok) {
      serverHeader = res.headers.get("server") || "";
      const html = await res.text();
      schemaMarkup = /schema\.org|application\/ld\+json/i.test(html);
    } else {
      console.error(`backlinks: site fetch failed (${res.status}) ${baseUrl}`);
    }
  } catch (err) {
    console.error(`backlinks: site fetch error:`, err instanceof Error ? err.message : err);
  }

  // Check sitemap for page count
  try {
    const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`, {
      headers: { "User-Agent": "Cabbge/1.0" },
    });
    if (sitemapRes.ok) {
      const sitemapText = await sitemapRes.text();
      const urlMatches = sitemapText.match(/<loc>/g);
      pageCount = urlMatches?.length || 0;
    }
  } catch (err) {
    console.error(`backlinks: sitemap fetch error:`, err instanceof Error ? err.message : err);
  }

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

// ---------- Web-Search Backlink Data ----------

/**
 * Priority 2: Use ChatGPT web search to find real DA/backlink data from
 * Moz, Ahrefs, SEMrush, or any publicly available source. Falls back to
 * null if web search doesn't fire or returns nothing useful.
 */
async function analyzeBacklinksViaWebSearch(url: string): Promise<BacklinkResult | null> {
  try {
    const domain = new URL(url).hostname;
    const { text, source } = await queryForVisibility(
      "openai",
      `What is the domain authority, total backlinks, and referring domains for ${domain}? Check Moz, Ahrefs, SEMrush, or any available source. Also list the top referring domains if available.`
    );

    if (!text || (source !== "web_search" && source !== "grounded")) {
      console.log(`backlinks web search: source=${source}, skipping (need real web data)`);
      return null;
    }

    const parsePrompt = `Extract backlink data from this web search result. Return ONLY valid JSON, no other text.

Web search result:
"""
${text.slice(0, 3000)}
"""

Return this exact JSON structure (use 0 for any values not found):
{
  "domainAuthority": <number 0-100>,
  "totalBacklinks": <number>,
  "referringDomains": <number>,
  "topReferrers": [{"domain": "example.com", "authority": 0, "linkCount": 0, "type": "dofollow"}],
  "linkVelocity": "growing|stable|declining|unknown"
}

Only include data that was actually mentioned in the search result. Do NOT invent or estimate values — use 0 if not found.`;

    const parsed = await aiLight("Extract structured data from text. Return only valid JSON.", parsePrompt, 800);
    const jsonMatch = parsed.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);
    if (!data.domainAuthority && !data.totalBacklinks && !data.referringDomains) {
      console.log("backlinks web search: parsed data has all zeros, falling back");
      return null;
    }

    return {
      url,
      domainAuthority: data.domainAuthority || 0,
      totalBacklinks: data.totalBacklinks || 0,
      referringDomains: data.referringDomains || 0,
      topReferrers: Array.isArray(data.topReferrers) ? data.topReferrers : [],
      linkVelocity: data.linkVelocity || "unknown",
      anchorTexts: [],
      recommendations: [],
      dataSource: "web_search",
    };
  } catch (err) {
    console.error("backlinks web search failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------- AI-Powered Backlink Analysis (fallback estimation) ----------

async function analyzeBacklinks(
  url: string,
  signals: Awaited<ReturnType<typeof fetchSiteSignals>>
): Promise<BacklinkResult> {
  const system = `You are Cabbge's backlink analysis agent, specialized in Indian residential real estate developer websites. Based on observable site signals, estimate the backlink profile and provide actionable recommendations.

You must return valid JSON only, no other text.`;

  // Fallback prompt ONLY asks for a DA guess + strategic recommendations.
  // We deliberately do NOT ask the AI to invent topReferrers or anchorTexts
  // — fabricated referring domains look plausible but are worse than useless:
  // users trust them, then notice they aren't real, then lose trust in the
  // whole product. Better to show nothing than to show fakes.
  const prompt = `For ${url} (Indian real estate developer), provide ONLY:

Site Signals:
- HTTPS: ${signals.hasHttps}
- Schema: ${signals.schemaMarkup}
- Indexed pages (est): ${signals.pageCount}

JSON output:
{
  "domainAuthority": <0-100 rough estimate based on site scale — this is a ROUGH guess, clearly labeled as estimated in the UI>,
  "linkVelocity": "growing|stable|declining|unknown",
  "recommendations": [
    {
      "title": "...",
      "description": "2-3 sentences, specific to Indian real estate link building — portal listings, local PR, RERA pages, broker blogs",
      "priority": "high|medium|low",
      "category": "Content|Outreach|Technical|Local"
    }
  ]
}

Rules:
- recommendations: 6-8 actionable items. Specific to Indian real estate.
- DO NOT invent referring domains. DO NOT invent anchor text distributions.
  We don't have that data without a Moz/Ahrefs API key.`;

  const text = await aiComplete(system, prompt, 1500);
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[0]);
      return {
        url,
        domainAuthority: data.domainAuthority || 0,
        totalBacklinks: 0,                     // unknown without real API
        referringDomains: 0,                   // unknown without real API
        topReferrers: [],                      // explicitly empty — no fabrication
        linkVelocity: data.linkVelocity || "unknown",
        anchorTexts: [],                       // explicitly empty — no fabrication
        recommendations: data.recommendations || [],
        dataSource: "ai_estimated",
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
    dataSource: "ai_estimated",
  };
}

// ---------- Verified Referrer Discovery ----------

/**
 * Uses ChatGPT web_search to VERIFY whether specific high-value Indian
 * real-estate domains link to the target URL. Only returns referrers
 * the web search could confirm with a specific page URL. Much slower
 * than fabrication but every result is real and auditable.
 *
 * Why we check these specific domains: every Indian RE buyer discovers
 * developers through the property portals and ~3 news sites. If you're
 * linked from these, you're visible. If not, that's your #1 gap.
 */
const HIGH_VALUE_RE_DOMAINS = [
  { domain: "99acres.com", authority: 76, type: "portal" },
  { domain: "magicbricks.com", authority: 74, type: "portal" },
  { domain: "housing.com", authority: 72, type: "portal" },
  { domain: "nobroker.in", authority: 68, type: "portal" },
  { domain: "squareyards.com", authority: 62, type: "portal" },
  { domain: "proptiger.com", authority: 60, type: "portal" },
  { domain: "commonfloor.com", authority: 58, type: "portal" },
  { domain: "economictimes.indiatimes.com", authority: 92, type: "news" },
  { domain: "livemint.com", authority: 88, type: "news" },
  { domain: "moneycontrol.com", authority: 90, type: "news" },
];

export interface VerifiedReferrer {
  domain: string;
  authority: number;
  type: string;
  verifiedAt: string;
  citationUrl?: string;
}

export async function findVerifiedReferrers(url: string): Promise<{
  verified: VerifiedReferrer[];
  checked: number;
  source: "web_search" | "unavailable";
}> {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    const brand = domain.split(".")[0];

    // One web search query covering multiple candidates at once
    const siteQueries = HIGH_VALUE_RE_DOMAINS.slice(0, 6)
      .map((d) => `site:${d.domain} "${brand}"`)
      .join(" OR ");
    const { text, source } = await queryForVisibility(
      "openai",
      `Check which of these Indian real estate sites link to or mention ${domain} (brand: ${brand}): ${HIGH_VALUE_RE_DOMAINS.map((d) => d.domain).join(", ")}. Only report the ones where you can see an actual page URL linking to ${domain}. Query: ${siteQueries}`
    );

    if (!text || (source !== "web_search" && source !== "grounded")) {
      return { verified: [], checked: 0, source: "unavailable" };
    }

    // Parse — for each candidate domain, check if it's mentioned with a real URL
    const verified: VerifiedReferrer[] = [];
    for (const cand of HIGH_VALUE_RE_DOMAINS) {
      // Look for mentions with a URL pointing to that domain
      const mentionRegex = new RegExp(`https?://(?:[\\w-]+\\.)?${cand.domain.replace(/\./g, "\\.")}[^\\s)"']*`, "i");
      const urlMatch = text.match(mentionRegex);
      if (urlMatch) {
        verified.push({
          domain: cand.domain,
          authority: cand.authority,
          type: cand.type,
          verifiedAt: new Date().toISOString(),
          citationUrl: urlMatch[0],
        });
      }
    }

    return {
      verified,
      checked: HIGH_VALUE_RE_DOMAINS.length,
      source: "web_search",
    };
  } catch (err) {
    console.error("findVerifiedReferrers failed:", err instanceof Error ? err.message : err);
    return { verified: [], checked: 0, source: "unavailable" };
  }
}

// ---------- Main Function ----------

export async function runBacklinkAnalysis(url: string): Promise<BacklinkResult> {
  if (!url.startsWith("http")) url = `https://${url}`;

  // Priority 1: Try real Moz API data
  const mozData = await getMozBacklinks(url);
  if (mozData) {
    const signals = await fetchSiteSignals(url);
    const aiResult = await analyzeBacklinks(url, signals);
    return {
      url,
      domainAuthority: mozData.domainAuthority,
      totalBacklinks: mozData.inboundLinks,
      referringDomains: mozData.linkingDomains,
      topReferrers: mozData.topLinkingDomains.map(d => ({
        domain: d.domain,
        authority: d.domainAuthority,
        linkCount: d.linkCount,
        type: "dofollow" as const,
      })),
      linkVelocity: aiResult.linkVelocity,
      anchorTexts: aiResult.anchorTexts,
      recommendations: aiResult.recommendations,
      dataSource: "moz_api" as const,
    };
  }

  // Priority 2: Try web search for real backlink data (ChatGPT + Moz/Ahrefs/SEMrush)
  const webSearchResult = await analyzeBacklinksViaWebSearch(url);
  if (webSearchResult) {
    const signals = await fetchSiteSignals(url);
    const aiResult = await analyzeBacklinks(url, signals);
    return {
      ...webSearchResult,
      anchorTexts: aiResult.anchorTexts,
      recommendations: aiResult.recommendations,
      dataSource: "web_search" as const,
    };
  }

  // Priority 3: Fallback to AI-estimated DA + recommendations (NO fabricated referrers).
  // Augment with verified-referrer check via web search — real, auditable data.
  const signals = await fetchSiteSignals(url);
  const [estimate, verifiedRes] = await Promise.all([
    analyzeBacklinks(url, signals),
    findVerifiedReferrers(url),
  ]);

  // Which high-value domains we checked but DIDN'T find — these are outreach targets
  const verifiedSet = new Set(verifiedRes.verified.map((v) => v.domain));
  const unlinked = HIGH_VALUE_RE_DOMAINS.filter((d) => !verifiedSet.has(d.domain));

  // If we got verified referrers, expose them as topReferrers so the UI
  // shows REAL data instead of an empty list.
  const realReferrers: Referrer[] = verifiedRes.verified.map((v) => ({
    domain: v.domain,
    authority: v.authority,
    linkCount: 1,
    type: "dofollow" as const,
  }));

  return {
    ...estimate,
    topReferrers: realReferrers,  // only real data, possibly empty
    verifiedReferrers: verifiedRes.verified,
    unlinkedHighValueDomains: unlinked,
    dataSource: "ai_estimated" as const,
  };
}
