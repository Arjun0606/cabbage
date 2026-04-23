import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";
import { formatWritingInstructions } from "@/lib/writingInstructions";
import { requireActiveSubscription } from "@/lib/db/supabase-server";

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
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;

    const {
      projectName, developerName, location, city,
      configurations, priceRange, amenities, website,
      brandVoice, productInfo, writingInstructions,
    } = await req.json();

    if (!developerName || !city) {
      return NextResponse.json({ error: "developerName and city are required" }, { status: 400 });
    }

    const system = `You generate Google Business Profile posts for Indian real estate developers.
Output ONLY valid JSON. No markdown, no code fences.

CRITICAL HONESTY RULES:
- Do NOT invent specific distances, metro station names, school names, or hospital names near the location. Use generic neighbourhood framing ("schools in ${location || city}", "metro connectivity", "minutes from major landmarks") unless a real name is supplied in the data.
- Do NOT invent specific prices, per-sq-ft figures, discount percentages, or possession dates. Use the exact price range provided or omit the claim.
- Never fabricate offers ("No GST for first N buyers" etc.) — those are developer-authorised marketing claims.

Each post must:
- Be 100-300 words (Google truncates longer)
- Include a clear CTA ("Book a site visit", "Get price sheet", "Call now")
- Mention the FULL project name and developer name (no pronouns)
- Use specific numbers ONLY from the supplied data (price range, configurations, RERA number)
- Be in English with occasional Hindi terms buyers use (crore, lakh, vastu)`;

    const prompt = `Generate Google Business Profile posts for:

**Developer:** ${developerName}
**Project:** ${projectName || "General company post"}
**Location:** ${location || city}
**City:** ${city}
**Configurations:** ${configurations || "Not specified"}
**Price Range:** ${priceRange || "Not specified"}
**Amenities:** ${amenities || "Not specified"}
**Website:** ${website || "Not specified"}
**Brand Voice:** ${brandVoice || "Professional and trustworthy"}
${productInfo ? `**Product Info:** ${productInfo.substring(0, 400)}` : ""}

Generate this JSON structure:
{
  "posts": [
    {
      "week": 1,
      "type": "update|offer|event|whats_new",
      "title": "Post title (max 58 chars)",
      "body": "Full post body, 100-300 words. Specific details, prices, landmarks.",
      "cta": "Book Site Visit|Get Offer|Learn More|Call Now|Sign Up",
      "ctaUrl": "${website || ""}/enquiry",
      "imageSuggestion": "What photo to use",
      "targetKeyword": "Primary local keyword this post targets"
    }
  ]
}

Generate as many posts as this business needs. Consider:
- What stage is the project? (pre-launch needs teasers, under-construction needs updates, ready-to-move needs offers)
- What matters to buyers in ${location || city}? (connectivity, schools, investment potential?)
- What types work best: updates, offers, events, what's new, local lifestyle, testimonials
- Cover enough variety for consistent posting over the next month

Make every post useful and specific to the data above. Reference ${location || city} by name, but do not invent specific landmarks or distances.
${formatWritingInstructions(writingInstructions, "gbpPosts", "GBP post")}`;

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
