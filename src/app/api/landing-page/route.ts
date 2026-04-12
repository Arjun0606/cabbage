import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

type PageType =
  | "site_visit"
  | "price_enquiry"
  | "nri"
  | "festive_offer"
  | "pre_launch";

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
      pageType,
    } = await req.json();

    if (!projectName || !city || !location) {
      return NextResponse.json(
        { error: "projectName, city, and location are required" },
        { status: 400 }
      );
    }

    const type: PageType = pageType || "site_visit";
    const configStr = configurations || "2BHK, 3BHK";
    const priceStr = priceRange || "On request";
    const uspStr = usps || "Premium amenities, great connectivity";
    const devStr = developerName || "";
    const reraStr = reraNumber || "";
    const amenStr = amenities || "";

    let pageTypeInstructions = "";
    switch (type) {
      case "nri":
        pageTypeInstructions = `
This is an NRI-focused landing page. You MUST include:
- A currency converter section (INR to USD/AED/GBP/SGD) with placeholder values
- Virtual tour CTA section prominently placed
- NRI-specific legal information section (FEMA rules, repatriation, PAN/Aadhaar requirements, NRO/NRE account guidance)
- International dialing-friendly phone format in CTAs
- "NRI Exclusive Concierge" section offering airport pickup for site visits`;
        break;
      case "festive_offer":
        pageTypeInstructions = `
This is a festive offer landing page. You MUST include:
- A prominent urgency banner at the very top ("Limited Period Offer", "Ends [date]")
- A limited-time offer section with specific-sounding offers (e.g., "No GST on first 50 bookings", "Gold coin on booking")
- A countdown timer placeholder (div with id="countdown-timer" and a comment explaining the JS needed)
- Festive-themed color accents (gold, saffron)
- A "Why Buy This Festive Season" section`;
        break;
      case "pre_launch":
        pageTypeInstructions = `
This is a pre-launch landing page. You MUST include:
- A "Register Your Interest" form (name, email, phone, preferred config) instead of a standard enquiry form
- An early bird pricing section with "Pre-Launch Advantage" messaging
- A "Why Pre-Launch?" benefits section (lowest price point, best unit selection, highest appreciation potential)
- A construction timeline / milestone section
- Explicit "pre-launch" language throughout (not "book now" but "register interest")`;
        break;
      case "price_enquiry":
        pageTypeInstructions = `
This is a price enquiry landing page. The form and CTA should focus on "Get Latest Pricing" / "Download Price Sheet". Emphasise value proposition and affordability. Include an EMI calculator placeholder section.`;
        break;
      default:
        pageTypeInstructions = `
This is a site visit landing page. The primary CTA is "Book a Free Site Visit". Include scheduling convenience ("Choose your preferred time slot") and mention what the site visit includes (sample flat tour, construction progress, etc.).`;
    }

    const system = `You are an expert Indian real estate landing page designer and copywriter. You create HIGH-CONVERTING landing pages that consistently outperform agency-built pages. You deeply understand Indian homebuyer psychology — trust signals, family decision-making, investment mindset, and RERA compliance. You write HTML that is clean, semantic, mobile-first, and SEO-optimised.

IMPORTANT: Return ONLY valid JSON with the exact structure specified. No markdown fences, no commentary outside the JSON.`;

    const prompt = `Generate a COMPLETE, ready-to-deploy HTML landing page for this Indian real estate project.

PROJECT DETAILS:
- Project Name: ${projectName}
- Developer: ${devStr || "N/A"}
- City: ${city}
- Location: ${location}
- Configurations: ${configStr}
- Price Range: ${priceStr}
- USPs: ${uspStr}
- RERA Number: ${reraStr || "Applied / Awaited"}
- Amenities: ${amenStr || "Swimming pool, gymnasium, landscaped gardens, children's play area, clubhouse"}

PAGE TYPE: ${type}
${pageTypeInstructions}

The HTML page MUST include ALL of these sections:
1. Hero section with a compelling headline, subheadline, and a CTA lead capture form (name, phone, email)
2. Project highlights section — 3-4 key USPs with icons (use Unicode/emoji icons)
3. Configuration & pricing table (responsive)
4. Location advantages section — connectivity, landmarks, social infrastructure
5. Amenities grid (responsive, icon-based)
6. Developer trust section — track record narrative, RERA number displayed prominently
7. FAQ section — 5 relevant questions with expandable answers (use <details>/<summary>)
8. Sticky WhatsApp CTA button (bottom-right, links to wa.me with pre-filled message)
9. Footer with legal disclaimers and RERA info
10. Inline CSS only — NO external stylesheets, NO external JS libraries. Must be fully self-contained.
11. Mobile-responsive (use CSS media queries)
12. OG meta tags (og:title, og:description, og:type, og:image placeholder)
13. Google Analytics event tracking placeholders (dataLayer.push calls on form submit, WhatsApp click, CTA clicks)

Design guidelines:
- Professional color scheme (dark blue/navy primary, gold/amber accent, white backgrounds)
- Clean typography using system font stack
- Generous whitespace, clear visual hierarchy
- Trust badges area (RERA verified, X+ years experience)
- Form should be above the fold on desktop

Return JSON with this EXACT structure:
{
  "html": "<!DOCTYPE html>...complete HTML page as a single string...",
  "title": "SEO-optimised page title (under 60 chars)",
  "metaDescription": "SEO meta description (under 155 chars)",
  "pageType": "${type}",
  "sections": ["list", "of", "section", "names", "included"]
}`;

    const raw = await aiComplete(system, prompt, 4000);

    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();
    const result = JSON.parse(cleaned);

    // Validate expected fields
    const required = ["html", "title", "metaDescription", "pageType", "sections"];
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
    console.error("Landing page generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Landing page generation failed",
      },
      { status: 500 }
    );
  }
}
