import { NextRequest, NextResponse } from "next/server";
import { runAIVisibility } from "@/lib/agents/aiVisibility";
import { generateSearchQueries, type QueryWithMeta } from "@/lib/agents/localityEngine";
import { enforceCredits } from "@/lib/credits";

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
    const { websiteUrl, brand, projects, city, savedQueries, projectDetails, industry, brandContext, companyId } = await req.json();

    if (!brand) {
      return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
    }

    // Server-side credit tracking (always allows — upsell model, not hard block)
    await enforceCredits(companyId, "ai_visibility");

    const cityClean = typeof city === "string" ? city.trim() : "";
    const normalizedSaved = normalizeSavedQueries(savedQueries, cityClean);

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
        projectDetails?.[0]?.location,
        industry,
        projectDetails,
        brandContext
      );
      queries = generated.queries;
      queryGenerationFallback = { used: generated.usedFallback, reason: generated.reason };
    }

    const result = await runAIVisibility(
      websiteUrl || "",
      brand,
      projects || [],
      queries
    );

    return NextResponse.json({ ...result, queriesUsed: queries, queryGenerationFallback });
  } catch (error) {
    console.error("AI Visibility error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI Visibility check failed" },
      { status: 500 }
    );
  }
}
