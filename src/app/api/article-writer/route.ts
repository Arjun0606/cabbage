import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

type ArticleType =
  | "locality_guide"
  | "project_showcase"
  | "market_analysis"
  | "buyer_guide"
  | "comparison"
  | "investment"
  | "nri_guide";

const ARTICLE_TYPE_INSTRUCTIONS: Record<ArticleType, string> = {
  locality_guide:
    "Write a comprehensive locality guide. Cover connectivity (roads, metro, rail), social infrastructure (schools, hospitals, malls), upcoming developments, livability factors, and why this area is ideal for homebuyers.",
  project_showcase:
    "Write a detailed project showcase article. Highlight the developer's track record, project design and architecture, amenities, floor plans, construction quality, RERA details, and possession timeline.",
  market_analysis:
    "Write a real estate market analysis. Cover price trends, supply-demand dynamics, rental yields, appreciation potential, comparison with neighboring micro-markets, and expert outlook.",
  buyer_guide:
    "Write a homebuyer's guide. Cover the buying process step-by-step, documentation checklist, loan eligibility, RERA verification, hidden costs, negotiation tips, and red flags to watch for.",
  comparison:
    "Write a comparison article. Compare this project with 2-3 competing projects in the area across price, location, amenities, developer reputation, and value for money. Be balanced but highlight unique advantages.",
  investment:
    "Write an investment-focused article. Cover ROI potential, rental yield estimates, capital appreciation trends, infrastructure catalysts, risk factors, and exit strategy considerations.",
  nri_guide:
    "Write a guide specifically for NRI (Non-Resident Indian) buyers. Cover FEMA regulations, repatriation rules, Power of Attorney process, NRE/NRO account usage for transactions, tax implications (TDS, capital gains), virtual site visit and video tour options, property management services, and currency conversion considerations (USD/AED/GBP to INR).",
};

export async function POST(req: NextRequest) {
  try {
    const {
      projectName,
      developerName,
      location,
      city,
      configurations,
      priceRange,
      usps,
      topic,
      targetKeyword,
      articleType,
    } = await req.json();

    if (!projectName || !location || !city) {
      return NextResponse.json(
        { error: "projectName, location, and city are required" },
        { status: 400 }
      );
    }

    if (!articleType || !ARTICLE_TYPE_INSTRUCTIONS[articleType as ArticleType]) {
      return NextResponse.json(
        {
          error: `Invalid articleType. Must be one of: ${Object.keys(ARTICLE_TYPE_INSTRUCTIONS).join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (!targetKeyword) {
      return NextResponse.json(
        { error: "targetKeyword is required" },
        { status: 400 }
      );
    }

    const typeInstruction = ARTICLE_TYPE_INSTRUCTIONS[articleType as ArticleType];

    const systemPrompt = `You are an expert real estate content writer specializing in Indian real estate. You write SEO-optimized, engaging, and informative articles that rank well on Google and get cited by AI search engines (Google AI Overview, ChatGPT, Perplexity).

Your writing style:
- Professional yet conversational — avoid jargon overload
- Data-driven with specific numbers, distances, and facts
- Locally relevant — mention real landmarks, roads, neighborhoods, and infrastructure projects
- Structured with clear H2/H3 headings for scannability
- Naturally incorporate the target keyword (aim for 1-1.5% keyword density)
- Include calls-to-action that feel helpful, not pushy
- End with a FAQ section (3-5 questions) with concise, direct answers optimized for AI/GEO visibility

IMPORTANT: Return your response as valid JSON with this exact structure:
{
  "title": "SEO-optimized title (50-60 chars ideally, must include target keyword)",
  "metaDescription": "Compelling meta description (150-160 chars, includes target keyword and a value proposition)",
  "content": "Full article in markdown format with ## and ### headings. 1500-2000 words.",
  "faqs": [
    { "question": "...", "answer": "..." }
  ],
  "suggestedInternalLinks": ["topic or page that should link to/from this article"]
}`;

    const userPrompt = `Write a full SEO-optimized article with the following details:

**Article Type:** ${articleType}
**Type-Specific Instructions:** ${typeInstruction}

**Project Details:**
- Project Name: ${projectName}
- Developer: ${developerName || "Not specified"}
- Location: ${location}
- City: ${city}
- Configurations: ${configurations || "2BHK, 3BHK"}
- Price Range: ${priceRange || "Not specified"}
- USPs: ${usps || "Not specified"}

**SEO Details:**
- Topic: ${topic || articleType.replace(/_/g, " ")}
- Target Keyword: ${targetKeyword}

**Requirements:**
1. Write 1500-2000 words
2. Use ## for H2 headings and ### for H3 subheadings
3. Naturally weave "${targetKeyword}" throughout the article (8-12 occurrences)
4. Reference real areas, landmarks, roads, and infrastructure near ${location}, ${city}
5. Include a compelling introduction that hooks the reader
6. Add 2-3 CTA sections naturally within the article (e.g., "Schedule a Site Visit", "Download Brochure", "Talk to Our Experts")
7. End with a FAQ section of 3-5 questions that people commonly ask about this topic
8. Suggest 4-6 internal link topics that relate to this article
9. Make every paragraph valuable — no filler content

Return ONLY valid JSON. No markdown code blocks around the JSON.`;

    const raw = await aiComplete(systemPrompt, userPrompt, 4000);

    let parsed;
    try {
      // Strip markdown code fences if the model wraps the JSON
      const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON" },
        { status: 502 }
      );
    }

    // Count words in the content
    const wordCount = (parsed.content || "")
      .replace(/[#*_\[\]()]/g, "")
      .split(/\s+/)
      .filter((w: string) => w.length > 0).length;

    return NextResponse.json({
      title: parsed.title || "",
      metaDescription: parsed.metaDescription || "",
      targetKeyword,
      content: parsed.content || "",
      wordCount,
      faqs: parsed.faqs || [],
      suggestedInternalLinks: parsed.suggestedInternalLinks || [],
    });
  } catch (error) {
    console.error("Article writer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Article generation failed" },
      { status: 500 }
    );
  }
}
