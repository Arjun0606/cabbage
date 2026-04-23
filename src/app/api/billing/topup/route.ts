import { NextRequest, NextResponse } from "next/server";
import { isDemoRequest } from "@/lib/demo";

/**
 * Credit top-ups — temporarily disabled.
 *
 * The original Razorpay-backed top-up flow was removed in the Dodo
 * Payments migration. The equivalent Dodo flow (checkoutSessions.create
 * against a one-time product) will land once the Dodo dashboard has
 * top-up products configured.
 *
 * Until then this route returns 503 so the pricing page's Top-up
 * button fails cleanly rather than 500-ing on a missing Razorpay key.
 * Customers who actually need more credits mid-month reach us at
 * sales@cabbge.com and we handle it manually — not scalable, but
 * fine at current customer count.
 */

export async function POST(req: NextRequest) {
  if (isDemoRequest(req)) {
    return NextResponse.json({
      demoMode: true,
      success: true,
      message: "Demo mode — top-up flow is being migrated to Dodo Payments.",
    });
  }

  return NextResponse.json(
    {
      error: "Credit top-ups are temporarily unavailable.",
      hint: "We're moving payments to Dodo Payments. Email sales@cabbge.com if you need extra credits this cycle.",
      disabledReason: "dodo_migration",
    },
    { status: 503 }
  );
}
