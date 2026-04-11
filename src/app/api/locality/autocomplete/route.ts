import { NextRequest, NextResponse } from "next/server";
import { autocompleteLocality } from "@/lib/agents/localityEngine";
import { getBudgetRanges } from "@/lib/agents/localityEngine";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const city = req.nextUrl.searchParams.get("city") || undefined;
  const type = req.nextUrl.searchParams.get("type") || "locality";

  if (type === "budget") {
    const budgets = getBudgetRanges(city || "hyderabad");
    return NextResponse.json(budgets);
  }

  const results = autocompleteLocality(q, city);
  return NextResponse.json(results);
}
