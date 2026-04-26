import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";
import { publishLocalPost, type GBPCredentials, type GBPLocalPost } from "@/lib/integrations/googleBusinessProfile";

/**
 * GBP deploy — push a generated Local Post to a customer's Google
 * Business Profile location.
 *
 * Flow:
 *   1. Caller provides { summary, imageUrl?, cta?, topicType?, locationName? }.
 *   2. We pull the customer's stored GBP credentials + location list
 *      from `integrations` (provider="google_business_profile").
 *   3. If no integration row exists → 412 with hint to connect via
 *      Settings.
 *   4. Otherwise refresh tokens if expired and POST the Local Post
 *      via the GBP API.
 *
 * Why this is a separate endpoint vs reusing /api/gbp-posts:
 *   /api/gbp-posts only generates copy. /api/gbp-deploy actually
 *   ships it. Keeping the loop split lets the customer regenerate /
 *   approve / publish on different cadences.
 *
 * NOTE: until OAuth credentials are configured (GBP_OAUTH_CLIENT_ID +
 * GBP_OAUTH_CLIENT_SECRET) and at least one customer has connected
 * their GBP account, this endpoint will return 412 cleanly. The
 * library at lib/integrations/googleBusinessProfile.ts is the
 * working primitive that flips this on the moment OAuth is wired.
 */

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await req.json()) as Partial<GBPLocalPost> & { locationName?: string; companyId?: string };
  if (!body.summary || typeof body.summary !== "string") {
    return NextResponse.json({ error: "summary is required" }, { status: 400 });
  }

  const db = getServiceClient();

  // Resolve company. Prefer explicit companyId; fall back to the
  // user's own company.
  let companyId = body.companyId;
  if (!companyId) {
    const { data: company } = await db
      .from("companies")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();
    companyId = company?.id as string | undefined;
  }
  if (!companyId) {
    return NextResponse.json({ error: "No company found for this user" }, { status: 404 });
  }

  const { data: integration } = await db
    .from("integrations")
    .select("credentials, metadata")
    .eq("company_id", companyId)
    .eq("provider", "google_business_profile")
    .maybeSingle();

  if (!integration?.credentials) {
    return NextResponse.json(
      {
        error: "Google Business Profile not connected",
        hint: "Open Settings → Integrations → Connect Google Business Profile to enable Local Post publishing.",
        needsConnect: true,
        setupUrl: "/settings#integrations",
      },
      { status: 412 }
    );
  }

  const creds = integration.credentials as GBPCredentials;
  const meta = (integration.metadata || {}) as { locations?: Array<{ name: string; title?: string }> };

  // Resolve target location: caller-supplied wins, else the only stored
  // location, else a 400 asking which to publish to.
  let locationName = body.locationName;
  if (!locationName) {
    const stored = meta.locations || [];
    if (stored.length === 1) {
      locationName = stored[0].name;
    } else if (stored.length > 1) {
      return NextResponse.json(
        {
          error: "Multiple GBP locations connected — pass locationName.",
          hint: "Use one of the location names from /api/integrations/gbp/locations",
          locations: stored,
        },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: "No GBP locations registered for this account" },
        { status: 412 }
      );
    }
  }

  try {
    const post: GBPLocalPost = {
      summary: body.summary,
      imageUrl: body.imageUrl,
      cta: body.cta,
      topicType: body.topicType,
    };
    const result = await publishLocalPost(creds, locationName, post);
    return NextResponse.json({ ok: true, post: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "GBP publish failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
