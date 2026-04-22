import { NextResponse } from "next/server";
import { getTopIndianPropertyPortals } from "@/lib/marketKnowledge";

/**
 * Thin public wrapper around the cached portal discovery. Lets the
 * Execution Checklist (and any other client surface) render portal
 * actions derived from live market data instead of hardcoded domains.
 *
 * Cached 6h in marketKnowledge.ts, then edge-cached for another hour
 * so lots of dashboard tabs don't all hit the model simultaneously.
 */
export async function GET() {
  const portals = await getTopIndianPropertyPortals();
  return NextResponse.json(
    { portals },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
