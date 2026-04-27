export const runtime = "nodejs";
export const maxDuration = 300;
import { NextRequest, NextResponse } from "next/server";
import { runSiteCrawlChunk } from "@/lib/agents/siteCrawler";
import { enforceCredits } from "@/lib/credits";
import { requireActiveSubscription } from "@/lib/db/supabase-server";
import { canRunScan } from "@/lib/cadence";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * Full-site crawler endpoint. The per-scan page cap is tier-gated:
 * Starter 500, Growth 1500, Scale 3000.
 *
 * Crawls under INLINE_THRESHOLD pages run synchronously in a single
 * invocation — the existing fast-path that fits Vercel's 5-minute
 * function timeout. Crawls bigger than that get a `crawl_jobs` row
 * and a chunk-based worker handoff: the first chunk runs inline so
 * the response carries partial data immediately, then the cron worker
 * (every 30 min) drains subsequent chunks until the crawl is done.
 *
 * This is what makes Scale's 3000-page promise honest. Without it,
 * a national builder's site tree hits the function-timeout wall and
 * returns ~2000 pages with maxPagesReached: false (misleading state).
 */
const DEFAULT_PAGES = 200;
const INLINE_THRESHOLD = 1500;
const FIRST_CHUNK_PAGES = 1500;

export async function POST(req: NextRequest) {
  try {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const tierCap = gate.limits.maxPagesPerCrawl;

    const body = await req.json();
    const { url, maxPages, companyId } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Cadence gate — Solo + Starter buy weekly full scans, Growth+ buy
    // daily. Block re-crawls within the tier window.
    if (companyId && typeof companyId === "string") {
      const cadenceCheck = await canRunScan(companyId, "audit", gate.limits.fullScanCadence);
      if (!cadenceCheck.ok) {
        return NextResponse.json(
          {
            error: "Cadence limit reached",
            hint: cadenceCheck.hint,
            nextAllowedAt: cadenceCheck.nextAllowedAt,
            needsUpgrade: gate.limits.fullScanCadence === "weekly",
          },
          { status: 429 }
        );
      }
    }

    await enforceCredits(companyId, "audit");

    const requested = Math.max(Number(maxPages) || DEFAULT_PAGES, 1);
    const limit = Math.min(requested, tierCap);

    // Inline path: single-shot crawl, fits in this invocation. This
    // is the existing behaviour for Starter / Growth and for any
    // smaller crawl on Scale.
    if (limit <= INLINE_THRESHOLD) {
      const { result } = await runSiteCrawlChunk(url, { maxPages: limit });
      return NextResponse.json({
        ...result,
        tierCap,
        requestedPages: requested,
        cappedByPlan: requested > tierCap,
      });
    }

    // Chunked path: enqueue a crawl_jobs row, run the FIRST chunk
    // inline so the response is immediately useful (partial pages +
    // discovered URLs), then hand the rest off to the cron worker.
    // Scale-tier 3000-page crawls finish in 2 chunks.
    if (!companyId || typeof companyId !== "string") {
      // No company → can't persist state. Fall back to inline; might
      // hit the timeout but at least returns something.
      const { result } = await runSiteCrawlChunk(url, { maxPages: limit });
      return NextResponse.json({
        ...result,
        tierCap,
        requestedPages: requested,
        cappedByPlan: requested > tierCap,
      });
    }

    const { result, state, done } = await runSiteCrawlChunk(url, {
      maxPages: limit,
      chunkSize: FIRST_CHUNK_PAGES,
    });

    const svc = getServiceClient();
    const { data: job } = await svc
      .from("crawl_jobs")
      .insert({
        company_id: companyId,
        url,
        max_pages: limit,
        state,
        pages_done: result.totalPages,
        status: done ? "done" : "running",
        last_tick_at: new Date().toISOString(),
        completed_at: done ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    return NextResponse.json({
      ...result,
      tierCap,
      requestedPages: requested,
      cappedByPlan: requested > tierCap,
      // Job-tracking fields the dashboard polls on.
      crawlJobId: job?.id ?? null,
      crawlChunked: true,
      crawlComplete: done,
    });
  } catch (error) {
    console.error("Site crawl error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Site crawl failed" },
      { status: 500 }
    );
  }
}
