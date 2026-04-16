import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No key" });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "top builders in Hyderabad 2026" }] }],
      }),
    }
  );
  const data = await res.json();
  return NextResponse.json({
    status: res.status,
    ok: res.ok,
    error: data?.error?.message?.slice(0, 300),
    errorStatus: data?.error?.status,
    textLen: data?.candidates?.[0]?.content?.parts?.[0]?.text?.length || 0,
    textPreview: data?.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 400),
  });
}
