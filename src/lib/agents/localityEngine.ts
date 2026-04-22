/**
 * Dynamic Locality Engine — 100% AI-powered
 *
 * No hardcoded cities, no hardcoded localities, no mock data.
 * Everything is discovered dynamically based on user input.
 *
 * - User types a city → AI discovers localities
 * - User types a locality → AI discovers nearby areas, buyer profiles, keywords
 * - Content plans are generated fresh from real context every time
 */

import { aiComplete, aiLight } from "@/lib/ai";
import { geocodeLocality, findNearbyLocalities, isPlacesConfigured } from "@/lib/integrations/googlePlaces";

// ---------- Types ----------

export interface LocalitySearchResult {
  locality: string;
  city: string;
  country: string;
  nearbyAreas: string[];
  buyerProfiles: BuyerProfile[];
  suggestedKeywords: string[];
  suggestedPages: SuggestedPage[];
  competingProjects: string[];
  marketInsight: string;
}

interface BuyerProfile {
  type: string;
  searchBehavior: string;
  topKeywords: string[];
  preferredConfig: string;
  budgetRange: string;
}

export interface SuggestedPage {
  title: string;
  slug: string;
  targetKeyword: string;
  searchVolume: "high" | "medium" | "low";
  difficulty: "easy" | "medium" | "hard";
  pageType: "locality" | "comparison" | "budget" | "guide" | "review";
}

export interface ContentPlan {
  projectName: string;
  location: string;
  city: string;
  localityPages: SuggestedPage[];
  weeklyPlan: WeeklyContent[];
  socialCalendar: SocialPost[];
}

interface WeeklyContent {
  week: number;
  blog: { title: string; targetKeyword: string; outline: string[] };
  localityPage: { title: string; slug: string };
  socialPosts: number;
}

interface SocialPost {
  platform: "linkedin" | "whatsapp" | "facebook";
  type: "post" | "reel" | "story" | "broadcast";
  title: string;
  content: string;
  scheduledDay: string;
  hashtags?: string[];
}

export interface BudgetRange {
  label: string;
  min: number;
  max: number;
}

// ---------- Core AI Functions ----------

/**
 * Discover localities for any city on earth.
 * No hardcoded data — entirely AI-powered.
 */
export async function discoverLocalities(
  city: string,
  country?: string
): Promise<{ locality: string; type: string }[]> {
  const system = "You are a real estate market expert with deep knowledge of residential property markets worldwide. Return valid JSON only, no other text.";

  const prompt = `List the top 20 residential real estate localities/neighborhoods in ${city}${country ? `, ${country}` : ""} where active residential development is happening. For each, indicate the type (luxury, mid-segment, affordable, upcoming, established).

Return JSON: [{"locality": "name", "type": "luxury|mid-segment|affordable|upcoming|established"}]

Be specific — use real neighborhood/area names that home buyers actually search for. Not administrative districts.`;

  const text = await aiLight(system, prompt, 1500);
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
  }
  return [];
}

/**
 * Search for a specific locality and get comprehensive real estate intelligence.
 * Entirely AI-powered — works for any locality in any city on earth.
 */
export async function searchLocality(
  city: string,
  locality: string,
  projectName?: string,
  configurations?: string,
  priceRange?: string
): Promise<LocalitySearchResult> {
  const system = `You are Cabbge's locality intelligence engine for real estate. Given any city and locality, provide real estate market intelligence.

CRITICAL HONESTY RULES:
- NEVER invent specific competitor project names, school names, hospital names, metro station names, or specific distance figures. If you aren't highly confident a place exists at that location, omit it.
- For "nearbyAreas", use only regions you are confident are near ${locality} in ${city}. Prefer fewer accurate entries over a long made-up list.
- For "competingProjects", list only projects you are confident actually exist in that locality. If uncertain, return an empty array — never fabricate project names.
- "marketInsight" must stay generic (demand drivers, typical configurations, trajectory) unless you can cite specifics — do not invent percentage price trends or named infrastructure projects.

Return valid JSON only.`;

  const prompt = `Real estate intelligence for ${locality}, ${city}:
${projectName ? `Project context: ${projectName}` : ""}
${configurations ? `Configurations: ${configurations}` : ""}
${priceRange ? `Price range: ${priceRange}` : ""}

Return JSON:
{
  "country": "country name",
  "nearbyAreas": ["5-8 nearby residential areas buyers also consider"],
  "buyerProfiles": [
    {
      "type": "buyer type (e.g. First-time buyer, NRI investor, Upgrade buyer)",
      "searchBehavior": "how they search online",
      "topKeywords": ["3 specific search queries they'd use"],
      "preferredConfig": "unit type they prefer",
      "budgetRange": "typical budget in local currency"
    }
  ],
  "suggestedKeywords": ["15-20 high-intent real estate search keywords for this specific locality"],
  "suggestedPages": [
    {
      "title": "SEO page title",
      "slug": "url-friendly-slug",
      "targetKeyword": "primary keyword to rank for",
      "searchVolume": "high|medium|low",
      "difficulty": "easy|medium|hard",
      "pageType": "locality|comparison|budget|guide|review"
    }
  ],
  "competingProjects": ["5-8 known real competing residential projects in this area"],
  "marketInsight": "2-3 sentence market overview for this locality — price trends, demand drivers, upcoming infrastructure"
}

Keep the response grounded in the supplied data. If you're uncertain about a specific place, infrastructure project, school, or metro station, omit it rather than guessing.`;

  // Run AI generation and real geographic lookup in parallel.
  // Places gives us ground truth for nearbyAreas — AI gets overridden.
  const [text, placesNearby] = await Promise.all([
    aiComplete(system, prompt, 2500),
    (async () => {
      if (!isPlacesConfigured()) return [];
      const coords = await geocodeLocality(locality, city);
      if (!coords) return [];
      return findNearbyLocalities(coords, 6000, 10);
    })(),
  ]);

  const jsonMatch = text.match(/\{[\s\S]*\}/);

  const defaults: LocalitySearchResult = {
    locality,
    city,
    country: "",
    nearbyAreas: [],
    buyerProfiles: [],
    suggestedKeywords: [],
    suggestedPages: [],
    competingProjects: [],
    marketInsight: "",
  };

  let parsed: Partial<LocalitySearchResult> = {};
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch { /* use defaults */ }
  }

  // Override nearbyAreas with verified Places data when available.
  // Keep the AI's list as a fallback only when Places isn't configured.
  const nearbyAreas = placesNearby.length > 0
    ? placesNearby
        .filter((p) => p.name.toLowerCase() !== locality.toLowerCase())
        .slice(0, 8)
        .map((p) => `${p.name} (${p.distanceKm} km)`)
    : (Array.isArray(parsed.nearbyAreas) ? parsed.nearbyAreas : []);

  return {
    ...defaults,
    ...parsed,
    locality,
    city,
    nearbyAreas,
  };
}

/**
 * Get budget ranges for any city. AI-powered, not hardcoded.
 */
export async function getBudgetRanges(city: string): Promise<BudgetRange[]> {
  const system = "Return valid JSON only.";

  const prompt = `What are the 4-5 most common residential property budget ranges that home buyers search for in ${city}? Use local currency.

Return JSON: [{"label": "under X lakhs", "min": 0, "max": 5000000}]

Use the actual local currency and terms (lakhs/crore for India, AED for UAE, GBP for UK, USD for US, etc).`;

  const text = await aiLight(system, prompt, 500);
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
  }

  return [
    { label: "budget tier 1", min: 0, max: 5000000 },
    { label: "budget tier 2", min: 5000000, max: 10000000 },
    { label: "budget tier 3", min: 10000000, max: 20000000 },
    { label: "budget tier 4", min: 20000000, max: 999999999 },
  ];
}

/**
 * One search query plus the metadata that lets us segment results by
 * geography, configuration, and price tier. We persist this with the saved
 * query set so cold starts and saved-query reuse don't lose context.
 *
 * Why every field is optional except `query` and `level`:
 * - `city` is null for country-level queries
 * - `config` only set when the brand exposes configurations (real estate)
 * - `priceTier` only set when the brand exposes price ranges
 * - `intent` is best-effort buyer intent classification
 */
export interface QueryWithMeta {
  query: string;
  level: "locality" | "city" | "country";
  city?: string;
  config?: string;     // e.g. "2BHK", "3BHK", "villa", "plot"
  priceTier?: string;  // e.g. "₹50L-1Cr", "₹3Cr+", "<₹50L"
  intent?: "research" | "comparison" | "shortlist" | "investment" | "rental";
}

/**
 * Result of search-query generation. `usedFallback=true` means the AI
 * generator failed and we returned a minimal generic query set so the scan
 * could still run — caller should warn the user that scores are based on
 * generic queries rather than the rich brand-aware set.
 */
export interface GeneratedQueries {
  queries: QueryWithMeta[];
  usedFallback: boolean;
  reason?: string;
}

/**
 * Generate search queries for AI Visibility agent.
 * Dynamic — works for any city, any locality, any language.
 */
export async function generateSearchQueries(
  city: string,
  brand: string,
  projects: string[],
  locality?: string,
  industry?: string,
  projectDetails?: Array<{ name?: string; location?: string; configurations?: string; priceRange?: string }>,
  brandContext?: { targetAudience?: string; usps?: string; projectsCompleted?: string }
): Promise<GeneratedQueries> {
  // NOTE: We do NOT include the brand name in queries.
  // Real customers don't know the company — they search by need, location, budget.
  // The test is: does ChatGPT/Google AI RECOMMEND this company when asked generic queries?
  // That's the real measure of GEO visibility.

  // Multi-level GEO: locality (micro) + city (metro) + country (macro)
  // This ensures we track visibility at every level a buyer searches.

  const system = "Return a JSON array of English strings. No other text.";

  const loc = locality || city;
  const country = "India"; // Can be parameterized later
  const ind = industry || "real_estate";

  // Industry-adaptive prompt
  const industryContext = ind === "real_estate"
    ? `real home buyers searching for flats, apartments, villas, or plots in ${loc}, ${city}. They want AI to RECOMMEND a developer/builder.`
    : ind === "saas"
    ? `business professionals searching for software solutions. They want AI to RECOMMEND a product.`
    : ind === "ecommerce"
    ? `online shoppers searching for products. They want AI to RECOMMEND a brand or store.`
    : ind === "healthcare"
    ? `patients or caregivers searching for healthcare providers in ${loc}, ${city}. They want AI to RECOMMEND a hospital, clinic, or doctor.`
    : ind === "legal"
    ? `people searching for legal services in ${loc}, ${city}. They want AI to RECOMMEND a law firm or lawyer.`
    : ind === "education"
    ? `students or parents searching for educational institutions in ${loc}, ${city}. They want AI to RECOMMEND a school, college, or course.`
    : ind === "finance"
    ? `people searching for financial services or products. They want AI to RECOMMEND a bank, fintech, or insurance provider.`
    : ind === "hospitality"
    ? `travelers or diners searching for hotels, restaurants, or experiences in ${loc}, ${city}. They want AI to RECOMMEND a place.`
    : ind === "automotive"
    ? `car buyers searching for vehicles or dealerships in ${loc}, ${city}. They want AI to RECOMMEND a brand or dealer.`
    : ind === "local_business"
    ? `people searching for local services in ${loc}, ${city}. They want AI to RECOMMEND a business.`
    : `potential customers searching for services or products in ${loc}, ${city}. They want AI to RECOMMEND a company.`;

  // Build dynamic context blocks from actual brand + project data.
  // Group projects by CITY to handle multi-city developers (DLF in NCR+Bangalore+Chennai, etc.)
  const projectsByCity = new Map<string, Array<{ name?: string; location?: string; configurations?: string; priceRange?: string }>>();
  for (const p of projectDetails || []) {
    // Parse city from location string (e.g. "Gachibowli, Hyderabad" → "Hyderabad")
    // If location doesn't contain a city, fall back to the primary city
    const locParts = (p.location || "").split(",").map(s => s.trim());
    const projectCity = locParts.length > 1 ? locParts[locParts.length - 1] : city;
    const key = projectCity || city;
    if (!projectsByCity.has(key)) projectsByCity.set(key, []);
    projectsByCity.get(key)!.push(p);
  }

  const multiCity = projectsByCity.size > 1;

  const projectsBlock = projectDetails && projectDetails.length > 0
    ? `\n\nPROJECTS BY CITY (generate queries for EACH city, not just the primary):\n${
        Array.from(projectsByCity.entries()).map(([cityName, projs]) =>
          `\n=== ${cityName} ===\n${projs.map(p =>
            `- ${p.name || "project"}${p.location ? ` in ${p.location}` : ""}${p.configurations ? ` (${p.configurations})` : ""}${p.priceRange ? ` @ ${p.priceRange}` : ""}`
          ).join("\n")}`
        ).join("\n")
      }\n\nFor EACH city above, generate locality-level queries covering every project's micro-market, configuration, and price segment.`
    : "";

  const audienceBlock = brandContext?.targetAudience
    ? `\n\nTARGET AUDIENCE (real buyer profile):\n${brandContext.targetAudience.slice(0, 500)}\nGenerate queries THIS specific audience would type.`
    : "";

  const uspsBlock = brandContext?.usps
    ? `\n\nBRAND USPs / DIFFERENTIATORS:\n${brandContext.usps.slice(0, 300)}\nInclude queries that surface competitors selling around these same USPs.`
    : "";

  const uniqueCities = Array.from(projectsByCity.keys()).filter(Boolean);
  const uniqueLocations = Array.from(new Set((projectDetails || []).map(p => p.location).filter(Boolean)));
  const uniqueConfigs = Array.from(new Set((projectDetails || []).flatMap(p => (p.configurations || "").split(",").map(c => c.trim())).filter(Boolean)));
  const priceRanges = Array.from(new Set((projectDetails || []).map(p => p.priceRange).filter(Boolean)));

  const prompt = `Generate search queries that ${industryContext} These customers DO NOT know any specific company — they are searching by need, location, and requirements. The brand being tested is "${brand}" but DO NOT include it in any query.

INDUSTRY: ${ind.replace(/_/g, " ")}
${multiCity
  ? `CITIES WHERE BRAND OPERATES (MULTI-CITY): ${uniqueCities.join(", ")}`
  : `PRIMARY CITY: ${city}${locality ? `\nPRIMARY LOCALITY/AREA: ${locality}` : ""}`}
COUNTRY: ${country}
${uniqueLocations.length > 0 ? `LOCALITIES/MICRO-MARKETS: ${uniqueLocations.join(", ")}` : ""}
${uniqueConfigs.length > 0 ? `CONFIGURATIONS OFFERED: ${uniqueConfigs.join(", ")}` : ""}
${priceRanges.length > 0 ? `PRICE SEGMENTS (generate queries for EACH): ${priceRanges.join(" | ")}` : ""}${projectsBlock}${audienceBlock}${uspsBlock}

CRITICAL RULES:
- ALL queries in ENGLISH only
- DO NOT include any company or brand name (no "${brand}", no project names)
- Use REAL landmarks, areas, institutions near each locality — vary them per city
- Must be realistic queries real customers would type
- Use local currency and terminology (different cities may need different pricing formats)
${multiCity ? "- MULTI-CITY: Generate queries for EACH city where the brand operates. A buyer in Bangalore searches differently from a buyer in Mumbai. Do not skip any city." : ""}
- Where projects span multiple localities within a city, include hyper-local queries for each
- Where configurations vary, include queries for each (2BHK buyers search different things than 4BHK buyers)
- Where price segments vary (₹80L vs ₹5Cr), include queries for each (buyer intent is totally different)

Generate queries at THREE levels — as many as this brand needs:

LOCALITY LEVEL — hyper-local queries for EVERY locality the brand operates in${uniqueLocations.length > 0 ? `:\n  Localities: ${uniqueLocations.join(", ")}` : ""}
${multiCity ? "  Since this brand operates in multiple cities, generate locality queries for micro-markets across ALL cities — don't just focus on one." : ""}
- Service/product + location combos
- Landmark-based queries (IT parks, metro stations, schools specific to each locality)
- Decision queries ("best/top [service] in [specific locality]")
- Comparison queries ("[locality] vs [nearby area in same city]")
- Generate more queries for bigger, more active markets; fewer for smaller ones

CITY LEVEL — city-wide intent for EVERY city the brand operates in${multiCity ? ` (${uniqueCities.join(", ")})` : ` (${city})`}:
- "best [service/product] in [city]" for each city
- "top [industry] companies in [city]" for each city
- City-specific comparisons where relevant (e.g. "best area to invest in Bangalore vs Chennai")

COUNTRY LEVEL — national discovery:
- "best [service/product] in ${country}"
- "top [industry] companies in ${country}"
- Include if the brand operates in 2+ cities (signals national operation)
- "best cities to invest in" if applicable

Use REAL landmark names specific to each locality and city. Cover every meaningful query the TARGET AUDIENCE would ask across every market the brand serves.

HYPER-LOCAL × CONFIG × PRICE-TIER COVERAGE (CRITICAL):
${uniqueConfigs.length > 0 && uniqueLocations.length > 0 ? `- For EACH config in [${uniqueConfigs.join(", ")}] × EACH locality in [${uniqueLocations.join(", ")}], generate at least one query like "best <config> in <locality>". A 2BHK buyer in Gachibowli is a totally different person from a 4BHK buyer in Jubilee Hills.` : ""}
${priceRanges.length > 0 && uniqueLocations.length > 0 ? `- For EACH price tier in [${priceRanges.join(", ")}] × EACH locality, generate at least one query like "best <config> under <price> in <locality>" or "<price> apartments in <locality>".` : ""}
- Mix intent types: research ("what are the best..."), comparison ("X vs Y"), shortlist ("top 5..."), investment ("good roi areas..."), rental ("flats for rent in...").

Return a JSON array of objects, each with:
{
  "query": "the search query string",
  "level": "locality" | "city" | "country",
  "city": "<which city this query targets (required for locality/city level; null for country level)>",
  "config": "<configuration if mentioned in the query, e.g. '2BHK', '3BHK', 'villa', 'plot' — null if generic>",
  "priceTier": "<price band if mentioned, e.g. '<₹50L', '₹50L-1Cr', '₹1Cr-3Cr', '₹3Cr+' — null if not specified>",
  "intent": "research" | "comparison" | "shortlist" | "investment" | "rental"
}

Classify each query:
- "level" — locality (micro-market), city (city-wide), or country (national)
- "city" — tag locality and city-level queries with the actual city they target so multi-city brands can break down progress per city
- "config" — extract the configuration ONLY if the query explicitly mentions one. Don't invent.
- "priceTier" — extract the price band ONLY if the query explicitly mentions a budget. Don't invent.
- "intent" — what is the buyer trying to do with this query?`;

  // Try the AI generator. If it throws, log and fall through to the safety net.
  let text = "";
  try {
    text = await aiLight(system, prompt, 3500);
  } catch (err) {
    console.error(
      "generateSearchQueries: aiLight threw —",
      err instanceof Error ? err.message : err
    );
  }

  const validLevels = new Set(["locality", "city", "country"]);
  const validIntents = new Set(["research", "comparison", "shortlist", "investment", "rental"]);

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    // Handle truncated JSON arrays — try to salvage partial results
    let jsonStr = jsonMatch[0];
    try { JSON.parse(jsonStr); } catch {
      const lastObj = jsonStr.lastIndexOf("}");
      if (lastObj > 0) jsonStr = jsonStr.slice(0, lastObj + 1) + "]";
    }
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const queries: QueryWithMeta[] = [];
        for (const item of parsed) {
          // Tolerate two shapes: bare string (legacy) or {query, level, city, ...}
          if (typeof item === "string") {
            queries.push({ query: item, level: "locality", city });
            AI_QUERY_LEVELS.set(item.toLowerCase(), "locality");
            AI_QUERY_CITIES.set(item.toLowerCase(), city);
          } else if (item?.query && typeof item.query === "string") {
            const level: "locality" | "city" | "country" = validLevels.has(item.level)
              ? item.level
              : "locality";
            const tagCity = typeof item.city === "string" && item.city ? item.city : (level === "country" ? undefined : city);
            const config = typeof item.config === "string" && item.config && item.config !== "null" ? item.config : undefined;
            const priceTier = typeof item.priceTier === "string" && item.priceTier && item.priceTier !== "null" ? item.priceTier : undefined;
            const intent = typeof item.intent === "string" && validIntents.has(item.intent) ? item.intent : undefined;
            queries.push({ query: item.query, level, city: tagCity, config, priceTier, intent: intent as QueryWithMeta["intent"] });
            const qLower = item.query.toLowerCase();
            AI_QUERY_LEVELS.set(qLower, level);
            if (tagCity) AI_QUERY_CITIES.set(qLower, tagCity);
          }
        }
        if (queries.length > 0) return { queries, usedFallback: false };
      }
    } catch (err) {
      console.error(
        "generateSearchQueries: JSON.parse failed —",
        err instanceof Error ? err.message : err,
        "raw:",
        jsonMatch[0].slice(0, 400)
      );
    }
  } else if (text) {
    console.error(
      "generateSearchQueries: no JSON array found in aiLight output. Raw:",
      text.slice(0, 400)
    );
  }

  // Safety net. The earlier comment said "NO HARDCODED FALLBACK" — but that was
  // about not hardcoding brand lists or sentiment lexicons. Returning [] when
  // query generation fails turns a transient AI hiccup into a fully broken scan
  // (no queries → no platform calls → dashboard shows "scan unavailable"
  // forever, even though the AI infrastructure is fine).
  //
  // These minimal queries don't bias the scan toward any brand — they're the
  // exact phrasing a buyer might type when they don't know any company. The
  // scan still measures real visibility; we just guarantee the scan happens.
  console.error(
    `generateSearchQueries: AI generator returned no usable queries for brand="${brand}", city="${city}", industry="${ind}". Falling back to minimal generic query set so the scan can run.`
  );

  const industryNoun = ind === "real_estate" ? "real estate developers"
    : ind === "saas" ? "software platforms"
    : ind === "ecommerce" ? "online stores"
    : ind === "healthcare" ? "hospitals"
    : ind === "legal" ? "law firms"
    : ind === "education" ? "schools"
    : ind === "finance" ? "financial advisors"
    : ind === "hospitality" ? "hotels"
    : ind === "automotive" ? "car dealerships"
    : ind === "local_business" ? "local businesses"
    : "companies";

  // Fallback set with proper metadata so downstream segmentation still works
  // when AI generation is unavailable.
  const fallbackRows: Array<{ query: string; level: "locality" | "city" | "country"; tagCity?: string; intent: QueryWithMeta["intent"] }> = [
    { query: `best ${industryNoun} in ${loc}`, level: loc !== city ? "locality" : "city", tagCity: city, intent: "research" },
    { query: `top ${industryNoun} in ${city}`, level: "city", tagCity: city, intent: "shortlist" },
    { query: `most trusted ${industryNoun} in ${city}`, level: "city", tagCity: city, intent: "shortlist" },
    { query: `${industryNoun} in ${country}`, level: "country", tagCity: undefined, intent: "research" },
    { query: `which ${industryNoun.replace(/s$/, "")} should I choose in ${loc}`, level: loc !== city ? "locality" : "city", tagCity: city, intent: "comparison" },
  ];

  // Mix in a config × locality cross if we have enough data — keeps the
  // fallback non-trivially useful for real estate brands.
  if (uniqueConfigs.length > 0 && uniqueLocations.length > 0 && ind === "real_estate") {
    for (const cfg of uniqueConfigs.slice(0, 3)) {
      for (const locality of uniqueLocations.slice(0, 2)) {
        fallbackRows.push({
          query: `best ${cfg} in ${locality}`,
          level: "locality",
          tagCity: city,
          intent: "shortlist",
        });
      }
    }
  }

  const fallbackQueries: QueryWithMeta[] = fallbackRows.map((r) => {
    AI_QUERY_LEVELS.set(r.query.toLowerCase(), r.level);
    if (r.tagCity) AI_QUERY_CITIES.set(r.query.toLowerCase(), r.tagCity);
    return {
      query: r.query,
      level: r.level,
      city: r.tagCity,
      intent: r.intent,
    };
  });

  return {
    queries: fallbackQueries,
    usedFallback: true,
    reason: text
      ? `AI returned unparseable output (${text.length} chars). Used ${fallbackQueries.length} generic ${ind.replace(/_/g, " ")} queries for ${city}.`
      : `AI generator returned no output. Used ${fallbackQueries.length} generic ${ind.replace(/_/g, " ")} queries for ${city}.`,
  };
}

// Module-level cache of AI-classified query levels (populated during generation)
export const AI_QUERY_LEVELS = new Map<string, "locality" | "city" | "country">();

// Module-level cache of AI-classified query cities (populated during generation)
// Used to break down GEO progress per-city for multi-city developers (DLF in NCR+Bangalore+Chennai)
export const AI_QUERY_CITIES = new Map<string, string>();

// ---------- Content Plan Generator ----------

/**
 * Generates a 4-week content plan for a specific project.
 * 100% dynamic — no templates, no hardcoded anything.
 */
export async function generateContentPlan(
  projectName: string,
  developerName: string,
  location: string,
  city: string,
  configurations: string,
  priceRange: string,
  usps: string
): Promise<ContentPlan> {
  // Get locality intelligence first
  const localityData = await searchLocality(city, location, projectName, configurations, priceRange);

  // Generate content plan
  const system = `You are Cabbge's content strategist for real estate. Create content plans that maximize SEO impact and social engagement. Be specific to the actual locality, market, and buyer demographics. Return valid JSON only.`;

  const prompt = `Create a 4-week content plan for:
- Project: ${projectName} by ${developerName}
- Location: ${location}, ${city}
- Configurations: ${configurations}
- Price: ${priceRange}
- USPs: ${usps}
- Nearby areas: ${localityData.nearbyAreas.join(", ")}
- Competing projects: ${localityData.competingProjects.join(", ")}
- Buyer profiles: ${localityData.buyerProfiles.map(b => b.type).join(", ")}
- Market insight: ${localityData.marketInsight}

Return JSON:
{
  "localityPages": [
    {
      "title": "SEO page title targeting a specific buyer query",
      "slug": "url-slug",
      "targetKeyword": "exact keyword to rank for",
      "searchVolume": "high|medium|low",
      "difficulty": "easy|medium|hard",
      "pageType": "locality|comparison|budget|guide|review"
    }
  ],
  "weeklyPlan": [
    {
      "week": 1,
      "blog": {"title": "...", "targetKeyword": "...", "outline": ["5 sections"]},
      "localityPage": {"title": "...", "slug": "..."},
      "socialPosts": 5
    }
  ],
  "socialCalendar": [
    {
      "platform": "linkedin|whatsapp|facebook",
      "type": "post|reel|story|broadcast",
      "title": "short title",
      "content": "full post content",
      "scheduledDay": "Week 1 Monday",
      "hashtags": ["optional"]
    }
  ]
}

Generate 10-15 locality pages, 4 weekly blog posts, and 12 social posts (3/week — mix of LinkedIn posts for the marketing head and WhatsApp broadcasts for the sales team). No Instagram — their agency handles that. Make everything hyper-specific to ${location}, ${city}. Reference real landmarks, infrastructure, and market conditions.`;

  const text = await aiComplete(system, prompt, 3500);
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  let plan: Partial<ContentPlan> = {};
  if (jsonMatch) {
    try { plan = JSON.parse(jsonMatch[0]); } catch { /* use defaults */ }
  }

  return {
    projectName,
    location,
    city,
    localityPages: plan.localityPages || localityData.suggestedPages,
    weeklyPlan: plan.weeklyPlan || [],
    socialCalendar: plan.socialCalendar || [],
  };
}
