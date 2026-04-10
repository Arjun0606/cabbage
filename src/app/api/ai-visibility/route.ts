import { NextRequest, NextResponse } from "next/server";
import { runAIVisibility } from "@/lib/agents/aiVisibility";
import { REAL_ESTATE_QUERIES } from "@/data/queries";

export async function POST(req: NextRequest) {
  try {
    const { websiteUrl, brand, projects, city } = await req.json();

    if (!brand) {
      return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
    }

    // Use city-specific queries or all queries
    const queries = city && REAL_ESTATE_QUERIES[city as keyof typeof REAL_ESTATE_QUERIES]
      ? REAL_ESTATE_QUERIES[city as keyof typeof REAL_ESTATE_QUERIES]
      : Object.values(REAL_ESTATE_QUERIES).flat().slice(0, 15); // Cap at 15 for cost

    const result = await runAIVisibility(
      websiteUrl || "",
      brand,
      projects || [],
      queries as string[]
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI Visibility error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI Visibility check failed" },
      { status: 500 }
    );
  }
}
