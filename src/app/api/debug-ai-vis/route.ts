import { NextRequest, NextResponse } from "next/server";
import { queryForVisibility } from "@/lib/ai";

/**
 * One-shot diagnostic for the AI visibility pipeline.
 *
 * Usage:
 *   GET /api/debug-ai-vis?q=best+real+estate+developers+in+hyderabad
 *
 * Returns the actual result of querying ChatGPT (Responses API + web_search) and
 * Gemini (generateContent + google_search grounding) for one query, so you can
 * see whether web search is firing or silently falling back.
 *
 * No auth — this only exposes which API path succeeded and the first 800 chars
 * of the model's reply. It does NOT expose API keys.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q") || "best real estate developers in hyderabad 2026";

  const env = {
    openaiKey: !!process.env.OPENAI_API_KEY,
    geminiKey: !!process.env.GOOGLE_GEMINI_API_KEY,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV || null,
  };

  const startedAt = Date.now();

  // Run both providers in parallel — same shape the real scan uses.
  const [openai, gemini] = await Promise.all([
    queryForVisibility("openai", query).catch((err) => ({
      text: "",
      source: "failed" as const,
      error: err instanceof Error ? err.message : String(err),
    })),
    queryForVisibility("gemini", query).catch((err) => ({
      text: "",
      source: "failed" as const,
      error: err instanceof Error ? err.message : String(err),
    })),
  ]);

  const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…[+${s.length - n} chars]` : s);

  return NextResponse.json({
    query,
    durationMs: Date.now() - startedAt,
    env,
    openai: {
      source: openai.source,
      ok: openai.source === "web_search",
      error: openai.error || null,
      textLength: openai.text.length,
      textPreview: truncate(openai.text, 800),
    },
    gemini: {
      source: gemini.source,
      ok: gemini.source === "grounded",
      error: gemini.error || null,
      textLength: gemini.text.length,
      textPreview: truncate(gemini.text, 800),
    },
    diagnosis:
      openai.source === "web_search" && gemini.source === "grounded"
        ? "Both platforms returned live search results. If real scans still show 0, the brand truly isn't being mentioned."
        : openai.source === "missing_key" || gemini.source === "missing_key"
          ? "API key missing on this deployment. Check Vercel env vars for OPENAI_API_KEY / GOOGLE_GEMINI_API_KEY."
          : `Web search isn't firing. OpenAI source=${openai.source}, Gemini source=${gemini.source}. Check the error fields above.`,
  });
}
