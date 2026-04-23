import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser, requireActiveSubscription } from "@/lib/db/supabase-server";
import { sanitizeUrl } from "@/lib/security";
import { extractCityFromLocation } from "@/lib/cities";
import { parseProject } from "@/lib/projectParse";

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
    // Tier-aware gate. Paid subscribers get their tier's limits.
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;

    // Demo mode doesn't persist to DB (demo company data lives in
    // localStorage on the client); only signed-in users can write here.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          error: gate.plan === "demo"
            ? "Demo mode doesn't persist companies to the cloud — use localStorage."
            : "Authentication required",
        },
        { status: 401 }
      );
    }

    const db = getServiceClient();
    const body = await req.json();

    const { name, description, website, city, documents, sites, projects, competitors } = body;

    if (!name || !website) {
      return NextResponse.json({ error: "name and website are required" }, { status: 400 });
    }

    // Enforce per-tier project + city + competitor caps. -1 means
    // unlimited (Enterprise). These caps are what make Starter vs Pro
    // vs Enterprise sell — fail with a clean upgrade hint when hit.
    const limits = gate.limits;
    if (Array.isArray(projects)) {
      if (limits.maxProjects >= 0 && projects.length > limits.maxProjects) {
        return NextResponse.json(
          {
            error: `Your plan allows up to ${limits.maxProjects} projects. Upgrade to track more.`,
            needsUpgrade: true,
            limit: limits.maxProjects,
            attempted: projects.length,
          },
          { status: 402 }
        );
      }
      if (limits.maxCities >= 0) {
        const cityKeys = new Set<string>();
        for (const p of projects) {
          const parsed = parseProject({ location: p.location }, city || "");
          const c = (parsed.city || city || "").trim().toLowerCase();
          if (c) cityKeys.add(c);
        }
        if (city && city.trim()) cityKeys.add(city.trim().toLowerCase());
        if (cityKeys.size > limits.maxCities) {
          return NextResponse.json(
            {
              error: `Your plan covers up to ${limits.maxCities} cit${limits.maxCities === 1 ? "y" : "ies"}. Upgrade to serve more metros.`,
              needsUpgrade: true,
              limit: limits.maxCities,
              attempted: cityKeys.size,
            },
            { status: 402 }
          );
        }
      }
    }
    if (Array.isArray(competitors) && limits.maxCompetitors >= 0 && competitors.length > limits.maxCompetitors) {
      return NextResponse.json(
        {
          error: `Your plan tracks up to ${limits.maxCompetitors} competitors. Upgrade to track more.`,
          needsUpgrade: true,
          limit: limits.maxCompetitors,
          attempted: competitors.length,
        },
        { status: 402 }
      );
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

      // Derive structured fields from the user's free-text inputs so
      // the app can roll up by locality, match "under 3 cr" queries,
      // and generate stage-aware content. The free-text columns are
      // still saved alongside for display.
      const projectRows = projects
        .filter((p: any) => p.name)
        .map((p: any) => {
          const parsed = parseProject({
            location: p.location,
            configurations: p.configurations,
            priceRange: p.priceRange,
            status: p.status,
          }, city || "");
          // Parse possession date. Users type things like "Dec 2026",
          // "Q3 2026", "2026-12-31". We store the free-text under
          // possession_date (already a text column) and try to extract
          // a concrete date into possession_target_date for delay-risk
          // arithmetic. If we can't parse, we leave it null — nothing
          // breaks, the delay view just reports 'n/a'.
          const parsePossession = (raw: unknown): string | null => {
            if (typeof raw !== "string" || !raw.trim()) return null;
            const t = raw.trim();
            const iso = Date.parse(t);
            if (!Number.isNaN(iso)) return new Date(iso).toISOString().slice(0, 10);
            // "Q3 2026" / "Q1 2025" → end of quarter
            const qm = t.match(/q([1-4])[\s\-\/]*([12]\d{3})/i);
            if (qm) {
              const q = Number(qm[1]);
              const y = Number(qm[2]);
              const month = [3, 6, 9, 12][q - 1]; // quarter-end month (1-indexed)
              const day = [31, 30, 30, 31][q - 1];
              return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            }
            // "Dec 2026" / "December 2026" → last day of that month
            const mm = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+([12]\d{3})/i);
            if (mm) {
              const monthIdx = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
                .indexOf(mm[1].slice(0, 3).toLowerCase());
              if (monthIdx >= 0) {
                const y = Number(mm[2]);
                const lastDay = new Date(y, monthIdx + 1, 0).getDate();
                return `${y}-${String(monthIdx + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
              }
            }
            return null;
          };

          return {
            company_id: companyId,
            name: p.name,
            website: p.website || null,
            location: p.location || null,
            city: parsed.city || extractCityFromLocation(p.location, city || "") || city || null,
            locality: parsed.locality || null,
            configurations: p.configurations || null,
            config_tags: parsed.configTags.length > 0 ? parsed.configTags : null,
            price_range: p.priceRange || null,
            price_min: parsed.priceMin ?? null,
            price_max: parsed.priceMax ?? null,
            rera_number: p.reraNumber || null,
            amenities: p.amenities || null,
            status: p.status || "Active",
            stage: parsed.stage,
            usps: p.usps || null,
            phase: p.phase || null,
            possession_date: p.possessionDate || null,
            possession_target_date: parsePossession(p.possessionDate),
          };
        });

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
