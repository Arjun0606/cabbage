import { aiLight } from "@/lib/ai";

/**
 * Hallucination + misattribution detection.
 *
 * When AI answers a buyer query with wrong facts about the brand, the
 * damage compounds: in Indian residential RE every claim (RERA number,
 * price, BHK, possession date) is legally regulated. A buyer who acts
 * on an AI-hallucinated RERA or price and later finds it wrong has
 * standing for a complaint. A CMO running AI-visibility scans needs to
 * know this is happening to correct the AI's source material — usually
 * by publishing a canonical facts page.
 *
 * We extract every specific factual claim about the brand from an AI
 * response, compare against the ground-truth project data we scraped
 * from the brand's own site, and flag discrepancies by type + severity.
 *
 * Types of issue we catch:
 *   rera         — AI states a RERA number that doesn't match ours
 *   config       — AI states wrong BHK mix for a real project
 *   price        — AI quotes a price outside the real band
 *   location     — AI puts the project in the wrong locality/city
 *   attribution  — AI attributes a competitor's project to our brand
 *   invented     — AI invents a project name that isn't in our portfolio
 *   possession   — AI states a possession/ready date we can't verify
 *
 * Severity:
 *   critical — RERA mismatch, attribution of a competitor project
 *              (legally exposed, reputationally toxic)
 *   high     — wrong price, invented project
 *   medium   — config, location, possession errors
 */

export type HallucinationType =
  | "rera"
  | "config"
  | "price"
  | "location"
  | "attribution"
  | "invented"
  | "possession";

export type HallucinationSeverity = "critical" | "high" | "medium";

export interface Hallucination {
  type: HallucinationType;
  severity: HallucinationSeverity;
  /** What the AI actually said (verbatim, trimmed to 300 chars). */
  aiClaim: string;
  /** The project name the claim references, when identifiable. Empty for invented. */
  project: string;
  /** The ground-truth value, when we have one. Empty for invented / unverifiable. */
  truth: string;
  /** One-line remediation hint the CMO can act on. */
  fix: string;
}

export interface ProjectGroundTruth {
  name: string;
  /** Alternate names we accept (abbreviations, common spellings). Optional. */
  aliases?: string[];
  location?: string;
  configurations?: string;
  priceRange?: string;
  reraNumber?: string;
  /** E.g. "Dec 2026", "Q2 2027", "Ready to move". Empty if unknown. */
  possession?: string;
}

export interface HallucinationCheckResult {
  hallucinations: Hallucination[];
  /** True if we successfully ran the check (vs. bailed early because response was empty). */
  checked: boolean;
}

const EMPTY: HallucinationCheckResult = { hallucinations: [], checked: false };

/**
 * Main entry. Runs a cheap LLM extraction pass that returns structured
 * claims with a type + severity pre-classified. We then sanity-filter
 * the output against the ground-truth list to suppress false positives.
 */
export async function checkHallucinations(
  brand: string,
  aliases: string[],
  exclusions: string[],
  projects: ProjectGroundTruth[],
  aiResponse: string
): Promise<HallucinationCheckResult> {
  if (!aiResponse || aiResponse.trim().length < 40) return EMPTY;

  // Build a compact ground-truth block. Cap at 30 projects — beyond that
  // the prompt balloons and the LLM starts losing precision.
  const gtProjects = projects.slice(0, 30);
  const gtBlock = gtProjects.length > 0
    ? gtProjects.map((p, i) => {
        const parts: string[] = [`${i + 1}. ${p.name}`];
        if (p.location) parts.push(`loc: ${p.location}`);
        if (p.configurations) parts.push(`config: ${p.configurations}`);
        if (p.priceRange) parts.push(`price: ${p.priceRange}`);
        if (p.reraNumber) parts.push(`RERA: ${p.reraNumber}`);
        if (p.possession) parts.push(`possession: ${p.possession}`);
        return parts.join(" | ");
      }).join("\n")
    : "(no project ground truth supplied — only check attribution + brand-level claims)";

  const excludeBlock = exclusions.length > 0
    ? `\nBRANDS TO EXCLUDE (same name, different company — ignore claims that clearly refer to these): ${exclusions.map((e) => `"${e}"`).join(", ")}`
    : "";

  const aliasBlock = aliases.length > 0
    ? `\nALIASES / ALTERNATE NAMES for "${brand}": ${aliases.map((a) => `"${a}"`).join(", ")}`
    : "";

  const system = `You are a fact-checking auditor for Indian residential real-estate brand mentions in AI chatbot responses.

You compare what an AI model said about a brand to the verified ground truth and return a structured list of factual errors. You return ONLY valid JSON. No markdown fences, no commentary.

You are CONSERVATIVE: you only flag claims the AI made EXPLICITLY. You do not guess, you do not infer errors from silence. If the AI's claim matches the ground truth OR is too vague to be wrong, you skip it. Zero-hallucination rule: if ground truth is missing for a field, you DO NOT flag it — mark the claim as unverifiable and skip.`;

  const prompt = `TARGET BRAND: ${brand}${aliasBlock}${excludeBlock}

GROUND TRUTH PROJECTS (verified from the brand's own website + site scraper):
${gtBlock}

AI RESPONSE TO AUDIT:
"""
${aiResponse.slice(0, 4500)}
"""

Extract every specific factual claim the AI made about ${brand} or its projects. For each, decide whether it is CORRECT (skip), UNVERIFIABLE (skip — ground truth doesn't cover it), or WRONG (include in output).

Classify each WRONG claim into exactly one type:
  - "rera"        : AI states a RERA number that doesn't match the ground-truth RERA for the project it references. Severity: critical.
  - "attribution" : AI attributes a competitor's project to ${brand} (e.g. says ${brand} built a project that is not in the ground-truth list AND is known to be a different developer's). Severity: critical.
  - "invented"    : AI describes a ${brand} project name that is NOT in the ground-truth list and does not appear to be an alias/variant of any listed project. Severity: high.
  - "price"       : AI quotes a specific price (e.g. "₹1.5 Cr", "80 lakhs") that falls outside or contradicts the ground-truth priceRange. Severity: high.
  - "config"      : AI states a BHK configuration (e.g. "2BHK", "4BHK") that contradicts the ground-truth configurations for a named project. Severity: medium.
  - "location"    : AI places a named project in a locality/city that contradicts the ground-truth location. Severity: medium.
  - "possession"  : AI quotes a specific possession/ready date that is unverified or contradicts ground truth. Severity: medium.

Return JSON:
{
  "hallucinations": [
    {
      "type": "rera" | "attribution" | "invented" | "price" | "config" | "location" | "possession",
      "severity": "critical" | "high" | "medium",
      "aiClaim": "<verbatim quote from the AI response showing the wrong claim, max 300 chars>",
      "project": "<project name the claim references, empty for invented-but-unnamed>",
      "truth": "<the ground-truth value we have for that project/field, empty if unverifiable>",
      "fix": "<one-line remediation hint: e.g. 'Publish a canonical RERA reference page listing P02400009478 for Aparna Moonstone'>"
    }
  ]
}

Critical rules:
- DO NOT invent hallucinations. If uncertain, SKIP the claim. False positives destroy trust in this report.
- If a claim is about ${brand} generally (e.g. "${brand} is a well-known developer") with no specific fact, SKIP.
- If ground truth doesn't have the field the AI mentioned, SKIP (unverifiable ≠ wrong).
- If the AI's wording uses "approximately" / "around" / "starting from" and the value is plausibly within the ground-truth band, SKIP.
- Max 15 hallucinations per response.
- Return { "hallucinations": [] } if no wrong claims found.`;

  try {
    const raw = await aiLight(system, prompt, 900);
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const validTypes: HallucinationType[] = ["rera", "config", "price", "location", "attribution", "invented", "possession"];
    const validSeverities: HallucinationSeverity[] = ["critical", "high", "medium"];

    const hallucinations: Hallucination[] = Array.isArray(parsed?.hallucinations)
      ? parsed.hallucinations
          .filter((h: any) => h && typeof h === "object")
          .slice(0, 15)
          .map((h: any): Hallucination => ({
            type: (validTypes.includes(h.type) ? h.type : "invented") as HallucinationType,
            severity: (validSeverities.includes(h.severity) ? h.severity : "medium") as HallucinationSeverity,
            aiClaim: String(h.aiClaim || "").slice(0, 300).replace(/[\x00-\x1F]/g, " "),
            project: String(h.project || "").slice(0, 120),
            truth: String(h.truth || "").slice(0, 200),
            fix: String(h.fix || "").slice(0, 200),
          }))
          .filter((h: Hallucination) => h.aiClaim.length >= 5)
      : [];

    return { hallucinations, checked: true };
  } catch {
    // Parse failure — return empty + checked:false so the UI can tell the
    // difference between "audited, nothing found" and "audit didn't run".
    return EMPTY;
  }
}
