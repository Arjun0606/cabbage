import { NextRequest, NextResponse } from "next/server";

/**
 * Writing Instructions API
 *
 * Stores per-platform content tone/style directives.
 * These get injected into every content generation prompt
 * so all output matches the brand's voice per platform.
 *
 * Stored in localStorage for v1 (Supabase in v2).
 */

export interface WritingInstructions {
  linkedin: string;
  instagram: string;
  whatsapp: string;
  facebook: string;
  articles: string;
  general: string;
}

const DEFAULT_INSTRUCTIONS: WritingInstructions = {
  linkedin: "Use founder voice, short paragraphs, no fluff, clear takeaway. Professional but warm.",
  instagram: "Visual-first hooks, short punchy captions, local references, trending hashtags.",
  whatsapp: "Personal, concise, under 100 words. Light emoji usage. Clear CTA.",
  facebook: "Conversational, community-focused, include a question to drive engagement.",
  articles: "Prioritize practical depth, specific examples, and a professional tone. SEO-optimized.",
  general: "Write in a tone that matches a premium residential real estate developer. Confident, knowledgeable, trustworthy.",
};

// GET returns default instructions (client merges with saved)
export async function GET() {
  return NextResponse.json(DEFAULT_INSTRUCTIONS);
}

// POST validates and returns merged instructions
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const merged: WritingInstructions = {
      linkedin: body.linkedin || DEFAULT_INSTRUCTIONS.linkedin,
      instagram: body.instagram || DEFAULT_INSTRUCTIONS.instagram,
      whatsapp: body.whatsapp || DEFAULT_INSTRUCTIONS.whatsapp,
      facebook: body.facebook || DEFAULT_INSTRUCTIONS.facebook,
      articles: body.articles || DEFAULT_INSTRUCTIONS.articles,
      general: body.general || DEFAULT_INSTRUCTIONS.general,
    };

    return NextResponse.json({ saved: true, instructions: merged });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save" },
      { status: 500 }
    );
  }
}
