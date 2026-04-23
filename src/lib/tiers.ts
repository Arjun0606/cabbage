/**
 * Pricing tiers — single source of truth.
 *
 * Both the pricing page marketing copy AND the server-side enforcement
 * in the API routes derive their numbers from this file. Change a
 * limit here and it flows everywhere (checkout, cap checks, the
 * "you've hit the limit" nudges, the /api/billing/status response).
 *
 * Tier selection is driven by `subscriptions.plan` in Supabase. Values:
 *   "starter" | "pro" | "enterprise"    active paid tiers
 *   "demo"                                demo cookie — unlimited
 *   anything else (including "none", null) → no access (paywall)
 */

export type PlanTier = "starter" | "pro" | "enterprise";
export type PlanBilled = "monthly" | "annual";

export interface TierLimits {
  /** Max project rows the company can persist. -1 means unlimited. */
  maxProjects: number;
  /** Distinct cities the company can serve (derived from projects). -1 unlimited. */
  maxCities: number;
  /** Hard cap on pages per full-site crawl. */
  maxPagesPerCrawl: number;
  /** Max articles generated via /api/article-writer per calendar month. */
  articlesPerMonth: number;
  /** Max competitors the company can track. -1 unlimited. */
  maxCompetitors: number;
  /** Review-monitor cadence — enforced by rejecting rescans within the window. */
  reviewMonitorFrequency: "weekly" | "daily";
  /** Feature flags — simple on/off per tier. */
  features: {
    cmoDigest: boolean;
    infraNews: boolean;
    perCityAIVisibility: boolean;
    customReportTemplates: boolean;
    prioritySupport: boolean;
  };
}

export interface TierDef {
  key: PlanTier;
  label: string;
  /** USD list price (rounded). */
  usd: number;
  /** INR list price — what we actually charge. */
  inr: number;
  /**
   * Dodo Payments product ids per billing cycle. Each (tier × billed)
   * combination maps to its own Dodo product configured in the Dodo
   * dashboard.
   */
  dodoProductEnv: {
    monthly: string;
    annual: string;
  };
  limits: TierLimits;
}

export const TIERS: Record<PlanTier, TierDef> = {
  starter: {
    key: "starter",
    label: "Starter",
    usd: 500,
    inr: 42000,
    dodoProductEnv: {
      monthly: "DODO_PRODUCT_STARTER_MONTHLY",
      annual: "DODO_PRODUCT_STARTER_ANNUAL",
    },
    limits: {
      maxProjects: 10,
      maxCities: 1,
      maxPagesPerCrawl: 500,
      articlesPerMonth: 20,
      maxCompetitors: 5,
      reviewMonitorFrequency: "weekly",
      features: {
        cmoDigest: false,
        infraNews: false,
        perCityAIVisibility: false,
        customReportTemplates: false,
        prioritySupport: false,
      },
    },
  },
  pro: {
    key: "pro",
    label: "Pro",
    usd: 1200,
    inr: 99000,
    dodoProductEnv: {
      monthly: "DODO_PRODUCT_PRO_MONTHLY",
      annual: "DODO_PRODUCT_PRO_ANNUAL",
    },
    limits: {
      maxProjects: 40,
      maxCities: 3,
      maxPagesPerCrawl: 1500,
      articlesPerMonth: 60,
      maxCompetitors: 15,
      reviewMonitorFrequency: "daily",
      features: {
        cmoDigest: true,
        infraNews: true,
        perCityAIVisibility: true,
        customReportTemplates: false,
        prioritySupport: true,
      },
    },
  },
  enterprise: {
    key: "enterprise",
    label: "Enterprise",
    usd: 2500,
    inr: 210000,
    dodoProductEnv: {
      monthly: "DODO_PRODUCT_ENTERPRISE_MONTHLY",
      annual: "DODO_PRODUCT_ENTERPRISE_ANNUAL",
    },
    limits: {
      maxProjects: -1,
      maxCities: -1,
      maxPagesPerCrawl: 3000,
      articlesPerMonth: 200,
      maxCompetitors: -1,
      reviewMonitorFrequency: "daily",
      features: {
        cmoDigest: true,
        infraNews: true,
        perCityAIVisibility: true,
        customReportTemplates: true,
        prioritySupport: true,
      },
    },
  },
};

/**
 * Demo-mode limits — the sales demo cookie grants unrestricted access
 * so prospects see the full product. We mirror Enterprise caps.
 */
export const DEMO_LIMITS: TierLimits = {
  ...TIERS.enterprise.limits,
};

/**
 * Price computation honouring the annual-prepay 20% discount the
 * pricing page advertises.
 */
export function tierPrice(tier: TierDef, billed: PlanBilled): number {
  return billed === "annual" ? Math.round(tier.inr * 0.8) : tier.inr;
}

/**
 * Return the Dodo Payments product id for (tier, billed). Throws a
 * clear error if the env var isn't set so the operator knows which
 * product they haven't created yet in the Dodo dashboard.
 */
export function tierDodoProductId(tier: TierDef, billed: PlanBilled): string {
  const envKey = billed === "annual" ? tier.dodoProductEnv.annual : tier.dodoProductEnv.monthly;
  const value = process.env[envKey];
  if (!value) {
    throw new Error(
      `${envKey} is not configured. Create a ${tier.label} (${billed}) product in the Dodo Payments dashboard and set ${envKey}.`
    );
  }
  return value;
}

export function limitsForPlan(plan: string | null | undefined): TierLimits | null {
  if (!plan) return null;
  const t = TIERS[plan as PlanTier];
  if (!t) return null;
  return t.limits;
}

export function isPaidTier(plan: string | null | undefined): plan is PlanTier {
  return !!plan && (plan === "starter" || plan === "pro" || plan === "enterprise");
}
