import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase server client — reads/writes the httpOnly auth cookie
 * using Next.js cookie store. Use in route handlers, server actions,
 * and middleware (with NextRequest/NextResponse versions).
 */
export async function getServerSupabase(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase not configured.");

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — setting is not allowed here,
          // but middleware refreshes the session separately.
        }
      },
    },
  });
}

/**
 * Convenience: get the current authenticated user, or null.
 */
export async function getCurrentUser() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Require an active paid subscription on the request. Used by expensive
 * API routes (AI visibility, article writer, portal optimiser, etc.) to
 * make sure the dashboard paywall can't be bypassed by calling the API
 * directly. Demo-cookie sessions are granted access so the sales team
 * can still pitch prospects live.
 *
 * Returns { ok: true } when access is granted, or a ready-to-return
 * NextResponse (401 / 402) when it isn't. Callers spread the response
 * back to the client unchanged so error codes are consistent across
 * the API surface.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";

export async function requireActiveSubscription(
  req?: NextRequest
): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  // Demo cookie — sales pitches don't have a real Supabase session but
  // still need the full product surface working.
  const demo = req?.cookies.get("cabbge_demo")?.value === "1";
  if (demo) return { ok: true, userId: "demo" };

  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  try {
    const svc = getServiceClient();
    const { data: sub } = await svc
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (sub?.status === "active") return { ok: true, userId: user.id };
  } catch {
    // Supabase unreachable — fail closed for paid actions.
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: "Active subscription required", needsUpgrade: true },
      { status: 402 }
    ),
  };
}
