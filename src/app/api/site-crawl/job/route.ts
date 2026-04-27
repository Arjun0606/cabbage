export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { requireActiveSubscription } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * GET /api/site-crawl/job?id=...
 *
 * Returns the current state of a chunked crawl. The dashboard's
 * SiteCrawlPanel polls this every 30s while the job is queued or
 * running so the customer sees pages_done climb and finally a
 * "Crawl complete" banner when status flips to 'done'.
 *
 * Single-shot crawls (≤1500 pages on any tier) never create a
 * crawl_jobs row, so this endpoint isn't part of their flow.
 */
export async function GET(req: NextRequest) {
  try {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const svc = getServiceClient();
    // Confirm ownership before returning state — same RLS posture as
    // the rest of the API surface.
    const { data: job } = await svc
      .from("crawl_jobs")
      .select("id, company_id, url, max_pages, pages_done, status, failed_reason, enqueued_at, last_tick_at, completed_at, state")
      .eq("id", id)
      .maybeSingle();

    if (!job) {
      return NextResponse.json({ error: "Crawl job not found" }, { status: 404 });
    }

    if (gate.plan !== "demo") {
      const { data: ownership } = await svc
        .from("companies")
        .select("id")
        .eq("id", job.company_id)
        .eq("owner_id", gate.userId)
        .maybeSingle();
      if (!ownership) {
        return NextResponse.json({ error: "Crawl job not found" }, { status: 404 });
      }
    }

    // The state column carries the full pages array. For poll responses
    // we only need pages_done + a thin pages preview so the panel can
    // render an interim summary without shipping the entire 3000-page
    // payload on every poll.
    const stateAny = (job.state as { pages?: unknown[] }) || {};
    const pagesPreview = Array.isArray(stateAny.pages) ? stateAny.pages.slice(0, 200) : [];

    return NextResponse.json({
      id: job.id,
      url: job.url,
      maxPages: job.max_pages,
      pagesDone: job.pages_done,
      status: job.status,
      failedReason: job.failed_reason,
      enqueuedAt: job.enqueued_at,
      lastTickAt: job.last_tick_at,
      completedAt: job.completed_at,
      // Full pages array only when the crawl is done — saves bandwidth
      // on intermediate polls.
      pages: job.status === "done" ? (stateAny.pages || []) : pagesPreview,
    });
  } catch (error) {
    console.error("crawl-job GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Read failed" },
      { status: 500 }
    );
  }
}
