import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { TIERS, type PlanTier } from "@/lib/tiers";
import { isDemoRequest } from "@/lib/demo";

/**
 * Plan recommendation.
 *
 * Looks at the company's actual usage signals — project count, city
 * spread, competitor list, mention rate gap — and computes the smallest
 * tier that fits. Returns alongside the user's current plan so the UI
 * can show "you're on Growth, but Scale fits better now". Used for both
 * post-onboarding tier picks and ongoing upgrade nudges as the customer
 * grows.
 *
 * The math is intentionally simple: pick the smallest tier whose limits
 * cover every observed signal. If the customer is already above that
 * tier, no nudge. If they're below, we surface the gap with reasons.
 */

const TIER_ORDER: PlanTier[] = ["starter", "pro", "scale"];

interface PlanReason {
  signal: string;
  observed: number;
  starterCap: number | "unlimited";
  starterFits: boolean;
}

interface PlanRecommendation {
  currentPlan: PlanTier | "trial" | "none";
  recommendedPlan: PlanTier;
  recommendedLabel: string;
  recommendedPriceInr: number;
  recommendedPriceUsd: number;
  shouldUpgrade: boolean;
  shouldDowngrade: boolean;
  reasons: PlanReason[];
  signals: {
    projects: number;
    cities: number;
    competitors: number;
    estimatedArticlesNeeded: number;
  };
}

function fitsTier(plan: PlanTier, signals: PlanRecommendation["signals"]): boolean {
  const limits = TIERS[plan].limits;
  const fitsCount = (cap: number, observed: number) => cap === -1 || observed <= cap;
  return (
    fitsCount(limits.maxProjects, signals.projects) &&
    fitsCount(limits.maxCities, signals.cities) &&
    fitsCount(limits.maxCompetitors, signals.competitors) &&
    signals.estimatedArticlesNeeded <= limits.articlesPerMonth
  );
}

function smallestFittingTier(signals: PlanRecommendation["signals"]): PlanTier {
  for (const t of TIER_ORDER) {
    if (fitsTier(t, signals)) return t;
  }
  // Nothing fits even Scale's caps — recommend Scale anyway and let the
  // sales conversation handle anything bigger as a custom contract.
  return "scale";
}

function reasonFor(
  signal: string,
  observed: number,
  cap: number,
  recommended: PlanTier
): PlanReason {
  const recCap = (() => {
    const v = (TIERS[recommended].limits as unknown as Record<string, number>)[
      signal === "projects"
        ? "maxProjects"
        : signal === "cities"
          ? "maxCities"
          : signal === "competitors"
            ? "maxCompetitors"
            : "articlesPerMonth"
    ];
    return v === -1 ? "unlimited" : v;
  })();
  return {
    signal,
    observed,
    starterCap: cap === -1 ? "unlimited" : cap,
    starterFits: cap === -1 || observed <= cap,
    // The "recommended cap" is implied by the fact this tier fits; we keep
    // starterCap as the most-restrictive comparison point so the UI can
    // explain "you have X but Starter only allows Y".
    ...(typeof recCap === "number" ? { recommendedCap: recCap } : {}),
  };
}

async function userOwnsCompany(userId: string, companyId: string): Promise<boolean> {
  const db = getServiceClient();
  const { data } = await db
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_id", userId)
    .maybeSingle();
  return !!data;
}

function demoRecommendation(): PlanRecommendation {
  // The demo is a pitch — the prospect's discovered portfolio looks like
  // a Growth-tier customer. We surface that explicitly so the salesperson
  // can point at the recommended plan card while talking.
  const signals = { projects: 14, cities: 2, competitors: 9, estimatedArticlesNeeded: 60 };
  const recommended = smallestFittingTier(signals);
  return {
    currentPlan: "trial",
    recommendedPlan: recommended,
    recommendedLabel: TIERS[recommended].label,
    recommendedPriceInr: TIERS[recommended].inr,
    recommendedPriceUsd: TIERS[recommended].usd,
    shouldUpgrade: true,
    shouldDowngrade: false,
    reasons: [
      reasonFor("projects", 14, TIERS.starter.limits.maxProjects, recommended),
      reasonFor("cities", 2, TIERS.starter.limits.maxCities, recommended),
      reasonFor("competitors", 9, TIERS.starter.limits.maxCompetitors, recommended),
      reasonFor("articles", 60, TIERS.starter.limits.articlesPerMonth, recommended),
    ],
    signals,
  };
}

export async function GET(req: NextRequest) {
  if (isDemoRequest(req)) {
    return NextResponse.json(demoRecommendation());
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  if (!(await userOwnsCompany(user.id, companyId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = getServiceClient();

  const [{ count: projectCount }, { data: projectRows }, { count: competitorCount }, { data: subRow }] =
    await Promise.all([
      db.from("projects").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      db.from("projects").select("location").eq("company_id", companyId),
      db.from("competitors").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      db.from("subscriptions").select("plan, status, trial_ends_at").eq("user_id", user.id).maybeSingle(),
    ]);

  const cities = new Set<string>();
  for (const p of projectRows || []) {
    const loc = (p.location as string | null) || "";
    if (!loc) continue;
    // Last comma-separated segment is the city by convention
    // ("Sector 86, Gurgaon" → "gurgaon"). Cheap heuristic, good enough
    // for tier-fit math.
    const tail = loc.split(",").pop()?.trim().toLowerCase();
    if (tail) cities.add(tail);
  }

  // Articles "needed" estimate: we shoot for ~3 articles per month per
  // query that's currently NOT being mentioned. Pull the latest scan
  // and count missing-mention queries. Falls back to a conservative
  // estimate when no scan exists yet.
  let estimatedArticlesNeeded = 20;
  const { data: latestScan } = await db
    .from("scan_history")
    .select("results")
    .eq("company_id", companyId)
    .eq("scan_type", "ai_visibility")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestScan?.results) {
    const r = latestScan.results as { queryResults?: Array<{ chatgpt?: { mentioned?: boolean }; gemini?: { mentioned?: boolean } }> };
    const qrs = Array.isArray(r.queryResults) ? r.queryResults : [];
    const missing = qrs.filter(
      (qr) => qr.chatgpt?.mentioned !== true && qr.gemini?.mentioned !== true
    ).length;
    if (missing > 0) {
      estimatedArticlesNeeded = Math.min(500, missing * 3);
    }
  }

  const signals = {
    projects: projectCount ?? 0,
    cities: cities.size || 1,
    competitors: competitorCount ?? 0,
    estimatedArticlesNeeded,
  };

  const recommended = smallestFittingTier(signals);

  // Determine current plan: explicit subscription > trial > none.
  let currentPlan: PlanTier | "trial" | "none" = "none";
  const sub = subRow as { plan: string | null; status: string | null; trial_ends_at: string | null } | null;
  if (sub?.status === "active" && sub.plan && (TIER_ORDER as string[]).includes(sub.plan)) {
    currentPlan = sub.plan as PlanTier;
  } else if (sub?.trial_ends_at && new Date(sub.trial_ends_at) > new Date()) {
    currentPlan = "trial";
  }

  const currentRank =
    currentPlan === "none" || currentPlan === "trial"
      ? -1
      : TIER_ORDER.indexOf(currentPlan as PlanTier);
  const recommendedRank = TIER_ORDER.indexOf(recommended);

  const result: PlanRecommendation = {
    currentPlan,
    recommendedPlan: recommended,
    recommendedLabel: TIERS[recommended].label,
    recommendedPriceInr: TIERS[recommended].inr,
    recommendedPriceUsd: TIERS[recommended].usd,
    shouldUpgrade: recommendedRank > currentRank,
    shouldDowngrade: currentRank > recommendedRank && currentRank >= 0,
    reasons: [
      reasonFor("projects", signals.projects, TIERS.starter.limits.maxProjects, recommended),
      reasonFor("cities", signals.cities, TIERS.starter.limits.maxCities, recommended),
      reasonFor("competitors", signals.competitors, TIERS.starter.limits.maxCompetitors, recommended),
      reasonFor("articles", signals.estimatedArticlesNeeded, TIERS.starter.limits.articlesPerMonth, recommended),
    ],
    signals,
  };

  return NextResponse.json(result);
}
