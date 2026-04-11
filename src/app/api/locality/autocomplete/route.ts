import { NextRequest, NextResponse } from "next/server";
import { discoverLocalities, getBudgetRanges } from "@/lib/agents/localityEngine";

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get("city") || "";
  const type = req.nextUrl.searchParams.get("type") || "locality";

  if (!city) {
    return NextResponse.json({ error: "city parameter is required" }, { status: 400 });
  }

  if (type === "budget") {
    const budgets = await getBudgetRanges(city);
    return NextResponse.json(budgets);
  }

  // Discover localities dynamically via AI
  const results = await discoverLocalities(city);
  return NextResponse.json(results);
}
