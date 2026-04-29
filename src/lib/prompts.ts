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

const PACKS: Partial<Record<Vertical, (input: PromptPackInput) => QueryWithMeta[]>> = {
  saas: buildSaasPack,
  ecommerce: buildEcomPack,
  marketplace: buildEcomPack,
};

export function buildPackFor(
  vertical: Vertical,
  input: PromptPackInput,
): QueryWithMeta[] {
  const generator = PACKS[vertical] ?? buildSaasPack;
  return generator(input);
}

export { buildSaasPack, buildEcomPack };
