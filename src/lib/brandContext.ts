/**
 * Brand context completeness.
 *
 * Article-writer fires happily on a half-empty brand context, which
 * produces generic articles that nobody publishes. The completion score
 * gates article generation and surfaces "fill X to unlock better
 * articles" upsell pressure — empty context = empty pipeline = upgrade
 * doesn't justify itself, so this is a retention lever too.
 */

export interface BrandContextInput {
  productInfo?: string;
  brandVoice?: string;
  competitorAnalysis?: string;
  vision?: string;
  values?: string;
  targetAudience?: string;
  marketingStrategy?: string;
  brandAliases?: string;
  brandExclusions?: string;
}

interface FieldDef {
  key: keyof BrandContextInput;
  label: string;
  /** Min character count for this field to count as filled. */
  minLength: number;
  /** Whether the field counts toward the gate threshold. The five
   *  weighted fields are the ones that materially change article output. */
  required: boolean;
  /** One-line "why this matters" the UI can surface. */
  why: string;
}

const FIELDS: FieldDef[] = [
  {
    key: "productInfo",
    label: "Product info",
    minLength: 80,
    required: true,
    why: "Tells the article writer what you actually build — config range, price segments, signature features. Without it, articles read like every other developer's blog.",
  },
  {
    key: "brandVoice",
    label: "Brand voice",
    minLength: 60,
    required: true,
    why: "Without voice samples articles default to generic luxury-real-estate copy. Your CMO won't publish that.",
  },
  {
    key: "vision",
    label: "Vision / positioning",
    minLength: 40,
    required: true,
    why: "Drives the editorial angle on every piece. A heritage-traditional brand and a tech-forward brand should not produce the same article on the same query.",
  },
  {
    key: "targetAudience",
    label: "Target audience",
    minLength: 40,
    required: true,
    why: "First-time buyer copy is wildly different from NRI investor copy. Audience steers tone, evidence, and CTAs.",
  },
  {
    key: "competitorAnalysis",
    label: "Competitor analysis",
    minLength: 40,
    required: true,
    why: "Used by comparison-style articles ('alternatives to X') which are the highest-converting AI-search format.",
  },
  {
    key: "values",
    label: "Values",
    minLength: 30,
    required: false,
    why: "Optional — shapes hallucination-fix articles when AI claims something out of brand.",
  },
  {
    key: "marketingStrategy",
    label: "Marketing strategy",
    minLength: 30,
    required: false,
    why: "Optional — shapes the GBP / portal copy variants.",
  },
];

export interface BrandContextScore {
  /** 0–100 weighted by required fields only. */
  score: number;
  /** Whether article-writer should be allowed to fire. */
  ready: boolean;
  /** Required fields still missing or under their min-length. */
  missing: Array<{ key: string; label: string; why: string; charsHave: number; charsNeed: number }>;
  /** Optional fields not yet filled — UI can suggest these as polish. */
  optionalMissing: Array<{ key: string; label: string; why: string }>;
  /** Filled-and-valid required fields, for the progress bar. */
  filledRequired: number;
  totalRequired: number;
}

/** Article-writer is gated above this score. */
export const READY_THRESHOLD = 70;

function lenOf(v: string | undefined): number {
  return typeof v === "string" ? v.trim().length : 0;
}

export function scoreBrandContext(input: BrandContextInput | null | undefined): BrandContextScore {
  const ctx = input || {};
  const required = FIELDS.filter((f) => f.required);
  const optional = FIELDS.filter((f) => !f.required);

  const missing: BrandContextScore["missing"] = [];
  let filledRequired = 0;

  for (const f of required) {
    const len = lenOf(ctx[f.key]);
    if (len >= f.minLength) {
      filledRequired += 1;
    } else {
      missing.push({
        key: f.key,
        label: f.label,
        why: f.why,
        charsHave: len,
        charsNeed: f.minLength,
      });
    }
  }

  const optionalMissing = optional
    .filter((f) => lenOf(ctx[f.key]) < f.minLength)
    .map((f) => ({ key: f.key, label: f.label, why: f.why }));

  const score = Math.round((filledRequired / required.length) * 100);
  const ready = score >= READY_THRESHOLD;

  return {
    score,
    ready,
    missing,
    optionalMissing,
    filledRequired,
    totalRequired: required.length,
  };
}
