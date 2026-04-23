import { NextRequest, NextResponse } from "next/server";
import { runReviewMonitor } from "@/lib/agents/reviewMonitor";
import { requireActiveSubscription } from "@/lib/db/supabase-server";
import { enforceCredits } from "@/lib/credits";

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
    const { brand, projects, companyId } = body;

    if (!brand || typeof brand !== "string") {
      return NextResponse.json({ error: "brand is required" }, { status: 400 });
    }
    if (!Array.isArray(projects) || projects.length === 0) {
      return NextResponse.json(
        { error: "projects[] is required and must be non-empty" },
        { status: 400 }
      );
    }

    // Review monitor is web-search heavy; charge a proper credit so
    // it aligns with AI visibility in cost.
    await enforceCredits(companyId, "ai_visibility");

    const result = await runReviewMonitor(
      brand.trim(),
      projects.map((p: any) => ({
        name: String(p.name || "").trim(),
        locality: typeof p.locality === "string" ? p.locality : null,
        city: typeof p.city === "string" ? p.city : null,
        website: typeof p.website === "string" ? p.website : null,
      })).filter((p: any) => p.name),
      { cadence: gate.limits.reviewMonitorFrequency }
    );

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
