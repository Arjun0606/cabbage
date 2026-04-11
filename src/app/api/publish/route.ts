import { NextRequest, NextResponse } from "next/server";
import { publishContent, testConnection } from "@/lib/integrations/wordpress";

/**
 * Content Publishing API
 *
 * POST: Publish content to WordPress or Webflow.
 * PUT: Test connection to a CMS.
 */

export async function POST(req: NextRequest) {
  try {
    const { provider, credentials, post } = await req.json();

    if (!provider || !credentials || !post) {
      return NextResponse.json(
        { error: "provider, credentials, and post are required" },
        { status: 400 }
      );
    }

    const result = await publishContent(provider, credentials, post);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Publish error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publishing failed" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { provider, credentials } = await req.json();

    if (!provider || !credentials) {
      return NextResponse.json(
        { error: "provider and credentials are required" },
        { status: 400 }
      );
    }

    const result = await testConnection(provider, credentials);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Connection test error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connection test failed" },
      { status: 500 }
    );
  }
}
