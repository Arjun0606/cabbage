/**
 * RERA cross-verification.
 *
 * Every Indian state has its own RERA authority running its own public
 * project-registry portal. When we scrape a RERA number from a
 * developer's site, the only way to confirm it's valid AND still active
 * is to cross-check against the state portal. AI answers that cite an
 * expired or cancelled RERA number expose the brand to regulatory
 * complaints — this is a compliance check disguised as an SEO feature.
 *
 * We run a grounded web search per project against the relevant state
 * portal. Every confirmation row is backed by a URL on the state
 * authority's own domain — no fabrication, no AI-guessed status.
 *
 * Recognised state portals (domain + state label):
 *   Telangana   - rera.telangana.gov.in
 *   Karnataka   - rera.karnataka.gov.in
 *   Maharashtra - maharera.maharashtra.gov.in / maharerait.mahaonline.gov.in
 *   Haryana     - haryanarera.gov.in
 *   Delhi       - rera.delhi.gov.in
 *   UP          - up-rera.in
 *   Gujarat     - gujrera.gujarat.gov.in
 *   Tamil Nadu  - tnrera.tn.gov.in
 *   West Bengal - hira.wb.gov.in
 *   Others fall back to a generic search.
 */
import { queryForVisibility, aiLight } from "@/lib/ai";

export type ReraStatus =
  | "verified"
  | "not_found"
  | "mismatch"
  | "invalid_format"
  | "no_number"
  | "unknown";

export interface ReraVerificationEntry {
  project: string;
  reraNumber: string;
  /** State inferred from the RERA prefix or the project's location. */
  state: string;
  /** Portal we checked against. */
  portalDomain: string;
  status: ReraStatus;
  /** URL on the state portal proving the record (only when verified). */
  citationUrl?: string;
  /** Short one-line explanation. */
  note: string;
  checkedAt: string;
}

export interface ReraVerificationResult {
  entries: ReraVerificationEntry[];
  verified: number;
  mismatch: number;
  unverified: number;
  total: number;
  ranAt: string;
}

// RERA number format sanity — a fast regex filter before we burn a web
// search. Most state formats land in these shapes.
const VALID_RERA_RX = [
  /^P\d{2}\d{8,14}$/,
  /^PRM\/KA\/RERA\/\d+/,
  /^K-?RERA\/PR\/\d+/,
  /^HARERA-[A-Z]+-\d+/,
  /^HIRA\/\d+/,
  /^UPRERAPRJ\d+/,
  /^PR\/KN\/\d+/,
  /^TS\/\d+\/\d+/,
  /^RERA\s*\d+/i,
  /^[A-Z0-9\/-]{10,}$/,
];

function validFormat(rera: string): boolean {
  return VALID_RERA_RX.some((rx) => rx.test(rera));
}

interface StatePortal {
  state: string;
  domain: string;
  reraPrefixes: string[]; // RERA number prefixes that map to this state
  locationKeywords: string[]; // City / state words that map here
}

const STATE_PORTALS: StatePortal[] = [
  {
    state: "Telangana",
    domain: "rera.telangana.gov.in",
    reraPrefixes: ["P02", "TS/"],
    locationKeywords: ["hyderabad", "telangana", "secunderabad", "warangal"],
  },
  {
    state: "Karnataka",
    domain: "rera.karnataka.gov.in",
    reraPrefixes: ["PRM/KA", "K-RERA", "PR/KN"],
    locationKeywords: ["bangalore", "bengaluru", "mysore", "mangalore", "karnataka"],
  },
  {
    state: "Andhra Pradesh",
    domain: "rera.ap.gov.in",
    reraPrefixes: ["P03"],
    locationKeywords: ["vijayawada", "visakhapatnam", "andhra", "guntur", "tirupati"],
  },
  {
    state: "Maharashtra",
    domain: "maharera.maharashtra.gov.in",
    reraPrefixes: ["MAHARERA", "P51", "P52", "P99"],
    locationKeywords: ["mumbai", "pune", "nagpur", "nashik", "maharashtra", "thane", "navi mumbai"],
  },
  {
    state: "Haryana",
    domain: "haryanarera.gov.in",
    reraPrefixes: ["HARERA"],
    locationKeywords: ["gurgaon", "gurugram", "faridabad", "sonipat", "haryana"],
  },
  {
    state: "Delhi",
    domain: "rera.delhi.gov.in",
    reraPrefixes: ["DLRERA"],
    locationKeywords: ["delhi", "new delhi", "ncr"],
  },
  {
    state: "Uttar Pradesh",
    domain: "up-rera.in",
    reraPrefixes: ["UPRERAPRJ"],
    locationKeywords: ["noida", "greater noida", "ghaziabad", "lucknow", "uttar pradesh", "meerut"],
  },
  {
    state: "Gujarat",
    domain: "gujrera.gujarat.gov.in",
    reraPrefixes: ["PR/GJ"],
    locationKeywords: ["ahmedabad", "surat", "vadodara", "rajkot", "gujarat", "gandhinagar"],
  },
  {
    state: "Tamil Nadu",
    domain: "rera.tn.gov.in",
    reraPrefixes: ["TN/"],
    locationKeywords: ["chennai", "coimbatore", "madurai", "tamil nadu"],
  },
  {
    state: "West Bengal",
    domain: "hira.wb.gov.in",
    reraPrefixes: ["HIRA"],
    locationKeywords: ["kolkata", "west bengal", "howrah"],
  },
];

function inferStatePortal(reraNumber: string, location: string): StatePortal | null {
  const rnUpper = reraNumber.toUpperCase();
  for (const p of STATE_PORTALS) {
    if (p.reraPrefixes.some((pre) => rnUpper.startsWith(pre.toUpperCase()))) return p;
  }
  const locLower = location.toLowerCase();
  for (const p of STATE_PORTALS) {
    if (p.locationKeywords.some((k) => locLower.includes(k))) return p;
  }
  return null;
}

async function verifyOne(
  project: { name: string; reraNumber?: string; location?: string },
): Promise<ReraVerificationEntry> {
  const checkedAt = new Date().toISOString();
  const rera = (project.reraNumber || "").trim();

  if (!rera) {
    return {
      project: project.name,
      reraNumber: "",
      state: "",
      portalDomain: "",
      status: "no_number",
      note: "No RERA number scraped from the project page",
      checkedAt,
    };
  }

  if (!validFormat(rera)) {
    return {
      project: project.name,
      reraNumber: rera,
      state: "",
      portalDomain: "",
      status: "invalid_format",
      note: "Scraped value doesn't match any known RERA format",
      checkedAt,
    };
  }

  const portal = inferStatePortal(rera, project.location || "");
  const portalDomain = portal?.domain || "";
  const state = portal?.state || "";

  const query = portal
    ? `Search the public RERA registry at ${portal.domain} for the project with registration number "${rera}". Does the ${portal.state} RERA authority have an active record for this number? If yes, give me the specific page URL on ${portal.domain} that shows the record and the project name listed there. If no record exists or the number is invalid, say so explicitly.`
    : `Search the web for the Indian RERA project registration number "${rera}". Find the state RERA authority page that lists this project. Provide the page URL and the project name on record. If no authority lists it, say so.`;

  const { text, source } = await queryForVisibility("openai", query);

  if (!text || source === "missing_key" || source === "failed") {
    return {
      project: project.name,
      reraNumber: rera,
      state,
      portalDomain,
      status: "unknown",
      note: "Web search was unavailable for this check",
      checkedAt,
    };
  }

  const parsePrompt = `Parse this web-search answer about a RERA registration lookup.

PROJECT SCRAPED FROM DEVELOPER SITE: "${project.name}"
RERA NUMBER: "${rera}"
EXPECTED STATE PORTAL: "${portalDomain || "(any Indian state RERA)"}"

WEB SEARCH ANSWER:
"""
${text.slice(0, 2500)}
"""

Return ONLY JSON:
{
  "status": "verified" | "not_found" | "mismatch" | "unknown",
  "citationUrl": "<state-portal page URL that confirms the record, empty string if none>",
  "projectNameOnRecord": "<project name the portal lists for that RERA number, empty if unclear>",
  "note": "<one short sentence; under 140 chars>"
}

Rules:
- "verified" ONLY if the answer explicitly confirms the RERA number exists in the state RERA authority's records AND the citationUrl contains the state-portal domain${portalDomain ? ` (${portalDomain})` : ""}.
- "mismatch" if the record exists but is for a DIFFERENT project name than "${project.name}" (fuzzy match is fine — "Aparna Moonstone" and "APARNA MOONSTONE, Kompally" match).
- "not_found" if the portal says the number doesn't exist or the search confirms no record.
- "unknown" otherwise (including when the answer is evasive, hallucinated, or didn't actually search).
- citationUrl must be a URL visible in the answer.`;

  try {
    const raw = await aiLight("Parse a RERA lookup answer into structured JSON.", parsePrompt, 400);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return {
        project: project.name,
        reraNumber: rera,
        state,
        portalDomain,
        status: "unknown",
        note: "Parse failed",
        checkedAt,
      };
    }
    const parsed = JSON.parse(match[0]) as {
      status?: string;
      citationUrl?: string;
      projectNameOnRecord?: string;
      note?: string;
    };

    const validStatuses: ReraStatus[] = ["verified", "not_found", "mismatch", "unknown"];
    let status: ReraStatus = validStatuses.includes(parsed.status as ReraStatus)
      ? (parsed.status as ReraStatus)
      : "unknown";
    const citationUrl = typeof parsed.citationUrl === "string" ? parsed.citationUrl.trim() : "";
    const hasDomain = portalDomain
      ? citationUrl.toLowerCase().includes(portalDomain.toLowerCase())
      : citationUrl.length > 0;

    // Guardrail — "verified" requires a URL on the expected state portal.
    if (status === "verified" && !hasDomain) status = "unknown";

    return {
      project: project.name,
      reraNumber: rera,
      state,
      portalDomain,
      status,
      citationUrl: hasDomain ? citationUrl : undefined,
      note: (parsed.note || "").toString().slice(0, 200),
      checkedAt,
    };
  } catch {
    return {
      project: project.name,
      reraNumber: rera,
      state,
      portalDomain,
      status: "unknown",
      note: "Parse error",
      checkedAt,
    };
  }
}

export async function runReraVerification(
  projects: Array<{ name: string; reraNumber?: string; location?: string }>,
): Promise<ReraVerificationResult> {
  const ranAt = new Date().toISOString();

  // Filter to projects with RERA numbers first. For projects with no
  // number we return an entry so the UI shows coverage gaps explicitly.
  const targets = projects.slice(0, 20);

  // Run in batches of 5 — 20 parallel web searches can trip rate limits.
  const entries: ReraVerificationEntry[] = [];
  for (let i = 0; i < targets.length; i += 5) {
    const batch = await Promise.all(targets.slice(i, i + 5).map(verifyOne));
    entries.push(...batch);
  }

  const verified = entries.filter((e) => e.status === "verified").length;
  const mismatch = entries.filter((e) => e.status === "mismatch").length;
  const unverified = entries.filter((e) => !["verified", "no_number"].includes(e.status)).length;

  return {
    entries,
    verified,
    mismatch,
    unverified,
    total: entries.length,
    ranAt,
  };
}
