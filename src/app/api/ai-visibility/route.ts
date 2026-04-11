import { NextRequest, NextResponse } from "next/server";
import { runAIVisibility } from "@/lib/agents/aiVisibility";
import { generateSearchQueries } from "@/lib/agents/localityEngine";

export async function POST(req: NextRequest) {
  try {
    const { websiteUrl, brand, projects, city } = await req.json();

    if (!brand) {
      return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
    }

    // Generate queries dynamically based on the actual city and brand
    const queries = await generateSearchQueries(
      city || "the market",
      brand,
      projects || []
    );

    const result = await runAIVisibility(
      websiteUrl || "",
      brand,
      projects || [],
      queries
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
