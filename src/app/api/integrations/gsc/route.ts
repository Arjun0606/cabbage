import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl, getGSCOverview } from "@/lib/integrations/googleSearchConsole";
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
    const { credentials, siteUrl } = await req.json();

    if (!credentials?.accessToken || !siteUrl) {
      return NextResponse.json(
        { error: "credentials and siteUrl are required" },
        { status: 400 }
      );
    }

    const overview = await getGSCOverview(credentials as GSCCredentials, siteUrl);
    return NextResponse.json(overview);
  } catch (error) {
    console.error("GSC data fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch GSC data" },
      { status: 500 }
    );
  }
}
