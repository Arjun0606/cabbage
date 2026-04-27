import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";
import { createDodoCheckoutSession } from "@/lib/dodo";
import { isDemoRequest } from "@/lib/demo";
import { TIERS, tierDodoProductId, isPaidTier, type PlanBilled } from "@/lib/tiers";

/**
 * POST /api/billing/checkout
 *
 * Body: { plan: "starter" | "pro" | "scale", billed: "monthly" | "annual" }
 *
 * Picks the Dodo Payments product id for (tier, billed), creates a
 * hosted checkout session, and returns the URL the frontend should
 * redirect the customer to. Dodo's webhook (see /api/billing/webhook)
 * flips the subscription row to active once payment completes.
 *
 * Dodo env vars required:
 *   DODO_API_KEY
 *   DODO_PRODUCT_{STARTER|PRO|SCALE}_{MONTHLY|ANNUAL}
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const planInput: string = typeof body?.plan === "string" ? body.plan.toLowerCase() : "pro";
    const billedInput: string = body?.billed === "annual" ? "annual" : "monthly";

    if (!isPaidTier(planInput)) {
      return NextResponse.json(
        { error: `Unknown plan "${planInput}". Use starter, pro, or scale.` },
        { status: 400 }
      );
    }
    const tier = TIERS[planInput];
    const billed = billedInput as PlanBilled;

    // Demo mode: simulate a successful checkout without charging.
    if (isDemoRequest(req)) {
      return NextResponse.json({
        demoMode: true,
        checkoutUrl: "/dashboard?upgraded=demo",
        sessionId: `demo_sess_${Date.now()}`,
        plan: tier.key,
        billed,
        message: `Demo mode — in a real session Dodo Payments Checkout would open for Cabbge ${tier.label} (${billed}).`,
      });
    }

    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const productId = tierDodoProductId(tier, billed);

    const service = getServiceClient();
    const { data: existingSub } = await service
      .from("subscriptions")
      .select("status, plan")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingSub?.status === "active" && existingSub.plan === tier.key) {
      return NextResponse.json(
        { error: "You already have an active subscription on this plan" },
        { status: 409 }
      );
    }

    const origin = req.nextUrl.origin;

    const { sessionId, checkoutUrl } = await createDodoCheckoutSession({
      productId,
      email: user.email!,
      fullName: user.user_metadata?.full_name,
      returnUrl: `${origin}/dashboard?upgraded=true`,
      cancelUrl: `${origin}/pricing?cancelled=1`,
      metadata: {
        user_id: user.id,
        plan: tier.key,
        billed,
      },
    });

    // Stash the pending intent so we can reconcile when the webhook
    // arrives. We use the Dodo session_id as a placeholder in
    // razorpay_subscription_id for now — the column is a generic
    // provider-subscription-id bucket.
    await service.from("subscriptions").upsert({
      user_id: user.id,
      plan: tier.key,
      status: "pending",
      razorpay_subscription_id: sessionId,
      razorpay_plan_id: productId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return NextResponse.json({
      checkoutUrl,
      sessionId,
      plan: tier.key,
      billed,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
