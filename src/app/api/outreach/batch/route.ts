import { NextResponse, type NextRequest } from "next/server";
import { requireActiveSubscription } from "@/lib/db/supabase-server";
import { enforceCredits } from "@/lib/credits";
import { runOutreachBatch, OUTREACH_LIMITS } from "@/lib/outreach";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/outreach/batch { urls: string[] }
 *
 * Auth + credit gated. Each URL processed costs 1 credit (charged
 * per URL whether cache hit or fresh — keeps accounting simple,
 * still cheap, 100 URLs = 100 credits which Starter has 500/month).
 *
 * Returns per-URL: brand, score, top 2-4 playbook actions, drafted
 * email subject + body, drafted LinkedIn DM, /visibility permalink.
 *
 * Hard cap of 100 URLs per call. Concurrency 4. Roughly 1-3 minutes
 * for 100 URLs depending on cache hit ratio.
 */
export async function POST(req: NextRequest) {
  const sub = await requireActiveSubscription(req);
  if (!sub.ok) return sub.response;

  let body: { urls?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const urls = Array.isArray(body.urls) ? body.urls.filter(Boolean) : [];
  if (urls.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one URL in `urls`." },
      { status: 400 },
    );
  }
  if (urls.length > OUTREACH_LIMITS.maxUrlsPerBatch) {
    return NextResponse.json(
      {
        error: `Maximum ${OUTREACH_LIMITS.maxUrlsPerBatch} URLs per batch (got ${urls.length}).`,
      },
      { status: 400 },
    );
  }

  // 1 credit per URL up-front
  let totalCost = 0;
  let lastRemaining = Number.POSITIVE_INFINITY;
  let lastMonthly = 0;
  for (let i = 0; i < urls.length; i++) {
    const credit = await enforceCredits(sub.userId, "outreach_grade");
    if (!credit.allowed) {
      return NextResponse.json(
        {
          error: "Monthly credit limit reached mid-batch",
          processed: i,
          remaining: credit.remaining,
          monthly: credit.monthly,
        },
        { status: 402 },
      );
    }
    totalCost += credit.cost;
    lastRemaining = credit.remaining;
    lastMonthly = credit.monthly;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || req.nextUrl.origin;

  const batch = await runOutreachBatch(urls, baseUrl);

  return NextResponse.json({
    ...batch,
    credits: {
      cost: totalCost,
      remaining: lastRemaining,
      monthly: lastMonthly,
    },
  });
}
