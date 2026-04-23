import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * Dodo Payments webhook receiver.
 *
 * Dodo emits events using the Standard Webhooks spec:
 *   headers: webhook-id, webhook-timestamp, webhook-signature
 * We verify via the `standardwebhooks` npm package + DODO_WEBHOOK_KEY.
 *
 * Configure at dashboard.dodopayments.com → Developer → Webhooks
 *   URL:     https://cabbge.com/api/billing/webhook
 *   Events:  subscription.active | on_hold | cancelled | failed
 *            | renewed | plan_changed | expired
 *            payment.succeeded | payment.failed  (ignored here — topup
 *                               verification happens in /billing/topup)
 */

function mapDodoStatus(eventType: string, payloadStatus: string | undefined): string | null {
  const s = (payloadStatus || "").toLowerCase();
  if (s === "active" || s === "renewed") return "active";
  if (s === "on_hold") return "past_due";
  if (s === "paused") return "paused";
  if (s === "cancelled" || s === "canceled") return "canceled";
  if (s === "failed") return "past_due";
  if (s === "expired") return "expired";
  // Fallback — derive from event type if status isn't carried.
  if (eventType.includes("active") || eventType.includes("renewed")) return "active";
  if (eventType.includes("on_hold") || eventType.includes("failed")) return "past_due";
  if (eventType.includes("cancel")) return "canceled";
  if (eventType.includes("expired")) return "expired";
  return null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const webhookKey = process.env.DODO_WEBHOOK_KEY;

  if (!webhookKey) {
    console.error("DODO_WEBHOOK_KEY is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  try {
    const webhook = new Webhook(webhookKey);
    const headers = {
      "webhook-id": req.headers.get("webhook-id") || "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") || "",
      "webhook-signature": req.headers.get("webhook-signature") || "",
    };
    webhook.verify(rawBody, headers);
  } catch (err) {
    console.error("Dodo webhook verify failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType: string = payload?.type || payload?.event_type || "";
  const data = payload?.data || payload?.object || payload?.payload || {};

  const service = getServiceClient();

  if (eventType.startsWith("subscription.")) {
    const subId: string = data?.subscription_id || data?.id || "";
    if (!subId) return NextResponse.json({ ok: true, ignored: "no subscription id" });

    const newStatus = mapDodoStatus(eventType, data?.status);
    if (!newStatus) {
      return NextResponse.json({ ok: true, ignored: `unhandled ${eventType}` });
    }

    const metadataUserId: string | undefined = data?.metadata?.user_id;
    const sessionId: string | undefined = data?.checkout_session_id || data?.session_id;

    const update: Record<string, unknown> = {
      status: newStatus,
      razorpay_subscription_id: subId,
      current_period_start: data?.current_period_start
        ? new Date(data.current_period_start).toISOString()
        : undefined,
      current_period_end: data?.current_period_end
        ? new Date(data.current_period_end).toISOString()
        : undefined,
      cancel_at_period_end:
        typeof data?.cancel_at_period_end === "boolean" ? data.cancel_at_period_end : undefined,
      updated_at: new Date().toISOString(),
    };
    for (const k of Object.keys(update)) if (update[k] === undefined) delete update[k];

    // Reconcile by user_id metadata first (most reliable), then session
    // id (stored at checkout time), finally subscription id. The column
    // name `razorpay_subscription_id` is kept from the original schema
    // as a generic provider-subscription-id bucket so we don't need a
    // migration just to rename it.
    if (metadataUserId) {
      await service.from("subscriptions").update(update).eq("user_id", metadataUserId);
    } else if (sessionId) {
      await service.from("subscriptions").update(update).eq("razorpay_subscription_id", sessionId);
    } else {
      await service.from("subscriptions").update(update).eq("razorpay_subscription_id", subId);
    }

    return NextResponse.json({ ok: true, event: eventType, status: newStatus });
  }

  if (eventType === "payment.succeeded" || eventType === "payment.failed") {
    // Top-up reconciliation lives in /api/billing/topup's verify step,
    // so there's nothing to do here beyond acknowledging receipt.
    return NextResponse.json({ ok: true, event: eventType, noted: true });
  }

  return NextResponse.json({ ok: true, ignored: `unhandled ${eventType || "unknown"}` });
}

export const runtime = "nodejs";
