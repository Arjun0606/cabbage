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

    const collectDetailSlugs = (rawHtml: string, baseUrl: string, into: string[]) => {
      const a2 = extractAnchors(rawHtml, baseUrl);
      for (const a of a2) {
        try {
          const u = new URL(a.href);
          if (u.hostname.replace(/^www\./, "") !== baseHost) continue;
          if (!PROJECT_DETAIL_RX.test(u.pathname)) continue;
          const slug = u.pathname.split("/").filter(Boolean).pop() || "";
          if (slug && slug.length >= 4 && !NON_PROJECT_SLUG_RX.test(slug)) into.push(slug);
        } catch { /* ignore */ }
      }
    };

    const detailSlugs: string[] = [];
    collectDetailSlugs(html, url, detailSlugs);

    const indexHtmls = await Promise.all(indexPages.map((p) => fetchHtml(p)));
    for (let i = 0; i < indexHtmls.length; i++) {
      collectDetailSlugs(indexHtmls[i], indexPages[i], detailSlugs);
    }

    // Many modern developer sites are Next.js SPAs — index pages don't
    // render the project list in initial HTML. Sitemap.xml is the reliable
    // fallback and most sites keep it up to date.
    try {
      const origin = new URL(url).origin;
      const smXml = await fetchHtml(origin + "/sitemap.xml");
      const locs = Array.from(smXml.matchAll(/<loc>([^<]+)<\/loc>/gi)).map((m) => m[1]);
      for (const loc of locs) {
        try {
          const u = new URL(loc);
          if (u.hostname.replace(/^www\./, "") !== baseHost) continue;
          if (!PROJECT_DETAIL_RX.test(u.pathname)) continue;
          const slug = u.pathname.split("/").filter(Boolean).pop() || "";
          if (slug && slug.length >= 4 && !NON_PROJECT_SLUG_RX.test(slug)) detailSlugs.push(slug);
        } catch { /* ignore */ }
      }
    } catch { /* sitemap optional */ }

    const candidateNames = Array.from(new Set(detailSlugs)).slice(0, 60).map(slugToName);

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

**Candidate project slugs discovered from site navigation (these are reliable — treat each as a likely real project; convert slug to Title Case for the name):**
${candidateNames.length > 0 ? candidateNames.map((n) => "- " + n).join("\n") : "(none found in navigation — rely on page text below)"}

**Website Content (homepage + ${indexHtmls.filter(Boolean).length} project-index pages, up to 15000 chars):**
${textContent || "Could not fetch website content. Generate based on company name and URL only."}

Generate this JSON:
{
  "companyDescription": "2-3 sentence description of what the company does, inferred from their website",
  "city": "Primary city they operate in (inferred from content, addresses, project locations)",

  "documents": {
    "productInfo": "200-word summary: what they build (configurations, price segments, signature features) + target buyer (first-time / investor / NRI / families / IT / age / income bracket). Combine product + buyer in one block.",
    "brandVoice": "200-word combined block: brand voice and tone (luxury / affordable / family-focused / tech-forward / formal / casual) + values, mission, vision (what they stand for \u2014 quality / innovation / trust / heritage).",
    "competitorAnalysis": "150-word analysis of their competitive landscape. Who are their likely competitors in their city/segment? How are they positioned relative to competition?"
  },

  "inferredProjects": [
    {
      "name": "<EXACT project name. Prefer names found in the candidate slug list above OR in body text. If the site uses a brand-prefix convention (e.g. 'Aparna Moonstone', 'Prestige Lakeside Habitat', 'Brigade Eldorado'), preserve it. Include every candidate slug as a project entry unless it's clearly non-project nav (about, contact, blog, careers, privacy, sitemap, etc.). Never use placeholders like 'Project 1', 'Unknown', 'featured project'.>",
      "location": "<actual locality, e.g. 'Kukatpally, Hyderabad'. If not findable in text, leave empty string — better empty than fabricated.>",
      "configurations": "<e.g. '3BHK, 4BHK'. Empty string if unknown.>",
      "priceRange": "<if mentioned on site, e.g. '₹1.2 Cr onwards'. Empty string if not found>",
      "status": "Active | Pre-launch | Under Construction | Ready to Move | Sold Out"
    }
  ],

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

    let result;
    try {
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to analyze website" }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Auto-discover error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Auto-discovery failed" },
      { status: 500 }
    );
  }
}
