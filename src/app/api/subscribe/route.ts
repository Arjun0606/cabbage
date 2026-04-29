import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * POST /api/subscribe { email, brandSlug?, source? }
 *
 * Public lead-capture endpoint. Stores the email + brand context so
 * we can re-engage with weekly score updates. No auth — this is the
 * funnel surface. Every shared /visibility/[slug] URL becomes a
 * lead capture, even when the visitor doesn't pay yet.
 *
 * Rate limited at the proxy layer. See pivot.20 for the eventual
 * weekly-digest cron that fires off these subscribers.
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; brandSlug?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Valid email required" },
      { status: 400 },
    );
  }

  const brandSlug = body.brandSlug
    ? String(body.brandSlug).slice(0, 200)
    : null;
  const source = (body.source ?? "unknown").slice(0, 80);

  const referer = req.headers.get("referer") || undefined;
  const userAgent = req.headers.get("user-agent") || undefined;

  try {
    const service = getServiceClient();
    await service
      .from("global_subscribers")
      .upsert(
        {
          email,
          brand_slug: brandSlug,
          source,
          meta: { referer, userAgent },
          confirmed: true,
        },
        { onConflict: "email,brand_slug" },
      )
      .then(
        () => {},
        () => {},
      );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/subscribe failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Subscribe failed" },
      { status: 500 },
    );
  }
}
