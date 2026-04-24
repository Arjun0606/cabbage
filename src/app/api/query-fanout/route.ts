import { NextRequest, NextResponse } from "next/server";
import { requireActiveSubscription } from "@/lib/db/supabase-server";
import { enforceCredits } from "@/lib/credits";
import { runQueryFanout } from "@/lib/agents/queryFanout";

/**
 * POST /api/query-fanout
 *
 * Body: { anchor: string, brand: string, aliases?: string[], city?: string, variantCount?: number, companyId?: string }
 * Returns: FanoutResult
 *
 * On-demand because 5-10 web searches per click — running this on every
 * scan for every query is prohibitive. User clicks "Expand fanout" on
 * a specific golden prompt, we scan that prompt's ~20-variant fanout.
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;

    const { anchor, brand, aliases, city, variantCount, companyId } = await req.json();

    if (!anchor || typeof anchor !== "string" || anchor.trim().length < 4) {
      return NextResponse.json({ error: "anchor query is required" }, { status: 400 });
    }
    if (!brand || typeof brand !== "string") {
      return NextResponse.json({ error: "brand is required" }, { status: 400 });
    }

    // Fanout is web-search-heavy — 6-11 grounded searches per click.
    // Gate under ai_visibility credits.
    await enforceCredits(companyId, "ai_visibility");

    const cappedVariants = Math.min(Math.max(Number(variantCount) || 5, 3), 10);
    const cleanAliases = Array.isArray(aliases)
      ? aliases.filter((a) => typeof a === "string" && a.trim().length >= 2).slice(0, 10)
      : [];

    const result = await runQueryFanout(
      anchor.trim(),
      brand.trim(),
      cleanAliases,
      typeof city === "string" ? city.trim() : "",
      cappedVariants,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("query-fanout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query fanout failed" },
      { status: 500 }
    );
  }
}
