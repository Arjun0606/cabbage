/**
 * Content cannibalization detection.
 *
 * Two articles for the same target query split signal between themselves
 * — neither ranks. At 80-200 articles a month per customer, this becomes
 * a real risk. This lib finds existing tracked_articles that overlap with
 * a proposed new query so the article-writer can warn or block before
 * generating yet another competing piece.
 *
 * Matching is intentionally conservative — token-overlap on
 * normalised query strings, not LLM-based semantic similarity. Cheap,
 * deterministic, and good enough for the signal/noise tradeoff at the
 * volumes Cabbge runs.
 */

import { getServiceClient } from "@/lib/db/supabase";

export interface CannibalCandidate {
  id: string;
  query: string;
  title: string | null;
  status: string;
  generatedAt: string;
  similarity: number; // 0..1
}

export interface CannibalizationCheck {
  exact: CannibalCandidate | null; // exact normalised-query match if any
  near: CannibalCandidate[];       // ≥0.6 similarity, ranked desc
  isCannibal: boolean;             // true if exact or any near match exists
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
  "from", "as", "is", "are", "was", "were", "be", "been", "being",
  "best", "top", "good", "great", "new",
  "your", "my", "our",
  "what", "where", "when", "how", "why", "which",
  "near", "around", "in",
]);

function tokenize(q: string): Set<string> {
  return new Set(
    q
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOPWORDS.has(w)),
  );
}

function normalize(q: string): string {
  return q.toLowerCase().replace(/\s+/g, " ").trim();
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersect = 0;
  for (const t of a) if (b.has(t)) intersect++;
  const union = a.size + b.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

/**
 * Detect cannibalization for a proposed query against the company's
 * existing tracked_articles. Threshold defaults to 0.6 — high enough to
 * catch "best 3 BHK in Whitefield" vs "top 3 BHK Whitefield" (same
 * intent), low enough to skip "best 3 BHK in Whitefield" vs "best 4 BHK
 * in HSR" (different intent).
 */
export async function detectCannibalization(
  companyId: string,
  proposedQuery: string,
  options?: { threshold?: number; excludeId?: string },
): Promise<CannibalizationCheck> {
  const threshold = options?.threshold ?? 0.6;
  const proposedNorm = normalize(proposedQuery);
  const proposedTokens = tokenize(proposedQuery);

  const svc = getServiceClient();
  const { data, error } = await svc
    .from("tracked_articles")
    .select("id, query, title, status, generated_at")
    .eq("company_id", companyId)
    .order("generated_at", { ascending: false })
    .limit(500); // bounded — at 200/mo this covers ~2.5 months of history

  if (error || !data) {
    return { exact: null, near: [], isCannibal: false };
  }

  let exact: CannibalCandidate | null = null;
  const near: CannibalCandidate[] = [];

  for (const row of data) {
    if (options?.excludeId && row.id === options.excludeId) continue;
    if (!row.query) continue;
    const candidateNorm = normalize(row.query);
    if (candidateNorm === proposedNorm) {
      exact = {
        id: row.id,
        query: row.query,
        title: row.title,
        status: row.status,
        generatedAt: row.generated_at,
        similarity: 1,
      };
      continue;
    }
    const sim = jaccard(proposedTokens, tokenize(row.query));
    if (sim >= threshold) {
      near.push({
        id: row.id,
        query: row.query,
        title: row.title,
        status: row.status,
        generatedAt: row.generated_at,
        similarity: Math.round(sim * 100) / 100,
      });
    }
  }

  near.sort((a, b) => b.similarity - a.similarity);

  return {
    exact,
    near: near.slice(0, 5),
    isCannibal: !!exact || near.length > 0,
  };
}
