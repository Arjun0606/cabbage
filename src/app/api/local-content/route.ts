import { NextRequest, NextResponse } from "next/server";
import { generateLocalContent } from "@/lib/agents/localContent";

export async function POST(req: NextRequest) {
  try {
    const {
      projectName,
      developerName,
      location,
      city,
      configurations,
      priceRange,
      usps,
    } = await req.json();

    if (!projectName || !location || !city) {
      return NextResponse.json(
        { error: "projectName, location, and city are required" },
        { status: 400 }
      );
    }

    const result = await generateLocalContent(
      projectName,
      developerName || "",
      location,
      city,
      configurations || "2BHK, 3BHK",
      priceRange || "",
      usps || ""
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Local content error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Content generation failed" },
      { status: 500 }
    );
  }
}
