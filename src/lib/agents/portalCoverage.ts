/**
 * Portal coverage audit.
 *
 * The Authority card's "Portal Listings N/5" counter used to mean "how
 * many portals do we have listing-copy generated for" — not "how many
 * portals actually list your brand". The latter is what a CMO wants to
 * see; the former is an internal pipeline metric.
 *
 * This module runs a web-search grounded check per portal to find the
 * brand's real listing presence. Every claim is backed by a URL the
 * auditor returned, so we never fabricate coverage.
 *
 * Why this matters: 99acres, MagicBricks, Housing, NoBroker, and
 * CommonFloor together own the buyer-intent middle of the funnel in
 * Indian RE. AI answers cite these portals on 35-40% of "best X in Y"
 * queries (Foundation Inc's portal-share finding). A developer listed
 * on 5/5 compounds into AI citations; a developer listed on 2/5 caps
 * their AI ceiling no matter how good their own site is.
 */
import { queryForVisibility, aiLight } from "@/lib/ai";
import { getTopIndianPropertyPortals, type PropertyPortal } from "@/lib/marketKnowledge";

export interface PortalCoverageEntry {
  portal: string;
  domain: string;
  status: "listed" | "missing" | "unknown";
  /** Best canonical URL for the brand's listing page on this portal. */
  citationUrl?: string;
  /** Approximate listing count surfaced by web search (e.g., "12+ projects"). */
  listingHint?: string;
  /** One-line reason when status is "missing" or "unknown". */
  note?: string;
  checkedAt: string;
}

export interface PortalCoverageResult {
  entries: PortalCoverageEntry[];
  /** Count of portals confirmed to list the brand. */
  listed: number;
  /** Total portals checked. */
  total: number;
  /** Portals we tried but couldn't verify (counted separately from missing). */
  unknown: number;
  /** When the scan ran. */
  ranAt: string;
  /**
   * - ok         real web search worked on every portal
   * - degraded   some checks fell back to non-grounded answers
   * - unavailable no web search available — results shouldn't be trusted
   */
  source: "ok" | "degraded" | "unavailable";
}

async function checkOne(portal: PropertyPortal, brand: string, city: string): Promise<PortalCoverageEntry> {
  const query = `Search the web. Does the property portal ${portal.domain} have any current listings for the Indian residential real-estate developer "${brand}"${city ? ` in ${city}` : ""}? If yes, give me the canonical page URL on ${portal.domain} that lists their projects and an approximate count (e.g. "8 projects listed"). If no, say so explicitly.`;

  const { text, source } = await queryForVisibility("openai", query);
  const checkedAt = new Date().toISOString();

  if (!text || source === "missing_key" || source === "failed") {
    return {
      portal: portal.name,
      domain: portal.domain,
      status: "unknown",
      note: "Web search unavailable for this check",
      checkedAt,
    };
  }

  // Cheap extraction pass — keep this deterministic so the UI can
  // render an auditable row. Prompt the smaller model for structure.
  const parsePrompt = `The following is a web-search answer about whether "${brand}" is listed on the Indian property portal ${portal.domain}. Extract a structured summary.

WEB SEARCH ANSWER:
"""
${text.slice(0, 2500)}
"""

Return ONLY JSON:
{
  "status": "listed" | "missing" | "unknown",
  "citationUrl": "<a URL on ${portal.domain} that proves the listing, empty string if none>",
  "listingHint": "<short phrase like '8 projects' or '50+ listings', empty string if not stated>",
  "note": "<one short sentence summary; under 120 chars>"
}

Rules:
- "listed" ONLY if the answer explicitly confirms at least one current ${brand} listing AND provides a URL that contains "${portal.domain}".
- "missing" if the answer says no listings were found or the brand is absent.
- "unknown" if the answer is evasive, hallucinated, or didn't actually search.
- citationUrl must be a real URL visible in the answer. If uncertain, leave empty and set status to "unknown".`;

  try {
    const raw = await aiLight("Extract structured data from a web-search answer. Return only JSON.", parsePrompt, 400);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return {
        portal: portal.name,
        domain: portal.domain,
        status: "unknown",
        note: "Parse failed",
        checkedAt,
      };
    }
    const parsed = JSON.parse(match[0]) as {
      status?: string;
      citationUrl?: string;
      listingHint?: string;
      note?: string;
    };

    let status: PortalCoverageEntry["status"] =
      parsed.status === "listed" || parsed.status === "missing" ? parsed.status : "unknown";
    const citationUrl = typeof parsed.citationUrl === "string" ? parsed.citationUrl.trim() : "";
    const hasDomain = citationUrl.toLowerCase().includes(portal.domain.toLowerCase());

    // Guardrail — "listed" requires a URL on the portal's own domain.
    // Prevents the LLM from declaring a match based on a Google snippet.
    if (status === "listed" && !hasDomain) {
      status = "unknown";
    }

    return {
      portal: portal.name,
      domain: portal.domain,
      status,
      citationUrl: hasDomain ? citationUrl : undefined,
      listingHint: typeof parsed.listingHint === "string" && parsed.listingHint.trim()
        ? parsed.listingHint.trim().slice(0, 80)
        : undefined,
      note: typeof parsed.note === "string" ? parsed.note.trim().slice(0, 160) : undefined,
      checkedAt,
    };
  } catch {
    return {
      portal: portal.name,
      domain: portal.domain,
      status: "unknown",
      note: "Parse error",
      checkedAt,
    };
  }
}

export async function runPortalCoverage(brand: string, city: string): Promise<PortalCoverageResult> {
  const ranAt = new Date().toISOString();
  const portals = await getTopIndianPropertyPortals();

  if (portals.length === 0) {
    return {
      entries: [],
      listed: 0,
      total: 0,
      unknown: 0,
      ranAt,
      source: "unavailable",
    };
  }

  // Run in parallel — 5-7 web searches. Slightly slower than a single
  // call but every row becomes independently audited.
  const entries = await Promise.all(portals.slice(0, 7).map((p) => checkOne(p, brand, city)));

  const listed = entries.filter((e) => e.status === "listed").length;
  const unknown = entries.filter((e) => e.status === "unknown").length;

  const source: PortalCoverageResult["source"] =
    unknown === 0 ? "ok" : unknown < entries.length ? "degraded" : "unavailable";

  return {
    entries,
    listed,
    total: entries.length,
    unknown,
    ranAt,
    source,
  };
}
