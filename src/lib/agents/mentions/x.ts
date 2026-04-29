/**
 * X (Twitter) mention adapter.
 *
 * The X API costs $200/month even for the cheapest tier, which is
 * excessive for a feature that's a single column on the dashboard.
 * Instead we lean on Grok — X.AI's models have native access to the
 * X firehose via search_parameters.sources=[{type:"x"}], and we
 * already pay for an XAI_API_KEY for the 5-engine GEO scan.
 *
 * We ask Grok to return JSON with the most recent posts mentioning
 * the brand. Grok's grounding citations include post URLs which we
 * use as the natural id (X post URLs contain the numeric tweet id).
 */
import OpenAI from "openai";
import type { Mention } from "../mentions";

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: "https://api.x.ai/v1",
    });
  }
  return _client;
}

interface XPostJson {
  url?: string;
  text?: string;
  author?: string;
  posted_at?: string;
  likes?: number;
  replies?: number;
}

const POST_ID_RE = /\/status\/(\d+)/;

export async function fetchXMentions(
  brand: string,
  limit = 15,
): Promise<Mention[]> {
  if (!process.env.XAI_API_KEY) return [];

  const prompt = [
    `List the ${limit} most recent public posts on X that mention "${brand}".`,
    `Respond with a JSON object {"posts": Array<{url, text, author, posted_at, likes, replies}>}.`,
    `url must be the canonical https://x.com/<user>/status/<id> link.`,
    `posted_at must be an ISO 8601 timestamp.`,
    `If no recent posts are found, return {"posts": []}. Do not invent posts.`,
  ].join(" ");

  let raw = "";
  try {
    const res = (await getClient().chat.completions.create({
      model: "grok-3-latest",
      max_completion_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      ...({
        search_parameters: {
          mode: "auto",
          sources: [{ type: "x" }],
        },
      } as unknown as Record<string, unknown>),
    })) as OpenAI.Chat.Completions.ChatCompletion;
    raw = res.choices[0]?.message?.content?.trim() || "";
  } catch {
    return [];
  }

  if (!raw) return [];
  let parsed: { posts?: XPostJson[] } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const posts = parsed.posts ?? [];
  const seen = new Set<string>();

  return posts
    .map((p): Mention | null => {
      const url = p.url?.trim();
      if (!url) return null;
      const m = url.match(POST_ID_RE);
      const id = m?.[1] ?? url;
      if (seen.has(id)) return null;
      seen.add(id);
      return {
        source: "x",
        sourceId: id,
        url,
        title: undefined,
        excerpt: (p.text || "").slice(0, 280),
        author: p.author,
        score: p.likes ?? 0,
        comments: p.replies ?? 0,
        postedAt: p.posted_at,
        meta: {},
      };
    })
    .filter((m): m is Mention => m !== null);
}
