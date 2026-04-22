import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl, getGSCOverview, listSites, refreshAccessToken } from "@/lib/integrations/googleSearchConsole";
import type { GSCCredentials } from "@/lib/integrations/googleSearchConsole";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * GET: Returns the Google OAuth URL to start the connection flow.
 * POST: Fetches GSC data using credentials stored in the integrations table
 *       (keyed to the authenticated user's company).
 */

async function loadStoredCredentials(userId: string): Promise<
  { companyId: string; credentials: GSCCredentials } | null
> {
  const service = getServiceClient();
  const { data } = await service
    .from("companies")
    .select("id, integrations!inner(credentials, provider)")
    .eq("owner_id", userId)
    .eq("integrations.provider", "google_search_console")
    .maybeSingle();
  if (!data) return null;
  const integ = Array.isArray((data as any).integrations)
    ? (data as any).integrations[0]
    : (data as any).integrations;
  if (!integ?.credentials?.accessToken || !integ?.credentials?.refreshToken) return null;
  return { companyId: (data as any).id, credentials: integ.credentials };
}

async function persistRefreshed(companyId: string, creds: GSCCredentials) {
  const service = getServiceClient();
  await service
    .from("integrations")
    .update({ credentials: creds })
    .eq("company_id", companyId)
    .eq("provider", "google_search_console");
}

export async function GET(req: NextRequest) {
  const redirectUri = `${req.nextUrl.origin}/api/integrations/gsc/callback`;

  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json({
      configured: false,
      message: "Google Search Console integration requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.",
    });
  }

  const authUrl = getGoogleAuthUrl(redirectUri);
  return NextResponse.json({ configured: true, authUrl });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const stored = await loadStoredCredentials(user.id);
    if (!stored) {
      return NextResponse.json(
        { error: "not_connected", message: "Google Search Console not connected. Go to Settings to connect." },
        { status: 401 }
      );
    }

    let creds = stored.credentials;
    // Refresh token if near expiry and persist the new access token so we
    // don't hit Google's refresh endpoint on every request.
    if (Date.now() >= creds.expiresAt - 60000) {
      try {
        creds = await refreshAccessToken(creds.refreshToken);
        await persistRefreshed(stored.companyId, creds);
      } catch (refreshErr) {
        return NextResponse.json(
          { error: "refresh_failed", message: refreshErr instanceof Error ? refreshErr.message : "Token refresh failed" },
          { status: 401 }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const { siteUrl } = body as { siteUrl?: string };

    if (!siteUrl) {
      const sites = await listSites(creds);
      return NextResponse.json({ sites });
    }

    const overview = await getGSCOverview(creds, siteUrl);
    return NextResponse.json(overview);
  } catch (error) {
    console.error("GSC data fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch GSC data" },
      { status: 500 }
    );
  }
}
