import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";

/**
 * GET  /api/competitor-alerts — list open alerts for the current user's company
 * POST /api/competitor-alerts/ack — mark an alert acknowledged
 */

async function ownCompanyId(userId: string): Promise<string | null> {
  const db = getServiceClient();
  const { data } = await db
    .from("companies")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  return data?.id || null;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const companyId = await ownCompanyId(user.id);
  if (!companyId) return NextResponse.json({ alerts: [] });

  const onlyUnread = req.nextUrl.searchParams.get("unread") === "1";

  const db = getServiceClient();
  let query = db
    .from("competitor_alerts")
    .select("id, competitor_name, competitor_url, alert_type, title, description, details, acknowledged_at, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (onlyUnread) query = query.is("acknowledged_at", null);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ alerts: [], error: error.message });
  }
  return NextResponse.json({ alerts: data || [] });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const companyId = await ownCompanyId(user.id);
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 404 });

  const { alertId } = await req.json();
  if (!alertId) return NextResponse.json({ error: "alertId required" }, { status: 400 });

  const db = getServiceClient();
  const { error } = await db
    .from("competitor_alerts")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", alertId)
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
