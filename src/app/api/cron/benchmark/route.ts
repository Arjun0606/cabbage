import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { BENCHMARK_DEVELOPERS } from "@/lib/benchmark/developers";

/**
 * Monthly GEO Benchmark cron.
 *
 * Runs the free grader (3 queries × ChatGPT + Gemini) on every
 * developer in the curated BENCHMARK_DEVELOPERS list and stores the
 * result keyed by (developer_slug, captured_month). The /benchmark
 * public page reads the latest month's rows.
 *
 * Expected load: ~35 developers × 2 platforms × 3 queries = 210
 * queryForVisibility calls per run. At 3s each, ~10 min wall time.
 * Vercel cron timeout is 15 min on Pro — we're under. If we grow the
 * list past ~50, shard across multiple cron slots.
 */

const MAX_DEVS_PER_RUN = 40;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = req.nextUrl.origin;
  const supabase = getServiceClient();

  const now = new Date();
  const capturedMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  // Skip developers we already ran this month so a re-trigger is safe.
  const { data: already } = await supabase
    .from("geo_benchmark_snapshots")
    .select("developer_slug")
    .eq("captured_month", capturedMonth);
  const done = new Set((already || []).map((r) => r.developer_slug));

  const todo = BENCHMARK_DEVELOPERS.filter((d) => !done.has(d.slug)).slice(0, MAX_DEVS_PER_RUN);

  const results: Array<{ slug: string; score: number; error?: string }> = [];

  for (const dev of todo) {
    try {
      const res = await fetch(`${origin}/api/grader`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: dev.brand, city: dev.city }),
      });
      if (!res.ok) {
        results.push({ slug: dev.slug, score: 0, error: `Grader HTTP ${res.status}` });
        continue;
      }
      const data = await res.json();
      const score = typeof data.score === "number" ? data.score : 0;
      const mentionedCount = typeof data.mentionedCount === "number" ? data.mentionedCount : 0;
      const totalQueries = typeof data.totalQueries === "number" ? data.totalQueries : 0;
      const competitors = Array.isArray(data.competitors) ? data.competitors.slice(0, 10) : [];

      await supabase.from("geo_benchmark_snapshots").upsert(
        {
          developer_slug: dev.slug,
          brand: dev.brand,
          city: dev.city,
          tier: dev.tier,
          score,
          mentioned_count: mentionedCount,
          total_queries: totalQueries,
          competitors_seen: competitors,
          captured_month: capturedMonth,
        },
        { onConflict: "developer_slug,captured_month" }
      );

      results.push({ slug: dev.slug, score });
    } catch (err) {
      results.push({ slug: dev.slug, score: 0, error: err instanceof Error ? err.message : "unknown" });
    }
  }

  return NextResponse.json({
    month: capturedMonth,
    processed: results.length,
    remaining: BENCHMARK_DEVELOPERS.length - done.size - results.length,
    results,
  });
}
