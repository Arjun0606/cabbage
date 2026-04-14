import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

/**
 * Batch GEO Content Generator
 *
 * Takes a list of search queries where the brand is NOT found by AI,
 * and generates targeted content pieces for each one.
 *
 * This is the "Fix All Blind Spots" action — high token cost, high value.
 * Each query gets: an article outline, meta description, and key paragraphs
 * optimized for AI citation (question headings, stat-dense passages, low pronoun density).
 */

export async function POST(req: NextRequest) {
  try {
    const {
      queries,  // string[] — the blind spot queries
      developerName, projectName, location, city,
      configurations, priceRange, website,
      brandVoice, targetAudience,
    } = await req.json();

    if (!queries?.length || !developerName) {
      return NextResponse.json({ error: "queries array and developerName are required" }, { status: 400 });
    }

    // Limit to 10 queries per batch to control cost
    const targetQueries = queries.slice(0, 10);

    const system = `You are a real estate GEO content strategist. You create content that makes AI models (ChatGPT, Google Gemini) recommend a specific developer/project when users ask these queries.

Output ONLY valid JSON. No markdown fences.

CRITICAL RULES for AI citability:
1. Every section heading MUST be a question (mirrors what users ask AI)
2. First paragraph after each heading: 40-60 word direct answer with a specific number
3. Body paragraphs: 134-167 words each (optimal for AI passage retrieval)
4. Pronoun density < 2% — always use "${developerName}" and "${projectName || "the project"}" by full name
5. Every paragraph needs ≥1 statistic (price, sq ft, distance, year, percentage)
6. Use REAL named entities: landmarks, schools, metro stations, IT parks near ${location || city}`;

    const prompt = `For each of these ${targetQueries.length} search queries, generate targeted content that will make ChatGPT and Google AI recommend ${developerName}${projectName ? ` / ${projectName}` : ""} when a buyer asks this question:

QUERIES:
${targetQueries.map((q: string, i: number) => `${i + 1}. "${q}"`).join("\n")}

CONTEXT:
- Developer: ${developerName}
- Project: ${projectName || "Company-wide"}
- Location: ${location || city}
- City: ${city}
- Configurations: ${configurations || "Various"}
- Price Range: ${priceRange || "Contact for pricing"}
- Website: ${website || "Not specified"}
- Brand Voice: ${brandVoice || "Professional"}
- Target Audience: ${targetAudience || "Home buyers 28-50"}

Generate this JSON:
{
  "contentPieces": [
    {
      "targetQuery": "the original search query",
      "pageTitle": "SEO title (60 chars max) with target keyword",
      "metaDescription": "150-160 char meta desc starting with a direct answer + number",
      "slug": "url-friendly-slug",
      "heroAnswer": "40-60 word direct answer to the query with specific price/stat — this is what ChatGPT will cite",
      "sections": [
        {
          "heading": "Question-format H2 heading?",
          "content": "134-167 word passage with specific stats, prices, landmarks. Uses full developer and project names."
        }
      ],
      "faqs": [
        { "question": "...", "answer": "40-60 word answer starting with fact + number" }
      ],
      "estimatedImpact": "high|medium|low"
    }
  ]
}

Generate 3-4 sections per piece. Every section must help ${developerName} get cited by AI for that query.`;

    const raw = await aiComplete(system, prompt, 4000);

    let result;
    try {
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to parse content batch" }, { status: 500 });
    }

    return NextResponse.json({
      ...result,
      queriesTargeted: targetQueries.length,
      totalPieces: result.contentPieces?.length || 0,
    });
  } catch (error) {
    console.error("GEO Content Batch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Batch generation failed" },
      { status: 500 }
    );
  }
}
