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

/**
 * Five-tier ladder sized so the product fits a local builder all the
 * way up to DLF / Lodha scale. Every tier is designed for >92% gross
 * margin — the credit pool is sized so a typical customer's real COGS
 * (OpenAI web_search + article writing) stays well under 10% of list.
 *
 * Legacy keys kept for backward compatibility with existing Supabase
 * `subscriptions.plan` rows:
 *   "starter"      existing — unchanged
 *   "pro"          existing — display label changed to "Growth"
 *   "enterprise"   existing — unchanged
 *   "solo"         NEW — smallest tier, local-builder pricing
 *   "scale"        NEW — regional/national, fits between pro and enterprise
 */
export type PlanTier = "solo" | "starter" | "pro" | "scale" | "enterprise";
export type PlanBilled = "monthly" | "annual";

export interface TierLimits {
  /** Monthly credit pool. Every scan action deducts per CREDIT_COSTS.
   *  Soft limit — overages are flagged, not hard-blocked (upsell model). */
  creditsPerMonth: number;
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
  // ------- Solo (₹19,999/mo) -------
  // Local builder with 1-3 projects in one locality who already pays
  // a freelance SEO consultant ₹20-40k/mo. Same price, does the work
  // instead of just reporting it. Not the "cheapest possible" — the
  // minimum-viable entry for a serious marketer.
  // Typical COGS: ~$12/mo → ~95% margin.
  solo: {
    key: "solo",
    label: "Solo",
    usd: 240,
    inr: 19999,
    dodoProductEnv: {
      monthly: "DODO_PRODUCT_SOLO_MONTHLY",
      annual: "DODO_PRODUCT_SOLO_ANNUAL",
    },
    limits: {
      creditsPerMonth: 600,
      maxProjects: 3,
      maxCities: 1,
      maxPagesPerCrawl: 300,
      articlesPerMonth: 10,
      maxCompetitors: 3,
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
  // ------- Starter (₹49,999/mo) -------
  // Small single-city developer with 5-10 projects who typically runs
  // a ₹50k-₹1L agency retainer. We match that retainer and deliver
  // 10× the output with daily AI visibility scans.
  // Typical COGS: ~$40/mo → ~93% margin.
  starter: {
    key: "starter",
    label: "Starter",
    usd: 600,
    inr: 49999,
    dodoProductEnv: {
      monthly: "DODO_PRODUCT_STARTER_MONTHLY",
      annual: "DODO_PRODUCT_STARTER_ANNUAL",
    },
    limits: {
      creditsPerMonth: 2000,
      maxProjects: 10,
      maxCities: 1,
      maxPagesPerCrawl: 500,
      articlesPerMonth: 30,
      maxCompetitors: 7,
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
  // ------- Growth (pro key, ₹99,999/mo) -------
  // Regional multi-city developer (10-40 projects) — the sweet spot.
  // Priced precisely against the ₹3-5L/mo agency retainer they'd
  // otherwise pay. Daily full scan on main site + microsites, 80
  // articles, CMO digest, infrastructure news.
  // Typical COGS: ~$100/mo → ~92% margin.
  pro: {
    key: "pro",
    label: "Growth",
    usd: 1200,
    inr: 99999,
    dodoProductEnv: {
      monthly: "DODO_PRODUCT_PRO_MONTHLY",
      annual: "DODO_PRODUCT_PRO_ANNUAL",
    },
    limits: {
      creditsPerMonth: 5000,
      maxProjects: 40,
      maxCities: 3,
      maxPagesPerCrawl: 1500,
      articlesPerMonth: 80,
      maxCompetitors: 20,
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
  // ------- Scale (₹2,49,999/mo) -------
  // National builder with 40-100 projects across multiple cities.
  // Replaces a 3-person in-house marketing team. Daily scan on every
  // microsite, 200 articles, full portal + RERA coverage, custom
  // report templates.
  // Typical COGS: ~$250/mo → ~92% margin.
  scale: {
    key: "scale",
    label: "Scale",
    usd: 3000,
    inr: 249999,
    dodoProductEnv: {
      monthly: "DODO_PRODUCT_SCALE_MONTHLY",
      annual: "DODO_PRODUCT_SCALE_ANNUAL",
    },
    limits: {
      creditsPerMonth: 15000,
      maxProjects: 100,
      maxCities: 10,
      maxPagesPerCrawl: 3000,
      articlesPerMonth: 200,
      maxCompetitors: 50,
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
  // ------- Enterprise (₹5,99,999/mo) -------
  // Top-30 Indian developer — DLF / Prestige / Lodha / Godrej / Sobha /
  // Macrotech / Oberoi. Unlimited everything, daily scans on every
  // microsite, 500 articles, dedicated CSM, custom integrations.
  // Typical COGS: ~$550/mo → ~91% margin.
  enterprise: {
    key: "enterprise",
    label: "Enterprise",
    usd: 7200,
    inr: 599999,
    dodoProductEnv: {
      monthly: "DODO_PRODUCT_ENTERPRISE_MONTHLY",
      annual: "DODO_PRODUCT_ENTERPRISE_ANNUAL",
    },
    limits: {
      creditsPerMonth: 40000,
      maxProjects: -1,
      maxCities: -1,
      maxPagesPerCrawl: 10000,
      articlesPerMonth: 500,
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
  creditsPerMonth: 999999, // demo has no credit ceiling
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
