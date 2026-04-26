import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { sanitizeUrl } from "@/lib/security";

/**
 * Content deploy — the universal publish mechanism.
 *
 * POST: authenticated dashboard call. Saves HTML keyed by (site_url, slot)
 *       for the current user's company. Only the site's actual owner can
 *       write content under their origin.
 * GET:  public endpoint, CORS-enabled. The content-loader script on the
 *       customer's site calls this to fetch HTML for a given slot.
 *
 * Flow:
 *   Dashboard generates article → user clicks "Publish via Cabbge" →
 *   POST saves HTML to `deployed_content` → dashboard shows two snippets
 *   (one-time loader <script>, per-slot <div>) → customer pastes them
 *   into their site → content renders client-side on next page load.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300, s-maxage=300", // 5 min edge cache
};

const ALLOWED_TYPES = ["article", "gbp_post", "locality_page", "html_block", "internal_link"] as const;
type ContentType = typeof ALLOWED_TYPES[number];

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function normalizeOrigin(u: string): string | null {
  try {
    const url = new URL(u);
    return url.origin;
  } catch {
    return null;
  }
}

function normalizeSlot(s: string): string {
  // Strip leading/trailing slashes, spaces, disallow path traversal.
  return s
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.\./g, "")
    .slice(0, 200);
}

/** Public: customer site fetches deployed content for a (site, slot) pair. */
export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  const rawSlot = req.nextUrl.searchParams.get("slot");

  if (!rawUrl || !rawSlot) {
    return NextResponse.json(
      { error: "url and slot required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const site = normalizeOrigin(rawUrl);
  const slot = normalizeSlot(rawSlot);
  if (!site || !slot) {
    return NextResponse.json(
      { error: "invalid url or slot" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from("deployed_content")
      .select("html, meta, content_type, published_at, updated_at")
      .eq("site_url", site)
      .eq("slot", slot)
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ found: false }, { headers: CORS_HEADERS });
    }

    return NextResponse.json(
      {
        found: true,
        html: data.html,
        meta: data.meta || null,
        contentType: data.content_type,
        publishedAt: data.published_at,
        updatedAt: data.updated_at,
      },
      { headers: CORS_HEADERS }
    );
  } catch {
    return NextResponse.json({ found: false }, { headers: CORS_HEADERS });
  }
}

/** Authenticated dashboard write. */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { siteUrl, slot: rawSlot, html, meta, contentType } = body;

    if (!siteUrl || !rawSlot || !html || !contentType) {
      return NextResponse.json(
        { error: "siteUrl, slot, html, contentType required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(contentType as ContentType)) {
      return NextResponse.json(
        { error: `contentType must be one of: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const { valid, url: safeUrl, error } = sanitizeUrl(siteUrl);
    if (!valid || !safeUrl) {
      return NextResponse.json({ error: error || "Invalid siteUrl" }, { status: 400 });
    }

    const site = normalizeOrigin(safeUrl);
    const slot = normalizeSlot(rawSlot);
    if (!site || !slot) {
      return NextResponse.json({ error: "invalid siteUrl or slot" }, { status: 400 });
    }

    if (typeof html !== "string" || html.length > 200_000) {
      return NextResponse.json(
        { error: "html must be a string under 200 KB" },
        { status: 400 }
      );
    }

    const service = getServiceClient();

    // Verify the caller owns a company whose website (or additional site)
    // matches this site_url. Prevents one customer deploying content to a
    // competitor's domain slot.
    const { data: ownCompany } = await service
      .from("companies")
      .select("id, website, sites")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!ownCompany) {
      return NextResponse.json(
        { error: "No company found for user — complete onboarding first." },
        { status: 400 }
      );
    }

    const ownedOrigins = new Set<string>();
    if (ownCompany.website) {
      const w = normalizeOrigin(ownCompany.website);
      if (w) ownedOrigins.add(w);
    }
    const additionalSites = Array.isArray(ownCompany.sites) ? ownCompany.sites : [];
    for (const s of additionalSites) {
      if (s?.url) {
        const so = normalizeOrigin(s.url);
        if (so) ownedOrigins.add(so);
      }
    }

    if (!ownedOrigins.has(site)) {
      return NextResponse.json(
        {
          error: `You don't own ${site}. Add it as a site on your company profile first.`,
          ownedOrigins: Array.from(ownedOrigins),
        },
        { status: 403 }
      );
    }

    const { error: upsertError } = await service
      .from("deployed_content")
      .upsert(
        {
          company_id: ownCompany.id,
          site_url: site,
          slot,
          content_type: contentType,
          html,
          meta: meta || null,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "site_url,slot" }
      );

    if (upsertError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to persist content — 'deployed_content' table missing or insert failed.",
          details: upsertError.message,
        },
        { status: 500 }
      );
    }

    const origin = req.nextUrl.origin;
    return NextResponse.json({
      success: true,
      site,
      slot,
      publicUrl: `${origin}/api/content-deploy?url=${encodeURIComponent(site)}&slot=${encodeURIComponent(slot)}`,
      loaderScript: `<script defer src="${origin}/api/content-loader"></script>`,
      slotTag: `<div data-cabbge-slot="${slot}"></div>`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Content deploy failed" },
      { status: 500 }
    );
  }
}
