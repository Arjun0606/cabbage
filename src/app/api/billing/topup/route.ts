import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/db/supabase-server";
import { createCreditTopupOrder, verifyPaymentSignature } from "@/lib/razorpay";
import { isDemoRequest } from "@/lib/demo";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * Credit top-ups — buy more credits on top of the monthly base plan.
 *
 * POST (no ?verify): create a Razorpay order for N credits. Returns
 *   { orderId, amount, keyId } so the frontend opens Razorpay Checkout.
 *
 * POST with ?verify=1: verify the payment signature after checkout
 *   completes. On success, adds credits to the user's balance.
 *
 * Pricing (editable — these are just defaults):
 *   1,000 credits = ₹5,000  (₹5 / credit — slight premium over base)
 *   5,000 credits = ₹20,000 (₹4 / credit)
 *   10,000 credits = ₹35,000 (₹3.50 / credit — bulk)
 */

const CREDIT_PACKS: Record<string, { credits: number; rupees: number }> = {
  small: { credits: 1000, rupees: 5000 },
  medium: { credits: 5000, rupees: 20000 },
  large: { credits: 10000, rupees: 35000 },
};

export async function POST(req: NextRequest) {
  const verify = req.nextUrl.searchParams.get("verify") === "1";

  if (verify) return handleVerify(req);
  return handleCreate(req);
}

async function handleCreate(req: NextRequest) {
  try {
    const { pack } = await req.json();
    if (!pack || !CREDIT_PACKS[pack]) {
      return NextResponse.json({ error: "Invalid pack. Use 'small', 'medium', or 'large'." }, { status: 400 });
    }
    const { credits, rupees } = CREDIT_PACKS[pack];

    if (isDemoRequest(req)) {
      return NextResponse.json({
        demoMode: true,
        orderId: `demo_order_${Date.now()}`,
        amount: rupees * 100,
        keyId: process.env.RAZORPAY_KEY_ID || "demo_key",
        credits,
        message: `Demo mode — in a real session, Razorpay Checkout would open to buy ${credits.toLocaleString()} credits for ₹${rupees.toLocaleString()}.`,
      });
    }

    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const order = await createCreditTopupOrder({
      amountRupees: rupees,
      receipt: `topup_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: { user_id: user.id, credits: String(credits), pack },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      credits,
      email: user.email,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Topup order creation failed" },
      { status: 500 }
    );
  }
}

async function handleVerify(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits } = await req.json();

    if (isDemoRequest(req)) {
      return NextResponse.json({ demoMode: true, success: true, credits, message: "Demo mode — credits not actually added." });
    }

    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const ok = verifyPaymentSignature({
      subscriptionId: razorpay_order_id,  // order/subscription ID
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!ok) return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });

    // Grant credits by writing a NEGATIVE credit_usage row (offsets usage).
    // This works with the existing enforceCredits() calc: sum(credits_used).
    const service = getServiceClient();
    const { data: company } = await service
      .from("companies")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!company) {
      return NextResponse.json({ error: "No company found for user — set up your company first." }, { status: 400 });
    }
    await service.from("credit_usage").insert({
      company_id: company.id,
      user_id: user.id,
      action: "topup",
      credits_used: -Math.abs(Number(credits) || 0),
      metadata: { razorpay_payment_id, razorpay_order_id },
    });

    return NextResponse.json({ success: true, credits });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Topup verify failed" },
      { status: 500 }
    );
  }
}
