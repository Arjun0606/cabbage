import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, listSites } from "@/lib/integrations/googleSearchConsole";

/**
 * OAuth callback handler for Google Search Console.
 * Receives the authorization code, exchanges for tokens,
 * lists available sites, and redirects back to the dashboard
 * with credentials stored in the URL fragment (client-side only).
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

  try {
    const redirectUri = `${req.nextUrl.origin}/api/integrations/gsc/callback`;
    const credentials = await exchangeCodeForTokens(code, redirectUri);
    const sites = await listSites(credentials);

    // Store credentials in a short-lived cookie (httpOnly for security)
    // In production, store in database per user account
    const response = NextResponse.redirect(
      new URL(
        `/dashboard?gsc_connected=true&gsc_sites=${encodeURIComponent(JSON.stringify(sites))}`,
        req.nextUrl.origin
      )
    );

    // Set credentials as httpOnly cookie (temporary — move to DB in production)
    response.cookies.set("gsc_credentials", JSON.stringify(credentials), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
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
