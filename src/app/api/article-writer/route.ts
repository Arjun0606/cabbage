import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";
import { enforceCredits } from "@/lib/credits";

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
      // Per-channel writing instructions from Settings → Personalization
      writingInstructions,
    } = body;

    if (!projectName || !location || !city) {
      return NextResponse.json(
        { error: "projectName, location, and city are required" },
        { status: 400 }
      );
    }

    // Track credit usage (always allows — upsell model)
    await enforceCredits(body.companyId, "article");

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

    const systemPrompt = `You are an expert real estate content writer who writes articles optimised to be cited by AI search engines (ChatGPT, Google AI Overview, Perplexity). You understand Generative Engine Optimization (GEO).

CRITICAL HONESTY RULES — these override every other instruction:
- NEVER invent specific prices, distances, areas, percentages, RERA numbers, phone numbers, years, or named entities (schools, hospitals, metro stations, landmarks) unless they appear in the DATA section below. If the data doesn't support it, don't write it.
- If you don't have a specific number for something, omit the claim rather than inventing one. "Premium location" with no fabricated "2.5 km from HITEC City" is better than a confident lie.
- Only name real places if they are extremely well-known regional landmarks in the supplied location/city (e.g., "${location}" itself, the city name). Do not invent specific school names, hospital brand names, or metro station names.
- If you need to reference infrastructure, use generic language tied to the locality ("schools in ${location}", "metro connectivity in ${city}") rather than named entities.

AI CITABILITY RULES (Princeton/Georgia Tech research):

1. QUESTION-BASED HEADINGS: Every H2 must be a question a home buyer would ask.

2. ANSWER TARGET PATTERN: Immediately after every question H2, write a 40-60 word direct answer paragraph. Start with a fact or definition from the data provided — not filler.

3. PASSAGE LENGTH: Key paragraphs 134-167 words, self-contained.

4. LOW PRONOUN DENSITY: Use "${projectName}", "${developerName}", "${location}" by name — not "it"/"they"/"this project".

5. GROUND EVERY SPECIFIC CLAIM IN THE DATA. If the data has "${priceRange || "no price"}", use exactly that phrasing. Don't convert ranges to fake per-sqft figures.

6. FAQ SECTION: 5-8 FAQs. Every answer grounded in the data block.

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

    const userPrompt = `Write a full SEO-optimized article using ONLY the data below. Do not invent facts not present here.

**Article Type:** ${articleType}
**Type-Specific Instructions:** ${typeInstruction}

**Project Details (the only facts you can assert):**
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

${(writingInstructions?.articles || writingInstructions?.general) ? `**Writing Instructions (from Settings → Personalization — follow EXACTLY):**
${writingInstructions?.general ? `General: ${String(writingInstructions.general).substring(0, 2000)}` : ""}
${writingInstructions?.articles ? `Article-specific: ${String(writingInstructions.articles).substring(0, 2000)}` : ""}
These override any generic tone — match the voice, phrasing rules, dos/donts listed above.` : ""}

**SEO Details:**
- Topic: ${topic || articleType.replace(/_/g, " ")}
- Target Keyword: ${targetKeyword}

**Requirements:**
1. Write 1500-2000 words
2. EVERY H2 heading MUST be a question (e.g., "## What is the price of ${configurations || "homes"} in ${location}?" not "## Pricing")
3. After EVERY H2, the FIRST paragraph must be a 40-60 word direct answer starting with a fact or definition — grounded in the data above, not invented
4. Key paragraphs should be 134-167 words, self-contained, zero pronouns (use full names)
5. Use specific numbers ONLY when they're in the data above (price range, configurations, RERA number). Do NOT fabricate prices per sq ft, specific distances, or dated stats.
6. When referencing infrastructure/neighbourhood, use generic phrasing tied to "${location}"/"${city}" rather than invented school/hospital/metro names
7. Target keyword "${targetKeyword}" should appear 8-12 times naturally
8. Add 2-3 CTA sections (Schedule a Site Visit, Download Brochure, Talk to Our Experts)
9. End with 5-8 FAQ questions — answers grounded in the data block only
10. Suggest 4-6 internal link topics
11. NO filler phrases like "In today's fast-paced world", "Let's dive in", "Looking for your dream home?"
12. When unsure about a specific fact, write a more general sentence rather than inventing a number

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
