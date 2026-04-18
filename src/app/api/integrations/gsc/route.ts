import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl, getGSCOverview, listSites } from "@/lib/integrations/googleSearchConsole";
import type { GSCCredentials } from "@/lib/integrations/googleSearchConsole";

/**
 * GET: Returns the Google OAuth URL to start the connection flow.
 * POST: Fetches GSC data using stored credentials.
 */

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
    const body = await req.json();
    const { siteUrl } = body;

    // Try credentials from request body first, then from httpOnly cookie
    let credentials: GSCCredentials | null = null;
    if (body.credentials?.accessToken) {
      credentials = body.credentials;
    } else {
      const cookieVal = req.cookies.get("gsc_credentials")?.value;
      if (cookieVal) {
        try { credentials = JSON.parse(cookieVal); } catch { /* ignore */ }
      }
    }

    if (!credentials?.accessToken) {
      return NextResponse.json(
        { error: "not_connected", message: "Google Search Console not connected. Go to Settings to connect." },
        { status: 401 }
      );
    }

    if (!siteUrl) {
      // If no siteUrl specified, list available sites
      const sites = await listSites(credentials);
      return NextResponse.json({ sites });
    }

    const overview = await getGSCOverview(credentials, siteUrl);
    return NextResponse.json(overview);
  } catch (error) {
    console.error("GSC data fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch GSC data" },
      { status: 500 }
    );
  }
}
