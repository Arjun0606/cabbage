import { NextResponse, type NextRequest } from "next/server";
import { gradeUrl } from "@/lib/agents/grader";
import { SEED_BRANDS, brandsNotIn } from "@/lib/seedBrands";
import { getServiceClient } from "@/lib/db/supabase";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET /api/cron/seed-brands?batch=N
 *
 * Walks the curated seed list (~250 SMB brands across CRM, project
 * mgmt, ecom platforms, etc.) and grades the next N brands that
 * don't yet have a public_grades row. Default batch = 10.
 *
 * Auth via the global CRON_SECRET (the same proxy/middleware
 * already enforces). Schedule via Vercel cron:
 *   0 * * * *  — every hour, batch of 10 brands
 * At $0.05/scan that's ~$1.20/day to seed + keep the catalog warm.
 */
export async function GET(req: NextRequest) {
  // The proxy already gates /api/cron/* with CRON_SECRET; if running
  // without the proxy (local dev) we still verify here as a backstop.
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
    Math.min(50, Number(url.searchParams.get("batch")) || 10),
  );

  const service = getServiceClient();
  const { data: existing } = await service
    .from("public_grades")
    .select("origin")
    .limit(50_000);

  const already = new Set<string>(
    (existing || []).map((r: { origin: string }) =>
      new URL(r.origin).hostname.replace(/^www\./, "").toLowerCase(),
    ),
  );

  const next = brandsNotIn(already).slice(0, batch);
  if (next.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "Seed list already fully graded.",
      seeded: SEED_BRANDS.length,
      cached: already.size,
    });
  }

  const results: Array<{
    url: string;
    ok: boolean;
    error?: string;
    score?: number;
  }> = [];

  for (const brand of next) {
    try {
      const grade = await gradeUrl(`https://${brand.url}`);
      results.push({
        url: brand.url,
        ok: true,
        score: grade.scores.overall,
      });
    } catch (err) {
      results.push({
        url: brand.url,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    batch: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    remaining: SEED_BRANDS.length - already.size - results.length,
    results,
  });
}
