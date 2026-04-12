import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

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

    const configStr = configurations || "2BHK, 3BHK";
    const priceStr = priceRange || "On request";
    const devStr = developerName || "";
    const reraStr = reraNumber || "";
    const amenStr = amenities || "";

    const hasExisting = currentListingTitle || currentListingDescription;

    const system = `You are India's leading property portal listing optimisation expert. You know the exact algorithms, character limits, and ranking factors for 99acres, MagicBricks, Housing.com, CommonFloor, and PropTiger. You understand what makes a listing rank higher, get more views, and generate more leads on each portal. You write listing content that is keyword-rich, benefit-driven, and formatted for maximum readability on each platform.

IMPORTANT: Return ONLY valid JSON with the exact structure specified. No markdown fences, no commentary outside the JSON.`;

    let improvementBlock = "";
    if (hasExisting) {
      improvementBlock = `
CURRENT LISTING (analyse and suggest improvements):
- Current Title: ${currentListingTitle || "Not provided"}
- Current Description: ${currentListingDescription || "Not provided"}

Include an "improvements" array in your response with 5-8 specific, actionable suggestions for improving the current listing (what to change and why).`;
    }

    const prompt = `Generate optimised listing content for ALL major Indian property portals for this project.

PROJECT DETAILS:
- Project Name: ${projectName}
- Developer: ${devStr || "N/A"}
- City: ${city}
- Location: ${location}
- Configurations: ${configStr}
- Price Range: ${priceStr}
- RERA Number: ${reraStr || "Applied / Awaited"}
- Amenities: ${amenStr || "Standard amenities"}
${improvementBlock}

Generate portal-specific optimised content and return JSON with this EXACT structure:
{
  "portals": {
    "ninetyNineAcres": {
      "title": "Optimised title for 99acres (max 70 chars, include location + config + developer name)",
      "description": "Full optimised description for 99acres (500-700 words). 99acres rewards detailed, structured descriptions. Use bullet points, cover: project overview, configurations, amenities, location advantages, connectivity, investment potential, developer track record, RERA info. Include relevant search keywords naturally.",
      "tags": ["keyword1", "keyword2", "...10-15 relevant search tags for 99acres"],
      "imageCaptions": ["Caption for elevation/facade shot", "Caption for floor plan", "Caption for amenity photo", "Caption for location map", "Caption for interior/sample flat"],
      "highlights": ["Key fields to fill on 99acres portal for better ranking — e.g., 'Possession date', 'Floor number', 'Furnishing status', etc."]
    },
    "magicBricks": {
      "title": "Optimised title for MagicBricks (max 60 chars, MagicBricks prefers concise titles)",
      "description": "Full optimised description for MagicBricks (400-600 words). MagicBricks favours conversational, benefit-focused descriptions. Write in a warm, engaging style. Highlight lifestyle benefits, neighbourhood advantages, and value proposition. Include price-per-sqft if possible.",
      "tags": ["keyword1", "keyword2", "...10-15 relevant tags"],
      "imageCaptions": ["Caption 1", "Caption 2", "Caption 3", "Caption 4", "Caption 5"],
      "highlights": ["Key MagicBricks-specific fields to fill for ranking"]
    },
    "housingCom": {
      "title": "Optimised title for Housing.com (max 80 chars, Housing.com allows longer titles)",
      "description": "Full optimised description for Housing.com (400-600 words). Housing.com attracts younger, tech-savvy buyers. Use modern language, emphasise lifestyle and investment angles. Mention walkability, social infrastructure, and work-from-home friendly features.",
      "tags": ["keyword1", "keyword2", "...10-15 relevant tags"],
      "imageCaptions": ["Caption 1", "Caption 2", "Caption 3", "Caption 4", "Caption 5"],
      "highlights": ["Key Housing.com-specific fields to fill for ranking"]
    },
    "commonFloor": {
      "title": "Optimised title for CommonFloor/PropTiger (max 70 chars)",
      "description": "Optimised description for CommonFloor/PropTiger (300-500 words). Focus on factual details, specifications, and neighbourhood data. These portals attract research-heavy buyers.",
      "tags": ["keyword1", "keyword2", "...8-10 relevant tags"],
      "imageCaptions": ["Caption 1", "Caption 2", "Caption 3", "Caption 4", "Caption 5"],
      "highlights": ["Key fields to fill on CommonFloor/PropTiger"]
    }
  },
  "googleBusinessProfile": {
    "description": "Google Business Profile description (750 chars max). Keyword-rich, location-focused, include configurations and price range. Optimised for local search.",
    "categories": ["Primary GBP category", "Secondary category 1", "Secondary category 2"]
  },
  "justDial": {
    "description": "JustDial listing description (300-400 words). Include contact-driving language, mention all configurations, price range, and location advantages. JustDial users want quick info."
  }${hasExisting ? ',\n  "improvements": ["Specific improvement 1", "Specific improvement 2", "..."]' : ""}
}

Rules:
- Each portal description MUST be unique — do not copy-paste between portals. Different portals have different audiences and algorithms.
- Titles must respect each portal's character limit strictly.
- Tags should include: location keywords, configuration keywords (2BHK, 3BHK), developer name, project name, nearby landmarks, "new launch" or "ready to move" as relevant.
- Image captions should be descriptive and keyword-rich (not generic "Image 1").
- Highlights should be actionable checklist items for the person filling out the portal form.`;

    const raw = await aiComplete(system, prompt, 3500);

    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();
    const result = JSON.parse(cleaned);

    // Validate expected fields
    const requiredPortals = [
      "ninetyNineAcres",
      "magicBricks",
      "housingCom",
      "commonFloor",
    ];
    if (!result.portals) {
      return NextResponse.json(
        { error: "Generated content missing portals object" },
        { status: 500 }
      );
    }
    for (const portal of requiredPortals) {
      if (!(portal in result.portals)) {
        return NextResponse.json(
          { error: `Generated content missing portal: ${portal}` },
          { status: 500 }
        );
      }
    }
    if (!result.googleBusinessProfile) {
      return NextResponse.json(
        { error: "Generated content missing googleBusinessProfile" },
        { status: 500 }
      );
    }
    if (!result.justDial) {
      return NextResponse.json(
        { error: "Generated content missing justDial" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Portal optimizer error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Portal listing optimization failed",
      },
      { status: 500 }
    );
  }
}
