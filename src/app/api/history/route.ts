import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * Scan History API
 *
 * GET: Fetch historical scan data for trend charts.
 * POST: Store a new scan result (called after each manual scan).
 */

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  const scanType = req.nextUrl.searchParams.get("scanType");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "30");

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();
    let query = supabase
      .from("scan_history")
      .select("id, scan_type, url, score, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (scanType) {
      query = query.eq("scan_type", scanType);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Calculate trends
    const scores = (data || []).map(d => ({ date: d.created_at, score: d.score, type: d.scan_type }));
    const latestScore = scores[0]?.score || 0;
    const previousScore = scores[1]?.score || latestScore;
    const trend = latestScore - previousScore;

    return NextResponse.json({
      history: data || [],
      trend: {
        current: latestScore,
        previous: previousScore,
        change: trend,
        direction: trend > 0 ? "improving" : trend < 0 ? "declining" : "stable",
      },
    });
  } catch (error) {
    console.error("History fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch history" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { companyId, scanType, url, score, results, triggeredBy } = await req.json();

    if (!companyId || !scanType || !url || results === undefined) {
      return NextResponse.json(
        { error: "companyId, scanType, url, and results are required" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase.from("scan_history").insert({
      company_id: companyId,
      scan_type: scanType,
      url,
      score: score || 0,
      results,
      triggered_by: triggeredBy || "manual",
    }).select().single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("History save error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save scan history" },
      { status: 500 }
    );
  }
}
