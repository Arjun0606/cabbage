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
      .select("plan, status, current_period_end, cancel_at_period_end, trial_ends_at")
      .eq("user_id", user.id)
      .maybeSingle();

    // Access tiers:
    //   active + paid plan  → full access at the paid tier
    //   trialing + valid    → full access at Pro caps (testing surface)
    //   anything else       → paywall
    const isActive = sub?.status === "active";
    const trialValid =
      sub?.status === "trialing" &&
      (!sub.trial_ends_at || new Date(sub.trial_ends_at) > new Date());
    const canAccess = isActive || trialValid;
    const needsUpgrade = !canAccess;

    // Days left in trial — surfaced to the UI so we can render a
    // "Trial: 9 days left · upgrade now" pill.
    const trialDaysLeft = trialValid && sub.trial_ends_at
      ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : null;

    // Map plan → tier limits. Trialing users get Pro caps so they can
    // exercise every feature; "base" legacy plan also maps to Pro.
    const limits = trialValid
      ? TIERS.pro.limits
      : isPaidTier(sub?.plan || "")
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
      isTrialing: trialValid,
      trialEndsAt: sub?.trial_ends_at || null,
      trialDaysLeft,
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
