import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

/* ------------------------------------------------------------------ */
/*  Indian festival calendar — approximate Gregorian windows.         */
/*  Lunar festivals shift yearly; these are mid-range dates that      */
/*  work well enough for "next upcoming" detection.                   */
/* ------------------------------------------------------------------ */
interface Festival {
  name: string;
  month: number; // 1-indexed
  day: number;
}

const FESTIVALS: Festival[] = [
  { name: "Republic Day",     month: 1,  day: 26 },
  { name: "Holi",             month: 3,  day: 14 },
  { name: "Ugadi",            month: 3,  day: 30 },
  { name: "Gudi Padwa",       month: 3,  day: 30 },
  { name: "Akshaya Tritiya",  month: 5,  day: 1  },
  { name: "Independence Day", month: 8,  day: 15 },
  { name: "Onam",             month: 8,  day: 29 },
  { name: "Navratri",         month: 10, day: 3  },
  { name: "Dussehra",         month: 10, day: 12 },
  { name: "Diwali",           month: 10, day: 31 },
  { name: "Christmas",        month: 12, day: 25 },
  { name: "New Year",         month: 1,  day: 1  },
];

function getNextFestival(): string {
  const now = new Date();
  const thisYear = now.getFullYear();

  // Build candidate dates: this year + next year (to wrap around Dec→Jan)
  const candidates = FESTIVALS.flatMap((f) => [
    { name: f.name, date: new Date(thisYear, f.month - 1, f.day) },
    { name: f.name, date: new Date(thisYear + 1, f.month - 1, f.day) },
  ]);

  // Find the earliest festival that is still in the future
  const upcoming = candidates
    .filter((c) => c.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return upcoming[0]?.name ?? "Diwali"; // fallback
}

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
      targetFestival,
    } = await req.json();

    if (!projectName || !location || !city) {
      return NextResponse.json(
        { error: "projectName, location, and city are required" },
        { status: 400 }
      );
    }

    const festival = targetFestival || getNextFestival();

    const systemPrompt = `You are an expert Indian real estate marketing strategist who specialises in festive campaign content. You deeply understand Indian buyer psychology during festive seasons — the auspiciousness, the emotional triggers, the urgency of limited-period offers, and the cultural nuances of each festival. You write in a warm yet professional tone that resonates with Indian homebuyers across digital channels.

IMPORTANT: Return ONLY valid JSON — no markdown fences, no commentary outside the JSON.`;

    const userPrompt = `Generate a complete festive marketing campaign for the following Indian real estate project.

PROJECT DETAILS:
- Project Name: ${projectName}
- Developer: ${developerName || "N/A"}
- City: ${city}
- Location: ${location}
- Configurations: ${configurations || "2BHK, 3BHK"}
- Price Range: ${priceRange || "Not specified"}
- USPs: ${usps || "Premium amenities, great connectivity"}

TARGET FESTIVAL: ${festival}

Generate a full multi-channel festive campaign and return as JSON with this EXACT structure:
{
  "festival": "${festival}",
  "campaignTheme": "A 5-8 word theme capturing the festival + real estate angle",
  "tagline": "A punchy tagline (under 15 words) tying the festival to homeownership",
  "whatsappMessages": [
    "Message 1 — festive greeting + project highlight + offer CTA (under 300 chars, use emojis)",
    "Message 2 — urgency-driven, mention limited units/offer deadline",
    "Message 3 — testimonial/social-proof style with festive touch"
  ],
  "linkedinPosts": [
    "Post 1 — professional festive message tying the festival to investment wisdom (150-250 words)",
    "Post 2 — thought-leadership style about festive season real estate trends + subtle project mention"
  ],
  "adCopy": [
    { "platform": "Facebook/Instagram", "headline": "...", "body": "Ad body 1 (under 125 words)", "cta": "CTA button text" },
    { "platform": "Facebook/Instagram", "headline": "...", "body": "Ad body 2 (under 125 words)", "cta": "CTA button text" }
  ],
  "emailContent": {
    "subject": "Email subject line (under 60 chars, festive + urgent)",
    "body": "Full email body for broker network (200-350 words). Include greeting, festive offer details, project highlights, CTA."
  },
  "landingPage": {
    "headline": "Landing page main headline",
    "subheading": "Supporting subheading that reinforces the festive offer",
    "bullets": ["Benefit/offer point 1", "Benefit/offer point 2", "Benefit/offer point 3", "Benefit/offer point 4", "Benefit/offer point 5"]
  },
  "googleAds": [
    { "headline": "Google Ad headline 1 (max 30 chars)", "description": "Google Ad description 1 (max 90 chars)" },
    { "headline": "Google Ad headline 2 (max 30 chars)", "description": "Google Ad description 2 (max 90 chars)" },
    { "headline": "Google Ad headline 3 (max 30 chars)", "description": "Google Ad description 3 (max 90 chars)" }
  ],
  "smsText": "SMS under 160 characters with festive offer + project name + CTA"
}

Rules:
- Make content culturally appropriate for ${festival}. Use the right greetings, symbols, and sentiments.
- Mention the project name and location naturally throughout.
- Include at least one specific-sounding festive offer (e.g., "No GST for first 50 buyers", "Gold coin on booking", "0% EMI till possession", "Modular kitchen free").
- WhatsApp messages should use emojis tastefully.
- Google Ad headlines MUST be under 30 characters. Descriptions MUST be under 90 characters.
- SMS MUST be under 160 characters total.
- All content should feel urgent and time-limited to the festive window.`;

    const raw = await aiComplete(systemPrompt, userPrompt, 3500);

    // Strip markdown fences if the model wraps them
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const result = JSON.parse(cleaned);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Festive campaign error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Festive campaign generation failed" },
      { status: 500 }
    );
  }
}
