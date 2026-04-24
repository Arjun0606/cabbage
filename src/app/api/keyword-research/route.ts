export const runtime = "nodejs";
export const maxDuration = 300;
import { NextRequest, NextResponse } from "next/server";
import { runKeywordResearch, runKeywordPortfolio } from "@/lib/agents/keywordResearch";
import { enforceCredits } from "@/lib/credits";
import { requireActiveSubscription } from "@/lib/db/supabase-server";

/**
 * POST body shapes:
 *   { mode: "portfolio", city, projects, gscData? }  — multi-dim research
 *   { seed, city, gscData? }                          — single seed (legacy)
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;

    const body = await req.json();
    const { seed, city, gscData, companyId, projects, mode } = body;

    await enforceCredits(companyId, "prompt_volumes");

    if (mode === "portfolio") {
      if (!city || !Array.isArray(projects)) {
        return NextResponse.json({ error: "city and projects[] required for portfolio mode" }, { status: 400 });
      }
      const result = await runKeywordPortfolio({ city, projects }, gscData);
      return NextResponse.json(result);
    }

    if (!seed || !city) {
      return NextResponse.json({ error: "seed and city are required" }, { status: 400 });
    }
    const result = await runKeywordResearch(seed, city, gscData);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Keyword research error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Keyword research failed" },
      { status: 500 }
    );
  }
}
