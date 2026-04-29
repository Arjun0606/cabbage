/**
 * Hacker News mention adapter.
 *
 * Algolia hosts the canonical HN search index and exposes it
 * publicly without auth or rate cap (their docs say "no API key,
 * no rate limit, just be reasonable"). One request returns both
 * stories and comments matching the brand.
 *
 * For B2B SaaS this is the single highest-signal channel — Show HN
 * threads, Ask HN where someone asks for a tool recommendation,
 * launch announcements, the occasional roast in comments. Worth
 * watching even for brands with low Reddit/X presence.
 */
import type { Mention } from "../mentions";

interface HNHit {
  objectID: string;
  title?: string | null;
  story_title?: string | null;
  comment_text?: string | null;
  story_text?: string | null;
  url?: string | null;
  story_url?: string | null;
  author: string;
  points?: number | null;
  num_comments?: number | null;
  created_at: string;
  _tags?: string[];
}

interface HNResponse {
  hits?: HNHit[];
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ").trim();
}

export async function fetchHnMentions(
  brand: string,
  limit = 25,
): Promise<Mention[]> {
  const q = encodeURIComponent(`"${brand}"`);
  const url = `https://hn.algolia.com/api/v1/search_by_date?query=${q}&tags=(story,comment)&hitsPerPage=${limit}`;

  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const json = (await res.json().catch(() => null)) as HNResponse | null;
  const hits = json?.hits ?? [];

  return hits.map((h): Mention => {
    const isComment = h._tags?.includes("comment");
    const title = h.title || h.story_title || "(comment)";
    const body = h.comment_text || h.story_text || "";
    const id = h.objectID;
    const url = isComment
      ? `https://news.ycombinator.com/item?id=${id}`
      : h.url || h.story_url || `https://news.ycombinator.com/item?id=${id}`;
    return {
      source: "hackernews",
      sourceId: id,
      url,
      title,
      excerpt: stripHtml(body).slice(0, 280),
      author: h.author,
      score: h.points ?? 0,
      comments: h.num_comments ?? 0,
      postedAt: h.created_at,
      meta: { kind: isComment ? "comment" : "story" },
    };
  });
}
