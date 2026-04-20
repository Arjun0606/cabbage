import { NextRequest, NextResponse } from "next/server";
import { runSiteCrawl } from "@/lib/agents/siteCrawler";
import { enforceCredits } from "@/lib/credits";

/**
 * Full-site crawler endpoint. Crawls a site (default 50 pages, max 200)
 * and returns per-URL SEO audit + site-wide summary.
 *
 * Used by the dashboard's "Run Site Crawl" button. Results are persisted
 * by the client to localStorage per activeSiteUrl so switching sites
 * loads that site's crawl.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, maxPages, companyId } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Soft credit tracking (upsell model — doesn't block)
    await enforceCredits(companyId, "audit");

    const limit = Math.min(Math.max(Number(maxPages) || 50, 1), 200);
    const result = await runSiteCrawl(url, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Site crawl error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Site crawl failed" },
      { status: 500 }
    );
  }
}
