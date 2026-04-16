import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST() {
  const client = new OpenAI();
  const results: any[] = [];

  const modelsToTest = ["gpt-5.4", "gpt-5.4-nano", "gpt-4o", "gpt-4o-mini", "gpt-5-mini"];

  for (const model of modelsToTest) {
    try {
      const res = await client.chat.completions.create({
        model,
        max_completion_tokens: 50,
        messages: [{ role: "user", content: "say hi" }],
      });
      results.push({ model, ok: true, response: res.choices[0]?.message?.content?.slice(0, 100) });
    } catch (err: any) {
      results.push({ model, ok: false, error: err?.message?.slice(0, 200) });
    }
  }

  return NextResponse.json({ results });
}
