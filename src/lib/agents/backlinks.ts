import { aiComplete, aiLight, queryForVisibility } from "@/lib/ai";

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
  dataSource: "web_search" | "ai_estimated";
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
//
// We are model-only — no Moz/Ahrefs/SEMrush API dependency. Two paths:
//   1. Grounded web search (ChatGPT/Gemini) — pulls real DA/backlink
//      numbers from public sources (Moz's free public scans, Ahrefs
//      Website Authority Checker, UberSuggest, Similarweb, press coverage).
//   2. AI estimate from observable site signals — when web search is
//      unavailable or returns nothing, we produce a rough DA band +
//      order-of-magnitude backlink estimate based on sitemap size,
//      schema, https, indexed pages. The UI labels this "AI estimated".

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
  const system = `You are Cabbge's backlink analysis agent, specialized in Indian residential real estate developer websites. You estimate the backlink profile from observable site signals + your knowledge of the Indian RE media landscape, and you return an order-of-magnitude range that a marketer can use for planning.

You must return valid JSON only, no other text.`;

  const domain = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } })();
  const brand = domain.split(".")[0];

  // Ask the model for rough-but-useful numbers. We're explicit that these
  // are estimates — the UI badges them "AI estimated" — but empty/zero
  // screens look broken, so the model DOES commit to a number it can
  // defend (typical DA range for a developer with N sitemap pages + schema,
  // typical backlink count for a brand this well-known, etc.). This is
  // the same call a human analyst would make without paid tools.
  const prompt = `Estimate the backlink profile for ${domain} (brand: ${brand}) — an Indian residential real estate developer.

Signals observed on the site:
- HTTPS: ${signals.hasHttps}
- Schema.org markup: ${signals.schemaMarkup}
- Indexed pages (from sitemap): ${signals.pageCount}

Use your knowledge of Indian RE: a big Hyderabad/Bengaluru developer with 20+ live projects, RERA coverage, and 10+ years in market typically has DA 40-55, 5k-40k backlinks from 300-800 referring domains. A small emerging builder with 1-3 projects typically has DA 10-25, 50-500 backlinks from 20-80 domains. Scale your numbers to the brand's recognition and site size.

Return JSON:
{
  "domainAuthority": <0-100 integer. Base on brand recognition + site scale. Be realistic — most Indian developers are DA 15-50.>,
  "totalBacklinks": <integer. Rough order of magnitude is what matters. For a well-known builder think 5000-30000; obscure, a few hundred.>,
  "referringDomains": <integer. Typically 2-5% of totalBacklinks for RE brands.>,
  "linkVelocity": "growing|stable|declining|unknown",
  "recommendations": [
    {
      "title": "...",
      "description": "2-3 sentences, specific to Indian real estate link building — portal listings, local PR, RERA pages, broker blogs, YouTube walkthroughs, Reddit locality subs",
      "priority": "high|medium|low",
      "category": "Content|Outreach|Technical|Local"
    }
  ]
}

Rules:
- recommendations: 6-8 actionable items. Specific to Indian real estate.
- DO NOT fabricate specific referring-domain names (topReferrers) or anchor-text distributions — those require real lookup. We handle that separately via verified-referrer web search.
- DO commit to realistic DA/backlink/referring-domain numbers. Zero is only valid for a brand that clearly doesn't exist.`;

  const text = await aiComplete(system, prompt, 1500);
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[0]);
      return {
        url,
        domainAuthority: Number(data.domainAuthority) || 0,
        totalBacklinks: Number(data.totalBacklinks) || 0,
        referringDomains: Number(data.referringDomains) || 0,
        topReferrers: [],                      // only filled by verified-referrer path
        linkVelocity: data.linkVelocity || "unknown",
        anchorTexts: [],                       // only filled by verified-referrer path
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
 * developers through the property portals and major news sites. If
 * you're linked from these, you're visible. If not, that's your #1 gap.
 *
 * The list is discovered LIVE (marketKnowledge.ts → ChatGPT web search)
 * rather than hardcoded — so when a new portal rises or an old one
 * fades, the check updates automatically.
 */
import { getHighAuthorityIndianRealEstateDomains, type HighAuthorityDomain } from "@/lib/marketKnowledge";

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
  highValueDomains: HighAuthorityDomain[];
}> {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    const brand = domain.split(".")[0];

    // Live list — replaces the old hardcoded HIGH_VALUE_RE_DOMAINS.
    const highValueDomains = await getHighAuthorityIndianRealEstateDomains();
    if (highValueDomains.length === 0) {
      return { verified: [], checked: 0, source: "unavailable", highValueDomains: [] };
    }

    const domainList = highValueDomains.map((d) => d.domain).join(", ");
    const { text, source } = await queryForVisibility(
      "openai",
      `Search the web to find which of these Indian real estate sites have a page that links to or mentions "${domain}" (brand: ${brand}):
${domainList}

For each one you confirm with a real visible URL, return JSON. If you can't confirm any, return an empty array. Respond ONLY with valid JSON, no prose:

{"matches": [{"domain": "example.com", "url": "https://example.com/..."}]}

Only include domains where you can see an actual linking/mentioning page URL. Never guess.`
    );

    if (!text || (source !== "web_search" && source !== "grounded")) {
      return { verified: [], checked: highValueDomains.length, source: "unavailable", highValueDomains };
    }

    const verified: VerifiedReferrer[] = [];
    const seen = new Set<string>();
    const jsonMatch = text.match(/\{[\s\S]*"matches"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        for (const m of parsed.matches || []) {
          const cand = highValueDomains.find((d) => d.domain === m.domain);
          if (!cand || seen.has(cand.domain)) continue;
          if (typeof m.url === "string" && m.url.startsWith("http") && m.url.includes(cand.domain)) {
            verified.push({
              domain: cand.domain,
              authority: cand.authority,
              type: cand.type,
              verifiedAt: new Date().toISOString(),
              citationUrl: m.url,
            });
            seen.add(cand.domain);
          }
        }
      } catch { /* fall through to regex */ }
    }

    if (verified.length === 0) {
      for (const cand of highValueDomains) {
        if (seen.has(cand.domain)) continue;
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
          seen.add(cand.domain);
        }
      }
    }

    return {
      verified,
      checked: highValueDomains.length,
      source: "web_search",
      highValueDomains,
    };
  } catch (err) {
    console.error("findVerifiedReferrers failed:", err instanceof Error ? err.message : err);
    return { verified: [], checked: 0, source: "unavailable", highValueDomains: [] };
  }
}

// ---------- Main Function ----------

export async function runBacklinkAnalysis(url: string): Promise<BacklinkResult> {
  if (!url.startsWith("http")) url = `https://${url}`;

  // Run signal fetch, AI estimate, and verified-referrer check in parallel.
  // We always get an AI estimate — no empty screens. We also always try
  // web search for real numbers and for confirming which high-value
  // Indian RE domains actually link to this brand.
  const [signals, webSearchResult, verifiedRes] = await Promise.all([
    fetchSiteSignals(url),
    analyzeBacklinksViaWebSearch(url),
    findVerifiedReferrers(url),
  ]);

  const estimate = await analyzeBacklinks(url, signals);

  const verifiedSet = new Set(verifiedRes.verified.map((v) => v.domain));
  const unlinked = verifiedRes.highValueDomains.filter((d) => !verifiedSet.has(d.domain));
  const realReferrers: Referrer[] = verifiedRes.verified.map((v) => ({
    domain: v.domain,
    authority: v.authority,
    linkCount: 1,
    type: "dofollow" as const,
  }));

  // Prefer web-search numbers when we got them; otherwise use the AI estimate.
  // Recommendations + linkVelocity always come from the AI pass.
  const base = webSearchResult
    ? {
        ...webSearchResult,
        anchorTexts: estimate.anchorTexts,
        recommendations: estimate.recommendations,
        dataSource: "web_search" as const,
      }
    : estimate;

  return {
    ...base,
    topReferrers: realReferrers,
    verifiedReferrers: verifiedRes.verified,
    unlinkedHighValueDomains: unlinked,
  };
}
