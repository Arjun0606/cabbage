import { NextRequest, NextResponse } from "next/server";
import { runKeywordResearch } from "@/lib/agents/keywordResearch";
import { enforceCredits } from "@/lib/credits";

export async function POST(req: NextRequest) {
  try {
    const { seed, city, gscData, companyId } = await req.json();
    if (!seed || !city) {
      return NextResponse.json({ error: "seed and city are required" }, { status: 400 });
    }
    await enforceCredits(companyId, "prompt_volumes");
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
