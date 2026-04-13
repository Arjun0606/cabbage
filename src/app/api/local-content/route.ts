import { NextRequest, NextResponse } from "next/server";
import { generateLocalContent } from "@/lib/agents/localContent";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      projectName, developerName, location, city,
      configurations, priceRange, usps,
      // Brand context (optional — enriches content quality)
      brandVoice, brandValues, brandVision, targetAudience,
      productInfo, marketingStrategy, amenities, reraNumber,
      status, allProjects, competitors,
    } = body;

    if (!projectName || !location || !city) {
      return NextResponse.json(
        { error: "projectName, location, and city are required" },
        { status: 400 }
      );
    }

    const brandContext = (brandVoice || brandValues || targetAudience || productInfo || amenities || reraNumber)
      ? { brandVoice, brandValues, brandVision, targetAudience, productInfo, marketingStrategy, amenities, reraNumber, status, allProjects, competitors }
      : undefined;

    const result = await generateLocalContent(
      projectName,
      developerName || "",
      location,
      city,
      configurations || "",
      priceRange || "",
      usps || "",
      brandContext
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
