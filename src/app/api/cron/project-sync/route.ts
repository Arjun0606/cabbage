export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * Weekly cron — auto-detect new projects on every customer's sitemap.
 *
 * Schedule: every Sunday at 02:00 UTC (~07:30 IST).
 *
 * For each company:
 *   1. Fetch their /sitemap.xml.
 *   2. Extract project-detail URLs (same regex as auto-discover).
 *   3. Diff against existing rows in `projects`. New URLs become
 *      `pending_review` rows the customer accepts in the dashboard.
 *
 * No LLM calls, no scraping past sitemap.xml — keeps the cron under a
 * minute even for a 100-company fleet. Detail-page enrichment happens
 * when the user clicks "Accept" (we already have the per-project
 * scraper in /api/auto-discover).
 */

const PROJECT_DETAIL_RX =
  /\/(project|projects|properties|residential|apartments|bungalows|villas|plots)\/[a-z0-9-]+\/[a-z0-9-]+/i;
const NON_PROJECT_SLUG_RX =
  /^(about|about-us|contact|contact-us|careers|blog|news|media|press|privacy|terms|tos|sitemap|faq|login|signup|gallery|events|csr|testimonials|awards|team|leadership|download|brochure|enquire|search|all|home|index)$/i;

function slugToName(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

async function fetchSitemap(websiteUrl: string): Promise<string[]> {
  try {
    const origin = new URL(websiteUrl).origin;
    const res = await fetch(`${origin}/sitemap.xml`, {
      headers: { "User-Agent": "Cabbge/1.0 (project-sync)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/gi)).map((m) => m[1]);
  } catch {
    return [];
  }
}

function extractProjectSlugs(urls: string[], baseHost: string): Array<{ slug: string; url: string }> {
  const out: Array<{ slug: string; url: string }> = [];
  const seen = new Set<string>();
  for (const u of urls) {
    try {
      const parsed = new URL(u);
      if (parsed.hostname.replace(/^www\./, "") !== baseHost) continue;
      if (!PROJECT_DETAIL_RX.test(parsed.pathname)) continue;
      const slug = parsed.pathname.split("/").filter(Boolean).pop() || "";
      if (!slug || slug.length < 4) continue;
      if (NON_PROJECT_SLUG_RX.test(slug)) continue;
      if (seen.has(slug)) continue;
      seen.add(slug);
      out.push({ slug, url: u });
    } catch { /* ignore */ }
  }
  return out;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const summary: Array<{ company: string; newProjects: number; error?: string }> = [];

  // Limit to 50 companies per cron run — same cap the daily scan cron uses.
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, website")
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!companies?.length) {
    return NextResponse.json({ message: "No companies", summary: [] });
  }

  for (const c of companies) {
    if (!c.website) {
      summary.push({ company: c.name, newProjects: 0, error: "no website" });
      continue;
    }

    try {
      const baseHost = new URL(c.website).hostname.replace(/^www\./, "");
      const sitemapUrls = await fetchSitemap(c.website);
      const sitemapProjects = extractProjectSlugs(sitemapUrls, baseHost);

      // What does the company already have?
      const { data: existing } = await supabase
        .from("projects")
        .select("name, website")
        .eq("company_id", c.id);
      const existingNames = new Set((existing || []).map((p) => (p.name || "").toLowerCase().trim()));
      const existingUrls = new Set(
        (existing || [])
          .map((p) => p.website || "")
          .filter(Boolean)
          .map((u) => u.toLowerCase().trim())
      );

      // Find sitemap projects that aren't tracked yet — match either by
      // URL (exact) or by name (slug-derived). Be conservative: an
      // existing fuzzy match is treated as already-tracked.
      const newOnes: Array<{ name: string; url: string }> = [];
      for (const { slug, url } of sitemapProjects) {
        const inferredName = slugToName(slug).toLowerCase().trim();
        if (existingNames.has(inferredName)) continue;
        if (existingUrls.has(url.toLowerCase().trim())) continue;
        newOnes.push({ name: slugToName(slug), url });
      }

      if (newOnes.length === 0) {
        summary.push({ company: c.name, newProjects: 0 });
        continue;
      }

      // Insert as pending_review so the dashboard surfaces them. Use
      // status='Pending Review' to fit the existing CHECK constraint
      // shape (the projects table accepts free-text status today).
      const inserts = newOnes.slice(0, 30).map((p) => ({
        company_id: c.id,
        name: p.name,
        website: p.url,
        status: "Pending Review",
      }));

      const { error: insertErr } = await supabase.from("projects").insert(inserts);
      if (insertErr) {
        summary.push({ company: c.name, newProjects: 0, error: insertErr.message });
      } else {
        summary.push({ company: c.name, newProjects: inserts.length });
      }
    } catch (err) {
      summary.push({
        company: c.name,
        newProjects: 0,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    companiesProcessed: companies.length,
    totalNewProjects: summary.reduce((s, r) => s + r.newProjects, 0),
    summary,
  });
}
