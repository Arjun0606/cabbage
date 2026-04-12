import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * GET /api/companies?id=xxx — fetch company by ID
 * GET /api/companies?website=xxx — fetch company by website
 * POST /api/companies — create or update company (upsert by website)
 */

export async function GET(req: NextRequest) {
  try {
    const db = getServiceClient();
    const id = req.nextUrl.searchParams.get("id");
    const website = req.nextUrl.searchParams.get("website");

    if (!id && !website) {
      return NextResponse.json({ error: "Provide id or website" }, { status: 400 });
    }

    let query = db.from("companies").select("*, projects(*), competitors(*)");
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
    const db = getServiceClient();
    const body = await req.json();

    const { name, description, website, city, documents, sites, projects, competitors } = body;

    if (!name || !website) {
      return NextResponse.json({ error: "name and website are required" }, { status: 400 });
    }

    // Check if company exists by website
    const { data: existing } = await db
      .from("companies")
      .select("id")
      .eq("website", website)
      .maybeSingle();

    let companyId: string;

    if (existing) {
      // Update existing company
      companyId = existing.id;
      const { error } = await db
        .from("companies")
        .update({
          name,
          description,
          website,
          city,
          product_info: documents?.productInfo || null,
          brand_voice: documents?.brandVoice || null,
          brand_values: documents?.brandValues || null,
          brand_vision: documents?.brandVision || null,
          target_audience: documents?.targetAudience || null,
          marketing_strategy: documents?.marketingStrategy || null,
          competitor_analysis: documents?.competitorAnalysis || null,
          sites: sites || [],
          documents: documents || {},
          updated_at: new Date().toISOString(),
        })
        .eq("id", companyId);
      if (error) throw error;
    } else {
      // Create new company
      const { data, error } = await db
        .from("companies")
        .insert({
          name,
          description,
          website,
          city,
          product_info: documents?.productInfo || null,
          brand_voice: documents?.brandVoice || null,
          brand_values: documents?.brandValues || null,
          brand_vision: documents?.brandVision || null,
          target_audience: documents?.targetAudience || null,
          marketing_strategy: documents?.marketingStrategy || null,
          competitor_analysis: documents?.competitorAnalysis || null,
          sites: sites || [],
          documents: documents || {},
        })
        .select("id")
        .single();
      if (error) throw error;
      companyId = data.id;
    }

    // Sync projects — delete and re-insert (simplest for now)
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

    // Sync competitors
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
