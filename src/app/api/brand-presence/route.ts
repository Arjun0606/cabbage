import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";
import { sanitizeUrl, sanitizeText } from "@/lib/security";

// ---------- Types ----------

interface PlatformResult {
  platform: string;
  status: "likely_present" | "likely_absent" | "unknown";
  importance: "critical" | "high" | "medium";
  impact: string;
  actionIfMissing: string;
}

interface BrandPresenceResult {
  brand: string;
  score: number;
  platforms: PlatformResult[];
  sameAsLinks: string[];
  existingEntitySignals: string[];
  missingEntitySignals: string[];
  recommendations: string[];
}

// ---------- Helpers ----------

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

/**
 * Extract sameAs links from Organization JSON-LD schema on the page.
 */
function extractSameAsLinks(html: string): string[] {
  const sameAsLinks: string[] = [];
  // Find all JSON-LD blocks
  const jsonLdMatches = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!jsonLdMatches) return sameAsLinks;

  for (const match of jsonLdMatches) {
    const content = match.replace(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>/i,
      ""
    ).replace(/<\/script>/i, "");
    try {
      const data = JSON.parse(content);
      // Handle single object or array
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (
          item["@type"] === "Organization" ||
          item["@type"] === "LocalBusiness" ||
          item["@type"] === "RealEstateAgent"
        ) {
          if (Array.isArray(item.sameAs)) {
            sameAsLinks.push(...item.sameAs);
          } else if (typeof item.sameAs === "string") {
            sameAsLinks.push(item.sameAs);
          }
        }
      }
    } catch {
      // Malformed JSON-LD, skip
    }
  }
  return sameAsLinks;
}

/**
 * Check if H1 on the page contains the brand name.
 */
function checkH1ForBrand(html: string, brand: string): boolean {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!h1Match) return false;
  const h1Text = h1Match[1].replace(/<[^>]*>/g, "").trim();
  return h1Text.toLowerCase().includes(brand.toLowerCase());
}

/**
 * Check if page has Organization schema.
 */
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

// ---------- Platform definitions for scoring ----------

const PLATFORM_WEIGHTS: Record<string, number> = {
  "Google Business Profile": 20,
  "YouTube": 10,
  "Wikipedia": 15,
  "99acres / MagicBricks / Housing.com": 10,
  "LinkedIn": 10,
  "JustDial / IndiaMART": 5,
  "RERA Website": 10,
  "Local News / Press Coverage": 10,
};

// ---------- Route Handler ----------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const brand = sanitizeText(body.brand, 200);
    const city = sanitizeText(body.city || "", 100);
    const websiteRaw = body.website || "";

    if (!brand) {
      return NextResponse.json(
        { error: "Brand name is required" },
        { status: 400 }
      );
    }

    // Validate website if provided
    let safeWebsite = "";
    let origin = "";
    if (websiteRaw) {
      const { valid, url, error } = sanitizeUrl(websiteRaw);
      if (!valid) return NextResponse.json({ error }, { status: 400 });
      safeWebsite = url;
      origin = new URL(url).origin;
    }

    // ---------- Programmatic checks (parallel) ----------

    const programmaticChecks = safeWebsite
      ? Promise.all([
          safeFetch(`${origin}/about`),
          safeFetch(origin, { timeout: 10000 }),
        ])
      : Promise.resolve([null, null] as [Response | null, Response | null]);

    // ---------- AI-based platform presence check ----------

    const cityContext = city ? ` in ${city}` : "";

    const systemPrompt = `You are an expert at assessing brand presence across digital platforms for Indian real estate developers. You will evaluate whether a given brand likely has presence on key platforms based on your knowledge.

Respond ONLY with valid JSON — no markdown fences, no extra text. Use exactly this structure:
{
  "platforms": [
    {
      "platform": "Platform Name",
      "status": "likely_present" | "likely_absent" | "unknown",
      "reasoning": "Brief explanation"
    }
  ]
}`;

    const userPrompt = `Assess the digital presence of the Indian real estate developer "${brand}"${cityContext}.

Check these platforms:
1. Google Business Profile — do they likely have a GBP listing?
2. YouTube — do they have a YouTube channel or videos about their projects?
3. Wikipedia — do they have a Wikipedia page?
4. 99acres / MagicBricks / Housing.com — are they listed on major Indian property portals?
5. LinkedIn — does the company have a LinkedIn page?
6. JustDial / IndiaMART — are they listed on local business directories?
7. RERA Website — are they registered with their state RERA authority?
8. Local News / Press Coverage — any press mentions or news articles?

${safeWebsite ? `Their website is: ${safeWebsite}` : ""}

For each platform, assess whether the brand is likely present, likely absent, or if you're unsure. Base this on your knowledge of the brand — if you don't recognize the brand at all, mark platforms as "unknown" rather than guessing.`;

    const [programmaticResults, aiResponse] = await Promise.all([
      programmaticChecks,
      aiComplete(systemPrompt, userPrompt, 2000),
    ]);

    const [aboutRes, homepageRes] = programmaticResults as [
      Response | null,
      Response | null
    ];

    // ---------- Parse AI response ----------

    const platformImpacts: Record<string, { importance: "critical" | "high" | "medium"; impact: string; action: string }> = {
      "Google Business Profile": {
        importance: "critical",
        impact: "Google AI Overviews draws heavily from GBP — this is the #1 source for local AI answers",
        action: "Claim your Google Business Profile at business.google.com",
      },
      "YouTube": {
        importance: "high",
        impact: "YouTube is the 2nd largest search engine — project videos significantly boost AI visibility",
        action: "Create a YouTube channel with project walkthroughs, construction updates, and buyer testimonials",
      },
      "Wikipedia": {
        importance: "high",
        impact: "Wikipedia is the top source AI models cite — a Wikipedia page massively boosts entity recognition",
        action: "Create a Wikipedia page for the company if it meets notability guidelines (requires third-party coverage)",
      },
      "99acres / MagicBricks / Housing.com": {
        importance: "high",
        impact: "Property portals are high-authority domains that AI models trust for real estate information",
        action: "List all active projects on 99acres, MagicBricks, and Housing.com with complete information",
      },
      "LinkedIn": {
        importance: "medium",
        impact: "LinkedIn company pages contribute to entity recognition and professional credibility signals",
        action: "Create/update your LinkedIn company page with complete information, projects, and employee profiles",
      },
      "JustDial / IndiaMART": {
        importance: "medium",
        impact: "Local directory listings strengthen NAP consistency which helps AI understand your brand as an entity",
        action: "Claim listings on JustDial and IndiaMART with consistent name, address, and phone number",
      },
      "RERA Website": {
        importance: "critical",
        impact: "RERA registration is a strong authority signal — AI models reference RERA data for real estate queries",
        action: "Ensure all projects are RERA registered and the registration numbers are visible on your website",
      },
      "Local News / Press Coverage": {
        importance: "high",
        impact: "Third-party mentions in news correlate 3x more with AI visibility than backlinks (Ahrefs Dec 2025)",
        action: "Build press relationships — project launches, milestones, and CSR activities are all newsworthy",
      },
    };

    let aiPlatforms: { platform: string; status: string; reasoning: string }[] = [];
    try {
      const parsed = JSON.parse(aiResponse);
      aiPlatforms = parsed.platforms || [];
    } catch {
      // If AI response is malformed, fall back to unknown for all
      aiPlatforms = Object.keys(platformImpacts).map((p) => ({
        platform: p,
        status: "unknown",
        reasoning: "Could not determine presence",
      }));
    }

    const platforms: PlatformResult[] = aiPlatforms.map((p) => {
      const meta = platformImpacts[p.platform] || {
        importance: "medium" as const,
        impact: "Contributes to overall brand entity signals",
        action: "Establish presence on this platform",
      };
      return {
        platform: p.platform,
        status: p.status as "likely_present" | "likely_absent" | "unknown",
        importance: meta.importance,
        impact: meta.impact,
        actionIfMissing: meta.action,
      };
    });

    // ---------- Programmatic signals ----------

    const existingEntitySignals: string[] = [];
    const missingEntitySignals: string[] = [];
    let sameAsLinks: string[] = [];
    let homepageHtml = "";

    if (homepageRes && homepageRes.ok) {
      homepageHtml = await homepageRes.text();

      if (checkH1ForBrand(homepageHtml, brand)) {
        existingEntitySignals.push("H1 on homepage mentions the brand name");
      } else {
        missingEntitySignals.push(
          "H1 on homepage does not mention the brand name — add it for stronger entity recognition"
        );
      }

      if (hasOrganizationSchema(homepageHtml)) {
        existingEntitySignals.push("Organization schema (JSON-LD) found on homepage");
        sameAsLinks = extractSameAsLinks(homepageHtml);
        if (sameAsLinks.length > 0) {
          existingEntitySignals.push(
            `Organization schema has ${sameAsLinks.length} sameAs link(s) to external profiles`
          );
        } else {
          missingEntitySignals.push(
            "Organization schema found but no sameAs links — add links to your social profiles and directory listings"
          );
        }
      } else {
        missingEntitySignals.push(
          "No Organization schema found on homepage — add JSON-LD Organization markup with sameAs links"
        );
      }
    }

    if (aboutRes && aboutRes.ok) {
      existingEntitySignals.push("/about page exists and is accessible");
    } else if (safeWebsite) {
      missingEntitySignals.push(
        "/about page not found — create a detailed about page with company history, leadership, and achievements"
      );
    }

    // Add AI-detected signals
    for (const p of platforms) {
      if (p.status === "likely_present") {
        existingEntitySignals.push(`${p.platform} presence detected`);
      } else if (p.status === "likely_absent") {
        missingEntitySignals.push(`No ${p.platform} presence found`);
      }
    }

    // ---------- Score calculation ----------

    let score = 0;
    const maxScore = Object.values(PLATFORM_WEIGHTS).reduce((a, b) => a + b, 0);

    for (const p of platforms) {
      const weight = PLATFORM_WEIGHTS[p.platform] || 5;
      if (p.status === "likely_present") {
        score += weight;
      } else if (p.status === "unknown") {
        score += Math.floor(weight / 2); // Partial credit for unknown
      }
    }

    // Bonus for programmatic signals (up to 10 points)
    if (homepageHtml && checkH1ForBrand(homepageHtml, brand)) score += 3;
    if (homepageHtml && hasOrganizationSchema(homepageHtml)) score += 4;
    if (sameAsLinks.length > 0) score += 3;

    const normalizedScore = Math.min(
      100,
      Math.round((score / (maxScore + 10)) * 100)
    );

    // ---------- Recommendations ----------

    const recommendations: string[] = [];
    for (const p of platforms) {
      if (p.status === "likely_absent") {
        recommendations.push(`${p.platform}: ${p.actionIfMissing}`);
      }
    }
    for (const signal of missingEntitySignals) {
      if (!recommendations.some((r) => r.includes(signal.split(" — ")[0]))) {
        const fix = signal.includes(" — ") ? signal.split(" — ")[1] : signal;
        recommendations.push(fix);
      }
    }

    const result: BrandPresenceResult = {
      brand,
      score: normalizedScore,
      platforms,
      sameAsLinks,
      existingEntitySignals,
      missingEntitySignals,
      recommendations,
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
