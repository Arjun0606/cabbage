import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No key" });

  const tests: any[] = [];

  const models = ["gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash-001"];

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "top builders in Hyderabad 2026" }] }],
          }),
        }
      );
      const data = await res.json();
      tests.push({
        model,
        status: res.status,
        ok: res.ok,
        error: data?.error?.message?.slice(0, 200),
        textLen: data?.candidates?.[0]?.content?.parts?.[0]?.text?.length || 0,
        textPreview: data?.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 300),
      });
    } catch (e: any) { tests.push({ model, error: e.message }); }
  }

  return NextResponse.json({ tests });
}
