/**
 * Dodo Payments client — server-side only.
 *
 * Cabbge uses Dodo Payments as its merchant of record. Dodo handles
 * global tax + compliance + subscription billing so we don't have to
 * integrate with Razorpay / Stripe directly.
 *
 * Required env vars:
 *   DODO_API_KEY                  (bearer token from the Dodo dashboard)
 *   DODO_WEBHOOK_KEY              (for verifying incoming webhooks)
 *   DODO_MODE                     (optional — "test" for sandbox, "live" otherwise)
 *   DODO_PRODUCT_STARTER_MONTHLY  (product ids — one per tier × cycle)
 *   DODO_PRODUCT_STARTER_ANNUAL
 *   DODO_PRODUCT_PRO_MONTHLY
 *   DODO_PRODUCT_PRO_ANNUAL
 *   DODO_PRODUCT_SCALE_MONTHLY
 *   DODO_PRODUCT_SCALE_ANNUAL
 *   DODO_PRODUCT_ENTERPRISE_MONTHLY
 *   DODO_PRODUCT_ENTERPRISE_ANNUAL
 */

import DodoPayments from "dodopayments";

let _client: DodoPayments | null = null;

export function getDodo(): DodoPayments {
  if (_client) return _client;
  const bearerToken = process.env.DODO_API_KEY;
  if (!bearerToken) {
    throw new Error(
      "DODO_API_KEY is not configured. Set it to your Dodo Payments API key."
    );
  }
  const environment =
    process.env.DODO_MODE === "test" ? "test_mode" : "live_mode";
  _client = new DodoPayments({ bearerToken, environment });
  return _client;
}

/**
 * Create a hosted-checkout session for a Cabbge subscription.
 *
 * Customers land on Dodo's hosted payment page, complete payment, and
 * are redirected back to `returnUrl`. Once Dodo issues the webhook we
 * flip the subscription row to status=active.
 */
export async function createDodoCheckoutSession(params: {
  productId: string;
  email: string;
  fullName?: string | null;
  returnUrl: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}): Promise<{ sessionId: string; checkoutUrl: string }> {
  const client = getDodo();
  const session = await client.checkoutSessions.create({
    product_cart: [{ product_id: params.productId, quantity: 1 }],
    customer: {
      email: params.email,
      name: params.fullName || params.email,
    },
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl || params.returnUrl,
    metadata: params.metadata,
    feature_flags: {
      allow_discount_code: true,
      allow_phone_number_collection: false,
      allow_currency_selection: true,
    },
  });

  const checkoutUrl = session.checkout_url;
  if (!checkoutUrl) {
    throw new Error("Dodo did not return a checkout URL");
  }
  return {
    sessionId: session.session_id,
    checkoutUrl,
  };
}

/**
 * Cancel an active subscription by id. Dodo emits a
 * subscription.cancelled webhook which flips our row; the direct
 * API call is used from the Settings page "Cancel" button.
 */
export async function cancelDodoSubscription(subscriptionId: string): Promise<void> {
  const client = getDodo();
  await client.subscriptions.update(subscriptionId, {
    status: "cancelled",
  });
}
