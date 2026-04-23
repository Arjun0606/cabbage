import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";
import { getTopIndianPropertyPortals, type PropertyPortal } from "@/lib/marketKnowledge";
import { requireActiveSubscription } from "@/lib/db/supabase-server";

/**
 * Portal Optimizer — generates portal-specific listing copy for each
 * top Indian property portal.
 *
 * Previously this asked the model for ONE giant JSON with all portals
 * + GBP in a single ~3500-token response. With 7 portals × 500-word
 * descriptions the model truncated mid-JSON and the parse threw
 * ("Expected ',' or ']' after array element"). Now each portal is its
 * own small, reliable call in parallel.
 */

const PORTAL_MAX = 5; // cap to keep load manageable + responses tight

function slugifyPortal(domain: string): string {
  return domain.replace(/\.[a-z.]+$/i, "").replace(/[^a-z0-9]+/gi, "").toLowerCase() || "portal";
}

interface PortalInput {
  projectName: string;
  developerName: string;
  city: string;
  location: string;
  configurations: string;
  priceRange: string;
  amenities: string;
  reraNumber: string;
}

interface PortalContent {
  title: string;
  description: string;
  tags: string[];
  imageCaptions: string[];
  highlights: string[];
}

function projectBlock(input: PortalInput): string {
  return `PROJECT DETAILS:
- Project Name: ${input.projectName}
- Developer: ${input.developerName || "N/A"}
- City: ${input.city}
- Location: ${input.location}
- Configurations: ${input.configurations || "Not provided"}
- Price Range: ${input.priceRange || "Not provided"}
- RERA Number: ${input.reraNumber || "Not provided"}
- Amenities: ${input.amenities || "Not provided"}`;
}

const SYSTEM_PROMPT = `You are an expert Indian property portal listing optimizer.

CRITICAL HONESTY RULES:
- Do NOT invent specific price-per-sqft figures, rental yield percentages, annual appreciation forecasts, or possession dates. Use only fields supplied.
- Do NOT invent named landmarks (specific schools, hospitals, metro stations, IT parks). Use generic neighbourhood framing.
- Do NOT claim "fast-selling" / "Only X units left" / "Price rising next month" unless supplied.
- When a field (e.g. RERA) isn't supplied, write generic copy or omit the claim. Never fabricate.

Return ONLY valid JSON. No markdown fences, no commentary.`;

async function generatePortalContent(
  portal: PropertyPortal,
  input: PortalInput
): Promise<PortalContent | null> {
  const prompt = `Generate optimised ${portal.name} listing content.

${projectBlock(input)}

Return JSON:
{
  "title": "${portal.name} title (max 70 chars, include location + config + developer)",
  "description": "400-600 word description for ${portal.name}. Bullet points OK. Cover: project overview, configs, amenities, location advantages (generic, not named landmarks), value proposition. Unique to this portal — don't copy generic copy.",
  "tags": ["8-12 search tags"],
  "imageCaptions": ["5 descriptive captions for: facade, floor plan, amenity, location map, sample flat"],
  "highlights": ["5-7 actionable checklist items for filling out the portal form — fields like 'Possession date', 'Floor number', 'Furnishing status'"]
}`;

  try {
    const raw = await aiComplete(SYSTEM_PROMPT, prompt, 1800);
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.title || !parsed.description) return null;
    return {
      title: String(parsed.title).slice(0, 120),
      description: String(parsed.description).slice(0, 5000),
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 15).map(String) : [],
      imageCaptions: Array.isArray(parsed.imageCaptions) ? parsed.imageCaptions.slice(0, 8).map(String) : [],
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 10).map(String) : [],
    };
  } catch {
    return null;
  }
}

async function generateGBP(input: PortalInput): Promise<{ description: string; categories: string[] } | null> {
  const prompt = `Generate Google Business Profile content.

${projectBlock(input)}

Return JSON:
{
  "description": "GBP description, max 750 characters. Keyword-rich, location-focused, concrete.",
  "categories": ["Primary GBP category", "Secondary category 1", "Secondary category 2"]
}`;
  try {
    const raw = await aiComplete(SYSTEM_PROMPT, prompt, 800);
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.description) return null;
    return {
      description: String(parsed.description).slice(0, 750),
      categories: Array.isArray(parsed.categories) ? parsed.categories.slice(0, 4).map(String) : [],
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;

    const body = await req.json();
    const {
      projectName,
      developerName,
      city,
      location,
      configurations,
      priceRange,
      amenities,
      reraNumber,
    } = body;

    if (!projectName || !city || !location) {
      return NextResponse.json(
        { error: "projectName, city, and location are required" },
        { status: 400 }
      );
    }

    const portals = (await getTopIndianPropertyPortals()).slice(0, PORTAL_MAX);
    if (portals.length === 0) {
      return NextResponse.json(
        {
          error:
            "Couldn't discover the current top Indian property portals. Try again in a minute — live web search may be rate-limited.",
        },
        { status: 503 }
      );
    }

    const input: PortalInput = {
      projectName,
      developerName: developerName || "",
      city,
      location,
      configurations: configurations || "",
      priceRange: priceRange || "",
      amenities: amenities || "",
      reraNumber: reraNumber || "",
    };

    // Parallel per-portal generation. Each call is small + stays well
    // inside the model's token budget, so we stop seeing truncated JSON.
    const [gbp, ...portalResults] = await Promise.all([
      generateGBP(input),
      ...portals.map((p) => generatePortalContent(p, input)),
    ]);

    const portalsOut: Record<string, PortalContent> = {};
    const failedPortals: string[] = [];
    portals.forEach((p, i) => {
      const content = portalResults[i];
      const key = slugifyPortal(p.domain);
      if (content) {
        portalsOut[key] = content;
      } else {
        failedPortals.push(p.name);
      }
    });

    if (Object.keys(portalsOut).length === 0) {
      return NextResponse.json(
        { error: "Portal content generation failed for every portal — please retry." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      portals: portalsOut,
      googleBusinessProfile: gbp || null,
      meta: {
        portals: portals.map((p) => ({
          key: slugifyPortal(p.domain),
          name: p.name,
          domain: p.domain,
          submitUrl: p.submitUrl || null,
        })),
        failedPortals,
      },
    });
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
