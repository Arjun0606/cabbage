import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * Razorpay webhook receiver.
 * Configure in Razorpay dashboard → Settings → Webhooks → Add:
 *   URL:    https://cabbge.com/api/billing/webhook
 *   Events: subscription.activated, subscription.charged,
 *           subscription.halted, subscription.cancelled,
 *           subscription.completed, subscription.updated,
 *           subscription.pending
 *   Secret: RAZORPAY_WEBHOOK_SECRET env var
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-razorpay-signature") || "";
  const rawBody = await req.text();

  try {
    verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    console.error("Webhook signature verify failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event as string;
  const sub = payload.payload?.subscription?.entity;
  if (!sub?.id) {
    return NextResponse.json({ ok: true, ignored: "no subscription entity" });
  }

  const service = getServiceClient();

  // Map Razorpay status → our status
  const statusMap: Record<string, string> = {
    "subscription.activated": "active",
    "subscription.authenticated": "active",
    "subscription.charged": "active",
    "subscription.pending": "past_due",
    "subscription.halted": "past_due",
    "subscription.paused": "paused",
    "subscription.resumed": "active",
    "subscription.cancelled": "canceled",
    "subscription.completed": "expired",
  };

  const newStatus = statusMap[event];
  if (!newStatus) {
    return NextResponse.json({ ok: true, ignored: `unhandled event ${event}` });
  }

  const update: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (sub.current_start) update.current_period_start = new Date(sub.current_start * 1000).toISOString();
  if (sub.current_end) update.current_period_end = new Date(sub.current_end * 1000).toISOString();
  if (event === "subscription.cancelled") update.cancel_at_period_end = true;

  // Upsert by razorpay_subscription_id
  const { error } = await service
    .from("subscriptions")
    .update(update)
    .eq("razorpay_subscription_id", sub.id);

  if (error) {
    console.error("Webhook DB update failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, event, subscriptionId: sub.id, status: newStatus });
}
