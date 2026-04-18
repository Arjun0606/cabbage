import { getServiceClient } from "@/lib/db/supabase";

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

const CREDIT_COSTS: Record<string, number> = {
  audit: 2,
  technical: 1,
  ai_visibility: 4,
  backlinks: 1,
  competitors: 2,
  content: 3,
  content_plan: 3,
  article: 5,
  campaign: 3,
  partner: 3,
  schema: 2,
  landing: 5,
  portal: 2,
  neighborhood: 3,
  progress: 2,
  report: 5,
  ads: 3,
  llms_txt: 2,
  geo_improvement: 3,
  crawler: 1,
  brand_presence: 2,
  citability: 2,
  chat: 1,
  locality: 1,
  locality_domination: 10,
  citation_booster: 8,
  gbp_posts: 3,
  prompt_volumes: 3,
  free_report: 0,
};

const MONTHLY_INCLUDED = 1000;

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
): Promise<{ allowed: boolean; remaining: number; cost: number }> {
  const cost = getCreditCost(action);
  if (cost === 0) return { allowed: true, remaining: MONTHLY_INCLUDED, cost: 0 };
  if (!companyId) return { allowed: true, remaining: MONTHLY_INCLUDED, cost };

  try {
    const supabase = getServiceClient();
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
      return { allowed: true, remaining: MONTHLY_INCLUDED, cost };
    }

    const totalUsed = (data || []).reduce((sum, d) => sum + d.credits_used, 0);
    const remaining = Math.max(0, MONTHLY_INCLUDED - totalUsed);

    if (remaining < cost) {
      return { allowed: false, remaining, cost };
    }

    // Record usage
    await supabase.from("credit_usage").insert({
      company_id: companyId,
      action,
      credits_used: cost,
    }).then(() => {}, () => {}); // fire-and-forget

    return { allowed: true, remaining: remaining - cost, cost };
  } catch {
    // On any error, allow (don't block users due to infra issues)
    return { allowed: true, remaining: MONTHLY_INCLUDED, cost };
  }
}
