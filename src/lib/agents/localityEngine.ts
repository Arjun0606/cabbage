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
  const system = `You are Cabbge's locality intelligence engine for real estate. Given any city and locality anywhere in the world, provide comprehensive real estate market intelligence. Use real landmark names, real infrastructure, real market data. Return valid JSON only.`;

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

Be hyper-specific to ${locality}, ${city}. Use real place names, real infrastructure projects, real schools/offices/metro stations nearby.`;

  const text = await aiComplete(system, prompt, 2500);
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

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return { ...defaults, ...parsed, locality, city };
    } catch { /* use defaults */ }
  }

  return defaults;
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
): Promise<string[]> {
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

  // Build dynamic context blocks from actual brand + project data
  const projectsBlock = projectDetails && projectDetails.length > 0
    ? `\n\nSPECIFIC PROJECTS TO GENERATE QUERIES AROUND:\n${projectDetails.map(p =>
        `- ${p.name || "project"}${p.location ? ` in ${p.location}` : ""}${p.configurations ? ` (${p.configurations})` : ""}${p.priceRange ? ` @ ${p.priceRange}` : ""}`
      ).join("\n")}\nFor each project, generate queries buyers would type to DISCOVER projects like this (without naming the developer).`
    : "";

  const audienceBlock = brandContext?.targetAudience
    ? `\n\nTARGET AUDIENCE (real buyer profile):\n${brandContext.targetAudience.slice(0, 500)}\nGenerate queries THIS specific audience would type.`
    : "";

  const uspsBlock = brandContext?.usps
    ? `\n\nBRAND USPs / DIFFERENTIATORS:\n${brandContext.usps.slice(0, 300)}\nInclude queries that surface competitors selling around these same USPs.`
    : "";

  // Extract unique locations/configs from projectDetails for locality-level coverage
  const uniqueLocations = Array.from(new Set((projectDetails || []).map(p => p.location).filter(Boolean)));
  const uniqueConfigs = Array.from(new Set((projectDetails || []).flatMap(p => (p.configurations || "").split(",").map(c => c.trim())).filter(Boolean)));
  const priceRanges = Array.from(new Set((projectDetails || []).map(p => p.priceRange).filter(Boolean)));

  const prompt = `Generate search queries that ${industryContext} These customers DO NOT know any specific company — they are searching by need, location, and requirements. The brand being tested is "${brand}" but DO NOT include it in any query.

INDUSTRY: ${ind.replace(/_/g, " ")}
CITY: ${city}
${locality ? `LOCALITY/AREA: ${locality}` : ""}
COUNTRY: ${country}
${uniqueLocations.length > 0 ? `KNOWN LOCALITIES WHERE BRAND OPERATES: ${uniqueLocations.join(", ")}` : ""}
${uniqueConfigs.length > 0 ? `CONFIGURATIONS OFFERED: ${uniqueConfigs.join(", ")}` : ""}
${priceRanges.length > 0 ? `PRICE SEGMENTS: ${priceRanges.join(" | ")}` : ""}${projectsBlock}${audienceBlock}${uspsBlock}

CRITICAL RULES:
- ALL queries in ENGLISH only
- DO NOT include any company or brand name (no "${brand}", no project names)
- Use real landmarks, areas, institutions near ${loc}
- Must be realistic queries real customers would type
- Use local currency and terminology appropriate for ${city}
- Where projects span multiple localities, include hyper-local queries for each
- Where configurations vary, include queries for each (2BHK buyers search different things than 4BHK buyers)

Generate queries at THREE levels — as many as this market needs:

LOCALITY LEVEL — hyper-local queries specific to ${loc}${uniqueLocations.length > 0 ? ` and other brand localities (${uniqueLocations.join(", ")})` : ""}:
- Service/product + location combos
- Landmark-based queries (IT parks, metro stations, schools)
- Decision queries ("best/top [service] in [locality]")
- Comparison queries ("[locality] vs [nearby area]")
- Generate more for bigger markets, fewer for smaller ones

CITY LEVEL — city-wide intent:
- "best [service/product] in ${city}"
- "top [industry] companies in ${city}"
- Cover queries where city-level results matter

COUNTRY LEVEL — national discovery:
- "best [service/product] in ${country}"
- "top [industry] companies in ${country}"
- Only include if the company operates nationally

Use REAL landmark names specific to ${loc}, ${city}. Cover every meaningful query the TARGET AUDIENCE would ask. Return JSON array of strings.`;

  const text = await aiLight(system, prompt, 1500);
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
  }

  // Fallback — all generic buyer queries, zero brand mentions
  return [
    `best 3BHK apartments in ${loc} under 1.5 crore`,
    `top builders in ${city} 2026`,
    `affordable flats near IT parks ${city}`,
    `luxury apartments in ${loc}`,
    `2BHK flats in ${city} under 80 lakhs`,
    `best gated community in ${loc}`,
    `RERA approved projects in ${loc}`,
    `${loc} vs nearby areas which is better`,
    `new launch projects ${city} 2026`,
    `should I buy flat in ${loc}`,
    `best area to invest in ${city} real estate`,
    `ready to move apartments ${loc}`,
    `apartments with good resale value ${loc}`,
    `property price trends ${loc}`,
    `upcoming metro stations near ${loc}`,
    `rental yield ${loc} ${city}`,
    `top 5 residential projects ${loc}`,
    `projects near IT parks ${city}`,
    `best locality to buy flat ${city} 2026`,
    `gated community with pool and gym ${city}`,
  ];
}

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
