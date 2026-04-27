import { getServiceClient } from "@/lib/db/supabase";

/**
 * Article-job queue helpers — bulk autonomous article generation.
 *
 * Companion to migration 012 (article_jobs). The dashboard enqueues
 * suggested queries here; the article-worker cron drains them. Brand
 * context for each generation comes from the company row + project
 * rows on tick, not from per-job storage, so re-issuing the company's
 * brand voice / project list / city always reflects the latest state
 * (a customer fixing their brand-aliases doc means everything
 * subsequently generated picks it up).
 */

export type ArticleJobStatus =
  | "queued"
  | "writing"
  | "done"
  | "failed"
  | "capped"
  // Brand voice / product info docs are below the threshold, so the
  // article-writer's brand-context gate rejected this job. We mark it
  // separately so the dashboard can render an actionable "fill brand
  // context to unblock" banner instead of a generic "failed" pip.
  | "needs_brand_context";

export interface ArticleJob {
  id: string;
  companyId: string;
  query: string;
  articleType: string | null;
  priority: number;
  status: ArticleJobStatus;
  enqueuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedReason: string | null;
  generatedArticleId: string | null;
}

/**
 * Mirror of the dashboard's runGeoFixForQuery routing ladder. Kept
 * here in lib so both the user-triggered POST and the cron worker
 * derive the same article type for the same query.
 */
export function deriveArticleType(query: string): string {
  const q = query.toLowerCase();
  if (/\bflats?\s+in\b/.test(q) && /bhk|villa|plot|studio/.test(q)) return "landing_page";
  if (/construction update|q[1-4]\s*(20\d\d)?/.test(q)) return "construction_update";
  if (/\bnri\b|non[\s-]?resident|fema|nre|nro/.test(q)) return "nri_guide";
  if (/\balternatives?\s+to\b|\bsimilar\s+to\b/.test(q)) return "alternatives_to";
  if (/\b(top|best)\s+(\d+|[a-z]+)\s+\S+\s+(in|for|near)\b/.test(q) || /\bbest\b.*\bin\b/.test(q)) return "best_of_list";
  if (/\b(move|moving|upgrade|upgrading|from\s+\S+\s+to)\b.*\b(buying|owning|home|apartment|flat)\b/.test(q) || /\bshift(ing)?\s+(from|to)\b/.test(q)) return "migration_guide";
  if (/\bvs\b|compare|versus/.test(q)) return "comparison";
  if (/investment|roi|rental yield/.test(q)) return "investment";
  if (/buyer guide|how to buy|buying process/.test(q)) return "buyer_guide";
  return "locality_guide";
}

interface RawRow {
  id: string;
  company_id: string;
  query: string;
  article_type: string | null;
  priority: number;
  status: ArticleJobStatus;
  enqueued_at: string;
  started_at: string | null;
  completed_at: string | null;
  failed_reason: string | null;
  generated_article_id: string | null;
}

function rowToJob(r: RawRow): ArticleJob {
  return {
    id: r.id,
    companyId: r.company_id,
    query: r.query,
    articleType: r.article_type,
    priority: r.priority,
    status: r.status,
    enqueuedAt: r.enqueued_at,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    failedReason: r.failed_reason,
    generatedArticleId: r.generated_article_id,
  };
}

/**
 * Insert a batch of queries for a company. Idempotent on
 * (company_id, query) — duplicates are ignored, not raised, so a
 * customer mashing "Auto-write all" twice doesn't double-enqueue.
 * Returns the count of NEW rows that were actually inserted.
 */
export async function enqueueArticles(
  companyId: string,
  items: Array<{ query: string; articleType?: string | null; priority?: number }>,
): Promise<{ inserted: number }> {
  if (!items.length) return { inserted: 0 };
  const svc = getServiceClient();
  const rows = items
    .map((it) => ({
      company_id: companyId,
      query: it.query.trim(),
      article_type: it.articleType ?? deriveArticleType(it.query),
      priority: it.priority ?? 0,
      status: "queued" as ArticleJobStatus,
    }))
    .filter((r) => r.query.length >= 4 && r.query.length <= 300);
  if (rows.length === 0) return { inserted: 0 };
  // upsert with ignoreDuplicates respects the (company_id, query)
  // unique constraint without raising — the dedupe behavior we want.
  const { count, error } = await svc
    .from("article_jobs")
    .upsert(rows, { onConflict: "company_id,query", ignoreDuplicates: true, count: "exact" });
  if (error) {
    throw new Error(`enqueueArticles failed: ${error.message}`);
  }
  return { inserted: count ?? 0 };
}

/**
 * List jobs for a company. Used by the dashboard ContentQueue to show
 * queued / writing / done counts and per-row status.
 */
export async function listJobs(companyId: string, statuses?: ArticleJobStatus[]): Promise<ArticleJob[]> {
  const svc = getServiceClient();
  let q = svc
    .from("article_jobs")
    .select("*")
    .eq("company_id", companyId)
    .order("priority", { ascending: false })
    .order("enqueued_at", { ascending: true });
  if (statuses && statuses.length > 0) q = q.in("status", statuses);
  const { data, error } = await q;
  if (error) {
    console.error("listJobs error:", error.message);
    return [];
  }
  return (data || []).map((r) => rowToJob(r as RawRow));
}

/**
 * Pull the next N queued jobs for one company. Atomically marks them
 * 'writing' so a second worker tick doesn't pick them up. Returns the
 * claimed jobs.
 */
export async function claimNext(companyId: string, limit: number): Promise<ArticleJob[]> {
  const svc = getServiceClient();
  // Two-step claim: read the IDs, then update by ID. Postgres doesn't
  // expose a SKIP LOCKED hook through PostgREST, so this two-step is
  // the cleanest race-safe pattern at the supabase-js layer. We accept
  // a small window of double-claim; the worker idempotency check
  // (status === 'writing' guard) covers it.
  const { data: claims } = await svc
    .from("article_jobs")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "queued")
    .order("priority", { ascending: false })
    .order("enqueued_at", { ascending: true })
    .limit(limit);
  if (!claims || claims.length === 0) return [];
  const ids = claims.map((r) => r.id);
  const startedAt = new Date().toISOString();
  const { data: updated } = await svc
    .from("article_jobs")
    .update({ status: "writing", started_at: startedAt })
    .in("id", ids)
    .eq("status", "queued") // race guard
    .select("*");
  return (updated || []).map((r) => rowToJob(r as RawRow));
}

export async function markDone(jobId: string, generatedArticleId: string | null): Promise<void> {
  const svc = getServiceClient();
  await svc
    .from("article_jobs")
    .update({
      status: "done",
      completed_at: new Date().toISOString(),
      generated_article_id: generatedArticleId,
    })
    .eq("id", jobId);
}

export async function markFailed(jobId: string, reason: string): Promise<void> {
  const svc = getServiceClient();
  await svc
    .from("article_jobs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      failed_reason: reason.slice(0, 500),
    })
    .eq("id", jobId);
}

export async function markNeedsBrandContext(jobId: string, reason: string): Promise<void> {
  const svc = getServiceClient();
  await svc
    .from("article_jobs")
    .update({
      status: "needs_brand_context",
      completed_at: new Date().toISOString(),
      failed_reason: reason.slice(0, 500),
    })
    .eq("id", jobId);
}

export async function markCapped(jobId: string): Promise<void> {
  const svc = getServiceClient();
  await svc
    .from("article_jobs")
    .update({
      status: "capped",
      completed_at: new Date().toISOString(),
      failed_reason: "Monthly article cap reached for current plan",
    })
    .eq("id", jobId);
}

export async function deleteJob(companyId: string, jobId: string): Promise<boolean> {
  const svc = getServiceClient();
  const { error } = await svc
    .from("article_jobs")
    .delete()
    .eq("id", jobId)
    .eq("company_id", companyId);
  return !error;
}

/**
 * Tally for the UI: queued / writing / done / failed / capped counts.
 */
export async function jobCounts(companyId: string): Promise<Record<ArticleJobStatus, number>> {
  const svc = getServiceClient();
  const { data } = await svc
    .from("article_jobs")
    .select("status")
    .eq("company_id", companyId);
  const out: Record<ArticleJobStatus, number> = {
    queued: 0, writing: 0, done: 0, failed: 0, capped: 0, needs_brand_context: 0,
  };
  for (const r of data || []) {
    const s = r.status as ArticleJobStatus;
    if (s in out) out[s] += 1;
  }
  return out;
}
