/**
 * Query fanout modeling.
 *
 * Foundation Inc's GEO research finds that modern AI search engines
 * (ChatGPT web, Google AIO, Perplexity) don't answer a single prompt —
 * they expand each user query into ~20 internal variations (rephrasing,
 * entity swap, locality micro-shift, intent reshape, config/price
 * variant) and pull sources from every variation, then synthesize.
 *
 * Measuring visibility on only the anchor query is like measuring
 * Google rank for one keyword while ignoring the dozens of long-tail
 * variants that actually drive impressions. A brand mentioned for
 * "best 3BHK in Gachibowli" but absent from "which 3BHK in Gachibowli
 * has the best amenities" has a hidden ceiling — the AI engine's own
 * fanout is where visibility really happens.
 *
 * We:
 *  1. Generate N semantic variants of an anchor query (one LLM pass)
 *  2. Fire each variant through ChatGPT web search (no Gemini by default
 *     — two LLMs per variant would 2x cost for marginal gain)
 *  3. Binary mention check per variant (cheap aiLight call)
 *  4. Return per-variant mention status + aggregate fanout score
 *
 * This is on-demand (button click per golden prompt) because running
 * fanout on every scan for every query would be prohibitively expensive.
 */
import { queryForVisibility, aiLight } from "@/lib/ai";

export interface FanoutVariant {
  query: string;
  /** Why the variant differs — for CMO readability. */
  dimension: "phrasing" | "locality" | "intent" | "config" | "price" | "entity";
  mentioned: boolean;
  /** Sentence from the AI's answer where the brand appears; empty if not mentioned. */
  context: string;
  /** Did we actually fire a real web search (vs. a cheap fallback)? */
  grounded: boolean;
}

export interface FanoutResult {
  anchor: string;
  variants: FanoutVariant[];
  /** % of variants where the brand appears (0-100). */
  fanoutScore: number;
  /** Did the anchor query itself surface the brand in this run? */
  anchorMentioned: boolean;
  /** fanoutScore minus anchorScore — negative means invisible ceiling. */
  gapVsAnchor: number;
  ranAt: string;
}

async function generateVariants(
  anchor: string,
  brand: string,
  city: string,
  variantCount: number,
): Promise<Array<{ query: string; dimension: FanoutVariant["dimension"] }>> {
  const prompt = `You generate AI-search query fanout variants. Real AI engines expand a buyer's prompt into ~20 internal variations before pulling sources. We're simulating that fanout for GEO measurement.

ANCHOR QUERY: "${anchor}"
TARGET BRAND: ${brand}
CITY: ${city || "(unspecified)"}

Produce ${variantCount} distinct semantic variants of the anchor query. Each should test the SAME intent but differ on ONE dimension. Cover this mix when possible:
  - phrasing:  same meaning, different wording (e.g. "best" → "top-rated" → "most recommended")
  - locality:  adjacent micro-locality in the same city corridor (e.g. Gachibowli → Madhapur → Kondapur — IT corridor)
  - intent:    shift the buyer archetype (general → investor → NRI → first-time buyer → family)
  - config:    shift BHK (3BHK → 2BHK or 4BHK)
  - price:     shift the price band (under 1 Cr, 1-2 Cr, premium 2Cr+)
  - entity:    reframe around nearby landmarks, schools, IT parks

Return ONLY JSON, no prose:
{
  "variants": [
    { "query": "...", "dimension": "phrasing" | "locality" | "intent" | "config" | "price" | "entity" }
  ]
}

Rules:
- Variants must still map to the ORIGINAL intent — do not drift topic
- Do not include the brand name in any variant (we want to test unprompted recall)
- Keep each variant under 120 chars
- Use real, commonly-queried phrasings — not academic rewrites
- Max ${variantCount} variants, min 3`;

  try {
    const raw = await aiLight("Generate query fanout variants. Return only valid JSON.", prompt, 600);
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const validDims = ["phrasing", "locality", "intent", "config", "price", "entity"] as const;
    const out: Array<{ query: string; dimension: FanoutVariant["dimension"] }> = [];
    if (Array.isArray(parsed?.variants)) {
      for (const v of parsed.variants) {
        const q = String(v?.query || "").trim();
        const d = validDims.includes(v?.dimension) ? v.dimension : "phrasing";
        if (q.length >= 10 && q.length <= 240 && !q.toLowerCase().includes(brand.toLowerCase())) {
          out.push({ query: q, dimension: d as FanoutVariant["dimension"] });
        }
        if (out.length >= variantCount) break;
      }
    }
    return out;
  } catch {
    return [];
  }
}

async function checkMention(
  response: string,
  brand: string,
  aliases: string[],
): Promise<{ mentioned: boolean; context: string }> {
  if (!response || response.trim().length < 20) {
    return { mentioned: false, context: "" };
  }

  // Fast path — literal substring check with aliases first. Only LLM-escalate
  // if ambiguous. Keeps fanout cheap (fanout = many calls).
  const haystack = response.toLowerCase();
  const needles = [brand, ...aliases].filter((n) => n && n.trim().length >= 3);
  for (const n of needles) {
    const hit = haystack.indexOf(n.toLowerCase());
    if (hit >= 0) {
      // Grab ~200 char window around the hit as the context sentence
      const start = Math.max(0, hit - 80);
      const end = Math.min(response.length, hit + n.length + 120);
      const window = response.slice(start, end).replace(/\s+/g, " ").trim();
      return { mentioned: true, context: window.slice(0, 300) };
    }
  }

  // Nothing literal — the brand didn't appear. Don't escalate to LLM;
  // false negatives on edge spellings are less bad than doubling cost
  // across 20+ fanout variants.
  return { mentioned: false, context: "" };
}

export async function runQueryFanout(
  anchor: string,
  brand: string,
  aliases: string[] = [],
  city: string = "",
  variantCount: number = 5,
): Promise<FanoutResult> {
  const ranAt = new Date().toISOString();

  const variantSpecs = await generateVariants(anchor, brand, city, variantCount);
  if (variantSpecs.length === 0) {
    return {
      anchor,
      variants: [],
      fanoutScore: 0,
      anchorMentioned: false,
      gapVsAnchor: 0,
      ranAt,
    };
  }

  // Fire every variant in parallel. OpenAI Responses API web_search
  // handles this fine; Gemini would rate-limit harder, which is why
  // we only use ChatGPT here.
  const variants: FanoutVariant[] = await Promise.all(
    variantSpecs.map(async ({ query, dimension }) => {
      const { text, source } = await queryForVisibility("openai", query).catch(() => ({ text: "", source: "failed" as const }));
      const grounded = source === "web_search" || source === "grounded";
      const { mentioned, context } = await checkMention(text, brand, aliases);
      return { query, dimension, mentioned, context, grounded };
    })
  );

  // Also re-run the anchor so the user sees a consistent comparison within
  // this one fanout snapshot (avoids the "it was mentioned in last scan but
  // not now, confusing!" mismatch).
  const { text: anchorText, source: anchorSource } = await queryForVisibility("openai", anchor).catch(() => ({ text: "", source: "failed" as const }));
  const anchorCheck = await checkMention(anchorText, brand, aliases);

  const fanoutScore = variants.length > 0
    ? Math.round((variants.filter((v) => v.mentioned).length / variants.length) * 100)
    : 0;
  const anchorScore = anchorCheck.mentioned ? 100 : 0;

  return {
    anchor,
    variants,
    fanoutScore,
    anchorMentioned: anchorCheck.mentioned,
    gapVsAnchor: fanoutScore - anchorScore,
    ranAt,
  };
}
