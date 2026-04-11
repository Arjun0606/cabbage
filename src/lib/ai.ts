import OpenAI from "openai";

/**
 * Shared AI client — all agents use this.
 *
 * Models:
 * - gpt-5.4: flagship model for complex reasoning ($2.50/$15 per MTok, 1M context)
 *   Used for: audit analysis, content gen, competitor insights, locality intelligence.
 *   We use the best because we're competing with ₹3L/month agencies.
 *   At $499/month per customer, the cost difference vs mini is negligible.
 *
 * - gpt-5.4-nano: cheapest for simple high-volume tasks ($0.20/$1.25 per MTok)
 *   Used for: chat, free reports, AI visibility queries, budget ranges.
 *
 * Single provider (OpenAI) = one API key, one billing, simpler stack.
 */

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI();
  }
  return _client;
}

// Model constants
export const MODEL_HEAVY = "gpt-5.4";       // Flagship — best quality for analysis, content, insights
export const MODEL_LIGHT = "gpt-5.4-nano";  // Cheapest — chat, quick checks, simple tasks

/**
 * Run a completion with the heavy model (gpt-5.4-mini).
 * Use for: audit analysis, content generation, competitor insights,
 * locality intelligence, backlink recommendations.
 */
export async function aiComplete(
  system: string,
  prompt: string,
  maxTokens: number = 2000
): Promise<string> {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: MODEL_HEAVY,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  return res.choices[0]?.message?.content || "";
}

/**
 * Run a completion with the light model (gpt-5.4-nano).
 * Use for: chat, free reports, simple checks, high-volume tasks.
 */
export async function aiLight(
  system: string,
  prompt: string,
  maxTokens: number = 1000
): Promise<string> {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: MODEL_LIGHT,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  return res.choices[0]?.message?.content || "";
}

/**
 * Run a chat completion with message history (for the chat agent).
 */
export async function aiChat(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens: number = 1500
): Promise<string> {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: MODEL_LIGHT,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      ...messages,
    ],
  });
  return res.choices[0]?.message?.content || "";
}

/**
 * Query a specific LLM for AI Visibility checks.
 * These are simple "ask a question, check the response" calls.
 */
export async function queryForVisibility(
  provider: "openai" | "perplexity" | "gemini",
  query: string
): Promise<string> {
  if (provider === "openai") {
    return aiLight("", query, 1000);
  }

  if (provider === "perplexity") {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) return "";
    try {
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [{ role: "user", content: query }],
          max_tokens: 1000,
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    } catch { return ""; }
  }

  if (provider === "gemini") {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) return "";
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: query }] }],
          }),
        }
      );
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch { return ""; }
  }

  return "";
}

/**
 * Query Claude for AI Visibility checks (optional — only if ANTHROPIC_API_KEY is set).
 */
export async function queryClaudeForVisibility(query: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: query }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text || "";
  } catch { return ""; }
}
