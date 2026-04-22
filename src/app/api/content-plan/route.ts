import { NextRequest, NextResponse } from "next/server";
import { generateContentPlan } from "@/lib/agents/localityEngine";

export async function POST(req: NextRequest) {
  try {
    const { projectName, developerName, location, city, configurations, priceRange, usps } = await req.json();

    if (!projectName || !location || !city) {
      return NextResponse.json(
        { error: "projectName, location, and city are required" },
        { status: 400 }
      );
    }

    // Don't fabricate a default configuration — if the project is
    // villas / plots / penthouses, defaulting to "2BHK, 3BHK" makes the
    // plan invent apartment-specific angles that don't apply.
    const plan = await generateContentPlan(
      projectName,
      developerName || "",
      location,
      city,
      configurations || "",
      priceRange || "",
      usps || ""
    );

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Content plan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Content plan generation failed" },
      { status: 500 }
    );
  }
}
