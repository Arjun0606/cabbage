import { NextRequest, NextResponse } from "next/server";
import { sanitizeUrl, sanitizeText } from "@/lib/security";

// Deterministic brand-presence scan.
// Previous version asked an LLM to "guess" whether a brand was likely on GBP,
// Wikipedia, JustDial, etc. That's noise — the customer knows better than the
// model. We now only report what we can verify from the homepage itself, and
// list actionable entity signals to fix. No hallucinated "likely_present".

interface EntitySignal {
  signal: string;
  present: boolean;
  impact: string;
  fix?: string;
}

interface BrandPresenceResult {
  brand: string;
  score: number;
  sameAsLinks: string[];
  existingEntitySignals: string[];
  missingEntitySignals: string[];
  recommendations: string[];
  entityChecks: EntitySignal[];
}

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

function extractSameAsLinks(html: string): string[] {
  const sameAsLinks: string[] = [];
  const jsonLdMatches = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!jsonLdMatches) return sameAsLinks;
  for (const match of jsonLdMatches) {
    const content = match
      .replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>/i, "")
      .replace(/<\/script>/i, "");
    try {
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (
          item["@type"] === "Organization" ||
          item["@type"] === "LocalBusiness" ||
          item["@type"] === "RealEstateAgent"
        ) {
          if (Array.isArray(item.sameAs)) sameAsLinks.push(...item.sameAs);
          else if (typeof item.sameAs === "string") sameAsLinks.push(item.sameAs);
        }
      }
    } catch {
      // malformed JSON-LD — skip
    }
  }
  return sameAsLinks;
}

function checkH1ForBrand(html: string, brand: string): boolean {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!h1Match) return false;
  const h1Text = h1Match[1].replace(/<[^>]*>/g, "").trim();
  return h1Text.toLowerCase().includes(brand.toLowerCase());
}

function hasOrganizationSchema(html: string): boolean {
  const jsonLdMatches = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!jsonLdMatches) return false;
  for (const match of jsonLdMatches) {
    const content = match
      .replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>/i, "")
      .replace(/<\/script>/i, "");
    try {
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (
          item["@type"] === "Organization" ||
          item["@type"] === "LocalBusiness" ||
          item["@type"] === "RealEstateAgent"
        ) {
          return true;
        }
      }
    } catch {
      // skip
    }
  }
  return false;
}

function extractTitleAndMeta(html: string): { title: string; description: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  return {
    title: titleMatch ? titleMatch[1].trim() : "",
    description: descMatch ? descMatch[1].trim() : "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const brand = sanitizeText(body.brand, 200);
    const websiteRaw = body.website || "";

    if (!brand) {
      return NextResponse.json(
        { error: "Brand name is required" },
        { status: 400 }
      );
    }

    let safeWebsite = "";
    let origin = "";
    if (websiteRaw) {
      const { valid, url, error } = sanitizeUrl(websiteRaw);
      if (!valid) return NextResponse.json({ error }, { status: 400 });
      safeWebsite = url;
      origin = new URL(url).origin;
    }

    if (!safeWebsite) {
      return NextResponse.json(
        { error: "Website URL is required for brand presence scan" },
        { status: 400 }
      );
    }

    const [homepageRes, aboutRes, robotsRes] = await Promise.all([
      safeFetch(origin, { timeout: 10000 }),
      safeFetch(`${origin}/about`),
      safeFetch(`${origin}/robots.txt`),
    ]);

    const existingEntitySignals: string[] = [];
    const missingEntitySignals: string[] = [];
    const recommendations: string[] = [];
    const entityChecks: EntitySignal[] = [];
    let sameAsLinks: string[] = [];
    let homepageHtml = "";

    if (homepageRes && homepageRes.ok) {
      homepageHtml = await homepageRes.text();
      const { title, description } = extractTitleAndMeta(homepageHtml);

      const h1HasBrand = checkH1ForBrand(homepageHtml, brand);
      entityChecks.push({
        signal: "H1 on homepage mentions the brand name",
        present: h1HasBrand,
        impact: "AI models extract H1 as the primary entity on the page",
        fix: h1HasBrand ? undefined : `Add "${brand}" to your homepage H1 — AI models need this signal to recognise you as the entity`,
      });

      const titleHasBrand = title.toLowerCase().includes(brand.toLowerCase());
      entityChecks.push({
        signal: "<title> tag includes brand name",
        present: titleHasBrand,
        impact: "Title tag is the strongest entity signal for search crawlers",
        fix: titleHasBrand ? undefined : `Include "${brand}" in your homepage <title> tag`,
      });

      const descHasBrand = description.toLowerCase().includes(brand.toLowerCase());
      entityChecks.push({
        signal: "Meta description mentions brand",
        present: descHasBrand,
        impact: "Meta description is often used as-is in AI search summaries",
        fix: descHasBrand ? undefined : `Mention "${brand}" explicitly in your meta description`,
      });

      const hasOrgSchema = hasOrganizationSchema(homepageHtml);
      entityChecks.push({
        signal: "Organization / LocalBusiness schema on homepage",
        present: hasOrgSchema,
        impact: "JSON-LD Organization schema is the #1 machine-readable entity signal",
        fix: hasOrgSchema ? undefined : "Add Organization JSON-LD schema to your homepage — use the Schema tab to generate it",
      });

      if (hasOrgSchema) {
        sameAsLinks = extractSameAsLinks(homepageHtml);
        entityChecks.push({
          signal: `sameAs links connect your entity to external profiles (${sameAsLinks.length} found)`,
          present: sameAsLinks.length > 0,
          impact: "sameAs links let AI models verify you own those external profiles — critical for entity resolution",
          fix: sameAsLinks.length > 0 ? undefined : "Add sameAs links to LinkedIn, YouTube, GBP, and portal listings inside your Organization schema",
        });
      }
    } else {
      missingEntitySignals.push("Homepage could not be fetched — cannot run entity checks");
    }

    entityChecks.push({
      signal: "/about page exists",
      present: !!(aboutRes && aboutRes.ok),
      impact: "AI models specifically crawl /about pages to build entity knowledge",
      fix: aboutRes && aboutRes.ok ? undefined : "Create a detailed /about page covering company history, leadership, and completed projects",
    });

    if (robotsRes && robotsRes.ok) {
      const robotsText = await robotsRes.text();
      const blocksGptBot = /user-agent:\s*gptbot[\s\S]*?disallow:\s*\//i.test(robotsText);
      const blocksGoogleExt = /user-agent:\s*google-extended[\s\S]*?disallow:\s*\//i.test(robotsText);
      entityChecks.push({
        signal: "robots.txt does not block AI crawlers (GPTBot, Google-Extended)",
        present: !blocksGptBot && !blocksGoogleExt,
        impact: "Blocking AI crawlers makes every other signal irrelevant — they can't see your site",
        fix: blocksGptBot || blocksGoogleExt
          ? "Remove GPTBot / Google-Extended Disallow rules from robots.txt — these block the AI models you're trying to rank in"
          : undefined,
      });
    }

    for (const c of entityChecks) {
      if (c.present) existingEntitySignals.push(c.signal);
      else {
        missingEntitySignals.push(c.signal);
        if (c.fix) recommendations.push(c.fix);
      }
    }

    const passed = entityChecks.filter((c) => c.present).length;
    const total = entityChecks.length;
    const score = total === 0 ? 0 : Math.round((passed / total) * 100);

    const result: BrandPresenceResult = {
      brand,
      score,
      sameAsLinks,
      existingEntitySignals,
      missingEntitySignals,
      recommendations,
      entityChecks,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Brand presence scan error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Brand presence scan failed",
      },
      { status: 500 }
    );
  }
}
