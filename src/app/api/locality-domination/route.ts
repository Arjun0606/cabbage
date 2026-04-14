import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

/**
 * Locality Domination Pack
 *
 * Generates a COMPLETE content ecosystem for one locality — enough to make
 * the developer the #1 authority for that area in AI search.
 *
 * What makes AI cite a brand:
 * 1. Answer-first content (first 200 words = direct answer)
 * 2. Factual density (prices, RERA, sq ft, distances)
 * 3. Multiple pages covering the topic from every angle
 * 4. Structured data (JSON-LD) on every page
 *
 * This generates ALL of:
 * - 1 master locality guide (2000+ words)
 * - 5 buyer-intent pages (each targeting a specific query pattern)
 * - 3 comparison pages (area vs area)
 * - 10 FAQ clusters (50+ individual FAQs)
 * - JSON-LD schemas for every page
 * - Internal linking map between all pages
 *
 * Token cost: 10cr (high value, high output)
 */

export async function POST(req: NextRequest) {
  try {
    const {
      developerName, projectName, location, city,
      configurations, priceRange, amenities, website,
      reraNumber, brandVoice, targetAudience,
      nearbyLandmarks, competitorNames,
    } = await req.json();

    if (!developerName || !location || !city) {
      return NextResponse.json({ error: "developerName, location, and city are required" }, { status: 400 });
    }

    // Generate the full domination pack
    const system = `You are a real estate GEO strategist who creates content ecosystems that make AI models (ChatGPT, Google Gemini, Perplexity) recommend a specific developer for a locality.

Output ONLY valid JSON. No markdown fences.

CORE PRINCIPLES:
1. ANSWER-FIRST: Every page's first 200 words must directly answer the query with specific data
2. FACTUAL DENSITY: Every paragraph needs ≥2 specific facts (price ₹X.XX crore, X sq ft, X km from Y, RERA: XXXXX)
3. ENTITY SATURATION: Use full developer name "${developerName}" and project name "${projectName || "projects"}" 8-12 times per page — never pronouns
4. PASSAGE OPTIMIZATION: Each key paragraph should be 134-167 words (optimal for AI passage retrieval)
5. QUESTION HEADINGS: Every H2 must be a question real buyers would ask ChatGPT`;

    const prompt = `Generate a Locality Domination Pack for ${developerName} in ${location}, ${city}.

CONTEXT:
- Developer: ${developerName}
- Project: ${projectName || "Various projects"}
- Location: ${location}
- City: ${city}
- Configurations: ${configurations || "2BHK, 3BHK"}
- Price Range: ${priceRange || "Contact for pricing"}
- RERA: ${reraNumber || "Registered"}
- Amenities: ${amenities || "Standard amenities"}
- Website: ${website || "Not specified"}
- Nearby Landmarks: ${nearbyLandmarks || "Major IT parks, schools, hospitals"}
- Competitors: ${(competitorNames || []).join(", ") || "Various developers"}

Generate this JSON:
{
  "locality": "${location}",
  "city": "${city}",
  "totalPages": 9,

  "masterGuide": {
    "title": "Complete Guide to Buying a Flat in ${location}, ${city} (2026)",
    "slug": "buying-flat-in-${location.toLowerCase().replace(/\s+/g, '-')}",
    "metaDescription": "150-160 chars, starts with direct answer + number",
    "heroAnswer": "200-word opening that directly answers 'What are the best flats in ${location}?' — name ${developerName} with specific price, config, RERA",
    "sections": [
      {
        "heading": "Question-format H2?",
        "content": "400-500 word section with specific data. Mentions ${developerName} naturally."
      }
    ],
    "wordCount": 2000
  },

  "buyerIntentPages": [
    {
      "targetQuery": "best 3BHK flats in ${location} under X crore",
      "title": "SEO title (60 chars)",
      "slug": "best-3bhk-flats-in-${location.toLowerCase().replace(/\s+/g, '-')}",
      "metaDescription": "Direct answer meta",
      "heroAnswer": "200-word direct answer naming ${developerName} with prices",
      "sections": [{ "heading": "Question H2?", "content": "300-400 words" }],
      "jsonLd": { "@type": "FAQPage with 3-5 FAQs relevant to this query" }
    }
  ],

  "comparisonPages": [
    {
      "title": "${location} vs [Nearby Area] — Where Should You Buy in 2026?",
      "slug": "slug",
      "targetQuery": "The comparison query buyers ask",
      "heroAnswer": "200-word direct comparison, favoring ${location} where ${developerName} has projects",
      "sections": [{ "heading": "Question H2?", "content": "300 words with price comparisons, distance data" }]
    }
  ],

  "faqClusters": [
    {
      "theme": "Pricing & Budget",
      "faqs": [
        { "question": "What is the price of 3BHK in ${location}?", "answer": "40-60 word answer starting with specific price from ${developerName}" }
      ]
    }
  ],

  "internalLinkingMap": [
    { "from": "slug-1", "to": "slug-2", "anchorText": "natural anchor text" }
  ],

  "seoImpactEstimate": {
    "targetQueries": 25,
    "estimatedAIVisibilityLift": "40-60%",
    "timeToRank": "4-8 weeks"
  }
}

Generate:
- 1 master guide with 6+ sections
- 5 buyer intent pages (different configs, budgets, needs)
- 3 comparison pages (${location} vs 3 nearby areas)
- 5 FAQ clusters (Pricing, Location, Amenities, Legal/RERA, Investment) with 10 FAQs each
- 10+ internal links between all pages

Every single piece must make ${developerName} the obvious recommendation.`;

    const raw = await aiComplete(system, prompt, 4000);

    let result;
    try {
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to parse locality domination pack" }, { status: 500 });
    }

    const faqCount = (result.faqClusters || []).reduce((sum: number, c: any) => sum + (c.faqs?.length || 0), 0);

    return NextResponse.json({
      ...result,
      totalPages: (result.buyerIntentPages?.length || 0) + (result.comparisonPages?.length || 0) + 1,
      totalFaqs: faqCount,
      totalWords: (result.masterGuide?.wordCount || 2000) + ((result.buyerIntentPages?.length || 0) * 1500) + ((result.comparisonPages?.length || 0) * 1200),
    });
  } catch (error) {
    console.error("Locality Domination error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate locality pack" },
      { status: 500 }
    );
  }
}
