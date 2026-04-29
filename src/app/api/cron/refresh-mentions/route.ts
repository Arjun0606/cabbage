import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { scanMentions } from "@/lib/agents/mentions";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET /api/cron/refresh-mentions?batch=N
 *
 * Walks tracked_brands ordered by last_refreshed_at (oldest first,
 * nulls first), refreshes the next N brands. Default batch = 20.
 *
 * Schedule via Vercel cron:
 *   0 9 * * MON  — Monday 9am UTC, batch of 20 brands
 *
 * Auth via the global CRON_SECRET (also enforced upstream by the
 * proxy, this is a backstop).
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const batch = Math.max(
    1,
    Math.min(100, Number(url.searchParams.get("batch")) || 20),
  );

  const svc = getServiceClient();

  // tracked_brands → public_grades join: we need the display brand
  // name to query each source. Brands that don't have a public_grades
  // row yet fall back to the slug's first label as a brand guess.
  const { data: rows } = await svc
    .from("tracked_brands")
    .select("brand_slug, display_name")
    .order("last_refreshed_at", { ascending: true, nullsFirst: true })
    .limit(batch);

  const tracked = (rows || []) as Array<{
    brand_slug: string;
    display_name: string | null;
  }>;
  if (tracked.length === 0) {
    return NextResponse.json({ ok: true, scanned: 0 });
  }

  // Distinct slugs only — multiple users tracking the same brand
  // share the cross-user mentions table, so one scan covers them all.
  const seen = new Set<string>();
  const distinct = tracked.filter((r) => {
    if (seen.has(r.brand_slug)) return false;
    seen.add(r.brand_slug);
    return true;
  });

  const slugs = distinct.map((r) => r.brand_slug);
  const { data: grades } = await svc
    .from("public_grades")
    .select("slug, brand")
    .in("slug", slugs);
  const brandFromGrade = new Map<string, string>(
    (grades || []).map((g: { slug: string; brand: string }) => [g.slug, g.brand]),
  );

  const results: Array<{
    slug: string;
    total: number;
    newSinceLastScan: number;
    errors: number;
  }> = [];

  for (const row of distinct) {
    const brand =
      brandFromGrade.get(row.brand_slug) ||
      row.display_name ||
      row.brand_slug.split(".")[0];
    try {
      const r = await scanMentions({
        brand,
        brandSlug: row.brand_slug,
        persist: true,
      });
      results.push({
        slug: row.brand_slug,
        total: r.total,
        newSinceLastScan: r.newSinceLastScan,
        errors: r.errors.length,
      });
    } catch (err) {
      results.push({
        slug: row.brand_slug,
        total: 0,
        newSinceLastScan: 0,
        errors: 1,
      });
      console.error(`refresh-mentions ${row.brand_slug} failed:`, err);
    }
  }

  // Touch last_refreshed_at on every tracked_brand row whose slug we
  // just scanned (covers the multi-user case).
  const refreshedSlugs = results.map((r) => r.slug);
  if (refreshedSlugs.length > 0) {
    await svc
      .from("tracked_brands")
      .update({ last_refreshed_at: new Date().toISOString() })
      .in("brand_slug", refreshedSlugs);
  }

  return NextResponse.json({
    ok: true,
    scanned: results.length,
    totalNew: results.reduce((s, r) => s + r.newSinceLastScan, 0),
    results,
  });
}
