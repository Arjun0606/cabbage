import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";
import { createCustomer, createSubscription, getPlanId } from "@/lib/razorpay";
import { isDemoRequest } from "@/lib/demo";

/**
 * POST /api/billing/checkout
 * Body: { plan: "starter" | "growth" | "enterprise" }
 *
 * Creates a Razorpay subscription for the authenticated user and returns
 * the subscription ID + key ID for the frontend to open checkout.
 */
export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();
    if (!["starter", "growth", "enterprise"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Demo mode: simulate a successful checkout without charging.
    // Returns a fake subscription id so the frontend's Razorpay flow
    // can be UI-tested, but no real subscription is created.
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

    const planId = getPlanId(plan);

    // Look up or create a Razorpay customer for this user
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

    // Create the subscription
    const subscription = await createSubscription({
      planId,
      customerId,
      totalCount: 12,
      notes: { user_id: user.id, plan },
    });

    // Save pending subscription state (status will flip to 'active' via webhook)
    await service.from("subscriptions").upsert({
      user_id: user.id,
      plan,
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
