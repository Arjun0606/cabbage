import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No key" });

  // Test with current key
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello, respond with just the word WORKING" }] }],
      }),
    }
  );
  const data = await res.json();

  return NextResponse.json({
    keyPrefix: apiKey.slice(0, 10),
    keyLen: apiKey.length,
    status: res.status,
    ok: res.ok,
    errorMsg: data?.error?.message?.slice(0, 500),
    errorStatus: data?.error?.status,
    text: data?.candidates?.[0]?.content?.parts?.[0]?.text,
  });
}
