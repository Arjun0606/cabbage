/**
 * Razorpay client — server-side only.
 *
 * Single subscription plan (Cabbge Base). Overage via credit top-ups,
 * created as one-off Razorpay orders rather than subscription items.
 *
 * Required env vars:
 *   RAZORPAY_KEY_ID            (public — also used as NEXT_PUBLIC_RAZORPAY_KEY_ID for checkout)
 *   RAZORPAY_KEY_SECRET        (server-side)
 *   RAZORPAY_WEBHOOK_SECRET    (for verifying webhook signatures)
 *   RAZORPAY_PLAN_BASE         (plan_xxxxx — ₹50,000/mo base subscription)
 */

import crypto from "crypto";

export interface RazorpaySubscription {
  id: string;
  plan_id: string;
  customer_id?: string;
  status: string;
  current_start: number;
  current_end: number;
  short_url: string;
}

const API = "https://api.razorpay.com/v1";

function authHeader(): string {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) throw new Error("Razorpay not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)");
  return "Basic " + Buffer.from(`${keyId}:${secret}`).toString("base64");
}

export function getBasePlanId(): string {
  const env = process.env.RAZORPAY_PLAN_BASE;
  if (!env) throw new Error("RAZORPAY_PLAN_BASE env var not configured");
  return env;
}

/**
 * Create a one-off order for a credit top-up.
 * Caller passes the INR amount (in rupees, we convert to paise for Razorpay).
 */
export async function createCreditTopupOrder(params: {
  amountRupees: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({
      amount: Math.round(params.amountRupees * 100),
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes || {},
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay order failed: ${err}`);
  }
  return res.json();
}

export async function createCustomer(email: string, name?: string): Promise<{ id: string }> {
  const res = await fetch(`${API}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({ email, name: name || email, fail_existing: 0 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay customer creation failed: ${err}`);
  }
  const data = await res.json();
  return { id: data.id };
}

export async function createSubscription(params: {
  planId: string;
  customerId: string;
  totalCount?: number;   // how many billing cycles (default 12)
  notes?: Record<string, string>;
}): Promise<RazorpaySubscription> {
  const res = await fetch(`${API}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({
      plan_id: params.planId,
      customer_notify: 1,
      total_count: params.totalCount || 12,
      notes: params.notes || {},
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay subscription creation failed: ${err}`);
  }
  return res.json();
}

export async function cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean = true): Promise<void> {
  const res = await fetch(`${API}/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({ cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay cancel failed: ${err}`);
  }
}

/**
 * Fetch an existing Razorpay order (used to cross-check that the credits
 * amount claimed by the client matches the amount we committed to when we
 * created the order server-side — otherwise a client could claim 10,000
 * credits after paying for 1,000).
 */
export async function fetchRazorpayOrder(orderId: string): Promise<{
  id: string;
  amount: number;
  currency: string;
  status: string;
  notes: Record<string, string>;
}> {
  const res = await fetch(`${API}/orders/${orderId}`, {
    method: "GET",
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay order fetch failed: ${err}`);
  }
  return res.json();
}

/**
 * Verify a Razorpay webhook signature. Throws if invalid.
 */
export function verifyWebhookSignature(payload: string, signature: string): void {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET not configured");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (expected !== signature) throw new Error("Invalid Razorpay webhook signature");
}

/**
 * Verify a Razorpay payment signature (for client-side checkout success).
 */
export function verifyPaymentSignature(params: { subscriptionId: string; paymentId: string; signature: string }): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const payload = `${params.paymentId}|${params.subscriptionId}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return expected === params.signature;
}
