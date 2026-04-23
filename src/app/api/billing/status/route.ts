import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";
import { TIERS, DEMO_LIMITS, isPaidTier } from "@/lib/tiers";

/**
 * GET /api/billing/status
 *
 * Returns the authenticated user's subscription state. Cabbge is a paid
 * product — there is no free trial. A signed-in user with no active
 * subscription sees the paywall until they pay.
 *
 * Demo cookie remains an escape hatch for the sales team pitching
 * prospects. It does NOT give free access to real users.
 */
export async function GET(req: NextRequest) {
  try {
    const inDemoMode = req.cookies.get("cabbge_demo")?.value === "1";
    if (inDemoMode) {
      return NextResponse.json({
        authenticated: false,
        demoMode: true,
        plan: "demo",
        status: "demo",
        canAccess: true,
        needsUpgrade: false,
        limits: DEMO_LIMITS,
      });
    }

    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, canAccess: false, needsUpgrade: false });
    }

    const service = getServiceClient();
    const { data: sub } = await service
      .from("subscriptions")
      .select("plan, status, current_period_end, cancel_at_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    // Access is strictly tied to an active subscription. New signups land
    // on /pricing to pick a plan before they get anywhere useful.
    const isActive = sub?.status === "active";
    const canAccess = isActive;
    const needsUpgrade = !canAccess;

    // Map plan → tier limits so the frontend can surface per-tier
    // nudges ("3 / 10 projects on Starter — upgrade to Pro for 40").
    // Legacy "base" customers get Pro caps (they paid the old flat
    // price that maps closest to Pro).
    const limits = isPaidTier(sub?.plan || "")
      ? TIERS[sub!.plan as keyof typeof TIERS].limits
      : sub?.plan === "base"
        ? TIERS.pro.limits
        : null;

    return NextResponse.json({
      authenticated: true,
      email: user.email,
      plan: sub?.plan || "none",
      status: sub?.status || "inactive",
      currentPeriodEnd: sub?.current_period_end,
      cancelAtPeriodEnd: sub?.cancel_at_period_end || false,
      canAccess,
      needsUpgrade,
      limits,
    });
  } catch (error) {
    console.error("Billing status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status check failed" },
      { status: 500 }
    );
  }
}
