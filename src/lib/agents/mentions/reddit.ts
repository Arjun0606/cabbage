/**
 * Reddit mention adapter.
 *
 * Reddit publishes a JSON view of every search URL — no API key
 * required for read-only access. We hit /search.json with the brand
 * as the query, sorted by new, and normalize each post into a
 * Mention. The user-agent header is mandatory; without it Reddit
 * returns 429 even for unauthenticated requests.
 *
 * Coverage: subreddit posts only. Comments are *not* indexed by
 * /search.json, so a brand mentioned only in a comment won't surface
 * here. That's a deliberate trade-off — the Reddit API for comments
 * is OAuth-gated and rate-limited per app, and the post-only signal
 * is already strong enough for weekly mention tracking.
 */
import type { Mention } from "../mentions";

const UA = "cabbge.com mention-tracker (https://cabbge.com)";

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext?: string;
    permalink: string;
    author: string;
    score: number;
    num_comments: number;
    created_utc: number;
    subreddit: string;
    over_18?: boolean;
  };
}

interface RedditResponse {
  data?: { children?: RedditPost[] };
}

export async function fetchRedditMentions(
  brand: string,
  limit = 25,
): Promise<Mention[]> {
  const q = encodeURIComponent(`"${brand}"`);
  const url = `https://www.reddit.com/search.json?q=${q}&sort=new&limit=${limit}&t=month`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const json = (await res.json().catch(() => null)) as RedditResponse | null;
  const posts = json?.data?.children ?? [];

  return posts
    .filter((p) => !p.data.over_18)
    .map((p): Mention => ({
      source: "reddit",
      sourceId: p.data.id,
      url: `https://www.reddit.com${p.data.permalink}`,
      title: p.data.title,
      excerpt: (p.data.selftext || "").slice(0, 280),
      author: p.data.author,
      score: p.data.score,
      comments: p.data.num_comments,
      postedAt: new Date(p.data.created_utc * 1000).toISOString(),
      meta: { subreddit: p.data.subreddit },
    }));
}
