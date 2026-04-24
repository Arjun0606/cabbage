export const runtime = "nodejs";
export const maxDuration = 300;
import { NextRequest, NextResponse } from "next/server";
import { analyzeInternalLinking } from "@/lib/agents/internalLinking";

/**
 * Internal linking analyzer — takes a previously-run site crawl and
 * produces orphan pages, hub pages, topical clusters, and specific
 * "link from X to Y" suggestions.
 *
 * Consumes crawl data from the client (stored in localStorage per site)
 * so we don't re-crawl unnecessarily.
 */
export async function POST(req: NextRequest) {
  try {
    const { crawl } = await req.json();
    if (!crawl || !Array.isArray(crawl.pages)) {
      return NextResponse.json({ error: "Valid crawl data is required. Run Site Crawl first." }, { status: 400 });
    }
    const report = analyzeInternalLinking(crawl);
    return NextResponse.json(report);
  } catch (error) {
    console.error("Internal linking error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal linking analysis failed" },
      { status: 500 }
    );
  }
}
