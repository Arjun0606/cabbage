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
      usps,
      reraNumber,
      targetAudience,
      adPlatform,
    } = await req.json();

    if (!projectName || !city || !location) {
      return NextResponse.json(
        { error: "projectName, city, and location are required" },
        { status: 400 }
      );
    }

    const platform = adPlatform || "both";
    const devStr = developerName || "Premium Developer";
    const configStr = configurations || "2BHK, 3BHK";
    const priceStr = priceRange || "On request";
    const uspStr = usps || "Premium amenities, great location";
    const reraStr = reraNumber ? `RERA: ${reraNumber}` : "";
    const audienceStr = targetAudience || "Homebuyers and investors in " + city;

    const googleSection = platform === "meta"
      ? "Skip the Google Ads section — set all Google fields to empty arrays."
      : `Generate Google Responsive Search Ads (5 ad sets worth of assets):
- 15 headlines: each MUST be 30 characters or fewer (this is a hard Google limit — count carefully)
- 4 descriptions: each MUST be 90 characters or fewer
- 4 sitelink extensions: Floor Plans, Pricing, Location, Book Visit — each with a 25-char headline and 35-char description line 1 and description line 2
- 6 callout extensions: each under 25 characters, highlighting key USPs
- Structured snippets: pick a relevant header (Amenities, Neighborhoods, Types) and provide 4-6 values`;

    const metaSection = platform === "google"
      ? "Skip the Meta Ads section — set metaAds to an empty array."
      : `Generate Meta/Facebook/Instagram Ads (3 ad sets):
Ad Set 1 — Lifestyle angle: emotional, aspirational, focus on living experience
Ad Set 2 — Investment angle: ROI, appreciation, rental yield potential
Ad Set 3 — Urgency angle: limited units, price increase, construction progress

For each ad set provide:
- primaryText: 125-150 words, compelling copy with line breaks for readability
- headline: punchy, under 40 characters
- description: supporting text, under 30 words
- cta: recommended CTA button (Learn More / Book Now / Get Offer / Contact Us)
- format: recommended ad format (carousel / single_image / video) with reasoning
- audience: targeting suggestions with location radius (km), interests, behaviors, demographics, and lookalike suggestions`;

    const systemPrompt = `You are an expert performance marketing specialist for Indian real estate. You create high-converting Google Ads and Meta Ads copy that drives qualified leads for residential projects. You understand Google Ads character limits strictly (headlines: 30 chars, descriptions: 90 chars) and Meta best practices (thumb-stopping copy, emotional triggers, clear CTAs).

IMPORTANT: Return ONLY valid JSON — no markdown fences, no commentary outside the JSON.`;

    const userPrompt = `Generate a complete paid ads content pack for:

PROJECT DETAILS:
- Project: ${projectName}
- Developer: ${devStr}
- City: ${city}
- Location: ${location}
- Configurations: ${configStr}
- Price Range: ${priceStr}
- USPs: ${uspStr}
${reraStr ? `- ${reraStr}` : ""}
- Target Audience: ${audienceStr}
- Platform: ${platform}

${googleSection}

${metaSection}

Also generate:
- 20 negative keywords (irrelevant search terms to exclude — e.g., "rent", "PG", "hostel", "office space", "commercial", etc. that waste ad spend)
- Budget allocation suggestion: recommended Google vs Meta spend split with reasoning (consider the city, project type, and audience)
- 3-4 A/B test recommendations (what to test first for better performance)

Return JSON with this EXACT structure:
{
  "googleAds": {
    "headlines": ["headline1 (max 30 chars)", "...up to 15"],
    "descriptions": ["desc1 (max 90 chars)", "...up to 4"],
    "sitelinks": [
      { "headline": "Floor Plans", "desc1": "View all layouts", "desc2": "2BHK to 4BHK options" }
    ],
    "callouts": ["Free Parking", "...up to 6"],
    "snippets": { "header": "Amenities", "values": ["Swimming Pool", "Gym", "..."] }
  },
  "metaAds": [
    {
      "primaryText": "Lifestyle ad copy...",
      "headline": "Short punchy headline",
      "description": "Supporting description",
      "cta": "Learn More",
      "format": "carousel",
      "audience": {
        "locationRadius": "15km around ${location}",
        "interests": ["Home Decor", "Real Estate", "..."],
        "behaviors": ["Engaged Shoppers", "..."],
        "demographics": "Age 28-50, household income top 30%",
        "lookalike": "Lookalike of past site visitors and lead form submitters"
      }
    }
  ],
  "negativeKeywords": ["rent", "PG", "...20 total"],
  "budgetSplit": {
    "google": "percentage (e.g., 60)",
    "meta": "percentage (e.g., 40)",
    "reason": "Why this split makes sense for this project/city"
  },
  "abTests": [
    "Test 1 description — what to test and why",
    "Test 2...",
    "Test 3..."
  ]
}

Rules:
- Google Ad headlines MUST be 30 characters or fewer. Count each one. If it exceeds 30 chars, shorten it.
- Google Ad descriptions MUST be 90 characters or fewer.
- Sitelink headlines MUST be 25 characters or fewer.
- Callouts MUST be 25 characters or fewer.
- Meta ad primary text should use line breaks and emojis sparingly for readability.
- Negative keywords should be specific to real estate lead gen (exclude renters, commercial, irrelevant cities).
- Budget split percentages must add up to 100.
- A/B test recommendations should be actionable and specific to this project.
- ${reraStr ? "Include the RERA number in at least one Google description and one Meta ad." : "Do not invent a RERA number."}`;

    const raw = await aiComplete(systemPrompt, userPrompt, 3500);

    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const result = JSON.parse(cleaned);

    // Normalize budget split values to numbers
    const budgetSplit = result.budgetSplit || {};
    if (typeof budgetSplit.google === "string") {
      budgetSplit.google = parseInt(budgetSplit.google, 10) || 60;
    }
    if (typeof budgetSplit.meta === "string") {
      budgetSplit.meta = parseInt(budgetSplit.meta, 10) || 40;
    }

    return NextResponse.json({
      googleAds: {
        headlines: result.googleAds?.headlines || [],
        descriptions: result.googleAds?.descriptions || [],
        sitelinks: result.googleAds?.sitelinks || [],
        callouts: result.googleAds?.callouts || [],
        snippets: result.googleAds?.snippets || { header: "", values: [] },
      },
      metaAds: result.metaAds || [],
      negativeKeywords: result.negativeKeywords || [],
      budgetSplit: {
        google: budgetSplit.google ?? 60,
        meta: budgetSplit.meta ?? 40,
        reason: budgetSplit.reason || "",
      },
      abTests: result.abTests || [],
    });
  } catch (error) {
    console.error("Ads generator error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ads content generation failed",
      },
      { status: 500 }
    );
  }
}
