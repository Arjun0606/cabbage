export const runtime = "nodejs";
export const maxDuration = 300;
import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

/**
 * Auto-Discover — scrapes a website and generates all company documents.
 *
 * Big Indian developers (Aparna, Prestige, Brigade, DLF) run Next.js SPAs
 * where the homepage has near-empty body text and real project data sits
 * on /project/apartments, /our-projects, /residential, /ongoing-projects
 * etc. Single-page scrape = 0 projects. So we:
 *   1. Fetch homepage, extract every anchor
 *   2. Find project-index pages and follow up to 4 of them
 *   3. Also collect project-slug anchors (e.g. /project/apartments/aparna-moonstone)
 *      — the slug itself often contains the project name
 *   4. Concatenate text from all pages and feed to the LLM with the
 *      candidate slug names baked into the prompt
 */

function stripToText(html: string, max: number): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function extractAnchors(html: string, base: string): Array<{ href: string; text: string }> {
  const anchors: Array<{ href: string; text: string }> = [];
  const re = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const abs = new URL(m[1], base).toString();
      const text = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      anchors.push({ href: abs, text });
    } catch { /* ignore malformed */ }
  }
  return anchors;
}

const PROJECT_INDEX_RX = /\/(our-)?projects?(\/|$)|\/portfolio|\/residential|\/apartments|\/bungalows?|\/plots?|\/villas?|\/ongoing|\/completed|\/upcoming|\/pre-?launch|\/ready-to-move/i;
const PROJECT_DETAIL_RX = /\/(project|projects|properties|residential|apartments|bungalows|villas|plots)\/[a-z0-9-]+\/[a-z0-9-]+/i;
const NON_PROJECT_SLUG_RX = /^(about|about-us|contact|contact-us|careers|blog|news|media|press|privacy|terms|tos|sitemap|faq|login|signup|gallery|events|csr|testimonials|awards|team|leadership|download|brochure|enquire|search|all|home|index)$/i;

// RERA registration number patterns. Every Indian state RERA authority
// uses a slightly different prefix but all are discoverable via regex.
// We match broadly and keep the matched substring verbatim.
const RERA_PATTERNS: RegExp[] = [
  /P\d{2}\d{8,14}/g,                                    // Telangana/AP/MH TSRERA/MahaRERA compact IDs
  /TS\/\d+\/\d+\/\d+/gi,                                // Telangana long form
  /K-?RERA\/PR\/\d+\/\d+(?:\/\d+)?/gi,                  // Karnataka
  /HARERA-[A-Z]+-\d+/gi,                                // Haryana
  /MAHARERA[\/-]P\d+/gi,                                // Maharashtra prefix variant
  /PRM\/KA\/RERA\/\d+\/\d+\/PR\/\d+\/\d+/gi,            // Karnataka full
  /RERA\s*(?:Reg(?:istration)?\s*(?:No\.?|Number)?\s*[:\-]?\s*)([A-Z0-9\/-]{8,40})/gi,
  /Regn\.?\s*No\.?\s*[:\-]?\s*([A-Z0-9\/-]{8,40})/gi,
];

function extractRera(text: string, rawHtml?: string): string {
  for (const rx of RERA_PATTERNS) {
    rx.lastIndex = 0;
    const m = rx.exec(text);
    if (m) {
      // If the pattern used a capture group, prefer it (strips the "RERA No:" prefix)
      const val = (m[1] || m[0]).trim();
      // Sanity filter — avoid grabbing words like "AUTHORITY" etc.
      if (/\d/.test(val) && val.length >= 6 && val.length <= 40) return val;
    }
  }
  // Next.js SPAs often embed the data as escaped JSON: \"reraNumber\":\"P0...\"
  if (rawHtml) {
    const embedded = /\\?"reraNumber\\?"\s*:\s*\\?"([^"\\]{4,60})\\?"/i.exec(rawHtml);
    if (embedded && embedded[1] && embedded[1].toUpperCase() !== "NA" && /\d/.test(embedded[1])) {
      return embedded[1];
    }
  }
  return "";
}

function extractConfigurations(text: string): string {
  // "2 BHK", "2, 3 & 4 BHK", "3BHK", "3-BHK"
  const re = /(\d(?:\s*(?:,|&|and|-|\/|to)\s*\d)*)\s*BHK/gi;
  const configs = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const digits = m[1].replace(/\s+/g, "").replace(/and/gi, "&");
    digits.split(/[,&/-]/).forEach((d) => {
      const n = parseInt(d, 10);
      if (n >= 1 && n <= 6) configs.add(`${n}BHK`);
    });
  }
  return Array.from(configs).sort().join(", ");
}

function extractPrice(text: string): string {
  // "₹1.2 Cr onwards", "₹85 Lakhs", "Rs. 1.2 Crore"
  const re = /(?:₹|Rs\.?|INR)\s*([\d.,]+)\s*(Cr(?:ore)?s?|Lakh?s?|L)\b/i;
  const m = re.exec(text);
  if (!m) return "";
  const num = m[1];
  const unit = /cr/i.test(m[2]) ? "Cr" : "L";
  return `₹${num} ${unit} onwards`;
}

function extractLocation(text: string, slug: string, metaTitle: string): string {
  // Prefer explicit "Location: X" or "in X, Hyderabad/Bengaluru/Mumbai/..." patterns
  const re1 = /Location\s*[:\-]\s*([A-Z][A-Za-z0-9 &'-]+?)(?:,\s*([A-Z][A-Za-z ]+))?(?:\s*[.|]|$)/;
  const m1 = re1.exec(text);
  if (m1) {
    return m1[2] ? `${m1[1].trim()}, ${m1[2].trim()}` : m1[1].trim();
  }
  // "<name> in <Locality>, <City>"
  const re2 = /\b(?:in|at)\s+([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)?)\s*,\s*([A-Z][A-Za-z]+)\b/;
  const m2 = re2.exec(text);
  if (m2) return `${m2[1]}, ${m2[2]}`;
  // Fallback from slug: "...-in-gandimaisamma" → "Gandimaisamma"
  const inMatch = /(?:-in-|-at-)([a-z0-9-]+)$/.exec(slug);
  if (inMatch) return slugToName(inMatch[1]);
  // Metatitle sometimes includes locality
  const tm = /\bin\s+([A-Z][A-Za-z]+)\b/.exec(metaTitle);
  if (tm) return tm[1];
  return "";
}

interface ScrapedProject {
  name: string;
  location: string;
  configurations: string;
  priceRange: string;
  reraNumber: string;
  website: string;
  status: string;
}

function slugToName(slug: string): string {
  // "aparna-moonstone" -> "Aparna Moonstone"
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

async function fetchHtml(u: string): Promise<string> {
  try {
    const res = await fetch(u, {
      headers: { "User-Agent": "Cabbge/1.0 (SEO Audit Bot)" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url, companyName, industry } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const baseHost = (() => {
      try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
    })();

    const html = await fetchHtml(url);

    // Follow project-index and project-detail pages on same host
    const anchors = extractAnchors(html, url);
    const sameHost = anchors.filter((a) => {
      try { return new URL(a.href).hostname.replace(/^www\./, "") === baseHost; } catch { return false; }
    });

    // Index pages = shallow project-listing paths (/projects, /project/apartments),
    // NOT individual detail paths (/project/apartments/aparna-moonstone).
    const indexPages = Array.from(
      new Set(
        sameHost
          .filter((a) => {
            try {
              const p = new URL(a.href).pathname;
              return PROJECT_INDEX_RX.test(p) && !PROJECT_DETAIL_RX.test(p);
            } catch { return false; }
          })
          .map((a) => a.href.split("#")[0])
      )
    ).slice(0, 4);

    // Keep slug → full URL so we can scrape each project detail page.
    const detailUrls = new Map<string, string>();
    const addSlug = (href: string) => {
      try {
        const u = new URL(href);
        if (u.hostname.replace(/^www\./, "") !== baseHost) return;
        if (!PROJECT_DETAIL_RX.test(u.pathname)) return;
        const slug = u.pathname.split("/").filter(Boolean).pop() || "";
        if (slug && slug.length >= 4 && !NON_PROJECT_SLUG_RX.test(slug)) {
          if (!detailUrls.has(slug)) detailUrls.set(slug, u.origin + u.pathname);
        }
      } catch { /* ignore */ }
    };

    const collectFromHtml = (rawHtml: string, baseUrl: string) => {
      for (const a of extractAnchors(rawHtml, baseUrl)) addSlug(a.href);
    };

    collectFromHtml(html, url);

    const indexHtmls = await Promise.all(indexPages.map((p) => fetchHtml(p)));
    for (let i = 0; i < indexHtmls.length; i++) {
      collectFromHtml(indexHtmls[i], indexPages[i]);
    }

    // Many modern developer sites are Next.js SPAs — index pages don't
    // render the project list in initial HTML. Sitemap.xml is the reliable
    // fallback and most sites keep it up to date.
    try {
      const origin = new URL(url).origin;
      const smXml = await fetchHtml(origin + "/sitemap.xml");
      const locs = Array.from(smXml.matchAll(/<loc>([^<]+)<\/loc>/gi)).map((m) => m[1]);
      for (const loc of locs) addSlug(loc);
    } catch { /* sitemap optional */ }

    // Scrape each project detail page in parallel to extract RERA,
    // configurations, location, price. Cap at 20 to keep the discover
    // call under ~30s even on slow sites.
    const detailEntries = Array.from(detailUrls.entries()).slice(0, 20);
    const scrapedProjects: ScrapedProject[] = await Promise.all(
      detailEntries.map(async ([slug, pageUrl]) => {
        const pageHtml = await fetchHtml(pageUrl);
        const metaT = (pageHtml.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "").trim();
        const body = stripToText(pageHtml, 20000);
        return {
          name: slugToName(slug),
          location: extractLocation(body, slug, metaT),
          configurations: extractConfigurations(body),
          priceRange: extractPrice(body),
          reraNumber: extractRera(body, pageHtml),
          website: pageUrl,
          status: /sold\s*out/i.test(body) ? "Sold Out"
            : /ready\s*to\s*move/i.test(body) ? "Ready to Move"
            : /pre-?launch/i.test(body) ? "Pre-launch"
            : /under\s*construction|on-?going/i.test(body) ? "Under Construction"
            : "Active",
        };
      })
    );

    // For slugs we didn't scrape in this pass (over the cap), still
    // include them as name-only entries so the project count is accurate.
    const scrapedSlugs = new Set(detailEntries.map(([s]) => s));
    const unscrapedProjects: ScrapedProject[] = Array.from(detailUrls.keys())
      .filter((s) => !scrapedSlugs.has(s))
      .map((s) => ({
        name: slugToName(s),
        location: "",
        configurations: "",
        priceRange: "",
        reraNumber: "",
        website: detailUrls.get(s) || "",
        status: "Active",
      }));

    const allProjects: ScrapedProject[] = [...scrapedProjects, ...unscrapedProjects];
    const candidateNames = allProjects.map((p) => p.name);

    const combinedText =
      stripToText(html, 5000) +
      indexHtmls.map((h) => "\n\n---\n\n" + stripToText(h, 4000)).join("");

    const textContent = combinedText.slice(0, 20000);

    // Extract meta description
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const metaDesc = metaMatch?.[1] || "";

    // Extract title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const pageTitle = titleMatch?.[1] || "";

    const industryLabel = industry || "business";
    const system = `You analyze ${industryLabel === "real_estate" ? "real estate developer" : industryLabel.replace(/_/g, " ")} websites and generate comprehensive brand intelligence.
Output ONLY valid JSON. No markdown fences.

You must infer everything from the website content — the company's voice, positioning, target audience, key products/services, and marketing approach. Be specific to the ${industryLabel.replace(/_/g, " ")} industry, not generic.`;

    const prompt = `Analyze this real estate developer's website and generate brand intelligence:

**Company:** ${companyName || "Unknown"}
**URL:** ${url}
**Page Title:** ${pageTitle}
**Meta Description:** ${metaDesc}

**Projects we already extracted (for context — do NOT re-list these):**
${candidateNames.length > 0 ? candidateNames.slice(0, 30).map((n) => "- " + n).join("\n") : "(none found)"}

**Website Content (homepage + ${indexHtmls.filter(Boolean).length} project-index pages, up to 20000 chars):**
${textContent || "Could not fetch website content. Generate based on company name and URL only."}

Generate this JSON:
{
  "companyDescription": "2-3 sentence description of what the company does, inferred from their website",
  "city": "Primary city they operate in (inferred from content, addresses, project locations)",

  "documents": {
    "productInfo": "200-word summary: what they build (configurations, price segments, signature features) + target buyer (first-time / investor / NRI / families / IT / age / income bracket). Combine product + buyer in one block.",
    "brandVoice": "150-word block: brand voice and tone (luxury / affordable-aspirational / family-focused / tech-forward / heritage-traditional / contemporary-minimal) and how it shows up in their copy and creative. Reference specific phrasings you saw on their site.",
    "brandValues": "120-word block: the values + ethos this brand markets on. Quality / safety / innovation / trust / sustainability / community. Pick 3-4 the brand actually leans into and explain how (e.g. Trust: they lead with their 30-year track record on every project page).",
    "brandVision": "100-word block: where the brand says it is going + the long-term promise it makes to buyers. Inferred from their About page, founder messaging, or strategic comms.",
    "targetAudience": "150-word block: who buys from them. Be specific about config, price band, locality, age, income, family stage, NRI segments. Reference the buyer personas the site signals.",
    "marketingStrategy": "150-word block: what their current digital marketing approach looks like (YT walkthroughs, RERA-compliant content, NRI-targeted pages, broker portals, brand campaigns, performance ads). Only state what is observable.",
    "competitorAnalysis": "150-word analysis of their competitive landscape. Who are their likely competitors in their city/segment? How are they positioned relative to competition?"
  },

  "inferredCompetitors": ["<Only list competitor developer names you can see explicitly mentioned on the scraped site (e.g., in comparison pages, press releases, or copy). If none are mentioned, return an empty array []. Never guess at competitors based on market knowledge — that fabricates names.>"],

  "seoObservations": {
    "hasSchema": true/false,
    "hasBlog": true/false,
    "hasLlmsTxt": true/false,
    "metaQuality": "good/poor/missing",
    "contentDepth": "thin/moderate/rich",
    "quickWins": ["3-5 immediate SEO improvements"]
  }
}

Be specific to this company — don't generate generic real estate descriptions.`;

    const raw = await aiComplete(system, prompt, 3000);

    let result: Record<string, unknown>;
    try {
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to analyze website" }, { status: 500 });
    }

    // Always attach the deterministically-scraped projects. The LLM never
    // sees or re-generates these, so hallucination risk is zero.
    result.inferredProjects = allProjects;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Auto-discover error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Auto-discovery failed" },
      { status: 500 }
    );
  }
}
