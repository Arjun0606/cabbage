import { NextRequest, NextResponse } from "next/server";
import { runSiteCrawl } from "@/lib/agents/siteCrawler";
import { enforceCredits } from "@/lib/credits";

/**
 * Full-site crawler endpoint. Crawls a site and returns per-URL SEO
 * audit + site-wide summary.
 *
 * The upper cap is generous on purpose. A Prestige / Lodha / Godrej
 * portfolio site easily has 2000+ URLs across project microsites,
 * locality pages, blog archives, and corporate content. Capping at
 * 200 hid 90% of the surface.
 */
const DEFAULT_PAGES = 200;
const MAX_PAGES = 3000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, maxPages, companyId } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    await enforceCredits(companyId, "audit");

    const limit = Math.min(Math.max(Number(maxPages) || DEFAULT_PAGES, 1), MAX_PAGES);
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
