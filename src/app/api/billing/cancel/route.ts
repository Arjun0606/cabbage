import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";
import { cancelDodoSubscription } from "@/lib/dodo";
import { isDemoRequest } from "@/lib/demo";

/**
 * POST /api/billing/cancel — cancels the active Dodo subscription.
 * Dodo doesn't expose a "cancel at period end" flag on the
 * Subscription object itself, so we cancel immediately but leave the
 * user with access until current_period_end (flagged client-side via
 * cancel_at_period_end) until the subscription.cancelled webhook
 * flips status to canceled.
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
      .select("razorpay_subscription_id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sub?.razorpay_subscription_id) {
      return NextResponse.json({ error: "No active subscription" }, { status: 400 });
    }

    // Only cancel in Dodo if it's not just a pending checkout session.
    // The razorpay_subscription_id column holds the checkout session id
    // until Dodo's subscription.active webhook swaps in the real
    // subscription id. If status is still pending there's nothing in
    // Dodo to cancel yet.
    if (sub.status === "active" || sub.status === "past_due" || sub.status === "paused") {
      try {
        await cancelDodoSubscription(sub.razorpay_subscription_id);
      } catch (err) {
        console.error("Dodo cancel failed, marking local:", err);
      }
    }

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
