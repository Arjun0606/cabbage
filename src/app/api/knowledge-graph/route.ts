import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { buildKnowledgeGraph } from "@/lib/seo/knowledgeGraph";

/**
 * GET /api/knowledge-graph?companyId=...
 *
 * Returns a connected JSON-LD @graph linking the developer
 * (Organization) → cities served → each project (Residence +
 * optional RealEstateListing) → amenities. Built from the company
 * record and its projects table — entirely real customer-supplied
 * data, no synthetic enrichment. The bundle is validated before
 * return.
 *
 * The customer can copy the @graph block straight into a
 * <script type="application/ld+json"> tag on their homepage so AI
 * overviews can traverse the whole brand structure in one parse.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const svc = getServiceClient();

  const { data: company } = await svc
    .from("companies")
    .select("id, owner_id, name, website, description, city, documents")
    .eq("id", companyId)
    .maybeSingle();
  if (!company || company.owner_id !== user.id) {
    return NextResponse.json({ error: "Not authorized for this company" }, { status: 403 });
  }
  if (!company.name) {
    return NextResponse.json({ error: "Company has no name set — finish onboarding first" }, { status: 412 });
  }

  // Cities live in two places: the legacy `city` (single string) column
  // and `documents.cities` (array, set by the multi-city onboarding
  // wizard). Merge both, dedupe.
  const docs = (company.documents as Record<string, unknown> | null) || {};
  const docCities = Array.isArray((docs as { cities?: unknown }).cities)
    ? ((docs as { cities: unknown[] }).cities.filter((c): c is string => typeof c === "string" && c.trim().length > 0))
    : [];
  const cities = Array.from(new Set([
    ...(company.city ? [String(company.city)] : []),
    ...docCities,
  ]));

  const { data: projects } = await svc
    .from("projects")
    .select("id, name, location, configurations, price_range, rera_number, amenities, status")
    .eq("company_id", companyId);

  const bundle = buildKnowledgeGraph(
    {
      id: company.id,
      name: company.name,
      website: company.website || "",
      description: company.description || "",
      cities,
      founded: null,
    },
    (projects || []) as any,
  );

  return NextResponse.json(bundle);
}
