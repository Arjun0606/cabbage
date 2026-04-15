import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

/**
 * Auto-Discover — scrapes a website and generates all company documents.
 *
 * Like Okara: the moment you add a URL, we analyze everything about the company
 * and auto-fill Brand Voice, Product Info, Competitor Analysis, Marketing Strategy,
 * Target Audience, and Brand Values.
 *
 * No manual document filling needed.
 */

export async function POST(req: NextRequest) {
  try {
    const { url, companyName, industry } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Fetch the website
    let html = "";
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Cabbge/1.0 (SEO Audit Bot)" },
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });
      html = await res.text();
    } catch {
      // If fetch fails, we'll work with just the URL and company name
    }

    // Extract visible text from HTML (strip tags)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000); // First 5000 chars is enough

    // Extract meta description
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const metaDesc = metaMatch?.[1] || "";

    // Extract title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const pageTitle = titleMatch?.[1] || "";

    const industryLabel = industry || "business";
    const system = `You analyze ${industryLabel === "real_estate" ? "real estate developer" : industryLabel.replace(/_/g, " ")} websites and generate comprehensive brand intelligence.
Output ONLY valid JSON. No markdown fences.

You must infer everything from the website content — the company's voice, positioning, target audience, key products/services, and marketing approach. Be specific to the ${industryLabel.replace(/_/g, " ")} industry, not generic.`;

    const prompt = `Analyze this real estate developer's website and generate brand intelligence:

**Company:** ${companyName || "Unknown"}
**URL:** ${url}
**Page Title:** ${pageTitle}
**Meta Description:** ${metaDesc}

**Website Content (first 5000 chars):**
${textContent || "Could not fetch website content. Generate based on company name and URL only."}

Generate this JSON:
{
  "companyDescription": "2-3 sentence description of what the company does, inferred from their website",
  "city": "Primary city they operate in (inferred from content, addresses, project locations)",

  "documents": {
    "productInfo": "200-word summary of their products/services. What do they build? What configurations? What price segments? Any signature features?",
    "brandVoice": "150-word description of their brand voice and tone. Are they luxury? Affordable? Family-focused? Tech-forward? Formal or casual? What language patterns do they use?",
    "brandValues": "150-word summary of their core values, mission, vision. What do they stand for? Quality? Innovation? Trust? Heritage?",
    "targetAudience": "150-word description of who their buyers are. First-time buyers? Investors? NRIs? Families? IT professionals? What age/income bracket?",
    "marketingStrategy": "150-word analysis of their current marketing approach. Do they have a blog? Social media? Portal listings? What channels are they active on? What's working/missing?",
    "competitorAnalysis": "150-word analysis of their competitive landscape. Who are their likely competitors in their city/segment? How are they positioned relative to competition?"
  },

  "inferredProjects": [
    {
      "name": "Project name (if found on website)",
      "location": "Location/locality",
      "configurations": "2BHK, 3BHK, etc.",
      "priceRange": "If mentioned",
      "status": "Active/Pre-launch/Ready to Move"
    }
  ],

  "inferredCompetitors": ["List of 3-5 likely competitors in their market"],

  "seoObservations": {
    "hasSchema": true/false,
    "hasBlog": true/false,
    "hasLlmsTxt": true/false,
    "metaQuality": "good/poor/missing",
    "contentDepth": "thin/moderate/rich",
    "quickWins": ["3-5 immediate SEO improvements"]
  }
}

Be specific to this company — don't generate generic real estate descriptions.`;

    const raw = await aiComplete(system, prompt, 3000);

    let result;
    try {
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to analyze website" }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Auto-discover error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Auto-discovery failed" },
      { status: 500 }
    );
  }
}
