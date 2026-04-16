import OpenAI from "openai";

/**
 * Shared AI client — all agents use this.
 *
 * Models:
 * - gpt-5.4: flagship for complex reasoning. Used for audits, content gen, insights.
 * - gpt-5.4-nano: cheapest for chat, simple checks, high-volume tasks.
 *
 * We query:
 * - ChatGPT (OpenAI) via Responses API with web_search tool (matches ChatGPT consumer UX)
 * - Gemini (Google) via generateContent with google_search grounding (matches AI Overviews)
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
 * Run a completion with the heavy model.
 * Used for: audit analysis, content generation, competitor insights, locality intelligence.
 */
export async function aiComplete(
  system: string,
  prompt: string,
  maxTokens: number = 2000
): Promise<string> {
  try {
    const client = getClient();
    const res = await client.chat.completions.create({
      model: MODEL_HEAVY,
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });
    const content = res.choices[0]?.message?.content || "";
    if (!content) {
      console.error("aiComplete: empty response from model", MODEL_HEAVY);
    }
    return content;
  } catch (err) {
    console.error("aiComplete failed:", err instanceof Error ? err.message : err);
    throw err; // Re-throw so callers know and can handle/retry
  }
}

/**
 * Run a completion with the light model.
 * Used for: chat, free reports, simple checks, high-volume tasks.
 */
export async function aiLight(
  system: string,
  prompt: string,
  maxTokens: number = 1000
): Promise<string> {
  try {
    const client = getClient();
    const res = await client.chat.completions.create({
      model: MODEL_LIGHT,
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });
    const content = res.choices[0]?.message?.content || "";
    if (!content) {
      console.error("aiLight: empty response from model", MODEL_LIGHT);
    }
    return content;
  } catch (err) {
    console.error("aiLight failed:", err instanceof Error ? err.message : err);
    throw err;
  }
}

/**
 * Run a chat completion with message history (for the chat agent).
 */
export async function aiChat(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens: number = 1500
): Promise<string> {
  try {
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
  } catch (err) {
    console.error("aiChat failed:", err instanceof Error ? err.message : err);
    throw err;
  }
}

/**
 * Query a specific LLM for AI Visibility checks.
 *
 * OpenAI: uses Responses API with web_search tool — critical for real visibility data.
 * Without web search, models hedge and never name specific brands.
 *
 * Gemini: uses google_search grounding — matches Google AI Overviews behavior.
 * Falls back through model versions on 429/404/503.
 */
export async function queryForVisibility(
  provider: "openai" | "gemini",
  query: string
): Promise<string> {
  if (provider === "openai") {
    try {
      const client = getClient();
      // Responses API with web_search tool — matches ChatGPT consumer behavior
      const response = await (client as unknown as {
        responses: {
          create: (args: unknown) => Promise<unknown>;
        };
      }).responses.create({
        model: MODEL_HEAVY,
        input: query,
        tools: [{ type: "web_search" }],
        max_output_tokens: 1500,
      });

      // Extract text from response
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

      const outputText = (response as { output_text?: string }).output_text;
      if (outputText) return outputText;

      console.error("OpenAI Responses API returned empty output");
    } catch (err) {
      console.error("OpenAI web search failed:", err instanceof Error ? err.message : err);
    }

    // Fallback: no web search (generic but non-empty)
    try {
      return await aiLight("", query, 1000);
    } catch {
      return "";
    }
  }

  if (provider === "gemini") {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_GEMINI_API_KEY not set");
      return "";
    }

    // Helper: one attempt with a specific model + grounding flag
    const tryGemini = async (
      model: string,
      useGrounding: boolean
    ): Promise<{ text: string; status?: number; error?: string }> => {
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

        // Always parse the body — but handle error responses explicitly
        let data: unknown;
        try {
          data = await res.json();
        } catch {
          console.error(`Gemini ${model}: failed to parse response (status ${res.status})`);
          return { text: "", status: res.status, error: "parse_error" };
        }

        if (!res.ok) {
          const errMsg = (data as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`;
          console.error(`Gemini ${model} error (${res.status}): ${errMsg}`);
          return { text: "", status: res.status, error: errMsg };
        }

        const text = (data as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        }).candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n") || "";

        return { text };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "fetch error";
        console.error(`Gemini ${model} fetch failed:`, msg);
        return { text: "", error: msg };
      }
    };

    // Try current model first, fall back through model versions
    const models = ["gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-2.5-pro"];

    for (const model of models) {
      // Grounded (best — simulates AI Overviews)
      const grounded = await tryGemini(model, true);
      if (grounded.text) return grounded.text;

      // If grounding specifically failed, try without grounding on same model
      if (
        grounded.status === 429 ||
        grounded.status === 400 ||
        grounded.status === 404 ||
        grounded.status === 503
      ) {
        const ungrounded = await tryGemini(model, false);
        if (ungrounded.text) return ungrounded.text;
      }
    }

    return "";
  }

  return "";
}
