import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

/**
 * Google Business Profile Post Generator
 *
 * Generates 4 weeks of GBP posts (8 posts) optimized for local SEO.
 * GBP posts appear in Google Maps and local search results — critical for GEO.
 *
 * Post types: Update, Offer, Event, What's New
 * Each post: 100-300 words, CTA button, image suggestion
 */

export async function POST(req: NextRequest) {
  try {
    const {
      projectName, developerName, location, city,
      configurations, priceRange, amenities, website,
      brandVoice, targetAudience,
    } = await req.json();

    if (!developerName || !city) {
      return NextResponse.json({ error: "developerName and city are required" }, { status: 400 });
    }

    const system = `You generate Google Business Profile posts for Indian real estate developers.
Output ONLY valid JSON. No markdown, no code fences.

Each post must:
- Be 100-300 words (Google truncates longer)
- Include a clear CTA ("Book a site visit", "Get price sheet", "Call now")
- Use specific numbers (price, sq ft, distance to landmarks)
- Mention the FULL project name and developer name (no pronouns)
- Reference REAL local landmarks, schools, IT parks, metro stations near the location
- Be in English with occasional Hindi terms buyers use (crore, lakh, vastu)`;

    const prompt = `Generate 8 Google Business Profile posts for:

**Developer:** ${developerName}
**Project:** ${projectName || "General company post"}
**Location:** ${location || city}
**City:** ${city}
**Configurations:** ${configurations || "Not specified"}
**Price Range:** ${priceRange || "Not specified"}
**Amenities:** ${amenities || "Not specified"}
**Website:** ${website || "Not specified"}
**Brand Voice:** ${brandVoice || "Professional and trustworthy"}
**Target Audience:** ${targetAudience || "Home buyers aged 28-50"}

Generate this JSON structure:
{
  "posts": [
    {
      "week": 1,
      "type": "update|offer|event|whats_new",
      "title": "Post title (max 58 chars)",
      "body": "Full post body, 100-300 words. Specific details, prices, landmarks.",
      "cta": "Book Site Visit|Get Offer|Learn More|Call Now|Sign Up",
      "ctaUrl": "${website || "https://example.com"}/enquiry",
      "imageSuggestion": "What photo to use (e.g. 'Aerial view of project with pool visible')",
      "targetKeyword": "Primary local keyword this post targets"
    }
  ]
}

Post mix across 8 posts:
- 2x Project Updates (construction milestones, new amenities revealed)
- 2x Offers (limited time pricing, festive offers, early bird discounts)
- 2x What's New (new configuration launched, RERA approval received, possession dates)
- 2x Local/Lifestyle (neighborhood guide, connectivity update, school proximity, IT park walkability)

Make every post genuinely useful and specific to ${location || city}. Use REAL landmarks.`;

    const raw = await aiComplete(system, prompt, 3000);

    // Parse JSON
    let result;
    try {
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to parse GBP posts" }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("GBP Posts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GBP post generation failed" },
      { status: 500 }
    );
  }
}
