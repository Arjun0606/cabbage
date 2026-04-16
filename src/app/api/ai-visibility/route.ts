import { NextRequest, NextResponse } from "next/server";
import { runAIVisibility } from "@/lib/agents/aiVisibility";
import { generateSearchQueries } from "@/lib/agents/localityEngine";

export async function POST(req: NextRequest) {
  try {
    const { websiteUrl, brand, projects, city, savedQueries, projectDetails, industry, brandContext } = await req.json();

    if (!brand) {
      return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
    }

    // Use saved queries if provided (for consistent tracking), otherwise generate fresh
    const queries = (savedQueries && savedQueries.length > 0)
      ? savedQueries
      : await generateSearchQueries(
          city || "the market",
          brand,
          projects || [],
          projectDetails?.[0]?.location,
          industry,
          projectDetails,
          brandContext
        );

    const result = await runAIVisibility(
      websiteUrl || "",
      brand,
      projects || [],
      queries
    );

    return NextResponse.json({ ...result, queriesUsed: queries });
  } catch (error) {
    console.error("AI Visibility error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI Visibility check failed" },
      { status: 500 }
    );
  }
}
