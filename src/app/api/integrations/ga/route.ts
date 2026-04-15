import { NextRequest, NextResponse } from "next/server";
import { getGAOverview, listGA4Properties } from "@/lib/integrations/googleAnalytics";
import type { GACredentials } from "@/lib/integrations/googleAnalytics";

/**
 * Google Analytics 4 Integration
 *
 * Uses the SAME Google OAuth as GSC — one connection gets both.
 * GET: List available GA4 properties
 * POST: Fetch analytics data for a property
 */

export async function GET(req: NextRequest) {
  try {
    const credentialsHeader = req.headers.get("x-ga-credentials");
    if (!credentialsHeader) {
      return NextResponse.json({ error: "Connect Google first via Search Console" }, { status: 400 });
    }

    const credentials: GACredentials = JSON.parse(credentialsHeader);
    const properties = await listGA4Properties(credentials);
    return NextResponse.json({ properties });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list properties" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { credentials, propertyId, days } = await req.json();

    if (!credentials?.accessToken || !propertyId) {
      return NextResponse.json(
        { error: "credentials and propertyId are required" },
        { status: 400 }
      );
    }

    const overview = await getGAOverview(credentials as GACredentials, propertyId, days || 28);
    return NextResponse.json(overview);
  } catch (error) {
    console.error("GA data fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch GA data" },
      { status: 500 }
    );
  }
}
