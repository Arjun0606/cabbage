import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

type ConstructionPhase =
  | "excavation"
  | "foundation"
  | "structure"
  | "finishing"
  | "landscaping"
  | "handover";

const PHASE_LABELS: Record<ConstructionPhase, string> = {
  excavation: "Excavation & Site Preparation",
  foundation: "Foundation & Basement Work",
  structure: "Structural / RCC Work",
  finishing: "Internal Finishing & MEP",
  landscaping: "Landscaping & External Development",
  handover: "Final Inspection & Handover",
};

export async function POST(req: NextRequest) {
  try {
    const {
      projectName,
      developerName,
      city,
      location,
      completionPercentage,
      currentPhase,
      milestones,
      photos,
    } = await req.json();

    if (!projectName || !city || !location) {
      return NextResponse.json(
        { error: "projectName, city, and location are required" },
        { status: 400 }
      );
    }

    const phase = currentPhase || "structure";
    const phaseLabel = PHASE_LABELS[phase as ConstructionPhase] || phase;
    const pct = completionPercentage ?? "N/A";
    const devStr = developerName || "the developer";
    const milestonesStr = milestones || "On track as per RERA timeline";
    const photosNote = photos
      ? `Photos/renders are available at: ${photos}. Reference them in visual-first content.`
      : "No photos provided — write content that works without visuals but encourages the reader to request a site visit.";

    const systemPrompt = `You are a real estate marketing expert specializing in construction progress communication for Indian residential projects. You create multi-channel content that keeps existing buyers reassured, creates urgency for prospects, and builds SEO value for the developer's brand.

IMPORTANT: Return ONLY valid JSON — no markdown fences, no commentary outside the JSON.`;

    const userPrompt = `Generate a complete monthly construction progress update content pack for:

PROJECT DETAILS:
- Project: ${projectName}
- Developer: ${devStr}
- City: ${city}
- Location: ${location}
- Current Phase: ${phaseLabel}
- Completion: ${pct}%
- Recent Milestones: ${milestonesStr}
- ${photosNote}

Return JSON with this EXACT structure:
{
  "projectName": "${projectName}",
  "phase": "${phaseLabel}",
  "linkedinPost": "Professional LinkedIn post (150-250 words). Show construction progress, mention milestones, reinforce developer credibility. Include 3-5 relevant hashtags at the end. Tone: confident, transparent, corporate.",
  "buyerWhatsApp": "WhatsApp message for existing buyers (under 300 chars). Reassuring, personal tone. Reference the phase and completion %. Use 2-3 emojis tastefully. End with a warm note like 'Your dream home is taking shape!'",
  "prospectWhatsApp": "WhatsApp message for prospects (under 300 chars). Urgency-driven — 'construction is moving fast', 'limited units left at current pricing'. Use 2-3 emojis. Include a CTA to book a site visit.",
  "emailSection": "Newsletter section for monthly buyer email (200-300 words). Professional, warm. Cover: what was completed this month, what's next, any photos/video links, timeline reaffirmation. Structured with a greeting and sign-off.",
  "blogPost": "SEO-optimized blog post (400-600 words) with ## headings. Title should include project name and construction update keywords. Cover: progress summary, phase details, what buyers can expect, location advantages recap, CTA. Include an FAQ section with 3 questions. Naturally use keywords like '${projectName} construction update', '${location} ${city} new projects', '${devStr} projects'.",
  "socialCaption": "Instagram/Facebook caption (100-150 words). Visual-first — describe what the audience would see in a construction photo/video. Engaging, use line breaks for readability. End with 8-12 hashtags mixing branded (#${projectName.replace(/\s+/g, "")}) and generic (#ConstructionUpdate #RealEstate #${city.replace(/\s+/g, "")}Homes).",
  "videoScript": "60-second YouTube video walkthrough narration script. Start with a hook, walk through the construction site verbally, highlight key milestones, end with a CTA to subscribe and visit. Mark [VISUAL CUE] where relevant footage should be shown. Under 180 words.",
  "smsText": "SMS to buyers — MUST be under 160 characters total. Reassuring, mention project name, phase, and a positive note."
}

Rules:
- All content should reference the current phase (${phaseLabel}) and completion percentage (${pct}%).
- Buyer-facing content should be reassuring and transparent.
- Prospect-facing content should create urgency and FOMO.
- Blog post must be genuinely SEO-useful, not generic filler.
- SMS must be strictly under 160 characters.
- Do NOT invent RERA numbers, pricing, or details not provided.`;

    const raw = await aiComplete(systemPrompt, userPrompt, 3500);

    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const result = JSON.parse(cleaned);

    return NextResponse.json({
      projectName: result.projectName || projectName,
      phase: result.phase || phaseLabel,
      linkedinPost: result.linkedinPost || "",
      buyerWhatsApp: result.buyerWhatsApp || "",
      prospectWhatsApp: result.prospectWhatsApp || "",
      emailSection: result.emailSection || "",
      blogPost: result.blogPost || "",
      socialCaption: result.socialCaption || "",
      videoScript: result.videoScript || "",
      smsText: result.smsText || "",
    });
  } catch (error) {
    console.error("Progress update error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Progress update content generation failed",
      },
      { status: 500 }
    );
  }
}
