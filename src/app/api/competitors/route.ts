import { NextRequest, NextResponse } from "next/server";
import { analyzeCompetitor, analyzeAllCompetitors } from "@/lib/agents/competitors";

export async function POST(req: NextRequest) {
  try {
    const { companyName, competitors } = await req.json();

    if (!companyName || !competitors?.length) {
      return NextResponse.json(
        { error: "companyName and competitors array are required" },
        { status: 400 }
      );
    }

    // If single competitor, analyze just that one
    if (competitors.length === 1) {
      const result = await analyzeCompetitor(companyName, competitors[0]);
      return NextResponse.json([result]);
    }

    // Analyze all (max 5 to avoid timeout)
    const limited = competitors.slice(0, 5);
    const results = await analyzeAllCompetitors(companyName, limited);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Competitor analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Competitor analysis failed" },
      { status: 500 }
    );
  }
}
