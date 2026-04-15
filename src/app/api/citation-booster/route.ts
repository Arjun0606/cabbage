import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

/**
 * Citation Booster — Brand Mention Amplification Engine
 *
 * Research shows: brands in the top quartile for web mentions get 10x more
 * AI citations. This generates everything needed to boost brand mentions:
 *
 * 1. Directory submission copy (99acres, MagicBricks, Housing.com, etc.)
 * 2. Press release template (for local news sites)
 * 3. Listicle pitch emails ("Top 10 Developers in [City]" articles)
 * 4. Quora/Reddit answer templates
 * 5. Wikipedia draft (if notable enough)
 * 6. Google Business Profile optimization checklist + content
 * 7. Industry association submission copy (CREDAI, NAREDCO)
 *
 * Token cost: 8cr (generates comprehensive off-page toolkit)
 */

export async function POST(req: NextRequest) {
  try {
    const {
      developerName, projectName, location, city,
      configurations, priceRange, amenities, website,
      reraNumber, yearEstablished, projectsCompleted,
      awards, usps,
    } = await req.json();

    if (!developerName || !city) {
      return NextResponse.json({ error: "developerName and city are required" }, { status: 400 });
    }

    const system = `You are a real estate PR and citation strategist. You create content that maximizes brand mentions across the web, because research shows this is the #1 factor for AI model citations.

Output ONLY valid JSON. No markdown fences.

Every piece of content must:
- Use the FULL brand name "${developerName}" prominently (never abbreviate)
- Include specific facts: RERA numbers, prices, sq ft, location details
- Be ready to copy-paste — no placeholders like [INSERT HERE]
- Sound authentic, not like AI-generated marketing copy`;

    const prompt = `Generate a complete Citation Booster toolkit for:

**Developer:** ${developerName}
**Project:** ${projectName || "Multiple projects"}
**Location:** ${location || city}
**City:** ${city}
**Configurations:** ${configurations || "Various"}
**Price Range:** ${priceRange || "Premium segment"}
**RERA:** ${reraNumber || "RERA Registered"}
**Website:** ${website || "Not specified"}
**Established:** ${yearEstablished || "Established developer"}
**Projects Completed:** ${projectsCompleted || "Multiple projects delivered"}
**Awards:** ${awards || "Industry recognized"}
**USPs:** ${usps || "Quality construction, timely delivery"}

Generate this JSON:
{
  "directoryListings": {
    "99acres": {
      "title": "Optimized listing title for 99acres",
      "description": "300-word description with all project details, locality info, RERA, amenities",
      "highlights": ["5 key selling points"],
      "keywords": ["target keywords for the listing"]
    },
    "magicbricks": { same structure },
    "housing": { same structure },
    "commonfloor": { same structure }
  },

  "pressRelease": {
    "headline": "News-worthy headline about ${developerName}",
    "subheadline": "Supporting detail",
    "body": "500-word press release about the project/company. Include quotes, facts, milestones.",
    "boilerplate": "About ${developerName} — standard company description paragraph",
    "targetPublications": ["List of 5 Indian real estate / business publications to send to"]
  },

  "listiclePitches": [
    {
      "targetArticle": "Top 10 Developers in ${city} 2026",
      "emailSubject": "Email subject line for the pitch",
      "emailBody": "150-word pitch email to the blogger/journalist",
      "suggestedBlurb": "100-word blurb about ${developerName} they can copy-paste into their article"
    }
  ],

  "communityAnswers": [
    {
      "platform": "Quora|Reddit|StackExchange",
      "question": "A real question buyers ask",
      "answer": "200-word helpful answer that naturally mentions ${developerName} with specific data"
    }
  ],

  "gbpOptimization": {
    "businessDescription": "750-character GBP description with keywords",
    "categories": ["Primary and secondary Google Business categories"],
    "attributes": ["Relevant GBP attributes to enable"],
    "posts": [
      {
        "type": "update|offer|event",
        "title": "Post title",
        "body": "200-word post with CTA",
        "cta": "Book Site Visit|Get Price Sheet"
      }
    ],
    "photoChecklist": ["Types of photos to upload for max impact"],
    "reviewStrategy": "How to systematically get more Google reviews"
  },

  "industrySubmissions": [
    {
      "organization": "CREDAI|NAREDCO|Local Builder Association",
      "submissionType": "Membership profile / project showcase",
      "content": "200-word submission content"
    }
  ],

  "impactEstimate": {
    "expectedNewMentions": "Estimated new brand mentions across web",
    "timeToImpact": "When AI models will start picking up these signals",
    "priorityOrder": ["Ordered list of what to do first for fastest impact"]
  }
}

Generate listings for EVERY relevant property portal in ${city} (99acres, MagicBricks, Housing.com, CommonFloor, NoBroker, SquareYards — whichever are relevant for this market).
Generate a press release, listicle pitches for relevant publications, community answers for platforms where buyers in ${city} actually ask questions (Quora, Reddit, local forums), GBP optimization, and submissions for any relevant industry associations.
Generate as much as this developer needs to maximize brand mentions across the web.`;

    const raw = await aiComplete(system, prompt, 4000);

    let result;
    try {
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to parse citation booster" }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Citation Booster error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Citation booster failed" },
      { status: 500 }
    );
  }
}
