import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { runAIVisibility } from "@/lib/agents/aiVisibility";
import { buildPackFor } from "@/lib/prompts";
import type { Vertical } from "@/lib/agents/classifier";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET /api/cron/daily-scan?batch=N
 *
 * The always-on monitoring layer. Runs a cheap 4-prompt mini-scan
 * across whatever engines have keys for every distinct brand slug
 * tracked by any user (deduped). Writes one row per brand per day
 * into score_history. Diffs against yesterday's row; if any engine
 * dropped > 5 points, queues a drift_alert.
 *
 * This complements the weekly /api/cron/refresh-mentions and the
 * existing 7-day public_grades cache. The daily scan never updates
 * public_grades — that stays as the deep weekly snapshot. This is
 * just the heartbeat.
 *
 * Schedule: 0 7 * * *  (07:00 UTC daily, before mentions cron)
 *
 * Cost: ~4 prompts × 5 engines × $0.005/call = $0.10/brand/day.
 * Sized for Starter ($49) cap of 3 brands → $0.30/day → $9/mo COGS.
 *
 * Auth: CRON_SECRET (proxy gate + this backstop).
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
    Math.min(50, Number(url.searchParams.get("batch")) || 30),
  );

  const svc = getServiceClient();

  // Distinct brand slugs across all users — one scan per slug
  // covers everyone tracking that brand.
  const { data: trackedRaw } = await svc
    .from("tracked_brands")
    .select("brand_slug")
    .limit(2000);
  const slugs = Array.from(
    new Set((trackedRaw || []).map((r: { brand_slug: string }) => r.brand_slug)),
  ).slice(0, batch);

  if (slugs.length === 0) {
    return NextResponse.json({ ok: true, scanned: 0, alerts: 0 });
  }

  // Look up the latest deep grade so we have brand + vertical +
  // category + competitors without re-running the classifier
  // (which is the expensive part of a full scan).
  const { data: grades } = await svc
    .from("public_grades")
    .select("slug, brand, category, vertical, competitors")
    .in("slug", slugs);
  const byslug = new Map<
    string,
    {
      brand: string;
      category: string;
      vertical: string;
      competitors: string[];
    }
  >();
  for (const g of (grades || []) as Array<{
    slug: string;
    brand: string;
    category: string | null;
    vertical: string | null;
    competitors: string[] | null;
  }>) {
    byslug.set(g.slug, {
      brand: g.brand,
      category: g.category || "",
      vertical: (g.vertical as string) || "saas",
      competitors: g.competitors || [],
    });
  }

  let scanned = 0;
  let alerts = 0;
  const results: Array<{
    slug: string;
    overall: number;
    delta: number | null;
    drift?: string;
  }> = [];

  for (const slug of slugs) {
    const meta = byslug.get(slug);
    if (!meta) continue; // can't scan without classifier metadata

    const targetUrl = `https://${slug}`;
    const fullPack = buildPackFor(meta.vertical as Vertical, {
      brand: meta.brand,
      category: meta.category,
      competitors: meta.competitors,
    });
    // Mini-scan: top 4 prompts only.
    const queries = fullPack.slice(0, 4);

    try {
      const r = await runAIVisibility(targetUrl, meta.brand, [], queries, {});

      const scores = {
        overall: r.scores.overall,
        chatgpt: r.scores.chatgpt,
        gemini: r.scores.gemini,
        ...(r.scores.perplexity !== undefined && {
          perplexity: r.scores.perplexity,
        }),
        ...(r.scores.claude !== undefined && { claude: r.scores.claude }),
        ...(r.scores.grok !== undefined && { grok: r.scores.grok }),
      };

      // Pull yesterday's row.
      const { data: prev } = await svc
        .from("score_history")
        .select("scores")
        .eq("brand_slug", slug)
        .order("scanned_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevScores = (prev as { scores: typeof scores } | null)?.scores;
      let delta: number | null = null;
      if (prevScores) {
        delta = scores.overall - prevScores.overall;
        // Per-engine drift detection — alert on any engine drop > 5.
        for (const k of [
          "overall",
          "chatgpt",
          "gemini",
          "perplexity",
          "claude",
          "grok",
        ] as const) {
          const cur = scores[k];
          const prv = prevScores[k];
          if (
            typeof cur === "number" &&
            typeof prv === "number" &&
            prv - cur > 5
          ) {
            await svc.from("drift_alerts").insert({
              brand_slug: slug,
              engine: k,
              prev_score: prv,
              curr_score: cur,
              severity: "drop",
            });
            alerts += 1;
          }
        }
      }

      await svc.from("score_history").insert({
        brand_slug: slug,
        scores,
        prompt_count: queries.length,
      });

      scanned += 1;
      results.push({
        slug,
        overall: scores.overall,
        delta,
        drift: delta !== null && delta < -5 ? "drop" : undefined,
      });
    } catch (err) {
      console.error(`daily-scan ${slug} failed:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    scanned,
    alerts,
    results,
  });
}
