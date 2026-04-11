import { NextRequest, NextResponse } from "next/server";
import { searchLocality } from "@/lib/agents/localityEngine";

export async function POST(req: NextRequest) {
  try {
    const { city, locality, projectName, configurations, priceRange } = await req.json();

    if (!city || !locality) {
      return NextResponse.json({ error: "city and locality are required" }, { status: 400 });
    }

    const result = await searchLocality(city, locality, projectName, configurations, priceRange);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Locality search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Locality search failed" },
      { status: 500 }
    );
  }
}
