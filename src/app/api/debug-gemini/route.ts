import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No key" });

  const tests: any[] = [];

  // Test 1: gemini-2.0-flash grounded
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "top builders in Hyderabad 2026" }] }],
          tools: [{ google_search: {} }],
        }),
      }
    );
    const data = await res.json();
    tests.push({ name: "gemini-2.0-flash+grounded", status: res.status, ok: res.ok, error: data?.error?.message, textLen: data?.candidates?.[0]?.content?.parts?.[0]?.text?.length || 0 });
  } catch (e: any) { tests.push({ name: "gemini-2.0-flash+grounded", error: e.message }); }

  // Test 2: gemini-2.0-flash ungrounded
  try {
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
    tests.push({ name: "gemini-2.0-flash ungrounded", status: res.status, ok: res.ok, error: data?.error?.message, textLen: data?.candidates?.[0]?.content?.parts?.[0]?.text?.length || 0 });
  } catch (e: any) { tests.push({ name: "gemini-2.0-flash ungrounded", error: e.message }); }

  // Test 3: gemini-1.5-flash
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "top builders in Hyderabad 2026" }] }],
        }),
      }
    );
    const data = await res.json();
    tests.push({ name: "gemini-1.5-flash", status: res.status, ok: res.ok, error: data?.error?.message, textLen: data?.candidates?.[0]?.content?.parts?.[0]?.text?.length || 0, text: data?.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 500) });
  } catch (e: any) { tests.push({ name: "gemini-1.5-flash", error: e.message }); }

  // Test 4: List available models
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const data = await res.json();
    tests.push({ name: "list models", status: res.status, models: data?.models?.slice(0, 10).map((m: any) => m.name) || data?.error?.message });
  } catch (e: any) { tests.push({ name: "list models", error: e.message }); }

  return NextResponse.json({ keyPrefix: apiKey.slice(0, 5), keyLen: apiKey.length, tests });
}
