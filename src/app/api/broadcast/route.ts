import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";
import {
  sendBroadcast,
  type BroadcastCredentials,
  type BroadcastProvider,
} from "@/lib/integrations/whatsappBroadcast";

/**
 * POST /api/broadcast
 *
 * Sends a WhatsApp broker broadcast via the user's configured provider
 * (AiSensy or Interakt). Credentials live in the `integrations` table.
 *
 * Body: { recipients: string[], bodyText: string, providerOverride?: "aisensy" | "interakt" }
 * Reply: { success, sent, failed, results? }
 *
 * NOTE: WhatsApp Business marketing templates must be pre-approved on
 * the provider's dashboard. The user's template must have ONE body
 * variable — we pass the generated channel-partner copy in as that
 * single variable.
 */

const ALLOWED_PROVIDERS: BroadcastProvider[] = ["aisensy", "interakt"];

async function loadCreds(userId: string, providerOverride?: BroadcastProvider): Promise<
  | { companyId: string; creds: BroadcastCredentials }
  | null
> {
  const db = getServiceClient();

  const { data: company } = await db
    .from("companies")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (!company) return null;

  let query = db
    .from("integrations")
    .select("provider, credentials")
    .eq("company_id", company.id)
    .in("provider", ALLOWED_PROVIDERS);

  if (providerOverride) query = query.eq("provider", providerOverride);

  const { data: rows } = await query;
  if (!rows?.length) return null;

  // Prefer the override, else the most recent.
  const row = rows[0];
  const credsJson = row.credentials as Record<string, string>;
  if (!credsJson?.apiKey) return null;

  const creds: BroadcastCredentials = {
    provider: row.provider as BroadcastProvider,
    apiKey: credsJson.apiKey,
    campaignName: credsJson.campaignName,
    templateName: credsJson.templateName,
    templateLanguage: credsJson.templateLanguage || "en",
    sourceName: credsJson.sourceName,
  };
  return { companyId: company.id, creds };
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { recipients, bodyText, providerOverride } = body;
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: "recipients[] required" }, { status: 400 });
  }
  if (typeof bodyText !== "string" || bodyText.length < 10) {
    return NextResponse.json({ error: "bodyText required" }, { status: 400 });
  }
  if (recipients.length > 500) {
    return NextResponse.json(
      { error: "Max 500 recipients per call — split into multiple batches" },
      { status: 400 }
    );
  }

  const loaded = await loadCreds(
    user.id,
    providerOverride && ALLOWED_PROVIDERS.includes(providerOverride) ? providerOverride : undefined
  );
  if (!loaded) {
    return NextResponse.json(
      {
        error: "WhatsApp broadcast not configured.",
        hint: "Connect AiSensy or Interakt from Settings → Integrations first.",
      },
      { status: 400 }
    );
  }

  const result = await sendBroadcast(loaded.creds, recipients, bodyText);

  return NextResponse.json({
    success: true,
    provider: loaded.creds.provider,
    sent: result.sent,
    failed: result.failed,
    // Only surface first 10 per-recipient results so very large batches
    // don't bloat the response.
    results: result.results.slice(0, 10),
  });
}
