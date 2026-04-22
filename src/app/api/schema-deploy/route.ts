import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * Schema deploy endpoints.
 *
 * POST: save a schema for a given site+page (called from dashboard).
 * GET:  public lookup — customer's website calls this to get schema
 *       for the current page. CORS-enabled, cached by Vercel edge.
 *
 * Flow:
 *   Dashboard generates RealEstateListing schema → clicks "Deploy" →
 *   POST saves to Supabase (or returns existing record) → dashboard
 *   shows GTM snippet + <script> snippet for copy-paste → customer's
 *   site fetches via GET on page load → schema lives in <head>.
 *
 * This skips the WordPress plugin complexity — works on any CMS.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=3600",  // 1-hour edge cache
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function normalize(u: string): { site: string; path: string } | null {
  try {
    const url = new URL(u);
    let path = url.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return { site: url.origin, path };
  } catch { return null; }
}

/** GET /api/schema-deploy?url=https://thecamellias.com/projects/camellias */
export async function GET(req: NextRequest) {
  const pageUrl = req.nextUrl.searchParams.get("url");
  if (!pageUrl) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400, headers: CORS_HEADERS });
  }

  const norm = normalize(pageUrl);
  if (!norm) {
    return NextResponse.json({ error: "invalid url" }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("deployed_schemas")
      .select("schema_json, schema_type, updated_at")
      .eq("site_url", norm.site)
      .eq("page_path", norm.path)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // Return empty array so customer site can handle gracefully
      return NextResponse.json({ schemas: [] }, { headers: CORS_HEADERS });
    }

    return NextResponse.json(
      { schemas: [{ type: data.schema_type, json: data.schema_json }] },
      { headers: CORS_HEADERS }
    );
  } catch {
    // Supabase not configured — return empty, script handles it
    return NextResponse.json({ schemas: [] }, { headers: CORS_HEADERS });
  }
}

/** POST { pageUrl, schemaType, schemaJson, companyId } */
export async function POST(req: NextRequest) {
  try {
    const { pageUrl, schemaType, schemaJson, companyId } = await req.json();
    if (!pageUrl || !schemaType || !schemaJson) {
      return NextResponse.json({ error: "pageUrl, schemaType, schemaJson required" }, { status: 400 });
    }
    const norm = normalize(pageUrl);
    if (!norm) {
      return NextResponse.json({ error: "invalid pageUrl" }, { status: 400 });
    }

    try {
      const supabase = getServiceClient();
      const { error } = await supabase
        .from("deployed_schemas")
        .upsert({
          company_id: companyId || null,
          site_url: norm.site,
          page_path: norm.path,
          schema_type: schemaType,
          schema_json: schemaJson,
          updated_at: new Date().toISOString(),
        }, { onConflict: "site_url,page_path" });

      if (error) {
        // Schema was not persisted — fail loudly so the UI doesn't show a
        // green "deployed" state while the customer's site has nothing to
        // fetch. Previously returned 200 with success=false (swallowed).
        return NextResponse.json(
          {
            success: false,
            saved_locally: true,
            saved_cloud: false,
            error: "Failed to persist schema — 'deployed_schemas' table missing or Supabase insert failed.",
            details: error.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        saved_locally: true,
        saved_cloud: true,
        publicUrl: `${req.nextUrl.origin}/api/schema-deploy?url=${encodeURIComponent(pageUrl)}`,
      });
    } catch (err) {
      return NextResponse.json(
        {
          success: false,
          saved_locally: false,
          saved_cloud: false,
          error: "Supabase not configured — schema cannot be served to your site. Configure Supabase for production deployment.",
          details: err instanceof Error ? err.message : String(err),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Schema deploy failed" },
      { status: 500 }
    );
  }
}
