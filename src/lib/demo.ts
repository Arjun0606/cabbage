import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

/**
 * Demo mode helper — checks if the request comes from a demo session.
 * Used across API routes so every auth-gated feature has a bypass for
 * sales/testing. Demo mode has a synthetic user id so downstream code
 * that needs an owner_id or user_id can still function, but nothing
 * real is saved to the customer DB.
 */

export const DEMO_USER_ID = "demo-00000000-0000-0000-0000-000000000000";
export const DEMO_USER = {
  id: DEMO_USER_ID,
  email: "demo@cabbge.com",
  isDemoUser: true as const,
} as const;

/** For use inside NextRequest handlers (e.g. route.ts POST with NextRequest) */
export function isDemoRequest(req: NextRequest): boolean {
  return req.cookies.get("cabbge_demo")?.value === "1";
}

/** For use inside server components / route handlers without NextRequest */
export async function isDemoSession(): Promise<boolean> {
  try {
    const store = await cookies();
    return store.get("cabbge_demo")?.value === "1";
  } catch {
    return false;
  }
}
