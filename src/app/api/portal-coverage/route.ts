export const runtime = "nodejs";
export const maxDuration = 300;
import { NextRequest, NextResponse } from "next/server";
import { requireActiveSubscription } from "@/lib/db/supabase-server";
import { enforceCredits } from "@/lib/credits";
import { runPortalCoverage } from "@/lib/agents/portalCoverage";

/**
 * POST /api/portal-coverage
 *
 * Body: { brand: string, city?: string, companyId?: string }
 * Returns: PortalCoverageResult — which of the top Indian RE portals
 * actually list the brand, with a citation URL per confirmed listing.
 *
 * Replaces the old Authority "Portal Listings N/5" counter which just
 * measured whether we had generated listing-copy. Now it measures
 * real coverage.
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;

    const { brand, city, companyId } = await req.json();

    if (!brand || typeof brand !== "string" || brand.trim().length < 2) {
      return NextResponse.json({ error: "brand is required" }, { status: 400 });
    }

    // Web-search heavy — 5-7 grounded searches per run. Price it
    // alongside AI visibility so users can budget it predictably.
    await enforceCredits(companyId, "ai_visibility");

    const result = await runPortalCoverage(
      brand.trim(),
      typeof city === "string" ? city.trim() : "",
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("portal-coverage error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Portal coverage check failed",
      },
      { status: 500 }
    );
  }
}
