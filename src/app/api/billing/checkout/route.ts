import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";
import { createCustomer, createSubscription, getBasePlanId } from "@/lib/razorpay";
import { isDemoRequest } from "@/lib/demo";

/**
 * POST /api/billing/checkout
 *
 * Creates the Cabbge Base subscription (single plan) for the authenticated
 * user. Credit top-ups are handled separately via /api/billing/topup.
 */
export async function POST(req: NextRequest) {
  try {
    // Demo mode: simulate success without real charge
    if (isDemoRequest(req)) {
      return NextResponse.json({
        demoMode: true,
        subscriptionId: `demo_sub_${Date.now()}`,
        keyId: process.env.RAZORPAY_KEY_ID || "demo_key",
        email: "demo@cabbge.com",
        message: "Demo mode — no charge will happen. In a real session, Razorpay Checkout would open here.",
      });
    }

    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const planId = getBasePlanId();

    const service = getServiceClient();
    const { data: existingSub } = await service
      .from("subscriptions")
      .select("razorpay_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = existingSub?.razorpay_customer_id;
    if (!customerId) {
      const customer = await createCustomer(user.email!, user.user_metadata?.full_name);
      customerId = customer.id;
    }

    const subscription = await createSubscription({
      planId,
      customerId,
      totalCount: 12,
      notes: { user_id: user.id, plan: "base" },
    });

    await service.from("subscriptions").upsert({
      user_id: user.id,
      plan: "base",
      status: "pending",
      razorpay_subscription_id: subscription.id,
      razorpay_customer_id: customerId,
      razorpay_plan_id: planId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      email: user.email,
      shortUrl: subscription.short_url,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
