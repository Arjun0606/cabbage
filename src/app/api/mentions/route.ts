import { NextResponse, type NextRequest } from "next/server";
import { requireActiveSubscription, getCurrentUser } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";
import { enforceCredits } from "@/lib/credits";
import { scanMentions, readMentions } from "@/lib/agents/mentions";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET  /api/mentions?slug=stripe.com
 *   List most-recent persisted mentions for a tracked brand.
 *   Returns the user's tracked_brand row + mentions[].
 *
 * POST /api/mentions { slug, brand?, refresh? }
 *   Subscribe the user to track this brand. If `refresh: true` (or
 *   the row is brand-new) run an immediate scan and persist.
 *   Costs 1 credit on a refresh, 0 to just subscribe.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const slug = req.nextUrl.searchParams.get("slug")?.trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const svc = getServiceClient();
  const { data: tracked } = await svc
    .from("tracked_brands")
    .select("id, brand_slug, display_name, notify_weekly, last_refreshed_at, created_at")
    .eq("user_id", user.id)
    .eq("brand_slug", slug)
    .maybeSingle();

  if (!tracked) {
    return NextResponse.json({ tracked: null, mentions: [] });
  }

  const mentions = await readMentions(slug, 100);
  return NextResponse.json({ tracked, mentions });
}

export async function POST(req: NextRequest) {
  const sub = await requireActiveSubscription(req);
  if (!sub.ok) return sub.response;

  let body: { slug?: string; brand?: string; refresh?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = body.slug?.trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }
  const brand = (body.brand || slug.split(".")[0]).trim();
  const refresh = Boolean(body.refresh);

  const svc = getServiceClient();
  const { data: existing } = await svc
    .from("tracked_brands")
    .select("id, last_refreshed_at")
    .eq("user_id", sub.userId)
    .eq("brand_slug", slug)
    .maybeSingle();

  // Insert subscription if new. brand-new rows always trigger a scan
  // so the dashboard isn't empty on first view.
  if (!existing) {
    await svc.from("tracked_brands").insert({
      user_id: sub.userId,
      brand_slug: slug,
      display_name: brand,
    });
  }

  const shouldScan = refresh || !existing;
  if (!shouldScan) {
    return NextResponse.json({ ok: true, scanned: false });
  }

  await enforceCredits(sub.userId, "mention_scan");
  const result = await scanMentions({
    brand,
    brandSlug: slug,
    persist: true,
  });

  await svc
    .from("tracked_brands")
    .update({ last_refreshed_at: new Date().toISOString() })
    .eq("user_id", sub.userId)
    .eq("brand_slug", slug);

  return NextResponse.json({
    ok: true,
    scanned: true,
    total: result.total,
    newSinceLastScan: result.newSinceLastScan,
    bySource: result.bySource,
    errors: result.errors,
    mentions: result.mentions.slice(0, 50),
  });
}

/**
 * DELETE /api/mentions?slug=stripe.com
 *   Stop tracking a brand. Mentions stay in the cross-user table
 *   (other users may still be tracking).
 */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const slug = req.nextUrl.searchParams.get("slug")?.trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }
  const svc = getServiceClient();
  await svc
    .from("tracked_brands")
    .delete()
    .eq("user_id", user.id)
    .eq("brand_slug", slug);
  return NextResponse.json({ ok: true });
}
