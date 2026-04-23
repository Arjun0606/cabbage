import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { sanitizeUrl } from "@/lib/security";

/**
 * GET /api/companies?id=xxx — fetch company by ID (scoped to current user)
 * GET /api/companies?website=xxx — fetch company by website (scoped to current user)
 * POST /api/companies — upsert the current user's company row
 *
 * All routes now require an authenticated Supabase session. Anonymous
 * callers receive 401. Previous behaviour allowed unauth reads/writes
 * against any company row by website alone — a trivial data-leak path.
 */

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const db = getServiceClient();
    const id = req.nextUrl.searchParams.get("id");
    const website = req.nextUrl.searchParams.get("website");

    if (!id && !website) {
      return NextResponse.json({ error: "Provide id or website" }, { status: 400 });
    }

    let query = db
      .from("companies")
      .select("*, projects(*), competitors(*)")
      .eq("owner_id", user.id);
    if (id) query = query.eq("id", id);
    else if (website) query = query.eq("website", website);

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ company: null });

    return NextResponse.json({ company: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch company" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const db = getServiceClient();
    const body = await req.json();

    const { name, description, website, city, documents, sites, projects, competitors } = body;

    if (!name || !website) {
      return NextResponse.json({ error: "name and website are required" }, { status: 400 });
    }

    // SSRF guard — the website + any additional sites get fetched by the
    // cron scanner. Reject anything that sanitizeUrl refuses (non-http(s),
    // private IP ranges, localhost, etc.).
    const websiteCheck = sanitizeUrl(website);
    if (!websiteCheck.valid) {
      return NextResponse.json({ error: websiteCheck.error || "Invalid website URL" }, { status: 400 });
    }
    const safeWebsite = websiteCheck.url;

    const safeSites: Array<{ url: string; label?: string }> = [];
    if (Array.isArray(sites)) {
      for (const s of sites) {
        if (!s?.url) continue;
        const c = sanitizeUrl(s.url);
        if (!c.valid) {
          return NextResponse.json({ error: `Invalid additional site URL: ${c.error}` }, { status: 400 });
        }
        safeSites.push({ url: c.url, label: typeof s.label === "string" ? s.label : undefined });
      }
    }

    // Look for an existing row owned by this user. We never attempt to
    // "claim" unowned rows anymore — safer to let the user explicitly
    // migrate if that ever becomes a real flow.
    const { data: existing } = await db
      .from("companies")
      .select("id")
      .eq("owner_id", user.id)
      .eq("website", safeWebsite)
      .maybeSingle();

    let companyId: string;

    if (existing) {
      companyId = existing.id;
      const updatePayload: Record<string, unknown> = {
        name,
        description,
        website: safeWebsite,
        city,
        product_info: documents?.productInfo || null,
        brand_voice: documents?.brandVoice || null,
        competitor_analysis: documents?.competitorAnalysis || null,
        sites: safeSites,
        documents: documents || {},
        owner_id: user.id,
        updated_at: new Date().toISOString(),
      };
      const { error } = await db.from("companies").update(updatePayload).eq("id", companyId);
      if (error) throw error;
    } else {
      const insertPayload: Record<string, unknown> = {
        name,
        description,
        website: safeWebsite,
        city,
        product_info: documents?.productInfo || null,
        brand_voice: documents?.brandVoice || null,
        competitor_analysis: documents?.competitorAnalysis || null,
        sites: safeSites,
        documents: documents || {},
        owner_id: user.id,
      };
      const { data, error } = await db.from("companies").insert(insertPayload).select("id").single();
      if (error) throw error;
      companyId = data.id;
    }

    // Sync projects — delete and re-insert (simplest for now). Scoped to
    // the company we just verified the user owns.
    if (projects && Array.isArray(projects)) {
      await db.from("projects").delete().eq("company_id", companyId);

      const projectRows = projects
        .filter((p: any) => p.name)
        .map((p: any) => ({
          company_id: companyId,
          name: p.name,
          website: p.website || null,
          location: p.location || null,
          city: city || null,
          configurations: p.configurations || null,
          price_range: p.priceRange || null,
          rera_number: p.reraNumber || null,
          amenities: p.amenities || null,
          status: p.status || "Active",
          usps: p.usps || null,
        }));

      if (projectRows.length > 0) {
        const { error } = await db.from("projects").insert(projectRows);
        if (error) throw error;
      }
    }

    if (competitors && Array.isArray(competitors)) {
      await db.from("competitors").delete().eq("company_id", companyId);

      const compRows = competitors
        .filter((c: any) => c.name)
        .map((c: any) => ({
          company_id: companyId,
          name: c.name,
          website: c.website || c.name,
        }));

      if (compRows.length > 0) {
        const { error } = await db.from("competitors").insert(compRows);
        if (error) throw error;
      }
    }

    return NextResponse.json({ id: companyId, synced: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save company" },
      { status: 500 }
    );
  }
}
