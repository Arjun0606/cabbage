/**
 * Pricing tiers — single source of truth.
 *
 * Both the pricing page marketing copy AND the server-side enforcement
 * in the API routes derive their numbers from this file. Change a
 * limit here and it flows everywhere (checkout, cap checks, the
 * "you've hit the limit" nudges, the /api/billing/status response).
 *
 * Tier selection is driven by `subscriptions.plan` in Supabase. Values:
 *   "starter" | "pro" | "scale"    active paid tiers
 *   "demo"                          demo cookie — unlimited
 *   anything else (including "none", null) → no access (paywall)
 */

/**
 * Three-tier ladder sized so the product fits a serious single-city
 * developer all the way up to a regional multi-city builder. Every
 * tier is designed for >92% gross margin — the credit pool is sized
 * so a typical customer's real COGS (OpenAI web_search + article
 * writing) stays well under 10% of list price.
 *
 * Starter (₹49,999) is the floor: this is a paid tool for serious
 * marketing teams, not a freemium hobby SKU. Anyone smaller than
 * Starter isn't our ICP — they don't pay for marketing services.
 *
 * The previous Enterprise tier (₹5,99,999, 500 articles/mo, 10K-page
 * crawl) was removed 2026-04-26 because the underlying infrastructure
 * (single-click article generation, 5-min Vercel function timeout
 * crawler) couldn't reliably deliver those headline volumes. Top tier
 * is Scale; anything beyond is a custom contract + build-out, not a
 * pricing-page SKU.
 *
 * Legacy keys retained for backward compatibility with existing
 * Supabase `subscriptions.plan` rows:
 *   "starter"   unchanged
 *   "pro"       display label "Growth"
 *   "scale"     national / multi-city builder
 */
export type PlanTier = "starter" | "pro" | "scale";
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
  /** Full-site scan cadence (audit + technical + backlinks + site-crawl).
   *  "weekly" blocks re-scans within 7 days. */
  fullScanCadence: "weekly" | "daily";
  /** AI visibility scan cadence. "weekly" blocks re-scans within 7 days. */
  aiVisibilityCadence: "weekly" | "daily";
}

/**
 * Cabbge's pricing model is volume-only. Every paid tier gets the
 * full feature surface (CMO digest, infra news, per-city AI vis,
 * custom report templates, brand disambiguation, hallucination
 * correction outreach, scheduled auto-scans, expanded golden prompts).
 * What differs between tiers is HOW MUCH the customer can do —
 * articlesPerMonth, maxProjects, creditsPerMonth, scan cadence, etc.
 *
 * If you're tempted to add a per-tier feature flag, don't. Either
 * make it universal across all paid tiers, or scale its cost via
 * the credit pool (the soft ceiling that already encodes volume).
 */

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
      fullScanCadence: "weekly",
      aiVisibilityCadence: "daily",
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
      fullScanCadence: "daily",
      aiVisibilityCadence: "daily",
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
      fullScanCadence: "daily",
      aiVisibilityCadence: "daily",
    },
  },
};

/**
 * Demo-mode limits — the sales demo cookie grants unrestricted access
 * so prospects see the full product. We mirror Scale (the top tier)
 * but lift the volume caps so demos never hit a "limit reached" wall.
 */
export const DEMO_LIMITS: TierLimits = {
  ...TIERS.scale.limits,
  creditsPerMonth: 999999, // demo has no credit ceiling
  maxProjects: 9999,
  maxCities: 9999,
  maxCompetitors: 9999,
  // demo also bypasses cadence gates so the sales pitch never shows
  // "wait 7 days to re-scan" during a live demo
  fullScanCadence: "daily",
  aiVisibilityCadence: "daily",
  reviewMonitorFrequency: "daily",
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
  return !!plan && (plan === "starter" || plan === "pro" || plan === "scale");
}
