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
  /** Sample project names the portal lists for this brand. Used to backfill
   *  the dashboard's project list when the brand's own site doesn't render
   *  projects in HTML (common with Next.js SPAs). */
  sampleProjects?: string[];
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
  const query = `Search the web. Does the property portal ${portal.domain} have any current listings for the Indian residential real-estate developer "${brand}"${city ? ` in ${city}` : ""}? If yes, give me:
1. The canonical page URL on ${portal.domain} that lists their projects
2. An approximate count (e.g. "8 projects listed")
3. The names of up to 5 projects visible on that page (just the project names, e.g. "Aparna Sarovar Grande", "Aparna Cyberzon")
If no, say so explicitly.`;

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
  "note": "<one short sentence summary; under 120 chars>",
  "sampleProjects": ["<up to 5 specific project names visible in the answer; empty array if none stated>"]
}

Rules:
- "listed" ONLY if the answer explicitly confirms at least one current ${brand} listing AND provides a URL that contains "${portal.domain}".
- "missing" if the answer says no listings were found or the brand is absent.
- "unknown" if the answer is evasive, hallucinated, or didn't actually search.
- citationUrl must be a real URL visible in the answer. If uncertain, leave empty and set status to "unknown".
- sampleProjects must be names that explicitly appear in the answer text — do not invent or guess. Strip generic suffixes like "by ${brand}". Skip generic terms like "luxury apartments" that aren't project names.`;

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
      sampleProjects?: unknown;
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

    const sampleProjects = Array.isArray(parsed.sampleProjects)
      ? (parsed.sampleProjects as unknown[])
          .filter((n): n is string => typeof n === "string")
          .map((n) => n.trim())
          .filter((n) => n.length >= 3 && n.length <= 80)
          .slice(0, 5)
      : [];

    return {
      portal: portal.name,
      domain: portal.domain,
      status,
      citationUrl: hasDomain ? citationUrl : undefined,
      listingHint: typeof parsed.listingHint === "string" && parsed.listingHint.trim()
        ? parsed.listingHint.trim().slice(0, 80)
        : undefined,
      note: typeof parsed.note === "string" ? parsed.note.trim().slice(0, 160) : undefined,
      sampleProjects: sampleProjects.length > 0 ? sampleProjects : undefined,
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
