import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * Cron endpoint for scheduled scans.
 *
 * Called by Vercel Cron (configured in vercel.json) on a schedule.
 * For each active company in the database, runs the configured agents
 * and stores results in the scan_history table.
 *
 * Protected by CRON_SECRET to prevent unauthorized access.
 */

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const results: { companyId: string; status: string; error?: string }[] = [];

  try {
    // Get all active companies
    const { data: companies, error } = await supabase
      .from("companies")
      .select("id, name, website, tier")
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!companies?.length) {
      return NextResponse.json({ message: "No companies to scan", results: [] });
    }

    for (const company of companies) {
      if (!company.website) {
        results.push({ companyId: company.id, status: "skipped", error: "No website URL" });
        continue;
      }

      try {
        // Run site audit
        const auditRes = await fetch(`${req.nextUrl.origin}/api/audit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: company.website }),
        });
        const auditData = await auditRes.json();

        // Store in scan history
        await supabase.from("scan_history").insert({
          company_id: company.id,
          scan_type: "audit",
          url: company.website,
          results: auditData,
          score: auditData.scores?.overall || 0,
        });

        // Run technical SEO
        const techRes = await fetch(`${req.nextUrl.origin}/api/technical-seo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: company.website }),
        });
        const techData = await techRes.json();

        await supabase.from("scan_history").insert({
          company_id: company.id,
          scan_type: "technical",
          url: company.website,
          results: techData,
          score: techData.onPageScore || 0,
        });

        results.push({ companyId: company.id, status: "success" });
      } catch (err) {
        results.push({
          companyId: company.id,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      message: `Scanned ${results.filter(r => r.status === "success").length}/${companies.length} companies`,
      results,
    });
  } catch (error) {
    console.error("Cron scan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron scan failed" },
      { status: 500 }
    );
  }
}
