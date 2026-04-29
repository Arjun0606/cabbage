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
 * Three-tier ladder sized for indie SaaS founders, Shopify and
 * independent ecom store owners, and small marketing teams. Self-
 * serve only — no enterprise tier, no custom contracts, no demo
 * call required. Even people inside larger orgs can pay $49 on a
 * personal card and use the tool unofficially.
 *
 * Pricing (post 2026-04-29 pivot from RE-specific INR pricing):
 *   Starter $49/mo  — indie founder, single Shopify store, freelance marketer
 *   Growth  $199/mo — small team, multi-product SaaS, 5-10 brand SKUs
 *   Scale   $599/mo — agencies, multi-brand operators, power users
 *
 * Limits keep the RE-era field names (maxProjects, maxCities, etc.)
 * for backward compatibility with downstream enforcement code, but
 * semantically:
 *   maxProjects   ≡ max tracked SITES per workspace
 *   maxCities     ≡ effectively unlimited geos (no longer gates)
 * These will be cleaned up in pivot.21 alongside the schema rename
 * (companies+projects → sites). For now the shape is preserved so
 * surviving routes (e.g. /api/plan-recommendation) keep compiling
 * without a touch.
 *
 * Legacy keys retained:
 *   "starter"   unchanged
 *   "pro"       display label "Growth"
 *   "scale"     agencies / multi-brand
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
  // ------- Starter ($49/mo) -------
  // Indie SaaS founder, single Shopify store, freelance marketer.
  // Pays on a personal card. Wants to know if they're recommended
  // by AI engines and ship the schema/FAQ/article fixes.
  // Typical COGS: ~$5/mo → ~90% margin.
  starter: {
    key: "starter",
    label: "Starter",
    usd: 49,
    inr: 4099,
    dodoProductEnv: {
      monthly: "DODO_PRODUCT_STARTER_MONTHLY",
      annual: "DODO_PRODUCT_STARTER_ANNUAL",
    },
    limits: {
      creditsPerMonth: 500,
      maxProjects: 3,
      maxCities: 999,
      maxPagesPerCrawl: 200,
      articlesPerMonth: 15,
      maxCompetitors: 5,
      reviewMonitorFrequency: "weekly",
      fullScanCadence: "weekly",
      aiVisibilityCadence: "daily",
    },
  },
  // ------- Growth ($199/mo) -------
  // Small marketing team at a Series Seed/A SaaS, multi-product
  // operator, midsize ecom brand. Wants competitor alerts, push
  // notifications on visibility drops, deeper monthly content
  // throughput. The sweet spot.
  // Typical COGS: ~$20/mo → ~90% margin.
  pro: {
    key: "pro",
    label: "Growth",
    usd: 199,
    inr: 16599,
    dodoProductEnv: {
      monthly: "DODO_PRODUCT_PRO_MONTHLY",
      annual: "DODO_PRODUCT_PRO_ANNUAL",
    },
    limits: {
      creditsPerMonth: 2500,
      maxProjects: 10,
      maxCities: 999,
      maxPagesPerCrawl: 1000,
      articlesPerMonth: 80,
      maxCompetitors: 20,
      reviewMonitorFrequency: "daily",
      fullScanCadence: "daily",
      aiVisibilityCadence: "daily",
    },
  },
  // ------- Scale ($599/mo) -------
  // Agencies serving SMBs, multi-brand operators, content-driven
  // teams that publish weekly. Priority execution queue, API access
  // (when shipped). Not enterprise — no custom pricing above this.
  // Typical COGS: ~$60/mo → ~90% margin.
  scale: {
    key: "scale",
    label: "Scale",
    usd: 599,
    inr: 49899,
    dodoProductEnv: {
      monthly: "DODO_PRODUCT_SCALE_MONTHLY",
      annual: "DODO_PRODUCT_SCALE_ANNUAL",
    },
    limits: {
      creditsPerMonth: 10000,
      maxProjects: 50,
      maxCities: 999,
      maxPagesPerCrawl: 3000,
      articlesPerMonth: 300,
      maxCompetitors: 100,
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
 * pricing page advertises. Returns USD by default (the pivot price
 * surface). Pass currency: "inr" for INR-equivalent display.
 */
export function tierPrice(
  tier: TierDef,
  billed: PlanBilled,
  currency: "usd" | "inr" = "usd",
): number {
  const base = currency === "inr" ? tier.inr : tier.usd;
  return billed === "annual" ? Math.round(base * 0.8) : base;
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
