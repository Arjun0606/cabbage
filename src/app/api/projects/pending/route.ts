export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";

/**
 * GET  /api/projects/pending?companyId=...
 *   List projects with status='Pending Review' for the company.
 *   Created weekly by /api/cron/project-sync when sitemap finds new
 *   project URLs not yet tracked.
 *
 * POST /api/projects/pending
 *   { companyId, projectIds: [...], action: "accept" | "dismiss" }
 *   Accept flips status to 'Active'. Dismiss deletes the row.
 */

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const db = getServiceClient();
  const { data: company } = await db
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const { data, error } = await db
    .from("projects")
    .select("id, name, website, location, configurations, price_range, rera_number, status, created_at")
    .eq("company_id", companyId)
    .eq("status", "Pending Review")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ pending: data || [] });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { companyId, projectIds, action } = await req.json();
  if (!companyId || !Array.isArray(projectIds) || projectIds.length === 0) {
    return NextResponse.json({ error: "companyId + projectIds[] required" }, { status: 400 });
  }
  if (action !== "accept" && action !== "dismiss") {
    return NextResponse.json({ error: "action must be accept or dismiss" }, { status: 400 });
  }

  const db = getServiceClient();
  const { data: company } = await db
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  if (action === "dismiss") {
    const { error } = await db
      .from("projects")
      .delete()
      .eq("company_id", companyId)
      .in("id", projectIds)
      .eq("status", "Pending Review");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, dismissed: projectIds.length });
  }

  // Accept: flip to Active. Detail-page enrichment (RERA / configs /
  // price) happens on the next manual scan or daily cron — keeping the
  // accept flow synchronous so the user sees the row immediately.
  const { error } = await db
    .from("projects")
    .update({ status: "Active", updated_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .in("id", projectIds)
    .eq("status", "Pending Review");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, accepted: projectIds.length });
}
