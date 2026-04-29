/**
 * YouTube mention adapter.
 *
 * Uses YouTube Data API v3 search.list (100 quota units per call,
 * 10k daily quota = 100 brand scans/day on the free tier — plenty
 * for a weekly digest across hundreds of tracked brands).
 *
 * We only request the fields we need (id + snippet) and skip the
 * follow-up videos.list lookup that would surface viewCount, since
 * pulling stats for every result would 4x the quota burn for a
 * marginal UX gain. The dashboard sorts by recency anyway.
 */
import type { Mention } from "../mentions";

interface YTSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
  };
}

interface YTSearchResponse {
  items?: YTSearchItem[];
  error?: { message?: string };
}

export async function fetchYoutubeMentions(
  brand: string,
  limit = 15,
): Promise<Mention[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];

  const params = new URLSearchParams({
    part: "snippet",
    q: `"${brand}"`,
    type: "video",
    order: "date",
    maxResults: String(Math.min(50, limit)),
    key,
  });
  const url = `https://www.googleapis.com/youtube/v3/search?${params}`;

  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const json = (await res.json().catch(() => null)) as YTSearchResponse | null;
  const items = json?.items ?? [];

  return items
    .filter((i) => i.id?.videoId)
    .map((i): Mention => {
      const id = i.id!.videoId!;
      return {
        source: "youtube",
        sourceId: id,
        url: `https://www.youtube.com/watch?v=${id}`,
        title: i.snippet?.title || "",
        excerpt: (i.snippet?.description || "").slice(0, 280),
        author: i.snippet?.channelTitle,
        score: 0,
        comments: 0,
        postedAt: i.snippet?.publishedAt,
        meta: { channel: i.snippet?.channelTitle },
      };
    });
}
