import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * GET /api/integrations?companyId=xxx — list all integrations for a company
 * GET /api/integrations?companyId=xxx&provider=google_search_console — get specific
 * POST /api/integrations — save/update integration credentials
 * DELETE /api/integrations?companyId=xxx&provider=xxx — disconnect
 */

export async function GET(req: NextRequest) {
  try {
    const db = getServiceClient();
    const companyId = req.nextUrl.searchParams.get("companyId");
    const provider = req.nextUrl.searchParams.get("provider");

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    let query = db.from("integrations").select("*").eq("company_id", companyId);
    if (provider) query = query.eq("provider", provider);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ integrations: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getServiceClient();
    const { companyId, provider, credentials, metadata } = await req.json();

    if (!companyId || !provider || !credentials) {
      return NextResponse.json({ error: "companyId, provider, and credentials are required" }, { status: 400 });
    }

    // Upsert by company_id + provider
    const { data, error } = await db
      .from("integrations")
      .upsert(
        {
          company_id: companyId,
          provider,
          credentials,
          metadata: metadata || null,
          connected_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "company_id,provider" }
      )
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ id: data.id, saved: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save integration" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getServiceClient();
    const companyId = req.nextUrl.searchParams.get("companyId");
    const provider = req.nextUrl.searchParams.get("provider");

    if (!companyId || !provider) {
      return NextResponse.json({ error: "companyId and provider are required" }, { status: 400 });
    }

    const { error } = await db
      .from("integrations")
      .delete()
      .eq("company_id", companyId)
      .eq("provider", provider);

    if (error) throw error;

    return NextResponse.json({ disconnected: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to disconnect integration" },
      { status: 500 }
    );
  }
}
