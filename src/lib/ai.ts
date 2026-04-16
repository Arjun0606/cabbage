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
    max_completion_tokens: maxTokens,
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
    max_completion_tokens: maxTokens,
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
    max_completion_tokens: maxTokens,
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
    // Use Responses API with web_search_preview tool — this is ACTUAL ChatGPT-like
    // behavior. Without this, the API returns generic hedging responses because
    // gpt models don't know current facts or have web access by default.
    try {
      const client = getClient();
      // Try the Responses API with web search (matches ChatGPT consumer behavior)
      const response = await (client as unknown as {
        responses: {
          create: (args: unknown) => Promise<unknown>;
        };
      }).responses.create({
        model: "gpt-5.4",
        input: query,
        tools: [{ type: "web_search" }],
        max_output_tokens: 1500,
      });

      // Extract text from response — shape: output[].content[].text
      const output = (response as { output?: unknown[] }).output || [];
      let text = "";
      for (const item of output) {
        const typed = item as { type?: string; content?: Array<{ type?: string; text?: string }> };
        if (typed.type === "message" && Array.isArray(typed.content)) {
          for (const c of typed.content) {
            if (c.type === "output_text" && c.text) text += c.text + "\n";
          }
        }
      }
      if (text.trim().length > 0) return text.trim();

      // Fallback: output_text convenience property
      const outputText = (response as { output_text?: string }).output_text;
      if (outputText) return outputText;
    } catch (err) {
      console.error("OpenAI web search failed:", err);
    }

    // Final fallback: no web search (will be generic but non-empty)
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
          max_completion_tokens: 1000,
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    } catch { return ""; }
  }

  if (provider === "gemini") {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) return "";

    // Helper: one attempt with given model/tools
    const tryGemini = async (model: string, useGrounding: boolean): Promise<{ text: string; errorMessage?: string; status?: number }> => {
      try {
        const body: { contents: unknown; tools?: unknown } = {
          contents: [{ parts: [{ text: query }] }],
        };
        if (useGrounding) {
          body.tools = [{ google_search: {} }];
        }

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        const data = await res.json();

        if (!res.ok) {
          const errorMsg = data?.error?.message || "Unknown error";
          console.error(`Gemini ${model} error (${res.status}):`, errorMsg);
          return { text: "", errorMessage: errorMsg, status: res.status };
        }
        const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("\n") || "";
        return { text };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "fetch error";
        console.error("Gemini request failed:", msg);
        return { text: "", errorMessage: msg };
      }
    };

    // Try grounded first (better responses), fall back to ungrounded if grounding fails
    const grounded = await tryGemini("gemini-2.0-flash", true);
    if (grounded.text) return grounded.text;

    // If grounded failed due to quota/billing, try without grounding (free tier often works)
    if (grounded.status === 429 || grounded.status === 400) {
      const fallback = await tryGemini("gemini-2.0-flash", false);
      if (fallback.text) return fallback.text;

      // Try older model that has more generous quotas
      const older = await tryGemini("gemini-1.5-flash", false);
      if (older.text) return older.text;
    }

    return "";
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
        max_completion_tokens: 1000,
        messages: [{ role: "user", content: query }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text || "";
  } catch { return ""; }
}
