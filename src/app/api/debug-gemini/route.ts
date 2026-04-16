import { NextResponse } from "next/server";

/**
 * Debug endpoint — returns raw Gemini response for a query.
 * Used to diagnose why Gemini returns 0 mentions.
 */
export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "GOOGLE_GEMINI_API_KEY not set", keyLen: 0 });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: query || "top real estate developers in Hyderabad 2026" }] }],
          tools: [{ google_search: {} }],
        }),
      }
    );

    const data = await res.json();

    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      keyPrefix: apiKey.slice(0, 5) + "...",
      keyLength: apiKey.length,
      raw: data,
      extractedText: data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("\n") || "",
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
