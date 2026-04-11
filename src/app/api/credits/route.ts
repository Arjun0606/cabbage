import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * Credit Usage API
 *
 * GET: Fetch current credit usage for a company.
 * POST: Record credit usage for an action.
 *
 * Credit costs per action:
 * - audit: 5 credits
 * - ai_visibility: 10 credits
 * - technical: 3 credits
 * - backlinks: 5 credits
 * - competitor_scan: 5 credits
 * - blog_post: 3 credits
 * - social_post: 1 credit
 * - locality_page: 2 credits
 * - content_plan: 8 credits
 * - chat_message: 1 credit
 */

const CREDIT_COSTS: Record<string, number> = {
  audit: 5,
  ai_visibility: 10,
  technical: 3,
  backlinks: 5,
  competitor_scan: 5,
  blog_post: 3,
  social_post: 1,
  locality_page: 2,
  content_plan: 8,
  chat_message: 1,
  free_report: 0, // Free reports don't cost credits
};

const MONTHLY_INCLUDED = 1000; // Credits included in base plan

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();

    // Get usage for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("credit_usage")
      .select("action, credits_used, created_at")
      .eq("company_id", companyId)
      .gte("created_at", startOfMonth.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    const totalUsed = (data || []).reduce((sum, d) => sum + d.credits_used, 0);
    const remaining = Math.max(0, MONTHLY_INCLUDED - totalUsed);

    // Break down by action type
    const breakdown: Record<string, number> = {};
    for (const row of data || []) {
      breakdown[row.action] = (breakdown[row.action] || 0) + row.credits_used;
    }

    return NextResponse.json({
      monthlyIncluded: MONTHLY_INCLUDED,
      totalUsed,
      remaining,
      overageCredits: Math.max(0, totalUsed - MONTHLY_INCLUDED),
      overageCost: Math.max(0, totalUsed - MONTHLY_INCLUDED) * 0.40,
      breakdown,
      recentActions: (data || []).slice(0, 20),
    });
  } catch (error) {
    console.error("Credits fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch credits" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { companyId, action, metadata } = await req.json();

    if (!companyId || !action) {
      return NextResponse.json(
        { error: "companyId and action are required" },
        { status: 400 }
      );
    }

    const creditsUsed = CREDIT_COSTS[action] || 1;

    const supabase = getServiceClient();
    const { error } = await supabase.from("credit_usage").insert({
      company_id: companyId,
      action,
      credits_used: creditsUsed,
      metadata: metadata || null,
    });

    if (error) throw error;

    return NextResponse.json({ action, creditsUsed });
  } catch (error) {
    console.error("Credit record error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record credit usage" },
      { status: 500 }
    );
  }
}
