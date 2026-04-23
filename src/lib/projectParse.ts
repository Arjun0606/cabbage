/**
 * Project data parsing.
 *
 * Users type location, configurations, price, and status as free text
 * (that's the ergonomics they're used to from property portals). The
 * parsers in this module convert those strings into the structured
 * columns the app uses for rollups, filters, and matrix-aware query
 * generation. All parsing is permissive — if we can't extract something
 * we return undefined rather than forcing a bad value.
 */

// ---------------------------------------------------------------------------
// Locality + city
// ---------------------------------------------------------------------------

/**
 * "Gachibowli, Hyderabad" -> { locality: "Gachibowli", city: "Hyderabad" }
 * "Tellapur" + fallback "Hyderabad" -> { locality: "Tellapur", city: "Hyderabad" }
 * "Hyderabad" + fallback "Hyderabad" -> { locality: undefined, city: "Hyderabad" }
 * "Neopolis, Kokapet" + fallback "Hyderabad" -> { locality: "Neopolis", city: "Kokapet" }
 *   — correct because "Kokapet" is the lower admin level in the address
 *   even though it's a Hyderabad sub-locality; UI code groups it under
 *   Hyderabad via the separate `city` rollup.
 *
 * The critical rule: if a single-token project location differs from
 * the company's primary city, treat it as a LOCALITY, not a city.
 * Most Indian developers type "Tellapur" without the ", Hyderabad"
 * suffix because it's obvious from context. The old implementation
 * wrongly promoted every such project to a separate city.
 */
export function parseLocation(
  location: string | null | undefined,
  fallbackCity?: string
): { locality?: string; city?: string } {
  if (!location) return { city: fallbackCity };
  const parts = location.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return { city: fallbackCity };
  if (parts.length === 1) {
    const only = parts[0];
    // If the user has specified a company-wide primary city and the
    // project token is something different, the project is a locality
    // within that city. Only when the token IS the company city (or no
    // fallback exists) do we treat it as the city.
    if (fallbackCity && only.toLowerCase() !== fallbackCity.toLowerCase()) {
      return { locality: only, city: fallbackCity };
    }
    return { city: only };
  }
  // Two or more parts: "Locality, City" or "Locality, City, State".
  // We drop the last part when it looks like an Indian state (since
  // buyer queries never use state names).
  const INDIAN_STATES = /\b(telangana|andhra pradesh|karnataka|maharashtra|tamil nadu|kerala|gujarat|rajasthan|madhya pradesh|uttar pradesh|bihar|jharkhand|chhattisgarh|odisha|west bengal|punjab|haryana|himachal|uttarakhand|assam|goa|delhi ncr)\b/i;
  if (parts.length >= 3 && INDIAN_STATES.test(parts[parts.length - 1])) {
    return { locality: parts[0], city: parts[1] };
  }
  return { locality: parts[0], city: parts[parts.length - 1] };
}

// ---------------------------------------------------------------------------
// Config tags
// ---------------------------------------------------------------------------

const CONFIG_PATTERNS: Array<{ match: RegExp; tag: string }> = [
  { match: /studio/i, tag: "Studio" },
  { match: /\b1\s*[\-\s]?\s*bhk\b/i, tag: "1BHK" },
  { match: /\b1\.?5\s*[\-\s]?\s*bhk\b/i, tag: "1.5BHK" },
  { match: /\b2\s*[\-\s]?\s*bhk\b/i, tag: "2BHK" },
  { match: /\b2\.?5\s*[\-\s]?\s*bhk\b/i, tag: "2.5BHK" },
  { match: /\b3\s*[\-\s]?\s*bhk\b/i, tag: "3BHK" },
  { match: /\b3\.?5\s*[\-\s]?\s*bhk\b/i, tag: "3.5BHK" },
  { match: /\b4\s*[\-\s]?\s*bhk\b/i, tag: "4BHK" },
  { match: /\b4\.?5\s*[\-\s]?\s*bhk\b/i, tag: "4.5BHK" },
  { match: /\b5\s*[\-\s]?\s*bhk\b/i, tag: "5BHK" },
  { match: /\b6\+?\s*[\-\s]?\s*bhk\b/i, tag: "6BHK" },
  { match: /\b(villa|row house|rowhouse)\b/i, tag: "Villa" },
  { match: /\b(plot|plots|land)\b/i, tag: "Plot" },
  { match: /\b(penthouse|penthouses)\b/i, tag: "Penthouse" },
  { match: /\b(duplex)\b/i, tag: "Duplex" },
  { match: /\b(commercial|office|retail|shop)\b/i, tag: "Commercial" },
];

/**
 * "3BHK, 4BHK" -> ["3BHK", "4BHK"]
 * "2 & 3 BHK"  -> ["2BHK", "3BHK"]
 * "3BHK + Villa" -> ["3BHK", "Villa"]
 * Dedup, ordered by the patterns above.
 */
export function parseConfigurations(input: string | null | undefined): string[] {
  if (!input) return [];
  const text = input.trim();
  if (!text) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { match, tag } of CONFIG_PATTERNS) {
    if (match.test(text) && !seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
  }
  // Some developers write bare numbers: "2, 3, 4 BHK" — handled above.
  // Some write shorthand: "2.5 BHK" — handled above.
  return out;
}

// ---------------------------------------------------------------------------
// Price range (returns INR values, not lakh/crore)
// ---------------------------------------------------------------------------

const LAKH = 100_000;
const CRORE = 10_000_000;

/**
 * "₹1.2 Cr onwards"         -> { min: 12000000, max: undefined }
 * "₹1.5 Cr - ₹3 Cr"          -> { min: 15000000, max: 30000000 }
 * "₹80 Lakh - ₹1.2 Cr"       -> { min: 8000000,  max: 12000000 }
 * "Price on request"         -> { min: undefined, max: undefined }
 * "Under 3 crore"            -> { min: undefined, max: 30000000 }
 * Parses the numeric(s) and detects Cr/Crore/L/Lakh units.
 */
export function parsePriceRange(
  input: string | null | undefined
): { min?: number; max?: number } {
  if (!input) return {};
  const text = input.toLowerCase().replace(/[₹,]/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return {};

  // Extract every numeric-with-unit token.
  // Examples that match: "1.2 cr", "80 lakh", "3cr", "1 crore", "50 l"
  const re = /(\d+(?:\.\d+)?)\s*(cr|crore|crores|l|lakh|lakhs|lac|lacs|k|thousand)?/g;
  const matches: Array<{ n: number; unit: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matches.push({ n: parseFloat(m[1]), unit: (m[2] || "").trim() });
  }
  if (matches.length === 0) return {};

  // Normalise each match to rupees. If unit is missing, inherit from the
  // next matched unit (handles "1.5 - 3 cr"). Default to crores when
  // the whole string has no unit at all (most Indian listings implicitly
  // quote in crores when numbers look like 1-20).
  const normalised: number[] = [];
  let defaultUnit = matches.find((x) => x.unit)?.unit || "cr";
  for (const x of matches) {
    const unit = x.unit || defaultUnit;
    let rupees = x.n;
    if (/^(cr|crore|crores)$/.test(unit)) rupees = x.n * CRORE;
    else if (/^(l|lakh|lakhs|lac|lacs)$/.test(unit)) rupees = x.n * LAKH;
    else if (/^(k|thousand)$/.test(unit)) rupees = x.n * 1000;
    else if (x.n < 50) rupees = x.n * CRORE; // bare number <50 probably means crores
    else if (x.n < 5000) rupees = x.n * LAKH; // 50-5000 probably lakhs
    normalised.push(rupees);
  }

  if (normalised.length === 1) {
    // Single number — interpret direction from modifier words.
    if (/\b(under|below|upto|up to|less than|max|maximum)\b/.test(text)) {
      return { max: normalised[0] };
    }
    if (/\b(above|over|from|onwards|min|minimum|starting)\b/.test(text)) {
      return { min: normalised[0] };
    }
    return { min: normalised[0] };
  }

  const min = Math.min(...normalised);
  const max = Math.max(...normalised);
  return { min, max };
}

/**
 * Format rupees back into Indian-style "₹1.2 Cr" for display.
 */
export function formatRupees(rupees: number | null | undefined): string {
  if (rupees === null || rupees === undefined || isNaN(rupees)) return "";
  if (rupees >= CRORE) return `₹${(rupees / CRORE).toFixed(rupees % CRORE === 0 ? 0 : 2)} Cr`;
  if (rupees >= LAKH) return `₹${(rupees / LAKH).toFixed(rupees % LAKH === 0 ? 0 : 1)} L`;
  return `₹${rupees.toLocaleString("en-IN")}`;
}

// ---------------------------------------------------------------------------
// State inference (for multi-state RERA tracking)
// ---------------------------------------------------------------------------

/**
 * India's state-level RERA authorities make the state of a project a
 * legally significant dimension — a DLF project in Gurgaon falls under
 * HARERA, a Bangalore project under K-RERA, Hyderabad under TS-RERA,
 * etc. This helper infers the state from the city so we can group
 * RERA coverage per state in the UI without asking the user to type it.
 *
 * Conservative on purpose: only cities we're sure of return a state.
 * Everything else returns undefined (the RERA card just shows the
 * total without the split).
 */
const CITY_TO_STATE: Record<string, string> = {
  hyderabad: "Telangana",
  secunderabad: "Telangana",
  visakhapatnam: "Andhra Pradesh",
  vijayawada: "Andhra Pradesh",
  vizag: "Andhra Pradesh",
  bangalore: "Karnataka",
  bengaluru: "Karnataka",
  mysore: "Karnataka",
  mangalore: "Karnataka",
  mumbai: "Maharashtra",
  pune: "Maharashtra",
  thane: "Maharashtra",
  navi: "Maharashtra",
  nagpur: "Maharashtra",
  nashik: "Maharashtra",
  chennai: "Tamil Nadu",
  coimbatore: "Tamil Nadu",
  kochi: "Kerala",
  ernakulam: "Kerala",
  thiruvananthapuram: "Kerala",
  trivandrum: "Kerala",
  ahmedabad: "Gujarat",
  surat: "Gujarat",
  vadodara: "Gujarat",
  baroda: "Gujarat",
  gandhinagar: "Gujarat",
  jaipur: "Rajasthan",
  udaipur: "Rajasthan",
  jodhpur: "Rajasthan",
  lucknow: "Uttar Pradesh",
  noida: "Uttar Pradesh",
  ghaziabad: "Uttar Pradesh",
  greater: "Uttar Pradesh",
  gurgaon: "Haryana",
  gurugram: "Haryana",
  faridabad: "Haryana",
  chandigarh: "Chandigarh",
  delhi: "Delhi NCR",
  "new delhi": "Delhi NCR",
  kolkata: "West Bengal",
  howrah: "West Bengal",
  bhubaneswar: "Odisha",
  cuttack: "Odisha",
  indore: "Madhya Pradesh",
  bhopal: "Madhya Pradesh",
  raipur: "Chhattisgarh",
  ranchi: "Jharkhand",
  patna: "Bihar",
  guwahati: "Assam",
  goa: "Goa",
  panaji: "Goa",
  dehradun: "Uttarakhand",
  shimla: "Himachal Pradesh",
};

export function inferState(city: string | null | undefined): string | undefined {
  if (!city) return undefined;
  const key = city.trim().toLowerCase();
  if (CITY_TO_STATE[key]) return CITY_TO_STATE[key];
  // Try the first word (e.g. "new delhi" as a two-word city)
  const firstWord = key.split(/\s+/)[0];
  return CITY_TO_STATE[firstWord];
}

// ---------------------------------------------------------------------------
// Stage (normalised to snake_case from the display status)
// ---------------------------------------------------------------------------

export type ProjectStage =
  | "pre_launch"
  | "under_construction"
  | "ready_to_move"
  | "sold_out"
  | "active";

const STAGE_ALIASES: Array<{ match: RegExp; stage: ProjectStage }> = [
  { match: /pre[\s\-]?launch/i, stage: "pre_launch" },
  { match: /ready[\s\-]?to[\s\-]?move|rtm|occupancy|possession/i, stage: "ready_to_move" },
  { match: /under[\s\-]?construction|uc|construction/i, stage: "under_construction" },
  { match: /sold[\s\-]?out|completed|delivered/i, stage: "sold_out" },
];

/** "Pre-launch" -> "pre_launch", "Ready to Move" -> "ready_to_move", else "active". */
export function parseStage(status: string | null | undefined): ProjectStage {
  if (!status) return "active";
  for (const { match, stage } of STAGE_ALIASES) {
    if (match.test(status)) return stage;
  }
  return "active";
}

/**
 * Human-readable label paired with a hint about what content strategy
 * fits this stage. Used by the content queue to explain opportunities.
 */
export function stageContentHint(stage: ProjectStage): string {
  switch (stage) {
    case "pre_launch":
      return "Teasers, launch-date speculation, early-bird pricing expectations — buyers are researching, not deciding.";
    case "under_construction":
      return "Construction progress, quarterly updates, walk-through videos — buyers want proof of delivery.";
    case "ready_to_move":
      return "Offers, possession-ready urgency, comparison with under-construction alternatives.";
    case "sold_out":
      return "Keep the brand warm — resale content, price-trajectory posts, next-launch signups.";
    default:
      return "Active inventory — the standard locality + config + price-tier content mix.";
  }
}

// ---------------------------------------------------------------------------
// Convenience: parse a whole project-input object at once.
// ---------------------------------------------------------------------------

export interface ProjectFreeText {
  location?: string | null;
  configurations?: string | null;
  priceRange?: string | null;
  status?: string | null;
}

export interface ProjectStructured {
  locality?: string;
  city?: string;
  configTags: string[];
  priceMin?: number;
  priceMax?: number;
  stage: ProjectStage;
}

export function parseProject(input: ProjectFreeText, fallbackCity?: string): ProjectStructured {
  const { locality, city } = parseLocation(input.location, fallbackCity);
  const configTags = parseConfigurations(input.configurations);
  const price = parsePriceRange(input.priceRange);
  const stage = parseStage(input.status);
  return {
    locality,
    city,
    configTags,
    priceMin: price.min,
    priceMax: price.max,
    stage,
  };
}

// ---------------------------------------------------------------------------
// Matching — does this project satisfy a buyer query?
// ---------------------------------------------------------------------------

/**
 * Does this project match "under 3 cr" / "above 1.5 cr" phrasing?
 * Lax — returns true when the query mentions no price at all.
 */
export function matchesPriceQuery(
  project: { price_min?: number | null; price_max?: number | null },
  query: string
): boolean {
  const p = parsePriceRange(query);
  if (p.min === undefined && p.max === undefined) return true;
  const projectMin = project.price_min ?? project.price_max ?? undefined;
  const projectMax = project.price_max ?? project.price_min ?? undefined;
  if (p.max !== undefined && projectMin !== undefined && projectMin > p.max) return false;
  if (p.min !== undefined && projectMax !== undefined && projectMax < p.min) return false;
  return true;
}
