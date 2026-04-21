import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { city, location, projectName, radius, developerName, configurations, priceRange, amenities } = await req.json();

    if (!city || !location) {
      return NextResponse.json(
        { error: "city and location are required" },
        { status: 400 }
      );
    }

    const radiusStr = radius || "5km";
    const projectStr = projectName || "";
    const devStr = developerName || "";
    const configStr = configurations || "";
    const priceStr = priceRange || "";
    const amenStr = amenities || "";

    const system = `You are an expert Indian real estate location analyst. You provide neighbourhood context that real estate marketers use in listings and landing pages.

CRITICAL HONESTY RULES:
1. NEVER fabricate specific place names, school names, hospital names, or metro station names you are not highly confident actually exist in the given location.
2. NEVER invent specific distances like "2.3 km" or "4.7 km". Use approximate ranges ("within 3 km", "5-7 km away") or omit the distance if uncertain.
3. Only include entries you are genuinely confident about. A shorter, accurate list beats a long fabricated one.
4. For every place you name: if the exact distance is unknown, use "Approximate — within ${radiusStr}" or a range.

IMPORTANT: Return ONLY valid JSON with the exact structure specified. No markdown fences, no commentary outside the JSON. All scores must be integers between 0 and 100.`;

    const prompt = `Generate comprehensive neighbourhood intelligence for the following location in India.

LOCATION: ${location}, ${city}
${projectStr ? `PROJECT: ${projectStr}` : ""}
${devStr ? `DEVELOPER: ${devStr}` : ""}
${configStr ? `CONFIGURATIONS: ${configStr}` : ""}
${priceStr ? `PRICE RANGE: ${priceStr}` : ""}
${amenStr ? `KEY AMENITIES: ${amenStr}` : ""}
ANALYSIS RADIUS: ${radiusStr}

Provide rich, accurate neighbourhood data and return JSON with this EXACT structure:
{
  "location": "${location}",
  "city": "${city}",
  "walkScore": <integer 0-100 — rate based on pedestrian infrastructure, footpath availability, market proximity, and general walkability of the area>,
  "connectivityScore": <integer 0-100 — rate based on metro/rail access, highway connectivity, bus network, and airport distance>,
  "connectivity": {
    "metro": "Nearest metro station name and distance (e.g., 'Hinjewadi Phase 1 Metro — 2.5 km, under construction, expected 2026'). Say 'No metro connectivity currently' if applicable.",
    "bus": "Bus connectivity details — nearest BMTC/PMPML/TSRTC/DTC bus stop, major bus routes",
    "highway": "Nearest highway/expressway and distance (e.g., 'Mumbai-Pune Expressway — 3 km via Kiwale interchange')",
    "airport": "Nearest airport and distance with approximate drive time"
  },
  "education": [
    { "name": "School/College Name", "type": "CBSE/ICSE/IB/State Board/University", "distance": "X km" },
    { "name": "...", "type": "...", "distance": "..." }
  ],
  "healthcare": [
    { "name": "Hospital/Clinic Name", "type": "Multi-specialty/Clinic/Government", "distance": "X km" },
    { "name": "...", "type": "...", "distance": "..." }
  ],
  "shopping": [
    { "name": "Mall/Market Name", "type": "Mall/High Street/Market/Supermarket", "distance": "X km" },
    { "name": "...", "type": "...", "distance": "..." }
  ],
  "itHubs": [
    { "name": "IT Park / Business Hub / Corporate Office", "distance": "X km" },
    { "name": "...", "distance": "..." }
  ],
  "upcomingInfra": [
    { "project": "Infrastructure project name", "timeline": "Expected completion timeline", "impact": "How it benefits residents of this location" },
    { "project": "...", "timeline": "...", "impact": "..." }
  ],
  "safety": "A 2-3 sentence narrative about the area's safety profile, gated community prevalence, police station proximity, and general livability.",
  "whyLiveHere": [
    "Reason 1 — a compelling, specific marketing bullet point about why this location is ideal for homebuyers",
    "Reason 2 — ...",
    "Reason 3 — ...",
    "Reason 4 — ...",
    "Reason 5 — ..."
  ],
  "seoContent": [
    "Paragraph 1 (100-150 words) — SEO-optimised overview of ${location}, ${city} as a residential destination. Include keywords: '${location} real estate', 'property in ${location}', 'homes in ${location} ${city}'.",
    "Paragraph 2 (100-150 words) — Focus on connectivity and infrastructure. Include keywords: '${location} connectivity', 'metro near ${location}', '${location} infrastructure development'.",
    "Paragraph 3 (100-150 words) — Focus on lifestyle and social infrastructure. Include keywords: 'living in ${location}', '${location} schools hospitals', '${location} lifestyle'."
  ],
  "nearbyLandmarks": [
    "Landmark 1 — well-known landmark for Google Maps optimisation",
    "Landmark 2 — ...",
    "Landmark 3 — ...",
    "Landmark 4 — ...",
    "Landmark 5 — ...",
    "Landmark 6 — ...",
    "Landmark 7 — ...",
    "Landmark 8 — ..."
  ]
}

Rules:
- Accuracy over completeness. Only include places you are CONFIDENT actually exist in this location. Prefer a shorter, accurate list over a long invented one.
- For distance fields: use approximate phrases like "within 2 km", "3-5 km away", or "near ${location}" when not certain of exact distance. NEVER invent specific decimal kilometres.
- Include 3-8 entries each for education, healthcare, and shopping — only verified-to-exist places.
- Include 2-6 IT hubs / business parks (only include for cities that actually have them: Bangalore, Hyderabad, Pune, Gurgaon, Noida, Chennai, Mumbai).
- Include 2-5 upcoming infrastructure projects ONLY if you have genuine knowledge of them. Otherwise return an empty array.
- Include 5-10 nearby landmarks — only if well-known and verifiable.
- walkScore and connectivityScore must reflect the actual ground reality of the location.
- "whyLiveHere" points should be specific to this location, not generic. Mention real place names only if confident.
- SEO content paragraphs should read naturally while incorporating keywords — no keyword stuffing.
- If ${projectStr ? `the project "${projectStr}" is known, reference it subtly in the whyLiveHere and seoContent sections` : "no project name is given, keep content location-focused"}.`;

    const raw = await aiComplete(system, prompt, 3000);

    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();
    const result = JSON.parse(cleaned);

    // Validate expected fields
    const required = [
      "location",
      "city",
      "walkScore",
      "connectivityScore",
      "connectivity",
      "education",
      "healthcare",
      "shopping",
      "itHubs",
      "upcomingInfra",
      "safety",
      "whyLiveHere",
      "seoContent",
      "nearbyLandmarks",
    ];
    for (const field of required) {
      if (!(field in result)) {
        return NextResponse.json(
          { error: `Generated content missing field: ${field}` },
          { status: 500 }
        );
      }
    }

    // Ensure scores are numbers in range
    result.walkScore = Math.max(0, Math.min(100, Math.round(Number(result.walkScore) || 0)));
    result.connectivityScore = Math.max(0, Math.min(100, Math.round(Number(result.connectivityScore) || 0)));

    // Data source flag — distances and place details are AI-estimated, not verified via Places API.
    result.dataSource = "ai_estimated";

    return NextResponse.json(result);
  } catch (error) {
    console.error("Neighborhood intelligence error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Neighborhood intelligence generation failed",
      },
      { status: 500 }
    );
  }
}
