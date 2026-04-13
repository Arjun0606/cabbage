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
    const body = await req.json();
    const {
      projectName, developerName, location, city,
      configurations, priceRange, usps, topic, targetKeyword, articleType,
      // Brand context
      brandVoice, brandValues, brandVision, targetAudience,
      productInfo, amenities, reraNumber, status,
      allProjects, competitors,
    } = body;

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

    const systemPrompt = `You are an expert real estate content writer who writes articles specifically optimized to be CITED BY AI SEARCH ENGINES (ChatGPT, Google AI Overview, Perplexity). You understand Generative Engine Optimization (GEO) deeply.

CRITICAL — AI CITABILITY RULES (based on Princeton/Georgia Tech research):

1. QUESTION-BASED HEADINGS: Every H2 must be a question that a home buyer would ask. Example: "## What is the price of 3BHK flats in Gachibowli?" NOT "## Pricing Details"

2. ANSWER TARGET PATTERN: Immediately after every question H2, write a 40-60 word direct answer paragraph. This is what Google AI Overview and ChatGPT extract. Start with a definition or direct answer: "${projectName} is..." or "The price of..." — NOT "Let's explore..." or "In this section..."

3. PASSAGE LENGTH: Key paragraphs should be 134-167 words — research shows this is the optimal length for AI citation. Each passage must be SELF-CONTAINED (understandable without reading anything else on the page).

4. LOW PRONOUN DENSITY: Never say "it", "they", "this project", "their". Always use the full name: "${projectName}", "${developerName}", "${location}". AI extracts individual passages — pronouns make them meaningless out of context.

5. STATISTICAL DENSITY: Every passage must contain at least ONE specific number: price per sq ft (₹X,XXX/sq ft), distance (X km from Y), area (X,XXX sq ft), year, percentage, or named source. NO vague quantifiers like "many", "several", "affordable".

6. NAMED ENTITIES: Use full names of real landmarks, schools, hospitals, metro stations, IT parks, highways near ${location}. AI systems verify entities — real names get cited, generic descriptions don't.

7. FAQ SECTION: End with 5-8 FAQs. Each answer must be 40-60 words, start with a direct factual statement, and include a specific number.

Return valid JSON:
{
  "title": "Question-format title including target keyword (50-60 chars)",
  "metaDescription": "Direct answer to the title question (150-160 chars, includes keyword + specific number)",
  "content": "Full article in markdown. 1500-2000 words. Every H2 is a question. Every first paragraph after H2 is a 40-60 word direct answer.",
  "faqs": [
    { "question": "Specific buyer question", "answer": "40-60 word direct answer starting with a fact, including a number" }
  ],
  "suggestedInternalLinks": ["related topics"]
}`;

    const userPrompt = `Write a full SEO-optimized article with the following details:

**Article Type:** ${articleType}
**Type-Specific Instructions:** ${typeInstruction}

**Project Details:**
- Project Name: ${projectName}
- Developer: ${developerName || "Not specified"}
- Location: ${location}
- City: ${city}
- Configurations: ${configurations || "Not specified"}
- Price Range: ${priceRange || "Not specified"}
- USPs: ${usps || "Not specified"}
${reraNumber ? `- RERA: ${reraNumber}` : ""}
${amenities ? `- Amenities: ${amenities}` : ""}
${status ? `- Status: ${status}` : ""}

${brandVoice || brandValues || targetAudience || productInfo ? `**Brand Context (write in this brand's voice):**
${brandVoice ? `- Voice & Tone: ${brandVoice.substring(0, 400)}` : ""}
${brandValues ? `- Values: ${brandValues.substring(0, 400)}` : ""}
${brandVision ? `- Vision: ${brandVision.substring(0, 300)}` : ""}
${targetAudience ? `- Target Buyers: ${targetAudience.substring(0, 400)}` : ""}
${productInfo ? `- Product Info: ${productInfo.substring(0, 400)}` : ""}` : ""}
${allProjects?.length > 1 ? `\n**Other projects by ${developerName}:** ${allProjects.filter((p: any) => p.name !== projectName).map((p: any) => `${p.name} (${p.location})`).join(", ")}` : ""}
${competitors?.length ? `**Competitors:** ${competitors.join(", ")}` : ""}

**SEO Details:**
- Topic: ${topic || articleType.replace(/_/g, " ")}
- Target Keyword: ${targetKeyword}

**Requirements:**
1. Write 1500-2000 words
2. EVERY H2 heading MUST be a question (e.g., "## What is the price of 3BHK in ${location}?" not "## Pricing")
3. After EVERY H2, the FIRST paragraph must be a 40-60 word direct answer starting with a fact or definition
4. Key paragraphs should be 134-167 words, self-contained, zero pronouns (use full names)
5. Include specific numbers in every paragraph: ₹ prices, sq ft areas, km distances, years, percentages
6. Reference REAL landmarks, schools, hospitals, metro stations, IT parks near ${location}, ${city} by name
7. Target keyword "${targetKeyword}" should appear 8-12 times naturally
8. Add 2-3 CTA sections (Schedule a Site Visit, Download Brochure, Talk to Our Experts)
9. End with 5-8 FAQ questions — each answer 40-60 words, starts with a direct fact, includes a number
10. Suggest 4-6 internal link topics
11. NO filler phrases like "In today's fast-paced world", "Let's dive in", "Looking for your dream home?"
12. EVERY paragraph must teach the reader something specific they didn't know

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
