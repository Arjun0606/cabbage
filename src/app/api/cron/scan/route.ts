import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * Automated Cron — runs daily at 02:30 IST (21:00 UTC).
 *
 * For each company in the database:
 * 1. Runs SEO audit + technical scan + backlinks (parallel)
 * 2. Runs AI visibility check (ChatGPT + Google AI) with FULL project
 *    context (configurations, prices, localities) — same quality as
 *    dashboard-triggered scans, not the stripped-down version.
 * 3. Stores everything in scan_history
 *
 * Content generation moved out of cron — was burning credits silently
 * every 4 hours. Now only fires on user action.
 */

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = req.nextUrl.origin;
  const results: { company: string; scans: string[]; content: string[]; errors: string[] }[] = [];

  try {
    const supabase = getServiceClient();

    // Get all companies with their projects
    const { data: companies, error } = await supabase
      .from("companies")
      .select("id, name, website, city, description, product_info, brand_voice, brand_values, target_audience, marketing_strategy")
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!companies?.length) {
      return NextResponse.json({ message: "No companies to scan", results: [] });
    }

    for (const company of companies) {
      if (!company.website) continue;

      const companyResult = { company: company.name, scans: [] as string[], content: [] as string[], errors: [] as string[] };

      // Get projects for this company
      const { data: projects } = await supabase
        .from("projects")
        .select("name, website, location, configurations, price_range, rera_number, amenities, status")
        .eq("company_id", company.id);

      // ---- PHASE 1: SCANS (parallel) ----
      try {
        const [auditRes, techRes, backlinkRes] = await Promise.all([
          fetchApi(origin, "/api/audit", { url: company.website }),
          fetchApi(origin, "/api/technical-seo", { url: company.website }),
          fetchApi(origin, "/api/backlinks", { url: company.website }),
        ]);

        // Store scan results
        if (auditRes?.scores) {
          await supabase.from("scan_history").insert({
            company_id: company.id, scan_type: "audit", url: company.website,
            score: auditRes.scores.overall || 0, results: auditRes, triggered_by: "cron",
          });
          companyResult.scans.push(`Audit: ${auditRes.scores.overall}/100`);
        }

        if (techRes?.onPageScore !== undefined) {
          await supabase.from("scan_history").insert({
            company_id: company.id, scan_type: "technical", url: company.website,
            score: techRes.onPageScore || 0, results: techRes, triggered_by: "cron",
          });
          companyResult.scans.push(`Technical: ${techRes.onPageScore}/100`);
        }

        if (backlinkRes?.domainAuthority !== undefined) {
          await supabase.from("scan_history").insert({
            company_id: company.id, scan_type: "backlinks", url: company.website,
            score: backlinkRes.domainAuthority || 0, results: backlinkRes, triggered_by: "cron",
          });
          companyResult.scans.push(`Backlinks: DA ${backlinkRes.domainAuthority}`);
        }
      } catch (err) {
        companyResult.errors.push(`Scan error: ${err instanceof Error ? err.message : "unknown"}`);
      }

      // ---- PHASE 2: AI VISIBILITY (with full project context) ----
      try {
        if (company.name && company.city) {
          const aiVisRes = await fetchApi(origin, "/api/ai-visibility", {
            websiteUrl: company.website,
            brand: company.name,
            city: company.city,
            projects: (projects || []).map((p: any) => p.name),
            projectDetails: (projects || []).map((p: any) => ({
              name: p.name,
              location: p.location,
              configurations: p.configurations,
              priceRange: p.price_range,
            })),
            industry: "real_estate",
            brandContext: {
              targetAudience: company.target_audience || "",
              usps: company.description || "",
            },
          });

          if (aiVisRes?.scores) {
            await supabase.from("scan_history").insert({
              company_id: company.id, scan_type: "ai_visibility", url: company.website,
              score: aiVisRes.scores.overall || 0, results: aiVisRes, triggered_by: "cron",
            });
            companyResult.scans.push(`AI Visibility: ${aiVisRes.scores.overall}/100 (Readiness: ${aiVisRes.scores.readiness}%)`);
          }
        }
      } catch (err) {
        companyResult.errors.push(`AI visibility error: ${err instanceof Error ? err.message : "unknown"}`);
      }

      // Content generation removed from cron — it was burning credits silently
      // every 4 hours with generic drafts nobody reviewed. Content is now
      // only generated on user action (article writer, geo-content-batch, etc.)
      // which produces targeted, query-specific content that users actually publish.

      results.push(companyResult);
    }

    const successCount = results.filter(r => r.errors.length === 0).length;
    return NextResponse.json({
      message: `Processed ${successCount}/${results.length} companies`,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed" },
      { status: 500 }
    );
  }
}

async function fetchApi(origin: string, path: string, body: any): Promise<any> {
  const res = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // Attempt to parse body safely
  let data: any;
  try {
    data = await res.json();
  } catch (err) {
    console.error(`cron fetchApi: failed to parse JSON from ${path} (status ${res.status})`, err);
    throw new Error(`${path} returned non-JSON response (status ${res.status})`);
  }

  if (!res.ok) {
    const errMsg = data?.error || `HTTP ${res.status}`;
    console.error(`cron fetchApi: ${path} failed (${res.status}):`, errMsg);
    throw new Error(`${path} failed: ${errMsg}`);
  }

  if (data?.error) throw new Error(data.error);
  return data;
}
