import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

/**
 * Prompt Volume Tracker — Profound-style
 *
 * Discovers what REAL home buyers are asking AI about a specific locality/city.
 * This is keyword research for AI search — not Google keywords, but AI prompts.
 *
 * Returns:
 * - Top buyer prompts by category (discovery, comparison, decision, investment)
 * - Estimated prompt volume (high/medium/low based on market size)
 * - Which prompts the brand currently appears for vs doesn't
 * - Opportunity score per prompt
 */

export async function POST(req: NextRequest) {
  try {
    const { city, locality, segment, brand } = await req.json();

    if (!city) {
      return NextResponse.json({ error: "city is required" }, { status: 400 });
    }

    const system = `You are an AI search behavior analyst specializing in Indian real estate. You know exactly what home buyers type into ChatGPT, Google AI, and Perplexity when searching for properties.

Output ONLY valid JSON. No markdown fences.

Your data should reflect REAL buyer behavior — not theoretical queries. Think about:
- What a 30-year-old IT professional in ${city} would actually ask ChatGPT
- What an NRI looking to invest in ${city} would search
- What a first-time buyer confused about RERA would ask
- What someone comparing 2 areas would type`;

    const prompt = `Generate a comprehensive Prompt Volume analysis for real estate in ${locality || city}, ${city}.

MARKET: ${city}
${locality ? `LOCALITY: ${locality}` : ""}
SEGMENT: ${segment || "Residential (2BHK, 3BHK, Villas)"}
${brand ? `BRAND TO CHECK: ${brand}` : ""}

Generate this JSON:
{
  "market": "${locality || city}, ${city}",
  "totalEstimatedPrompts": "Estimated monthly AI search prompts for real estate in this market (e.g. '2,500-5,000')",

  "promptCategories": [
    {
      "category": "Discovery",
      "description": "Buyers exploring options — highest volume",
      "estimatedVolume": "high|medium|low",
      "prompts": [
        {
          "prompt": "The exact query a buyer would type",
          "volume": "high|medium|low",
          "buyerIntent": "browsing|comparing|ready_to_buy|investing",
          "opportunity": 1-10,
          "difficulty": "easy|medium|hard",
          "idealContent": "What type of content would win this prompt (e.g. 'Locality guide with price comparisons')"
        }
      ]
    },
    {
      "category": "Comparison",
      "description": "Buyers comparing areas or builders",
      "estimatedVolume": "medium",
      "prompts": [...]
    },
    {
      "category": "Decision",
      "description": "Buyers close to purchasing — highest value",
      "estimatedVolume": "medium",
      "prompts": [...]
    },
    {
      "category": "Investment",
      "description": "Investors and NRIs evaluating ROI",
      "estimatedVolume": "low",
      "prompts": [...]
    }
  ],

  "topOpportunities": [
    {
      "prompt": "Highest opportunity prompt",
      "reason": "Why this is a great opportunity for a developer",
      "suggestedAction": "What to create to win this prompt"
    }
  ],

  "marketInsights": {
    "dominantBuyerProfile": "Who is searching most (e.g. 'IT professionals aged 28-35, budget 80L-1.5Cr')",
    "peakSearchTimes": "When buyers search most (e.g. 'Weekday evenings, Sunday mornings')",
    "trendingTopics": ["3 trending real estate topics in this market"],
    "underservedQueries": ["3 queries with high demand but low quality answers from AI"]
  }
}

Generate as many prompts as this market warrants per category. A large market like Gachibowli or Whitefield will have many more buyer queries than a small town. Cover every realistic query a buyer would ask AI.
Use REAL landmarks, schools, IT parks specific to ${locality || city}.`;

    const raw = await aiComplete(system, prompt, 3000);

    let result;
    try {
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to parse prompt volumes" }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Prompt volumes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Prompt volume analysis failed" },
      { status: 500 }
    );
  }
}
