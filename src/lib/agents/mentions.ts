/**
 * Brand mention tracker.
 *
 * Pivot.14: complements the 5-engine GEO scan. The scan tells you
 * how AI sees you; mentions tell you where humans are talking. We
 * pull from four channels in parallel:
 *
 *   - Reddit (free /search.json)
 *   - Hacker News (free Algolia search index)
 *   - YouTube (Data API v3, free quota of 10k units/day)
 *   - X / Twitter (via Grok's search_parameters.sources=[{type:"x"}])
 *
 * Sources are independently failable — if YouTube is missing a key
 * or HN's CDN is having a moment, the rest still surface. Each
 * source returns a Mention[] in our shared shape; we dedupe by
 * (source, sourceId) before persisting so cron re-runs are
 * idempotent.
 */
import { getServiceClient } from "@/lib/db/supabase";
import { fetchRedditMentions } from "./mentions/reddit";
import { fetchHnMentions } from "./mentions/hn";
import { fetchYoutubeMentions } from "./mentions/youtube";
import { fetchXMentions } from "./mentions/x";

export type MentionSource = "reddit" | "hackernews" | "youtube" | "x";

export interface Mention {
  source: MentionSource;
  sourceId: string;
  url: string;
  title?: string;
  excerpt?: string;
  author?: string;
  score?: number;
  comments?: number;
  postedAt?: string;
  sentiment?: "positive" | "neutral" | "negative";
  meta?: Record<string, unknown>;
}

export interface MentionScanResult {
  brand: string;
  brandSlug: string;
  total: number;
  bySource: Record<MentionSource, number>;
  newSinceLastScan: number;
  mentions: Mention[];
  errors: Array<{ source: MentionSource; error: string }>;
}

export interface MentionScanOptions {
  brand: string;
  brandSlug: string;
  limitPerSource?: number;
  persist?: boolean;
}

async function safeSource(
  source: MentionSource,
  fn: () => Promise<Mention[]>,
): Promise<{ source: MentionSource; mentions: Mention[]; error?: string }> {
  try {
    const mentions = await fn();
    return { source, mentions };
  } catch (err) {
    return {
      source,
      mentions: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function scanMentions(
  opts: MentionScanOptions,
): Promise<MentionScanResult> {
  const { brand, brandSlug } = opts;
  const limit = opts.limitPerSource ?? 25;
  const persist = opts.persist ?? true;

  const [reddit, hn, youtube, x] = await Promise.all([
    safeSource("reddit", () => fetchRedditMentions(brand, limit)),
    safeSource("hackernews", () => fetchHnMentions(brand, limit)),
    safeSource("youtube", () => fetchYoutubeMentions(brand, Math.min(limit, 15))),
    safeSource("x", () => fetchXMentions(brand, Math.min(limit, 15))),
  ]);

  const collected = [...reddit.mentions, ...hn.mentions, ...youtube.mentions, ...x.mentions];

  const seen = new Set<string>();
  const deduped: Mention[] = [];
  for (const m of collected) {
    const key = `${m.source}:${m.sourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(m);
  }
  deduped.sort((a, b) => {
    const ta = a.postedAt ? Date.parse(a.postedAt) : 0;
    const tb = b.postedAt ? Date.parse(b.postedAt) : 0;
    return tb - ta;
  });

  let newSinceLastScan = 0;
  if (persist && deduped.length > 0) {
    newSinceLastScan = await persistMentions(brandSlug, deduped);
  }

  const bySource: Record<MentionSource, number> = {
    reddit: reddit.mentions.length,
    hackernews: hn.mentions.length,
    youtube: youtube.mentions.length,
    x: x.mentions.length,
  };
  const errors = [reddit, hn, youtube, x]
    .filter((r): r is typeof r & { error: string } => Boolean(r.error))
    .map((r) => ({ source: r.source, error: r.error }));

  return {
    brand,
    brandSlug,
    total: deduped.length,
    bySource,
    newSinceLastScan,
    mentions: deduped,
    errors,
  };
}

async function persistMentions(
  brandSlug: string,
  mentions: Mention[],
): Promise<number> {
  const svc = getServiceClient();

  const { data: existing } = await svc
    .from("brand_mentions")
    .select("source, source_id")
    .eq("brand_slug", brandSlug)
    .in(
      "source_id",
      mentions.map((m) => m.sourceId),
    );
  const existingKeys = new Set<string>(
    (existing || []).map(
      (r: { source: string; source_id: string }) => `${r.source}:${r.source_id}`,
    ),
  );

  const fresh = mentions.filter(
    (m) => !existingKeys.has(`${m.source}:${m.sourceId}`),
  );

  if (fresh.length === 0) return 0;

  const rows = fresh.map((m) => ({
    brand_slug: brandSlug,
    source: m.source,
    source_id: m.sourceId,
    url: m.url,
    title: m.title ?? null,
    excerpt: m.excerpt ?? null,
    author: m.author ?? null,
    score: m.score ?? 0,
    comments: m.comments ?? 0,
    posted_at: m.postedAt ?? null,
    sentiment: m.sentiment ?? null,
    meta: m.meta ?? {},
  }));

  await svc
    .from("brand_mentions")
    .upsert(rows, { onConflict: "brand_slug,source,source_id" });

  return fresh.length;
}

/**
 * Read most-recent persisted mentions for a brand. Used by the
 * dashboard panel and the weekly digest builder.
 */
export async function readMentions(
  brandSlug: string,
  limit = 50,
): Promise<Mention[]> {
  const svc = getServiceClient();
  const { data } = await svc
    .from("brand_mentions")
    .select(
      "source, source_id, url, title, excerpt, author, score, comments, posted_at, sentiment, meta",
    )
    .eq("brand_slug", brandSlug)
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  return (data || []).map(
    (r: {
      source: string;
      source_id: string;
      url: string;
      title: string | null;
      excerpt: string | null;
      author: string | null;
      score: number | null;
      comments: number | null;
      posted_at: string | null;
      sentiment: string | null;
      meta: Record<string, unknown> | null;
    }): Mention => ({
      source: r.source as MentionSource,
      sourceId: r.source_id,
      url: r.url,
      title: r.title ?? undefined,
      excerpt: r.excerpt ?? undefined,
      author: r.author ?? undefined,
      score: r.score ?? 0,
      comments: r.comments ?? 0,
      postedAt: r.posted_at ?? undefined,
      sentiment:
        (r.sentiment as Mention["sentiment"]) ?? undefined,
      meta: r.meta ?? {},
    }),
  );
}
