export const runtime = "nodejs";
export const maxDuration = 300;
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { runSiteCrawlChunk, type CrawlState } from "@/lib/agents/siteCrawler";

/**
 * Crawl worker — drains chunked crawl_jobs.
 *
 * The /api/site-crawl entry point ran the FIRST chunk inline so the
 * customer's response carried partial pages immediately. This cron
 * runs every 30 minutes and processes the next 1500-page chunk for
 * each running job until status flips to 'done'. A 3000-page Scale
 * crawl finishes in 2 chunks (one inline + one cron tick); 5000+
 * page custom crawls finish in 4-5 ticks.
 *
 * Stuck-job recovery: if last_tick_at is older than STUCK_TIMEOUT
 * we re-claim the job assuming the previous tick crashed mid-write.
 * The chunk function is idempotent on visited URLs so re-running
 * never produces duplicate page rows.
 */

const PER_TICK_PAGES = 1500;
const STUCK_TIMEOUT_MS = 15 * 60_000;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = getServiceClient();
  const stuckCutoff = new Date(Date.now() - STUCK_TIMEOUT_MS).toISOString();

  // Pick up jobs that are queued, OR running but with a stale last_tick.
  // Limit per cron tick to keep the function under its 5-min budget;
  // unprocessed jobs roll into the next tick.
  const { data: jobs } = await svc
    .from("crawl_jobs")
    .select("id, company_id, url, max_pages, state, pages_done, status, last_tick_at")
    .or(`status.eq.queued,and(status.eq.running,last_tick_at.lt.${stuckCutoff})`)
    .order("enqueued_at", { ascending: true })
    .limit(3);

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ ranAt: new Date().toISOString(), processed: 0 });
  }

  const summary: Array<{ id: string; before: number; after: number; status: string; error?: string }> = [];

  for (const job of jobs) {
    const before = job.pages_done as number;
    try {
      // Mark running early so a concurrent tick (shouldn't happen on
      // Vercel cron, but defensive) doesn't double-claim.
      await svc
        .from("crawl_jobs")
        .update({ status: "running", last_tick_at: new Date().toISOString() })
        .eq("id", job.id);

      const prevState = (job.state as CrawlState) || { visited: [], queue: [], pages: [] };
      const { result, state, done } = await runSiteCrawlChunk(job.url as string, {
        maxPages: job.max_pages as number,
        chunkSize: PER_TICK_PAGES,
        prevState,
      });

      await svc
        .from("crawl_jobs")
        .update({
          state,
          pages_done: result.totalPages,
          status: done ? "done" : "running",
          last_tick_at: new Date().toISOString(),
          completed_at: done ? new Date().toISOString() : null,
        })
        .eq("id", job.id);

      // Append broken pages from this chunk to broken_links so the
      // dashboard panel reflects the latest crawl state without waiting
      // for the whole crawl to finish. Each chunk's rows share a single
      // crawled_at timestamp so the panel can group by recency.
      const broken = result.pages.filter((p) => p.statusCode >= 400 || p.statusCode === 0);
      if (broken.length > 0) {
        const chunkAt = new Date().toISOString();
        const rows = broken.slice(0, 500).map((p) => ({
          company_id: job.company_id as string,
          url: p.url,
          status_code: p.statusCode,
          fetch_error: p.fetchError || null,
          crawled_at: chunkAt,
        }));
        try {
          await svc.from("broken_links").insert(rows);
        } catch (err) {
          console.warn(
            "broken_links persist (cron) failed:",
            err instanceof Error ? err.message : err,
          );
        }
      }

      summary.push({
        id: job.id as string,
        before,
        after: result.totalPages,
        status: done ? "done" : "running",
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown error";
      await svc
        .from("crawl_jobs")
        .update({
          status: "failed",
          failed_reason: reason.slice(0, 500),
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      summary.push({ id: job.id as string, before, after: before, status: "failed", error: reason });
    }
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), processed: summary.length, summary });
}
