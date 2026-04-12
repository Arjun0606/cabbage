import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const {
      projectName,
      developerName,
      city,
      location,
      configurations,
      priceRange,
      usps,
      reraNumber,
      amenities,
    } = await req.json();

    if (!projectName || !city || !location) {
      return NextResponse.json(
        { error: "projectName, city, and location are required" },
        { status: 400 }
      );
    }

    const configStr = configurations || "2BHK, 3BHK";
    const priceStr = priceRange || "On request";
    const uspStr = usps || "";
    const devStr = developerName || "";
    const reraStr = reraNumber || "Applied / Awaited";
    const amenStr = amenities || "";

    const system = `You are a real estate marketing expert who creates content packs for channel partners (brokers/CPs) selling residential projects in India. Write persuasive, specific, professional content. Use the RERA number if provided. Be factual — do not invent details not provided. Output valid JSON only, no markdown fences.`;

    const prompt = `Create a complete channel partner content pack for:
- Project: ${projectName} by ${devStr}
- Location: ${location}, ${city}
- Configurations: ${configStr}
- Price Range: ${priceStr}
- USPs: ${uspStr}
- RERA Number: ${reraStr}
- Amenities: ${amenStr}

Return JSON with exactly this structure:
{
  "whatsappForward": "A WhatsApp forward message under 200 words. Use emojis sparingly. Include project name, location, configs, price range, key USPs, and a call to action. Format for easy reading on mobile.",
  "onePager": "A one-pager text covering: project highlights, location advantages, configurations & pricing, RERA number, key amenities, and contact CTA. 300-400 words, well-structured with clear sections.",
  "emailTemplate": {
    "subject": "Email subject line that gets opened",
    "body": "Professional email body (250-350 words) from a broker to their buyer database. Include project overview, why it's worth considering, pricing, and clear CTA to schedule a visit."
  },
  "pitchScript": "A 30-second elevator pitch script for phone calls. Natural, conversational tone. Cover: who you are, the project, why it matters, and ask for a meeting. Under 100 words.",
  "brokerFAQs": [
    { "question": "Common buyer objection or question", "answer": "Suggested answer for the broker to use" }
  ],
  "comparisonPoints": ["5-6 talking points on why this project stands out vs nearby competitors — be specific to the location and segment"]
}

For brokerFAQs, include exactly 5 entries covering: pricing concerns, location/connectivity, builder reputation, possession timeline, and investment potential.`;

    const text = await aiComplete(system, prompt, 2500);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to generate content pack" },
        { status: 500 }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate expected fields exist
    const required = [
      "whatsappForward",
      "onePager",
      "emailTemplate",
      "pitchScript",
      "brokerFAQs",
      "comparisonPoints",
    ];
    for (const field of required) {
      if (!(field in result)) {
        return NextResponse.json(
          { error: `Generated content missing field: ${field}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Channel partner content error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Channel partner content generation failed",
      },
      { status: 500 }
    );
  }
}
