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
 * Retry wrapper for OpenAI calls. Retries on 429 (rate limit) and 5xx
 * (transient infra) with exponential backoff. Does NOT retry on 4xx
 * other than 429 — those are real errors (bad request, auth, not found)
 * that won't fix themselves.
 *
 * Default: 3 attempts with 1s / 2s / 4s waits between them. Total max
 * delay before giving up = ~7s, well under any reasonable function
 * timeout. Honors Retry-After header when present (OpenAI sends it on
 * 429s and we respect it instead of our default backoff).
 */
async function withRetry<T>(fn: () => Promise<T>, opts?: { maxAttempts?: number; label?: string }): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 3;
  const label = opts?.label || "OpenAI";
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const e = err as { status?: number; code?: string; headers?: Record<string, string>; message?: string };
      const status = e?.status;
      const isRetryable =
        status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
      if (!isRetryable || attempt === maxAttempts) {
        throw err;
      }
      // Honor Retry-After header (seconds) if OpenAI sent one.
      const retryAfterRaw = e?.headers?.["retry-after"];
      const retryAfterSec = retryAfterRaw ? parseInt(retryAfterRaw, 10) : NaN;
      const waitMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
        ? Math.min(retryAfterSec * 1000, 10_000)
        : Math.min(1000 * Math.pow(2, attempt - 1), 4000);
      console.warn(`${label}: retryable error (status ${status}), attempt ${attempt}/${maxAttempts}, waiting ${waitMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw lastErr;
}

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
    const res = await withRetry(
      () =>
        client.chat.completions.create({
          model: MODEL_HEAVY,
          max_completion_tokens: maxTokens,
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
      { label: `aiComplete(${MODEL_HEAVY})` },
    );
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
    const res = await withRetry(
      () =>
        client.chat.completions.create({
          model: MODEL_LIGHT,
          max_completion_tokens: maxTokens,
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
      { label: `aiLight(${MODEL_LIGHT})` },
    );
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
    const res = await withRetry(
      () =>
        client.chat.completions.create({
          model: MODEL_LIGHT,
          max_completion_tokens: maxTokens,
          messages: [
            { role: "system", content: system },
            ...messages,
          ],
        }),
      { label: `aiChat(${MODEL_LIGHT})` },
    );
    return res.choices[0]?.message?.content || "";
  } catch (err) {
    console.error("aiChat failed:", err instanceof Error ? err.message : err);
    throw err;
  }
}

/**
 * Result of a visibility query — includes the source so callers can tell
 * whether real web/grounded search actually fired or we hit a fallback.
 *
 * source values:
 * - "web_search"     OpenAI Responses API with web_search tool succeeded.
 * - "grounded"       Gemini google_search grounding succeeded.
 * - "ungrounded"     Gemini call succeeded but without grounding (degraded).
 * - "fallback_chat"  OpenAI web_search failed; got generic chat completion instead.
 * - "missing_key"    Required API key is not configured.
 * - "failed"         Both primary and fallback paths returned nothing.
 */
export type VisibilitySource =
  | "web_search"
  | "grounded"
  | "ungrounded"
  | "fallback_chat"
  | "missing_key"
  | "failed";

export interface VisibilityResponse {
  text: string;
  source: VisibilitySource;
  error?: string;
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
): Promise<VisibilityResponse> {
  if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      return { text: "", source: "missing_key", error: "OPENAI_API_KEY not set" };
    }

    let webSearchError: string | undefined;
    try {
      const client = getClient();
      // Responses API with web_search tool — matches ChatGPT consumer behavior.
      // Wrapped in withRetry so 429s + transient 5xx don't break the
      // entire scan; before this wrapper, a single rate-limit on one
      // query was killing the whole AI visibility run for that platform.
      // Tighter retry budget on web_search than aiComplete/aiLight.
      // Web_search calls are 10-15s each and we fire up to 2 per query
      // (one OpenAI, one Gemini) × N queries. Without a per-call
      // timeout, a single hung Responses-API call could block the
      // whole scan past Vercel's 300s ceiling. 35s per attempt (3x
      // p99 latency) bounds the worst case to ~70s per query. The
      // surrounding fallback to ungrounded chat handles persistent
      // failures.
      const callWebSearch = () =>
        Promise.race([
          (client as unknown as {
            responses: {
              create: (args: unknown) => Promise<unknown>;
            };
          }).responses.create({
            model: MODEL_HEAVY,
            input: query,
            tools: [{ type: "web_search" }],
            max_output_tokens: 1500,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("web_search timed out after 35s")), 35_000),
          ),
        ]);
      const response = await withRetry(callWebSearch, {
        label: `web_search(${MODEL_HEAVY})`,
        maxAttempts: 2,
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
      if (text.trim().length > 0) return { text: text.trim(), source: "web_search" };

      const outputText = (response as { output_text?: string }).output_text;
      if (outputText) return { text: outputText, source: "web_search" };

      webSearchError = "empty output from Responses API";
      console.error("OpenAI Responses API returned empty output");
    } catch (err) {
      webSearchError = err instanceof Error ? err.message : String(err);
      console.error("OpenAI web search failed:", webSearchError);
    }

    // Fallback: no web search (generic but non-empty)
    try {
      const text = await aiLight("", query, 1000);
      if (text.trim().length > 0) {
        return { text, source: "fallback_chat", error: webSearchError };
      }
      return { text: "", source: "failed", error: webSearchError || "fallback returned empty" };
    } catch (err) {
      return {
        text: "",
        source: "failed",
        error: webSearchError || (err instanceof Error ? err.message : "fallback threw"),
      };
    }
  }

  if (provider === "gemini") {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_GEMINI_API_KEY not set");
      return { text: "", source: "missing_key", error: "GOOGLE_GEMINI_API_KEY not set" };
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

    let lastErr: string | undefined;
    for (const model of models) {
      // Grounded (best — simulates AI Overviews)
      const grounded = await tryGemini(model, true);
      if (grounded.text) return { text: grounded.text, source: "grounded" };
      lastErr = grounded.error || lastErr;

      // If grounding specifically failed, try without grounding on same model
      if (
        grounded.status === 429 ||
        grounded.status === 400 ||
        grounded.status === 404 ||
        grounded.status === 503
      ) {
        const ungrounded = await tryGemini(model, false);
        if (ungrounded.text) {
          return { text: ungrounded.text, source: "ungrounded", error: grounded.error };
        }
        lastErr = ungrounded.error || lastErr;
      }
    }

    return { text: "", source: "failed", error: lastErr };
  }

  return { text: "", source: "failed", error: `unknown provider: ${provider as string}` };
}
