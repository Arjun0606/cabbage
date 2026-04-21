import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * GET /api/billing/status
 * Returns the authenticated user's subscription state:
 *   { plan, status, trialEndsAt, daysLeftInTrial, canAccess, needsUpgrade }
 * Called by the dashboard client on load to show/hide paywall.
 */
export async function GET(req: NextRequest) {
  try {
    // Demo mode unlocks full access without auth or subscription
    const inDemoMode = req.cookies.get("cabbge_demo")?.value === "1";
    if (inDemoMode) {
      return NextResponse.json({
        authenticated: false,
        demoMode: true,
        plan: "demo",
        status: "demo",
        canAccess: true,
        needsUpgrade: false,
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
      .select("plan, status, trial_ends_at, current_period_end, cancel_at_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    const now = Date.now();
    const trialEndsAt = sub?.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : now;
    const daysLeftInTrial = Math.max(0, Math.ceil((trialEndsAt - now) / 86400_000));

    const isTrialing = sub?.status === "trialing" && trialEndsAt > now;
    const isActive = sub?.status === "active";
    const canAccess = isTrialing || isActive;
    const needsUpgrade = !canAccess;

    return NextResponse.json({
      authenticated: true,
      email: user.email,
      plan: sub?.plan || "trial",
      status: sub?.status || "trialing",
      trialEndsAt: sub?.trial_ends_at,
      daysLeftInTrial,
      currentPeriodEnd: sub?.current_period_end,
      cancelAtPeriodEnd: sub?.cancel_at_period_end || false,
      canAccess,
      needsUpgrade,
    });
  } catch (error) {
    console.error("Billing status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status check failed" },
      { status: 500 }
    );
  }
}
