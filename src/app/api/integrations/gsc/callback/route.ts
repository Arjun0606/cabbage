import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, listSites } from "@/lib/integrations/googleSearchConsole";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * OAuth callback for Google Search Console.
 *
 * Previously this stored the access + refresh tokens in a cookie and
 * also passed the full site list through the redirect URL (leaks via
 * referer + browser history). Tokens now live in the `integrations`
 * table, keyed to the authenticated user's company.
 */

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard?gsc_error=${encodeURIComponent(error)}`, req.nextUrl.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard?gsc_error=no_code", req.nextUrl.origin)
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(
      new URL("/signin?next=/dashboard&gsc_error=not_authed", req.nextUrl.origin)
    );
  }

  try {
    const redirectUri = `${req.nextUrl.origin}/api/integrations/gsc/callback`;
    const credentials = await exchangeCodeForTokens(code, redirectUri);
    const sites = await listSites(credentials);

    const service = getServiceClient();
    const { data: company } = await service
      .from("companies")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!company) {
      return NextResponse.redirect(
        new URL("/dashboard?gsc_error=no_company", req.nextUrl.origin)
      );
    }

    await service.from("integrations").upsert(
      {
        company_id: company.id,
        provider: "google_search_console",
        credentials,
        metadata: { sites },
        connected_at: new Date().toISOString(),
      },
      { onConflict: "company_id,provider" }
    );

    return NextResponse.redirect(
      new URL("/dashboard?gsc_connected=1", req.nextUrl.origin)
    );
  } catch (err) {
    console.error("GSC OAuth error:", err);
    return NextResponse.redirect(
      new URL(
        `/dashboard?gsc_error=${encodeURIComponent(err instanceof Error ? err.message : "OAuth failed")}`,
        req.nextUrl.origin
      )
    );
  }
}
