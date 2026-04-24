import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { TIERS, type PlanTier } from "@/lib/tiers";

/**
 * Credit Usage API — read-only.
 *
 * GET: Fetch current credit usage for the authenticated user's company.
 *
 * POST was removed: it used to let unauthenticated callers record arbitrary
 * credit writes against any companyId with a separate, out-of-sync cost table.
 * Actual credit recording now happens inside `enforceCredits()` on each
 * protected route (src/lib/credits.ts — single source of truth).
 */

// Overage rate must match the pricing-page footnote so the UI and the
// invoice agree. ₹4 per credit = ~$0.048 — matches what we tell prospects.
const OVERAGE_RATE_INR = 4;
const FALLBACK_MONTHLY = 1000;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();

    // Verify ownership
    const { data: owned } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!owned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Resolve the company's tier so we report against the right monthly
    // pool, not a global constant.
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("company_id", companyId)
      .maybeSingle();
    const planRaw = sub?.plan as string | undefined;
    const plan: PlanTier = planRaw === "solo" || planRaw === "starter" || planRaw === "pro" || planRaw === "scale" || planRaw === "enterprise"
      ? (planRaw as PlanTier)
      : "pro";
    const monthlyIncluded = TIERS[plan]?.limits.creditsPerMonth ?? FALLBACK_MONTHLY;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("credit_usage")
      .select("action, credits_used, created_at")
      .eq("company_id", companyId)
      .gte("created_at", startOfMonth.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    const totalUsed = (data || []).reduce((sum, d) => sum + d.credits_used, 0);
    const remaining = Math.max(0, monthlyIncluded - totalUsed);
    const overageCredits = Math.max(0, totalUsed - monthlyIncluded);

    const breakdown: Record<string, number> = {};
    for (const row of data || []) {
      breakdown[row.action] = (breakdown[row.action] || 0) + row.credits_used;
    }

    return NextResponse.json({
      plan,
      monthlyIncluded,
      totalUsed,
      remaining,
      overageCredits,
      overageRateInr: OVERAGE_RATE_INR,
      overageCostInr: overageCredits * OVERAGE_RATE_INR,
      breakdown,
      recentActions: (data || []).slice(0, 20),
    });
  } catch (error) {
    console.error("Credits fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch credits" },
      { status: 500 }
    );
  }
}
