export const runtime = "nodejs";
export const maxDuration = 300;
import { NextRequest, NextResponse } from "next/server";
import { runAIVisibility } from "@/lib/agents/aiVisibility";
import { generateSearchQueries, type QueryWithMeta } from "@/lib/agents/localityEngine";
import { enforceCredits } from "@/lib/credits";
import { requireActiveSubscription } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";
import { loadVolatilityFromDb, loadCitationDriftFromDb } from "@/lib/agents/volatility";
import { canRunScan } from "@/lib/cadence";

/**
 * Normalize whatever the client sent for `savedQueries` into QueryWithMeta[].
 * Accepts:
 *   - QueryWithMeta[]  (current shape — used directly)
 *   - string[]         (legacy shape from before query metadata was persisted —
 *                       upgraded with default level=locality + supplied city)
 * Anything else returns null so the caller falls through to fresh generation.
 */
function normalizeSavedQueries(input: unknown, defaultCity: string): QueryWithMeta[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const out: QueryWithMeta[] = [];
  for (const item of input) {
    if (typeof item === "string" && item.trim()) {
      out.push({ query: item, level: "locality", city: defaultCity || undefined });
    } else if (item && typeof item === "object" && typeof (item as { query?: unknown }).query === "string") {
      const q = item as Partial<QueryWithMeta>;
      out.push({
        query: q.query!,
        level: q.level === "city" || q.level === "country" ? q.level : "locality",
        city: typeof q.city === "string" && q.city ? q.city : defaultCity || undefined,
        config: typeof q.config === "string" ? q.config : undefined,
        priceTier: typeof q.priceTier === "string" ? q.priceTier : undefined,
        intent: q.intent,
      });
    }
  }
  return out.length > 0 ? out : null;
}

export async function POST(req: NextRequest) {
  try {
    // Paid-only: the AI visibility scan is the most expensive thing in
    // the product and the single biggest reason someone subscribes. Gate
    // it at the API so nobody can skip the paywall.
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;

    const { websiteUrl, brand, projects, city, savedQueries, projectDetails, industry, brandContext, companyId } = await req.json();

    if (!brand) {
      return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
    }

    // Cadence gate — pricing tiers promise weekly vs daily AI visibility
    // scans. Block re-scans within the tier's window. Demo mode bypasses.
    if (companyId && typeof companyId === "string") {
      const cadenceCheck = await canRunScan(companyId, "ai_visibility", gate.limits.aiVisibilityCadence);
      if (!cadenceCheck.ok) {
        return NextResponse.json(
          {
            error: "Cadence limit reached",
            hint: cadenceCheck.hint,
            nextAllowedAt: cadenceCheck.nextAllowedAt,
            needsUpgrade: gate.limits.aiVisibilityCadence === "weekly",
          },
          { status: 429 }
        );
      }
    }

    // Server-side credit tracking (always allows — upsell model, not hard block)
    await enforceCredits(companyId, "ai_visibility");

    const cityClean = typeof city === "string" ? city.trim() : "";
    const normalizedSaved = normalizeSavedQueries(savedQueries, cityClean);

    // Per-city AI visibility is universal — every tier scans the full
    // project set, including projects outside the primary city. The
    // credit pool is the natural ceiling on multi-city scan volume.
    const scopedProjectDetails = projectDetails;
    const cityRestrictionApplied: { reason: string; restrictedTo: string; ignoredCities: string[] } | null = null;

    if (!cityClean && !normalizedSaved) {
      // Fail loudly instead of falling back to "the market" — that produces
      // queries like "best real estate developers in the market" which AI
      // models answer with global brands (Vanke, Greystar, Emaar) and
      // never recommend a regional player like Aparna.
      return NextResponse.json({
        error: "City required",
        hint: "Set Primary City in the Company panel before running AI visibility. Empty city forces generic global queries that won't surface regional brands.",
      }, { status: 400 });
    }

    // Use saved queries if provided (for consistent tracking), otherwise generate fresh.
    // generateSearchQueries always returns at least a fallback set so the scan can run
    // even when the AI generator hiccups.
    let queries: QueryWithMeta[];
    let queryGenerationFallback: { used: boolean; reason?: string } = { used: false };
    if (normalizedSaved) {
      queries = normalizedSaved;
    } else {
      const generated = await generateSearchQueries(
        cityClean,
        brand,
        projects || [],
        scopedProjectDetails?.[0]?.location,
        industry,
        scopedProjectDetails,
        brandContext
      );
      queries = generated.queries;
      queryGenerationFallback = { used: generated.usedFallback, reason: generated.reason };
    }

    // Golden prompts: user-locked queries that must be tracked on every
    // scan so volatility reads as signal vs noise. We prepend them to
    // the query list (deduped) — never dropped, never substituted.
    let goldenPrompts: string[] = [];
    if (companyId && typeof companyId === "string") {
      try {
        const db = getServiceClient();
        const { data } = await db
          .from("golden_prompts")
          .select("query")
          .eq("company_id", companyId);
        goldenPrompts = (data || []).map((r) => r.query).filter(Boolean);
        if (goldenPrompts.length > 0) {
          const seen = new Set(queries.map((q) => q.query.trim().toLowerCase()));
          const toPrepend: QueryWithMeta[] = [];
          for (const g of goldenPrompts) {
            const key = g.trim().toLowerCase();
            if (!seen.has(key)) {
              toPrepend.push({ query: g, level: "locality", city: cityClean || undefined });
              seen.add(key);
            }
          }
          queries = [...toPrepend, ...queries];
        }
      } catch (err) {
        // Golden-prompts fetch is best-effort — a failure here should never
        // break a scan, just log and continue.
        console.warn("golden prompts fetch failed:", err instanceof Error ? err.message : err);
      }
    }

    // Parse aliases + exclusions from the brandContext payload. They
    // arrive as comma-separated strings (what the user typed) and get
    // normalised to trimmed arrays for the agent.
    //
    // Brand disambiguation is universal — every tier benefits from
    // suppressing collisions (Godrej Properties vs Godrej Consumer)
    // when the customer has configured aliases / exclusions on their
    // company doc. No tier gate.
    const parseList = (raw: unknown): string[] => {
      if (!raw || typeof raw !== "string") return [];
      return raw.split(",").map((s) => s.trim()).filter((s) => s.length >= 2).slice(0, 15);
    };
    const aliases = parseList((brandContext as any)?.aliases);
    const exclusions = parseList((brandContext as any)?.exclusions);

    // Ground-truth projects for the hallucination audit. projectDetails
    // is the rich array (name + location + configs + price + RERA)
    // produced by auto-discover's per-project scraper — auditing against
    // our own scraped data means zero made-up facts flagged as wrong.
    const projectGroundTruth = Array.isArray(scopedProjectDetails)
      ? scopedProjectDetails
          .filter((p: any) => p && typeof p === "object" && typeof p.name === "string" && p.name.trim())
          .map((p: any) => ({
            name: String(p.name).trim(),
            location: typeof p.location === "string" ? p.location : "",
            configurations: typeof p.configurations === "string" ? p.configurations : "",
            priceRange: typeof p.priceRange === "string" ? p.priceRange : "",
            reraNumber: typeof p.reraNumber === "string" ? p.reraNumber : "",
            possession: typeof p.possession === "string" ? p.possession : "",
          }))
      : undefined;

    const result = await runAIVisibility(
      websiteUrl || "",
      brand,
      projects || [],
      queries,
      { aliases, exclusions },
      projectGroundTruth,
    );

    // Persist the full scan to scan_history so volatility / trend / citation
    // drift computation has per-query data to read. The cron path writes the
    // same shape; without this server-side write, manual scans (the common
    // case) leave scan_history.results empty and every trend chart stays flat.
    // Skip for demo (no real company) and when no companyId was sent.
    if (companyId && typeof companyId === "string" && gate.userId !== "demo") {
      try {
        const db = getServiceClient();
        await db.from("scan_history").insert({
          company_id: companyId,
          scan_type: "ai_visibility",
          url: websiteUrl || "",
          score: (result as { scores?: { overall?: number } })?.scores?.overall ?? 0,
          results: result,
          triggered_by: "manual",
        });
      } catch (err) {
        console.warn("scan_history write failed:", err instanceof Error ? err.message : err);
      }
    }

    // Pull volatility + citation drift snapshots so the UI renders
    // sparklines + gained/lost-citation panels without a second round
    // trip. Cheap — one indexed read each.
    let volatility: Awaited<ReturnType<typeof loadVolatilityFromDb>> = [];
    let citationDrift: Awaited<ReturnType<typeof loadCitationDriftFromDb>> = [];
    if (companyId && typeof companyId === "string") {
      try {
        const db = getServiceClient();
        [volatility, citationDrift] = await Promise.all([
          loadVolatilityFromDb(db, companyId, { limit: 10 }),
          loadCitationDriftFromDb(db, companyId),
        ]);
      } catch { /* best-effort */ }
    }

    return NextResponse.json({
      ...result,
      queriesUsed: queries,
      queryGenerationFallback,
      goldenPrompts,
      volatility,
      citationDrift,
      cityRestriction: cityRestrictionApplied,
    });
  } catch (error) {
    console.error("AI Visibility error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI Visibility check failed" },
      { status: 500 }
    );
  }
}
