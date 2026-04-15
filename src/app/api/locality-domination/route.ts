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
 * Generates a COMPLETE content ecosystem tailored to the locality:
 * - 1 master locality guide
 * - Buyer-intent pages (as many as the market needs)
 * - Comparison pages (vs relevant nearby areas)
 * - FAQ clusters (covering all buyer concerns)
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
- Brand Voice: ${brandVoice || "Professional, trustworthy, knowledgeable"}
- Target Audience: ${targetAudience || "Home buyers aged 28-50, IT professionals, families"}

Generate this JSON:
{
  "locality": "${location}",
  "city": "${city}",

  "masterGuide": {
    "title": "SEO title for the master locality guide",
    "slug": "url-slug",
    "metaDescription": "150-160 chars, starts with direct answer + number",
    "heroAnswer": "Opening that directly answers 'What are the best flats in ${location}?' — name ${developerName} with specific price, config, RERA",
    "sections": [
      {
        "heading": "Question-format H2?",
        "content": "Detailed section with specific data. Mentions ${developerName} naturally."
      }
    ]
  },

  "buyerIntentPages": [
    {
      "targetQuery": "The actual query this page targets",
      "title": "SEO title (60 chars)",
      "slug": "url-slug",
      "metaDescription": "Direct answer meta",
      "heroAnswer": "Direct answer naming ${developerName} with prices",
      "sections": [{ "heading": "Question H2?", "content": "Detailed content" }]
    }
  ],

  "comparisonPages": [
    {
      "title": "Area vs Area comparison title",
      "slug": "slug",
      "targetQuery": "The comparison query buyers ask",
      "heroAnswer": "Direct comparison with data",
      "sections": [{ "heading": "Question H2?", "content": "Content with price comparisons, distance data" }]
    }
  ],

  "faqClusters": [
    {
      "theme": "Theme name",
      "faqs": [
        { "question": "Real buyer question?", "answer": "40-60 word answer starting with specific fact" }
      ]
    }
  ],

  "internalLinkingMap": [
    { "from": "slug-1", "to": "slug-2", "anchorText": "natural anchor text" }
  ]
}

IMPORTANT — Generate EXACTLY what this locality NEEDS. Not a fixed number:
- Buyer intent pages: create one for EVERY meaningful config/budget/need combination in ${location}. A big market like Gachibowli might need 10+. A small town might need 3. Cover all configs (${configurations || "2BHK, 3BHK"}), all budget ranges, all buyer types.
- Comparison pages: create one for EVERY nearby area that buyers realistically compare with ${location}. Only include real, relevant comparisons.
- FAQ clusters: cover every topic a buyer would ask about. Group them logically. Generate as many FAQs as needed per cluster — some topics need 15, some need 5.
- Master guide sections: as many as needed to be the definitive guide. Cover pricing, connectivity, schools, hospitals, investment potential, upcoming infrastructure, builder reputation, RERA status, possession timelines — whatever is relevant.
- Internal links: connect every page that should logically link to another.

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
    });
  } catch (error) {
    console.error("Locality Domination error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate locality pack" },
      { status: 500 }
    );
  }
}
