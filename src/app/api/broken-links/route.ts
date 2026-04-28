import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";

/**
 * GET /api/broken-links?companyId=...&limit=200
 *
 * Returns the most recent broken-link batch for the company. Each
 * crawl writes rows under a shared crawled_at timestamp; the panel
 * shows whichever batch has the latest crawled_at value. Older rows
 * stay in the table as history (per-URL trend tracking) but the
 * default view is the latest snapshot.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const companyId = req.nextUrl.searchParams.get("companyId");
  const limit = Math.max(1, Math.min(500, parseInt(req.nextUrl.searchParams.get("limit") || "200", 10)));
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const svc = getServiceClient();

  // Ownership check.
  const { data: company } = await svc
    .from("companies")
    .select("id, owner_id")
    .eq("id", companyId)
    .maybeSingle();
  if (!company || company.owner_id !== user.id) {
    return NextResponse.json({ error: "Not authorized for this company" }, { status: 403 });
  }

  // Most-recent crawled_at for this company.
  const { data: latestRow } = await svc
    .from("broken_links")
    .select("crawled_at")
    .eq("company_id", companyId)
    .order("crawled_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestRow) {
    return NextResponse.json({
      latestCrawledAt: null,
      total: 0,
      links: [] as Array<{ url: string; statusCode: number; fetchError: string | null; crawledAt: string }>,
    });
  }

  const { data: rows } = await svc
    .from("broken_links")
    .select("url, status_code, fetch_error, crawled_at")
    .eq("company_id", companyId)
    .eq("crawled_at", latestRow.crawled_at)
    .order("status_code", { ascending: false })
    .limit(limit);

  const links = (rows || []).map((r) => ({
    url: r.url,
    statusCode: r.status_code,
    fetchError: r.fetch_error,
    crawledAt: r.crawled_at,
  }));

  return NextResponse.json({
    latestCrawledAt: latestRow.crawled_at,
    total: links.length,
    links,
  });
}
