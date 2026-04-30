import type { Vertical } from "@/lib/agents/classifier";
import type { QueryWithMeta } from "@/lib/agents/localityEngine";

/**
 * Vertical-aware prompt packs for the public grader and (later)
 * for paid scans. Replaces the RE-specific localityEngine query
 * generator for non-RE customers — though the localityEngine file
 * itself stays until pivot.18 (still imported by RE-era panels).
 *
 * Each pack returns QueryWithMeta in the shape the existing
 * runAIVisibility() expects: { query, level, intent }. We set
 * level: "country" for everything (the locality concept doesn't
 * apply to most SMB customers) and pass intent as an enum cabbage
 * already understands.
 */

export interface PromptPackInput {
  brand: string;
  /** What the user would search for — "CRM software", "wireless earbuds". */
  category: string;
  /** Alternate brand spellings for disambiguation. */
  aliases?: string[];
  /** Known competitors — seed comparison queries. */
  competitors?: string[];
}

const SAAS_PERSONAS = [
  "solo founders",
  "small teams",
  "startups",
  "remote teams",
  "non-technical users",
  "developers",
  "agencies",
];

const SAAS_USECASES = [
  "getting started quickly",
  "scaling to thousands of users",
  "integrating with existing tools",
  "handling high-volume workflows",
];

function buildSaasPack(input: PromptPackInput): QueryWithMeta[] {
  const category = input.category || "software";
  const brand = input.brand;
  const competitors = input.competitors || [];
  const pack: QueryWithMeta[] = [];

  for (const persona of SAAS_PERSONAS) {
    pack.push({
      query: `best ${category} for ${persona}`,
      level: "country",
      intent: "research",
    });
  }
  pack.push({
    query: `top-rated ${category} in 2026`,
    level: "country",
    intent: "research",
  });
  pack.push({
    query: `most recommended ${category} right now`,
    level: "country",
    intent: "research",
  });
  for (const uc of SAAS_USECASES) {
    pack.push({
      query: `${category} for ${uc}`,
      level: "country",
      intent: "research",
    });
  }
  for (const comp of competitors) {
    pack.push({
      query: `${brand} vs ${comp}`,
      level: "country",
      intent: "comparison",
    });
    pack.push({
      query: `${comp} alternatives`,
      level: "country",
      intent: "comparison",
    });
  }
  pack.push({ query: `is ${brand} any good`, level: "country", intent: "research" });
  pack.push({ query: `${brand} review`, level: "country", intent: "research" });
  pack.push({ query: `${brand} pricing`, level: "country", intent: "research" });
  pack.push({ query: `${brand} alternatives`, level: "country", intent: "comparison" });
  pack.push({
    query: `${category} with free tier`,
    level: "country",
    intent: "research",
  });
  pack.push({
    query: `${category} with API`,
    level: "country",
    intent: "research",
  });

  return pack;
}

const ECOM_USECASES = [
  "everyday use",
  "travel",
  "gifting",
  "heavy-duty use",
  "beginners",
  "professionals",
];

const ECOM_PRICE_BANDS = [
  "budget",
  "under $50",
  "under $100",
  "premium",
];

function buildEcomPack(input: PromptPackInput): QueryWithMeta[] {
  const category = input.category || "products";
  const brand = input.brand;
  const competitors = input.competitors || [];
  const pack: QueryWithMeta[] = [];

  pack.push({ query: `best ${category} in 2026`, level: "country", intent: "research" });
  pack.push({ query: `most popular ${category} right now`, level: "country", intent: "research" });
  pack.push({ query: `top-rated ${category}`, level: "country", intent: "research" });

  for (const uc of ECOM_USECASES) {
    pack.push({
      query: `best ${category} for ${uc}`,
      level: "country",
      intent: "research",
    });
  }
  for (const band of ECOM_PRICE_BANDS) {
    pack.push({
      query: `best ${category} ${band}`,
      level: "country",
      intent: "research",
    });
  }
  for (const comp of competitors) {
    pack.push({
      query: `${brand} vs ${comp}`,
      level: "country",
      intent: "comparison",
    });
  }
  pack.push({ query: `${brand} review`, level: "country", intent: "research" });
  pack.push({ query: `is ${brand} legit`, level: "country", intent: "research" });
  pack.push({ query: `${brand} return policy`, level: "country", intent: "research" });
  pack.push({ query: `${brand} alternatives`, level: "country", intent: "comparison" });
  pack.push({
    query: `where to buy ${category} online`,
    level: "country",
    intent: "research",
  });
  pack.push({
    query: `${category} with fast shipping`,
    level: "country",
    intent: "research",
  });

  return pack;
}

// ---------- LOCAL SERVICE pack (RE developers, law firms, clinics, restaurants, agencies) ----------
//
// Real-estate developers like Urbanrise / Navanaami / Sobha land
// here. The buyer's prompts look completely different from SaaS:
// city + locality + budget + buyer-segment intent. Falling back to
// the SaaS pack ("best X for solo founders") is a demo killer.

const LOCAL_BUYER_INTENTS = [
  "first-time buyers",
  "NRI investors",
  "families",
  "young professionals",
  "investment buyers",
  "luxury buyers",
];

function buildLocalServicePack(input: PromptPackInput): QueryWithMeta[] {
  const category = input.category || "businesses";
  const brand = input.brand;
  const competitors = input.competitors || [];
  const pack: QueryWithMeta[] = [];

  // Pure category prompts — what would a buyer ask without naming you?
  pack.push({ query: `best ${category} in 2026`, level: "country", intent: "research" });
  pack.push({ query: `top-rated ${category}`, level: "country", intent: "research" });
  pack.push({ query: `most trusted ${category}`, level: "country", intent: "research" });
  pack.push({ query: `${category} reviews`, level: "country", intent: "research" });

  // Buyer-segment intent prompts.
  for (const intent of LOCAL_BUYER_INTENTS) {
    pack.push({
      query: `best ${category} for ${intent}`,
      level: "country",
      intent: "research",
    });
  }

  // Brand-direct prompts.
  pack.push({ query: `${brand} review`, level: "country", intent: "research" });
  pack.push({ query: `is ${brand} reliable`, level: "country", intent: "research" });
  pack.push({ query: `${brand} reputation`, level: "country", intent: "research" });
  pack.push({ query: `${brand} customer experience`, level: "country", intent: "research" });

  // Comparison prompts.
  for (const comp of competitors) {
    pack.push({
      query: `${brand} vs ${comp}`,
      level: "country",
      intent: "comparison",
    });
  }

  return pack;
}

// ---------- APP pack (mobile / desktop apps) ----------
function buildAppPack(input: PromptPackInput): QueryWithMeta[] {
  const category = input.category || "apps";
  const brand = input.brand;
  const competitors = input.competitors || [];
  const pack: QueryWithMeta[] = [];

  pack.push({ query: `best ${category} for iPhone`, level: "country", intent: "research" });
  pack.push({ query: `best ${category} for Android`, level: "country", intent: "research" });
  pack.push({ query: `top-rated ${category} 2026`, level: "country", intent: "research" });
  pack.push({ query: `most downloaded ${category}`, level: "country", intent: "research" });
  pack.push({ query: `${category} with no ads`, level: "country", intent: "research" });
  pack.push({ query: `free ${category}`, level: "country", intent: "research" });
  pack.push({ query: `${category} that actually works`, level: "country", intent: "research" });
  pack.push({ query: `${brand} review`, level: "country", intent: "research" });
  pack.push({ query: `${brand} alternatives`, level: "country", intent: "comparison" });
  pack.push({ query: `is ${brand} worth it`, level: "country", intent: "research" });
  for (const comp of competitors) {
    pack.push({
      query: `${brand} vs ${comp}`,
      level: "country",
      intent: "comparison",
    });
  }
  return pack;
}

// ---------- MEDIA pack (publishers, newsletters, blogs) ----------
function buildMediaPack(input: PromptPackInput): QueryWithMeta[] {
  const category = input.category || "publication";
  const brand = input.brand;
  const competitors = input.competitors || [];
  const pack: QueryWithMeta[] = [];

  pack.push({ query: `best ${category} to follow`, level: "country", intent: "research" });
  pack.push({ query: `top ${category} writers`, level: "country", intent: "research" });
  pack.push({ query: `most respected ${category}`, level: "country", intent: "research" });
  pack.push({ query: `expert sources for ${category}`, level: "country", intent: "research" });
  pack.push({ query: `${category} newsletter recommendations`, level: "country", intent: "research" });
  pack.push({ query: `${brand} review`, level: "country", intent: "research" });
  pack.push({ query: `is ${brand} reliable`, level: "country", intent: "research" });
  pack.push({ query: `${brand} bias`, level: "country", intent: "research" });
  pack.push({ query: `${brand} alternatives`, level: "country", intent: "comparison" });
  for (const comp of competitors) {
    pack.push({
      query: `${brand} vs ${comp}`,
      level: "country",
      intent: "comparison",
    });
  }
  return pack;
}

const PACKS: Partial<Record<Vertical, (input: PromptPackInput) => QueryWithMeta[]>> = {
  saas: buildSaasPack,
  ecommerce: buildEcomPack,
  marketplace: buildEcomPack,
  local_service: buildLocalServicePack,
  app: buildAppPack,
  media: buildMediaPack,
};

// Category-string heuristics for when the classifier returns
// vertical: "unknown" but the category string still tells us what
// the business is. Caught by Urbanrise — vertical came back unknown
// but category was "Sustainable Real Estate", which obviously
// belongs in local_service, not the SaaS fallback.
function inferVerticalFromCategory(
  vertical: Vertical,
  category: string,
): Vertical {
  if (vertical !== "unknown") return vertical;
  const c = category.toLowerCase();
  if (
    /\b(real estate|property|properties|developer|builder|construction|homes|apartments|villas|residence|housing|realty)\b/.test(
      c,
    )
  )
    return "local_service";
  if (
    /\b(law firm|lawyers|attorneys|legal services|clinic|hospital|dental|salon|spa|restaurant|cafe|hotel|agency|consulting|consultants)\b/.test(
      c,
    )
  )
    return "local_service";
  if (/\b(app|mobile)\b/.test(c)) return "app";
  if (/\b(magazine|newsletter|blog|publication|media)\b/.test(c))
    return "media";
  if (/\b(store|shop|products|goods|marketplace)\b/.test(c)) return "ecommerce";
  if (/\b(software|saas|platform|tool|api)\b/.test(c)) return "saas";
  return "unknown";
}

export function buildPackFor(
  vertical: Vertical,
  input: PromptPackInput,
): QueryWithMeta[] {
  const effectiveVertical = inferVerticalFromCategory(
    vertical,
    input.category || "",
  );
  const generator = PACKS[effectiveVertical] ?? buildSaasPack;

  // Sanitize category — if classifier failed to read the homepage
  // (typical for SPA shells with 0 words in raw HTML) it returns
  // "unknown" or empty. Substituting "unknown" verbatim into prompts
  // produces nonsense like "best unknown for solo founders". Fall
  // back to a vertical-appropriate generic phrasing instead.
  const cleanCategory =
    !input.category ||
    input.category.toLowerCase().trim() === "unknown" ||
    input.category.trim() === ""
      ? effectiveVertical === "ecommerce" || effectiveVertical === "marketplace"
        ? "products"
        : effectiveVertical === "local_service"
          ? "businesses"
          : effectiveVertical === "app"
            ? "apps"
            : effectiveVertical === "media"
              ? "publications"
              : "software"
      : input.category;

  return generator({ ...input, category: cleanCategory });
}

export {
  buildSaasPack,
  buildEcomPack,
  buildLocalServicePack,
  buildAppPack,
  buildMediaPack,
};
