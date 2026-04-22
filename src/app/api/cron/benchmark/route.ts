import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import {
  getBenchmarkCities,
  discoverDevelopersForCity,
  currentMonthTag,
  slugFor,
} from "@/lib/benchmark/discovery";

/**
 * Monthly GEO Benchmark cron — FULLY DYNAMIC.
 *
 *   1. Cities are pulled live from the companies + projects tables.
 *      If no users exist yet in a city, that city won't appear on the
 *      benchmark. The universe grows organically with the user base.
 *
 *   2. Top developers per city are discovered live via ChatGPT web
 *      search. No hardcoded list of brands anywhere. Every run asks
 *      the model fresh, so the leaderboard reflects current market
 *      reality rather than a snapshot from when someone typed names
 *      into a file.
 *
 *   3. For each discovered developer the grader runs (3 queries x 2
 *      platforms) and the result is stored keyed by
 *      (developer_slug, captured_month).
 *
 * Idempotent per month: re-running doesn't double-score a row.
 *
 * Expected load: grows with the city count. With ~20 cities x ~8
 * developers x 2 platforms x 3 queries = ~960 queryForVisibility calls
 * per run. Cap the per-city developer list to 8 and total cities per
 * run to 25 — spills into the next cron slot otherwise.
 */

const MAX_CITIES_PER_RUN = 25;
const MAX_DEVS_PER_CITY = 8;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = req.nextUrl.origin;
  const supabase = getServiceClient();
  const capturedMonth = currentMonthTag();

  // 1. Live city universe from customer data
  const cities = (await getBenchmarkCities()).slice(0, MAX_CITIES_PER_RUN);
  if (cities.length === 0) {
    return NextResponse.json({
      month: capturedMonth,
      message: "No customer cities yet — benchmark grows as users onboard.",
      processed: 0,
    });
  }

  // Existing snapshots this month — so we don't re-run what's already done
  const { data: already } = await supabase
    .from("geo_benchmark_snapshots")
    .select("developer_slug")
    .eq("captured_month", capturedMonth);
  const done = new Set((already || []).map((r) => r.developer_slug));

  const results: Array<{ city: string; brand: string; score: number; error?: string }> = [];

  for (const city of cities) {
    // 2. Discover this city's top developers live (per-month fresh).
    const discovered = (await discoverDevelopersForCity(city)).slice(0, MAX_DEVS_PER_CITY);
    if (discovered.length === 0) continue;

    for (const dev of discovered) {
      const slug = slugFor(dev.brand, city);
      if (done.has(slug)) continue;

      // 3. Grade the discovered brand
      try {
        const res = await fetch(`${origin}/api/grader`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brand: dev.brand, city }),
        });
        if (!res.ok) {
          results.push({ city, brand: dev.brand, score: 0, error: `Grader HTTP ${res.status}` });
          continue;
        }
        const data = await res.json();
        const score = typeof data.score === "number" ? data.score : 0;
        const mentionedCount = typeof data.mentionedCount === "number" ? data.mentionedCount : 0;
        const totalQueries = typeof data.totalQueries === "number" ? data.totalQueries : 0;
        const competitors = Array.isArray(data.competitors) ? data.competitors.slice(0, 10) : [];

        await supabase.from("geo_benchmark_snapshots").upsert(
          {
            developer_slug: slug,
            brand: dev.brand,
            city,
            tier: dev.tier,
            score,
            mentioned_count: mentionedCount,
            total_queries: totalQueries,
            competitors_seen: competitors,
            captured_month: capturedMonth,
          },
          { onConflict: "developer_slug,captured_month" }
        );

        results.push({ city, brand: dev.brand, score });
      } catch (err) {
        results.push({
          city,
          brand: dev.brand,
          score: 0,
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    }
  }

  return NextResponse.json({
    month: capturedMonth,
    citiesProcessed: cities.length,
    totalGraded: results.length,
    results: results.slice(0, 50), // cap response size
  });
}
