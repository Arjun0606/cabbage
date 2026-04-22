import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { requiredFieldsFor, type BroadcastProvider } from "@/lib/integrations/whatsappBroadcast";

/**
 * GET  /api/integrations/whatsapp — returns which providers are connected
 * POST /api/integrations/whatsapp — save / update credentials
 * DELETE /api/integrations/whatsapp?provider=aisensy — disconnect
 *
 * Credentials are scoped to the authenticated user's company and live in
 * the `integrations` table. For providers we support:
 *   aisensy  — { apiKey, campaignName, sourceName? }
 *   interakt — { apiKey, templateName, templateLanguage? }
 */

const ALLOWED: BroadcastProvider[] = ["aisensy", "interakt"];

async function ownCompanyId(userId: string): Promise<string | null> {
  const db = getServiceClient();
  const { data } = await db
    .from("companies")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  return data?.id || null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ connected: [] });

  const companyId = await ownCompanyId(user.id);
  if (!companyId) return NextResponse.json({ connected: [] });

  const db = getServiceClient();
  const { data } = await db
    .from("integrations")
    .select("provider, credentials, connected_at")
    .eq("company_id", companyId)
    .in("provider", ALLOWED);

  const connected = (data || []).map((row) => ({
    provider: row.provider,
    campaignName: (row.credentials as any)?.campaignName || null,
    templateName: (row.credentials as any)?.templateName || null,
    connectedAt: row.connected_at,
  }));
  return NextResponse.json({ connected });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const companyId = await ownCompanyId(user.id);
  if (!companyId) {
    return NextResponse.json({ error: "Complete onboarding first" }, { status: 400 });
  }

  const body = await req.json();
  const { provider, credentials } = body;
  if (!ALLOWED.includes(provider)) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }
  if (!credentials || typeof credentials !== "object") {
    return NextResponse.json({ error: "credentials object required" }, { status: 400 });
  }

  const required = requiredFieldsFor(provider as BroadcastProvider);
  const missing = required.filter((f) => !credentials[f]);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required field${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const db = getServiceClient();
  const { error } = await db
    .from("integrations")
    .upsert(
      {
        company_id: companyId,
        provider,
        credentials,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "company_id,provider" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, provider });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const companyId = await ownCompanyId(user.id);
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 404 });

  const provider = req.nextUrl.searchParams.get("provider");
  if (!provider || !ALLOWED.includes(provider as BroadcastProvider)) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  const db = getServiceClient();
  const { error } = await db
    .from("integrations")
    .delete()
    .eq("company_id", companyId)
    .eq("provider", provider);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
