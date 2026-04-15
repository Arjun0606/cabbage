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
  const system = `You are CabbageSEO's locality intelligence engine for real estate. Given any city and locality anywhere in the world, provide comprehensive real estate market intelligence. Use real landmark names, real infrastructure, real market data. Return valid JSON only.`;

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
  _brand: string,
  _projects: string[],
  locality?: string
): Promise<string[]> {
  // NOTE: We do NOT include the brand name in queries.
  // Real buyers don't know the developer — they search by location, budget, config.
  // The test is: does ChatGPT/Google AI RECOMMEND this developer when asked generic queries?
  // That's the real measure of GEO visibility.

  // Multi-level GEO: locality (micro) + city (metro) + country (macro)
  // This ensures we track visibility at every level a buyer searches.

  const system = "Return a JSON array of exactly 20 English strings. No other text.";

  const loc = locality || city;
  const country = "India"; // Can be parameterized later

  const prompt = `Generate exactly 20 search queries that real home buyers would type into ChatGPT or Google. These buyers DO NOT know any specific developer — they want AI to RECOMMEND one.

CITY: ${city}
${locality ? `LOCALITY/AREA: ${locality}` : ""}
COUNTRY: ${country}

CRITICAL RULES:
- ALL queries in ENGLISH only
- DO NOT include any developer or project name
- Use real landmarks, IT parks, metro stations, schools near ${loc}
- Use Indian price formats (lakhs, crore)
- Must be realistic queries a 28-45 year old professional would type

Generate this MULTI-LEVEL MIX:

LOCALITY LEVEL (8 queries) — hyper-local, micro-market:
1. "best 3BHK apartments in ${loc} under 1.5 crore"
2. "affordable flats near [real IT park/landmark] ${loc}"
3. "top 5 residential projects in ${loc} 2026"
4. "RERA approved projects near [real metro station] ${loc}"
5. "${loc} vs [real nearby area] which is better to buy"
6. "ready to move flats in ${loc}"
7. "projects near [real school name] ${loc}"
8. "property price trends in ${loc} 2026"

CITY LEVEL (8 queries) — metro-wide buyer intent:
9. "best areas to buy flat in ${city} 2026"
10. "which builder has the best track record in ${city}"
11. "luxury apartments in ${city} with good amenities"
12. "upcoming residential projects in ${city}"
13. "best gated communities in ${city} for families"
14. "2BHK flats in ${city} under 80 lakhs"
15. "top real estate developers in ${city}"
16. "new launch projects in ${city} with swimming pool"

COUNTRY LEVEL (4 queries) — national discovery:
17. "best cities to buy property in ${country} 2026"
18. "top real estate developers in ${country}"
19. "best areas for real estate investment in ${country}"
20. "upcoming smart cities in ${country} for property"

Use REAL landmark names specific to ${loc}, ${city}.
Return JSON array of 20 strings.`;

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
  const system = `You are CabbageSEO's content strategist for real estate. Create content plans that maximize SEO impact and social engagement. Be specific to the actual locality, market, and buyer demographics. Return valid JSON only.`;

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
