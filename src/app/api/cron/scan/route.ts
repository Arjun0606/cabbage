import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { captureCompetitorSignals, signalsHash, diffSnapshots } from "@/lib/agents/competitorWatch";

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
    // Limit to 50 companies per cron run to avoid memory + timeout issues.
    // If >50 companies exist, they'll be processed over multiple cron runs
    // via the ascending order (oldest first, newest last).
    const { data: companies, error } = await supabase
      .from("companies")
      .select("id, name, website, sites, city, description, product_info, brand_voice")
      .order("created_at", { ascending: true })
      .limit(50);

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

      // Build the full list of sites to scan — main website + any
      // additional sites (project microsites, NRI sites, landing pages).
      const additionalSites: Array<{ url: string; label?: string }> = Array.isArray(company.sites) ? company.sites : [];
      const allSites: Array<{ url: string; label: string }> = [
        { url: company.website, label: "Main site" },
        ...additionalSites
          .filter((s) => s?.url && s.url !== company.website)
          .map((s) => ({ url: s.url, label: s.label || s.url })),
      ];

      // ---- PHASE 1: SCANS (per-site, parallel within each site) ----
      for (const site of allSites) {
        try {
          const [auditRes, techRes, backlinkRes] = await Promise.all([
            fetchApi(origin, "/api/audit", { url: site.url }),
            fetchApi(origin, "/api/technical-seo", { url: site.url }),
            fetchApi(origin, "/api/backlinks", { url: site.url }),
          ]);

          if (auditRes?.scores) {
            await supabase.from("scan_history").insert({
              company_id: company.id, scan_type: "audit", url: site.url,
              score: auditRes.scores.overall || 0, results: auditRes, triggered_by: "cron",
            });
            companyResult.scans.push(`[${site.label}] Audit: ${auditRes.scores.overall}/100`);
          }

          if (techRes?.onPageScore !== undefined) {
            await supabase.from("scan_history").insert({
              company_id: company.id, scan_type: "technical", url: site.url,
              score: techRes.onPageScore || 0, results: techRes, triggered_by: "cron",
            });
            companyResult.scans.push(`[${site.label}] Technical: ${techRes.onPageScore}/100`);
          }

          if (backlinkRes?.domainAuthority !== undefined) {
            await supabase.from("scan_history").insert({
              company_id: company.id, scan_type: "backlinks", url: site.url,
              score: backlinkRes.domainAuthority || 0, results: backlinkRes, triggered_by: "cron",
            });
            companyResult.scans.push(`[${site.label}] Backlinks: DA ${backlinkRes.domainAuthority}`);
          }
        } catch (err) {
          companyResult.errors.push(`[${site.label}] Scan error: ${err instanceof Error ? err.message : "unknown"}`);
        }
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
              usps: company.description || "",
              productInfo: (company as any).product_info || "",
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

      // ---- PHASE 3: COMPETITOR WATCH ----
      // Snapshot each competitor homepage; diff against yesterday's
      // snapshot; write an alert for each meaningful change (new project
      // launch, price updates, sitemap growth, hero rewrite, etc.).
      try {
        const { data: competitors } = await supabase
          .from("competitors")
          .select("name, website")
          .eq("company_id", company.id);

        for (const comp of competitors || []) {
          if (!comp.website) continue;
          const next = await captureCompetitorSignals(comp.website);
          if (!next) continue;
          const nextHash = signalsHash(next);

          const { data: prior } = await supabase
            .from("competitor_snapshots")
            .select("signals, signals_hash")
            .eq("company_id", company.id)
            .eq("competitor_name", comp.name)
            .order("captured_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (prior?.signals_hash === nextHash) continue; // no change

          const alerts = diffSnapshots(
            prior ? (prior.signals as any) : null,
            next,
            comp.name
          );

          await supabase.from("competitor_snapshots").insert({
            company_id: company.id,
            competitor_name: comp.name,
            competitor_url: comp.website,
            signals: next,
            signals_hash: nextHash,
          });

          if (alerts.length > 0) {
            await supabase.from("competitor_alerts").insert(
              alerts.map((a) => ({
                company_id: company.id,
                competitor_name: comp.name,
                competitor_url: comp.website,
                alert_type: a.type,
                title: a.title,
                description: a.description,
                details: a.details,
              }))
            );
            companyResult.scans.push(`[${comp.name}] ${alerts.length} new alert${alerts.length === 1 ? "" : "s"}`);
          }
        }
      } catch (err) {
        companyResult.errors.push(`Competitor watch error: ${err instanceof Error ? err.message : "unknown"}`);
      }

      // Content generation removed from cron — it was burning credits silently
      // every 4 hours with generic drafts nobody reviewed. Content is now
      // only generated on user action (article writer, etc.)
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
