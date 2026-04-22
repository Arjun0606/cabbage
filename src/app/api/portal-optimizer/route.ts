import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";
import { getTopIndianPropertyPortals } from "@/lib/marketKnowledge";

/**
 * Portal Optimizer — generates portal-specific listing copy for the
 * top Indian property portals.
 *
 * The portal list is discovered LIVE via marketKnowledge (ChatGPT web
 * search, cached 6h). No hardcoded 99acres / MagicBricks / Housing /
 * CommonFloor / PropTiger here — when the market shifts, the
 * generator picks up the new portals automatically.
 */

function slugifyPortal(domain: string): string {
  return domain.replace(/\.[a-z.]+$/i, "").replace(/[^a-z0-9]+/gi, "").toLowerCase() || "portal";
}

export async function POST(req: NextRequest) {
  try {
    const {
      projectName,
      developerName,
      city,
      location,
      configurations,
      priceRange,
      amenities,
      reraNumber,
      currentListingTitle,
      currentListingDescription,
    } = await req.json();

    if (!projectName || !city || !location) {
      return NextResponse.json(
        { error: "projectName, city, and location are required" },
        { status: 400 }
      );
    }

    const portals = await getTopIndianPropertyPortals();
    if (portals.length === 0) {
      return NextResponse.json(
        {
          error:
            "Couldn't discover the current top Indian property portals. Try again in a minute — live web search may be rate-limited.",
        },
        { status: 503 }
      );
    }

    const configStr = configurations || "";
    const priceStr = priceRange || "";
    const devStr = developerName || "";
    const reraStr = reraNumber || "";
    const amenStr = amenities || "";

    const hasExisting = currentListingTitle || currentListingDescription;

    // Give each portal a stable JSON key derived from its domain, and
    // ask the model to return an object keyed by that slug.
    const portalList = portals
      .map((p) => `- ${p.name} (${p.domain}) — key "${slugifyPortal(p.domain)}"`)
      .join("\n");
    const portalKeys = portals.map((p) => slugifyPortal(p.domain));

    const system = `You are an expert Indian property portal listing optimizer. You write listing content that is keyword-rich, benefit-driven, and formatted for maximum readability on each portal.

CRITICAL HONESTY RULES:
- Do NOT invent specific price-per-sqft figures, rental yield percentages, annual appreciation forecasts, or possession dates. Use only the price range / RERA / configurations / amenities supplied in the data.
- Do NOT invent named landmarks (specific schools, hospitals, metro station names, IT parks) "near" the location. Use generic neighbourhood framing.
- Do NOT claim "fast-selling" / "Only X units left" / "Price rising next month" unless the customer has supplied those claims.
- When a field (e.g. RERA) isn't supplied, write generic copy or omit the claim. Never fabricate.

Return ONLY valid JSON with the exact structure specified. No markdown fences, no commentary outside the JSON.`;

    const improvementBlock = hasExisting
      ? `
CURRENT LISTING (analyse and suggest improvements):
- Current Title: ${currentListingTitle || "Not provided"}
- Current Description: ${currentListingDescription || "Not provided"}

Include an "improvements" array in your response with 5-8 specific, actionable suggestions.`
      : "";

    const prompt = `Generate optimised listing content for each of the Indian property portals below.

PROJECT DETAILS:
- Project Name: ${projectName}
- Developer: ${devStr || "N/A"}
- City: ${city}
- Location: ${location}
- Configurations: ${configStr || "Not provided"}
- Price Range: ${priceStr || "Not provided"}
- RERA Number: ${reraStr || "Not provided"}
- Amenities: ${amenStr || "Not provided"}
${improvementBlock}

ACTIVE PORTALS (generate a listing for EACH):
${portalList}

Return JSON with this shape — use the exact key shown in parentheses for each portal:

{
  "portals": {
    ${portalKeys.map((k) => `"${k}": { "title": "...", "description": "...", "tags": ["..."], "imageCaptions": ["..."], "highlights": ["..."] }`).join(",\n    ")}
  },
  "googleBusinessProfile": {
    "description": "GBP description (max 750 chars). Keyword-rich, location-focused.",
    "categories": ["Primary GBP category", "Secondary category 1", "Secondary category 2"]
  }${hasExisting ? ',\n  "improvements": ["Specific improvement 1", "Specific improvement 2", "..."]' : ""}
}

Rules:
- Each portal description must be unique — do NOT copy between portals.
- Respect each portal's typical character limits (60-80 char titles, 400-700 word descriptions).
- Tags: location + configuration + developer + project name + "new launch" or "ready to move" when the input supports it.
- Image captions should be descriptive and keyword-rich, not generic "Image 1".
- Highlights are actionable checklist items for the person filling out the portal form.`;

    const raw = await aiComplete(system, prompt, 3500);

    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const result = JSON.parse(cleaned);

    if (!result.portals || typeof result.portals !== "object") {
      return NextResponse.json(
        { error: "Generated content missing portals object" },
        { status: 500 }
      );
    }

    // Re-attach portal display metadata so the UI knows which domain /
    // display name each key maps to. Callers that render the list can
    // iterate `meta.portals` instead of hardcoding display names.
    const meta = {
      portals: portals.map((p) => ({
        key: slugifyPortal(p.domain),
        name: p.name,
        domain: p.domain,
        submitUrl: p.submitUrl || null,
      })),
    };

    return NextResponse.json({ ...result, meta });
  } catch (error) {
    console.error("Portal optimizer error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Portal listing optimization failed",
      },
      { status: 500 }
    );
  }
}
