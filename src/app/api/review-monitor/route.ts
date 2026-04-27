export const runtime = "nodejs";
export const maxDuration = 300;
import { NextRequest, NextResponse } from "next/server";
import { runReviewMonitor } from "@/lib/agents/reviewMonitor";
import { requireActiveSubscription } from "@/lib/db/supabase-server";
import { enforceCredits } from "@/lib/credits";
import { canRunScan } from "@/lib/cadence";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * POST /api/review-monitor
 *
 * Body: { brand, projects: [{ name, locality?, city?, website? }], companyId? }
 * Returns: ReviewMonitorResult (see lib/agents/reviewMonitor.ts)
 *
 * Uses the ChatGPT web_search tool to surface reviews of each project
 * across Housing.com / 99acres / MagicBricks / Google / Reddit / Quora
 * and extracts them into structured records. Cached server-side for
 * 24h so repeat clicks within the same day don't re-spend web_search
 * credits.
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;

    const body = await req.json();
    const { brand, projects, city, companyId } = body;

    if (!brand || typeof brand !== "string") {
      return NextResponse.json({ error: "brand is required" }, { status: 400 });
    }

    // projects[] is optional now — when empty, we fall back to a
    // brand-level search across review platforms scoped to the
    // primary city. Lets the panel be useful during onboarding
    // before any projects are added.
    const safeProjects: Array<{ name: string; locality: string | null; city: string | null; website: string | null }> = Array.isArray(projects)
      ? projects.map((p: { name?: string; locality?: string; city?: string; website?: string }) => ({
          name: String(p.name || "").trim(),
          locality: typeof p.locality === "string" ? p.locality : null,
          city: typeof p.city === "string" ? p.city : null,
          website: typeof p.website === "string" ? p.website : null,
        })).filter((p) => p.name)
      : [];

    // DB-backed cadence enforcement. Process-local cache in the agent
    // is only effective within one Lambda; on serverless cold starts a
    // Starter customer could re-trigger weekly-cadence work in minutes.
    // Querying scan_history makes the cadence durable across invocations.
    if (companyId && gate.plan !== "demo") {
      const cadenceCheck = await canRunScan(companyId, "review_monitor", gate.limits.reviewMonitorFrequency);
      if (!cadenceCheck.ok) {
        return NextResponse.json(
          {
            error: cadenceCheck.hint,
            nextAllowedAt: cadenceCheck.nextAllowedAt,
            needsUpgrade: gate.limits.reviewMonitorFrequency === "weekly",
          },
          { status: 429 }
        );
      }
    }

    // Review monitor is web-search heavy; charge a proper credit so
    // it aligns with AI visibility in cost.
    await enforceCredits(companyId, "ai_visibility");

    const result = await runReviewMonitor(
      brand.trim(),
      safeProjects,
      {
        cadence: gate.limits.reviewMonitorFrequency,
        brandCity: typeof city === "string" && city.trim() ? city.trim() : null,
      }
    );

    // Stamp scan_history so the cadence gate above sees this run on
    // the next request. Score = positive% out of total mentions, capped
    // at 100. Lets the dashboard's trend panel chart sentiment over
    // time without a second pass.
    if (companyId && gate.plan !== "demo") {
      try {
        const svc = getServiceClient();
        const total = result.totalMentions || 0;
        const positive = result.counts?.bySentiment?.positive ?? 0;
        const score = total > 0 ? Math.round((positive / total) * 100) : 0;
        await svc.from("scan_history").insert({
          company_id: companyId,
          scan_type: "review_monitor",
          score,
          results: { mentions: total },
          triggered_by: "manual",
        });
      } catch { /* non-fatal — the agent already returned */ }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("review-monitor error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Review monitor failed",
      },
      { status: 500 }
    );
  }
}
