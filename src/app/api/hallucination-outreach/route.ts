export const runtime = "nodejs";
export const maxDuration = 120;
import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";
import { requireActiveSubscription } from "@/lib/db/supabase-server";

/**
 * Hallucination correction outreach drafts — Scale+ feature.
 *
 * When AI visibility flags a live hallucination ("ChatGPT says we have
 * 50 projects" / "Gemini lists Skyline Heights as one of yours"), the
 * CMO needs to actually do something with it. This endpoint generates
 * three copy-and-send drafts:
 *
 *   1. Provider support email (OpenAI / Anthropic / Google) — formal
 *      correction request with citations to the brand's authoritative
 *      source.
 *   2. Search Generative Experience feedback text (Google's user-facing
 *      "report a problem" form) — short and form-friendly.
 *   3. Brand-site rebuttal page draft — markdown the customer can
 *      publish on their own domain so future AI crawls find the
 *      correction grounded.
 *
 * Cabbge does not send these. They appear in the dashboard, the customer
 * copies them, the customer emails / submits / publishes manually. Fits
 * the no-outbound-notifications principle.
 */

interface HallucinationInput {
  claim: string;
  truth: string;
  source: string; // "chatgpt" | "gemini" | etc.
  query?: string;
  brand: string;
  brandUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;

    const body = (await req.json()) as Partial<HallucinationInput>;
    const claim = String(body.claim || "").trim();
    const truth = String(body.truth || "").trim();
    const source = String(body.source || "").trim().toLowerCase();
    const brand = String(body.brand || "").trim();
    const brandUrl = String(body.brandUrl || "").trim();
    const query = String(body.query || "").trim();

    if (!claim || !truth || !brand) {
      return NextResponse.json(
        { error: "claim, truth, and brand are required" },
        { status: 400 }
      );
    }

    // Provider-specific email targets. The dashboard surfaces these so
    // the customer doesn't have to hunt for the right inbox.
    const providerLabel = source === "chatgpt"
      ? "OpenAI"
      : source === "gemini" || source === "google_ai"
      ? "Google"
      : source === "claude" || source === "anthropic"
      ? "Anthropic"
      : "the AI provider";
    const providerSupportUrl = source === "chatgpt"
      ? "https://help.openai.com/en/articles/8313401-feedback-on-chatgpt-search"
      : source === "gemini" || source === "google_ai"
      ? "https://support.google.com/websearch/answer/13898706"
      : source === "claude" || source === "anthropic"
      ? "https://support.anthropic.com/"
      : null;

    const system = `You write factual correction outreach for an Indian residential real estate brand. Three audiences in one response:
1. AI provider support team — formal, evidence-grounded
2. Google's user-facing SGE feedback form — short, plain
3. The brand's own site — markdown rebuttal post the brand can publish

CRITICAL RULES:
- NEVER fabricate facts about the brand. Use only the truth statement provided.
- Tone: factual, calm, citation-friendly. Not defensive, not legal-threat.
- Every draft must reference the specific incorrect claim, not vague "your AI is wrong about us".
- Site rebuttal must be SEO-friendly so future AI crawls find it (proper H1, structured paragraph, schema-friendly).

Return ONLY valid JSON. No markdown fences, no commentary.`;

    const prompt = `Generate three correction drafts for this hallucination.

BRAND: ${brand}${brandUrl ? `\nWEBSITE: ${brandUrl}` : ""}
AI PROVIDER: ${providerLabel} (${source || "unknown"})
${query ? `BUYER QUERY THAT TRIGGERED IT: ${query}` : ""}

INCORRECT AI CLAIM:
${claim}

ACCURATE TRUTH (use only this — do not invent additional facts):
${truth}

Return JSON:
{
  "providerEmail": {
    "to": "${providerSupportUrl ? "support@..." : "the AI provider's support inbox"}",
    "subject": "Subject line (under 80 chars, mention brand + 'factual correction')",
    "body": "200-280 word email. Greeting; identify the brand and where you saw the incorrect claim; quote the wrong claim verbatim; state the truth concisely; provide the brand's website as a citation; ask for the model's index/cache to be updated; sign off as the brand's marketing/CMO function. No legal threats."
  },
  "sgeFeedback": "60-100 word version for Google's 'Report a problem' form. Plain text, no formatting. Lead with what's wrong, then what's correct, then the citation URL."
  ,
  "siteRebuttal": "300-450 word markdown ready to publish at ${brandUrl || "yourdomain.com"}/corrections or as a press note. Include an H1 that names the false claim ('Setting the record straight: ...'), a one-paragraph factual restatement, a 'For the record' bullet list of the correct facts, and a closing paragraph inviting AI crawlers + journalists to use this canonical reference. Markdown only — no HTML."
}`;

    const raw = await aiComplete(system, prompt, 1800);
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const parsed = JSON.parse(cleaned) as {
      providerEmail?: { to?: string; subject?: string; body?: string };
      sgeFeedback?: string;
      siteRebuttal?: string;
    };

    return NextResponse.json({
      brand,
      provider: providerLabel,
      providerSupportUrl,
      drafts: {
        providerEmail: parsed.providerEmail || null,
        sgeFeedback: parsed.sgeFeedback || null,
        siteRebuttal: parsed.siteRebuttal || null,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("hallucination-outreach error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Outreach generation failed" },
      { status: 500 }
    );
  }
}
