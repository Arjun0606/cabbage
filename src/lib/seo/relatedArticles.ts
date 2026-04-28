/**
 * Related-article suggestions for internal linking.
 *
 * When a customer publishes article #50, articles 1-49 should link to
 * it where topically relevant. The auto-link pass injects a "Related
 * reading" section at the end of every generated article so the
 * customer's CMS can render the links the moment they paste the
 * content.
 *
 * Selection is by token overlap on (query, title) — the same
 * conservative matcher used for cannibalization detection — but
 * inverted. We pick articles with non-trivial overlap (0.15..0.7) so
 * we don't link to either unrelated content (too low) or articles that
 * are themselves cannibalisation candidates (too high).
 */

import { getServiceClient } from "@/lib/db/supabase";

export interface RelatedArticleSuggestion {
  id: string;
  title: string;
  query: string;
  publishUrl: string | null;
  status: string;
  similarity: number;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
  "from", "as", "is", "are", "was", "were", "be", "been", "being",
  "best", "top", "good", "great", "new",
  "your", "my", "our",
  "what", "where", "when", "how", "why", "which",
  "near", "around",
]);

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOPWORDS.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersect = 0;
  for (const t of a) if (b.has(t)) intersect++;
  const union = a.size + b.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

export async function findRelatedArticles(
  companyId: string,
  proposedQuery: string,
  proposedTitle: string,
  options?: { limit?: number; minSim?: number; maxSim?: number; excludeId?: string },
): Promise<RelatedArticleSuggestion[]> {
  const limit = options?.limit ?? 4;
  const minSim = options?.minSim ?? 0.15;
  const maxSim = options?.maxSim ?? 0.7;

  const proposedTokens = new Set<string>([
    ...tokenize(proposedQuery),
    ...tokenize(proposedTitle),
  ]);
  if (proposedTokens.size === 0) return [];

  const svc = getServiceClient();
  const { data, error } = await svc
    .from("tracked_articles")
    .select("id, query, title, status, publish_url, generated_at")
    .eq("company_id", companyId)
    .order("generated_at", { ascending: false })
    .limit(500);

  if (error || !data) return [];

  const candidates: RelatedArticleSuggestion[] = [];
  for (const row of data) {
    if (options?.excludeId && row.id === options.excludeId) continue;
    if (!row.query && !row.title) continue;
    const tokens = new Set<string>([
      ...tokenize(row.query || ""),
      ...tokenize(row.title || ""),
    ]);
    const sim = jaccard(proposedTokens, tokens);
    if (sim < minSim || sim > maxSim) continue;
    candidates.push({
      id: row.id,
      title: row.title || row.query,
      query: row.query,
      publishUrl: row.publish_url,
      status: row.status,
      similarity: Math.round(sim * 100) / 100,
    });
  }

  candidates.sort((a, b) => b.similarity - a.similarity);
  return candidates.slice(0, limit);
}

/**
 * Render a markdown "Related reading" block ready to append to article
 * content. Each link points to the article's publish_url when set,
 * otherwise to a slug placeholder the customer's CMS can resolve.
 */
export function renderRelatedReadingMarkdown(items: RelatedArticleSuggestion[]): string {
  if (items.length === 0) return "";
  const lines = items.map((it) => {
    const href = it.publishUrl && /^https?:\/\//.test(it.publishUrl) ? it.publishUrl : `#/${it.id}`;
    return `- [${it.title}](${href})`;
  });
  return `\n\n## Related reading\n\n${lines.join("\n")}\n`;
}
