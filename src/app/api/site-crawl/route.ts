export const runtime = "nodejs";
export const maxDuration = 300;
import { NextRequest, NextResponse } from "next/server";
import { runSiteCrawl } from "@/lib/agents/siteCrawler";
import { enforceCredits } from "@/lib/credits";
import { requireActiveSubscription } from "@/lib/db/supabase-server";
import { canRunScan } from "@/lib/cadence";

/**
 * Full-site crawler endpoint. The per-scan page cap is tier-gated so
 * Starter customers can't crawl more than 500 pages per scan — that's
 * the lever Starter vs Pro vs Enterprise actually buys. Enterprise
 * caps at 3000 (the agent's hard ceiling).
 */
const DEFAULT_PAGES = 200;

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
    const result = await runSiteCrawl(url, limit);

    // Annotate the response with tier-cap context so the client can
    // render an upgrade nudge when the user asked for more than their
    // plan permits.
    return NextResponse.json({
      ...result,
      tierCap,
      requestedPages: requested,
      cappedByPlan: requested > tierCap,
    });
  } catch (error) {
    console.error("Site crawl error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Site crawl failed" },
      { status: 500 }
    );
  }
}
