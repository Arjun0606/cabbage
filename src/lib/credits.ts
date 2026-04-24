import { getServiceClient } from "@/lib/db/supabase";
import { TIERS, type PlanTier } from "@/lib/tiers";

/**
 * Server-side credit enforcement.
 *
 * Every API route that costs credits should call `enforceCredits()` before
 * doing any expensive work. Returns { allowed, remaining } so the route
 * can either proceed or return 402.
 *
 * This is the server-side counterpart to the client-side `spendCredits()`
 * in dashboard/page.tsx. Both must agree on costs.
 */

export const CREDIT_COSTS: Record<string, number> = {
  audit: 2,
  technical: 1,
  ai_visibility: 4,
  backlinks: 1,
  competitors: 2,
  article: 5,
  schema: 2,
  portal: 2,
  neighborhood: 3,
  report: 5,
  llms_txt: 2,
  geo_improvement: 3,
  crawler: 1,
  brand_presence: 2,
  citability: 2,
  gbp_posts: 3,
  prompt_volumes: 3,
  free_report: 0,
};

/** Fallback when we can't resolve a tier — matches old behaviour. */
const FALLBACK_MONTHLY_INCLUDED = 1000;

export function getCreditCost(action: string): number {
  return CREDIT_COSTS[action] ?? 1;
}

/**
 * Check if a company has enough credits for an action.
 * If companyId is not provided (no Supabase), returns allowed=true
 * (client-side enforcement is the only gate in that case).
 */
export async function enforceCredits(
  companyId: string | null | undefined,
  action: string
): Promise<{ allowed: boolean; remaining: number; cost: number; monthly: number }> {
  const cost = getCreditCost(action);
  if (cost === 0) return { allowed: true, remaining: FALLBACK_MONTHLY_INCLUDED, cost: 0, monthly: FALLBACK_MONTHLY_INCLUDED };
  if (!companyId) return { allowed: true, remaining: FALLBACK_MONTHLY_INCLUDED, cost, monthly: FALLBACK_MONTHLY_INCLUDED };

  try {
    const supabase = getServiceClient();

    // Resolve the company's tier so we use THAT tier's monthly pool
    // instead of a global constant. Legacy "base" plans map to Pro.
    let monthlyPool = FALLBACK_MONTHLY_INCLUDED;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("company_id", companyId)
      .maybeSingle();
    const planRaw = sub?.plan as string | undefined;
    const plan: PlanTier = planRaw === "starter" || planRaw === "pro" || planRaw === "enterprise"
      ? (planRaw as PlanTier)
      : "pro"; // default legacy + demo-mode companies to pro's pool
    monthlyPool = TIERS[plan].limits.creditsPerMonth;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("credit_usage")
      .select("credits_used")
      .eq("company_id", companyId)
      .gte("created_at", startOfMonth.toISOString());

    if (error) {
      // If credit_usage table doesn't exist yet, allow (graceful degradation)
      console.error("enforceCredits: query failed, allowing:", error.message);
      return { allowed: true, remaining: monthlyPool, cost, monthly: monthlyPool };
    }

    const totalUsed = (data || []).reduce((sum, d) => sum + d.credits_used, 0);
    const remaining = Math.max(0, monthlyPool - totalUsed);

    // Record usage (soft limit — overage allowed so users aren't blocked
    // mid-demo. We surface the shortfall in /api/billing/status for the UI
    // to nudge an upgrade.)
    await supabase.from("credit_usage").insert({
      company_id: companyId,
      action,
      credits_used: cost,
    }).then(() => {}, () => {});

    return { allowed: true, remaining: remaining - cost, cost, monthly: monthlyPool };
  } catch {
    // On any error, allow (don't block users due to infra issues)
    return { allowed: true, remaining: FALLBACK_MONTHLY_INCLUDED, cost, monthly: FALLBACK_MONTHLY_INCLUDED };
  }
}
