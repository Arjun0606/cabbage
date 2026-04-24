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
  // ------- Solo (₹9,999/mo) -------
  // Local builder with 1-3 projects in one locality. Monthly manual
  // scans, a handful of articles. Cheapest entry so the product is
  // never out of reach for an SEO-curious small developer.
  // Typical COGS: ~$10/mo → >90% margin at ₹9,999.
  solo: {
    key: "solo",
    label: "Solo",
    usd: 120,
    inr: 9999,
    dodoProductEnv: {
      monthly: "DODO_PRODUCT_SOLO_MONTHLY",
      annual: "DODO_PRODUCT_SOLO_ANNUAL",
    },
    limits: {
      creditsPerMonth: 400,
      maxProjects: 3,
      maxCities: 1,
      maxPagesPerCrawl: 200,
      articlesPerMonth: 6,
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
  // ------- Starter (₹29,999/mo) -------
  // Small single-city developer, 5-10 projects. Weekly scans, 15-20
  // articles per month, covers one city's AI visibility.
  // Typical COGS: ~$25/mo → ~93% margin.
  starter: {
    key: "starter",
    label: "Starter",
    usd: 360,
    inr: 29999,
    dodoProductEnv: {
      monthly: "DODO_PRODUCT_STARTER_MONTHLY",
      annual: "DODO_PRODUCT_STARTER_ANNUAL",
    },
    limits: {
      creditsPerMonth: 1200,
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
  // ------- Growth (pro key, ₹79,999/mo) -------
  // Regional multi-city developer, 10-40 projects. Daily full scan
  // included, 40-60 articles/mo, per-city AI visibility, CMO digest,
  // infrastructure-news pipeline.
  // Typical COGS: ~$80/mo → ~93% margin.
  pro: {
    key: "pro",
    label: "Growth",
    usd: 950,
    inr: 79999,
    dodoProductEnv: {
      monthly: "DODO_PRODUCT_PRO_MONTHLY",
      annual: "DODO_PRODUCT_PRO_ANNUAL",
    },
    limits: {
      creditsPerMonth: 4000,
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
  // ------- Scale (₹1,99,999/mo) -------
  // Regional heavyweight / national builder, 40-100 projects across
  // 5-10 cities. Daily scans on every microsite, 100 articles, full
  // portal + RERA coverage, custom report templates.
  // Typical COGS: ~$180/mo → ~92% margin.
  scale: {
    key: "scale",
    label: "Scale",
    usd: 2400,
    inr: 199999,
    dodoProductEnv: {
      monthly: "DODO_PRODUCT_SCALE_MONTHLY",
      annual: "DODO_PRODUCT_SCALE_ANNUAL",
    },
    limits: {
      creditsPerMonth: 12000,
      maxProjects: 100,
      maxCities: 10,
      maxPagesPerCrawl: 3000,
      articlesPerMonth: 120,
      maxCompetitors: 40,
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
  // ------- Enterprise (₹4,99,999/mo) -------
  // DLF / Lodha / Prestige / Godrej / Sobha scale. Unlimited projects,
  // daily full scans on every microsite, 250 articles, dedicated CSM,
  // custom integrations, early access to new features.
  // Typical COGS: ~$400/mo → ~93% margin.
  enterprise: {
    key: "enterprise",
    label: "Enterprise",
    usd: 5999,
    inr: 499999,
    dodoProductEnv: {
      monthly: "DODO_PRODUCT_ENTERPRISE_MONTHLY",
      annual: "DODO_PRODUCT_ENTERPRISE_ANNUAL",
    },
    limits: {
      creditsPerMonth: 35000,
      maxProjects: -1,
      maxCities: -1,
      maxPagesPerCrawl: 10000,
      articlesPerMonth: 300,
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
