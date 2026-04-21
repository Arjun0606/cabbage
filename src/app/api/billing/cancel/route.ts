import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";
import { cancelSubscription } from "@/lib/razorpay";
import { isDemoRequest } from "@/lib/demo";

/**
 * POST /api/billing/cancel — cancels at the end of the current cycle.
 * User keeps access until current_period_end, then subscription ends.
 */
export async function POST(req: NextRequest) {
  try {
    if (isDemoRequest(req)) {
      return NextResponse.json({ demoMode: true, success: true, message: "Demo cancel — nothing actually cancelled." });
    }

    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const service = getServiceClient();
    const { data: sub } = await service
      .from("subscriptions")
      .select("razorpay_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sub?.razorpay_subscription_id) {
      return NextResponse.json({ error: "No active subscription" }, { status: 400 });
    }

    await cancelSubscription(sub.razorpay_subscription_id, true);

    await service
      .from("subscriptions")
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cancel failed" },
      { status: 500 }
    );
  }
}
