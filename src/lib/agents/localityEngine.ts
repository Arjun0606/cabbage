/**
 * Dynamic Locality Engine
 *
 * Unlike the static localities.ts file (which is a seed/fallback),
 * this engine dynamically discovers, suggests, and generates
 * locality-specific SEO content based on:
 * - User input (city, area, budget)
 * - Project locations (from onboarding)
 * - AI-powered discovery of nearby areas and buyer search patterns
 *
 * This is what makes CabbageSEO feel like it "knows" real estate.
 */

import Anthropic from "@anthropic-ai/sdk";
import { getLocalities, getNearbyAreas, LOCALITIES } from "@/data/localities";

// ---------- Types ----------

export interface LocalitySearchResult {
  locality: string;
  city: string;
  nearbyAreas: string[];
  buyerProfiles: BuyerProfile[];
  suggestedKeywords: string[];
  suggestedPages: SuggestedPage[];
  competingProjects: string[];
}

interface BuyerProfile {
  type: string; // "First-time buyer", "Upgrade buyer", "NRI investor", etc.
  searchBehavior: string;
  topKeywords: string[];
  preferredConfig: string;
  budgetRange: string;
}

interface SuggestedPage {
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

  // Programmatic pages (generated deterministically)
  localityPages: SuggestedPage[];

  // AI-generated content calendar
  weeklyPlan: WeeklyContent[];

  // Social media calendar
  socialCalendar: SocialPost[];
}

interface WeeklyContent {
  week: number;
  blog: { title: string; targetKeyword: string; outline: string[] };
  localityPage: { title: string; slug: string };
  socialPosts: number;
}

interface SocialPost {
  platform: "linkedin" | "instagram" | "whatsapp" | "facebook";
  type: "post" | "reel" | "story" | "broadcast";
  title: string;
  content: string;
  scheduledDay: string;
  hashtags?: string[];
}

// ---------- Locality Search & Discovery ----------

/**
 * Search for a locality and get comprehensive real estate intelligence.
 * Combines hardcoded data with AI-powered discovery.
 */
export async function searchLocality(
  city: string,
  locality: string,
  projectName?: string,
  configurations?: string,
  priceRange?: string
): Promise<LocalitySearchResult> {
  // First, check our hardcoded data
  const nearbyFromDb = getNearbyAreas(city, locality);

  // Then use AI to enrich with buyer profiles and keywords
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: `You are CabbageSEO's locality intelligence engine for Indian real estate. Given a city and locality, provide comprehensive real estate market intelligence. You know Indian cities deeply — microlocations, IT parks, schools, metro stations, buyer demographics, price trends.

Return valid JSON only.`,
    messages: [{
      role: "user",
      content: `Real estate intelligence for ${locality}, ${city}:
${projectName ? `Project: ${projectName}` : ""}
${configurations ? `Configurations: ${configurations}` : ""}
${priceRange ? `Price range: ${priceRange}` : ""}

Known nearby areas: ${nearbyFromDb.length > 0 ? nearbyFromDb.join(", ") : "discover them"}

Return JSON:
{
  "nearbyAreas": ["5-8 nearby residential areas buyers also consider"],
  "buyerProfiles": [
    {
      "type": "First-time buyer|Upgrade buyer|NRI investor|Retired couple|Young professional",
      "searchBehavior": "how they search online, what platforms",
      "topKeywords": ["3 keywords they'd search"],
      "preferredConfig": "2BHK|3BHK|4BHK|Villa",
      "budgetRange": "₹X - ₹Y"
    }
  ],
  "suggestedKeywords": ["15-20 high-intent real estate search keywords for this locality"],
  "suggestedPages": [
    {
      "title": "SEO page title",
      "slug": "url-friendly-slug",
      "targetKeyword": "primary keyword",
      "searchVolume": "high|medium|low",
      "difficulty": "easy|medium|hard",
      "pageType": "locality|comparison|budget|guide|review"
    }
  ],
  "competingProjects": ["5-8 known competing projects in this area"]
}

Be specific to ${city}. Use real landmark names, real IT park names, real school names. Don't be generic.`
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  let aiData = {
    nearbyAreas: nearbyFromDb,
    buyerProfiles: [],
    suggestedKeywords: [],
    suggestedPages: [],
    competingProjects: [],
  };

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      aiData = {
        nearbyAreas: parsed.nearbyAreas?.length ? parsed.nearbyAreas : nearbyFromDb,
        buyerProfiles: parsed.buyerProfiles || [],
        suggestedKeywords: parsed.suggestedKeywords || [],
        suggestedPages: parsed.suggestedPages || [],
        competingProjects: parsed.competingProjects || [],
      };
    } catch { /* use defaults */ }
  }

  return {
    locality,
    city,
    ...aiData,
  };
}

// ---------- Autocomplete ----------

/**
 * Returns locality suggestions as the user types.
 * Fast — uses only hardcoded data, no API calls.
 */
export function autocompleteLocality(
  query: string,
  city?: string
): { locality: string; city: string; nearbyCount: number }[] {
  const results: { locality: string; city: string; nearbyCount: number }[] = [];
  const q = query.toLowerCase().trim();

  if (!q) return [];

  const citiesToSearch = city
    ? { [city.toLowerCase()]: getLocalities(city) }
    : LOCALITIES;

  for (const [cityKey, localities] of Object.entries(citiesToSearch)) {
    for (const [locality, nearby] of Object.entries(localities)) {
      if (locality.toLowerCase().includes(q)) {
        results.push({
          locality,
          city: cityKey.replace(/_/g, " "),
          nearbyCount: nearby.length,
        });
      }
      // Also search in nearby areas
      for (const area of nearby) {
        if (area.toLowerCase().includes(q) && !results.find(r => r.locality === area)) {
          results.push({
            locality: area,
            city: cityKey.replace(/_/g, " "),
            nearbyCount: 0,
          });
        }
      }
    }
  }

  // Sort: exact prefix matches first, then contains
  return results
    .sort((a, b) => {
      const aPrefix = a.locality.toLowerCase().startsWith(q) ? 0 : 1;
      const bPrefix = b.locality.toLowerCase().startsWith(q) ? 0 : 1;
      return aPrefix - bPrefix || a.locality.localeCompare(b.locality);
    })
    .slice(0, 10);
}

// ---------- Budget Suggestions ----------

/**
 * Returns common budget ranges for a given city.
 * Used for programmatic page generation and keyword targeting.
 */
export function getBudgetRanges(city: string): { label: string; min: number; max: number }[] {
  const cityLower = city.toLowerCase();

  // Tier 1 cities — higher price ranges
  if (["mumbai", "delhi_ncr", "delhi ncr", "gurgaon", "noida"].includes(cityLower)) {
    return [
      { label: "under 50 lakhs", min: 0, max: 5000000 },
      { label: "50 lakhs to 1 crore", min: 5000000, max: 10000000 },
      { label: "1 to 2 crore", min: 10000000, max: 20000000 },
      { label: "2 to 5 crore", min: 20000000, max: 50000000 },
      { label: "5 crore and above", min: 50000000, max: 999999999 },
    ];
  }

  // Tier 1.5 — Bangalore, Pune
  if (["bangalore", "pune"].includes(cityLower)) {
    return [
      { label: "under 40 lakhs", min: 0, max: 4000000 },
      { label: "40 to 80 lakhs", min: 4000000, max: 8000000 },
      { label: "80 lakhs to 1.5 crore", min: 8000000, max: 15000000 },
      { label: "1.5 to 3 crore", min: 15000000, max: 30000000 },
      { label: "3 crore and above", min: 30000000, max: 999999999 },
    ];
  }

  // Tier 2 — Hyderabad, Chennai, Kolkata, Ahmedabad
  if (["hyderabad", "chennai", "kolkata", "ahmedabad"].includes(cityLower)) {
    return [
      { label: "under 30 lakhs", min: 0, max: 3000000 },
      { label: "30 to 60 lakhs", min: 3000000, max: 6000000 },
      { label: "60 lakhs to 1 crore", min: 6000000, max: 10000000 },
      { label: "1 to 2 crore", min: 10000000, max: 20000000 },
      { label: "2 crore and above", min: 20000000, max: 999999999 },
    ];
  }

  // Tier 3 — Kochi, Goa, others
  return [
    { label: "under 25 lakhs", min: 0, max: 2500000 },
    { label: "25 to 50 lakhs", min: 2500000, max: 5000000 },
    { label: "50 lakhs to 1 crore", min: 5000000, max: 10000000 },
    { label: "1 crore and above", min: 10000000, max: 999999999 },
  ];
}

// ---------- Content Plan Generator ----------

/**
 * Generates a 4-week content plan for a specific project.
 * Combines programmatic pages with AI-generated content calendar.
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
  // Get locality intelligence
  const localityData = await searchLocality(city, location, projectName, configurations, priceRange);
  const budgets = getBudgetRanges(city);

  // Generate programmatic locality pages
  const localityPages: SuggestedPage[] = localityData.suggestedPages.length > 0
    ? localityData.suggestedPages
    : generateDefaultPages(projectName, location, city, configurations, budgets);

  // Generate weekly content plan with AI
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    system: `You are CabbageSEO's content strategist for Indian real estate. Create a 4-week content plan that maximizes SEO impact and social engagement. Be specific to the locality and buyer demographics. Return valid JSON only.`,
    messages: [{
      role: "user",
      content: `Create a 4-week content plan for:
- Project: ${projectName} by ${developerName}
- Location: ${location}, ${city}
- Configurations: ${configurations}
- Price: ${priceRange}
- USPs: ${usps}
- Nearby areas: ${localityData.nearbyAreas.join(", ")}
- Competing projects: ${localityData.competingProjects.join(", ")}
- Buyer profiles: ${localityData.buyerProfiles.map(b => b.type).join(", ")}

Return JSON:
{
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
      "platform": "linkedin|instagram|whatsapp|facebook",
      "type": "post|reel|story|broadcast",
      "title": "short title",
      "content": "full post content (150-200 words for LinkedIn, 50-80 for others)",
      "scheduledDay": "Week 1 Monday|Week 1 Wednesday|etc",
      "hashtags": ["5-8 hashtags for Instagram only"]
    }
  ]
}

Generate exactly 4 weeks of plans with 5 social posts per week (mix of platforms). LinkedIn posts should be professional thought-leadership. Instagram should be visual-first with hooks. WhatsApp broadcasts should be short and personal. Make content hyper-local — mention specific landmarks, IT parks, schools, metro stations near ${location}.`
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  let plan = { weeklyPlan: [] as WeeklyContent[], socialCalendar: [] as SocialPost[] };
  if (jsonMatch) {
    try { plan = JSON.parse(jsonMatch[0]); } catch { /* use defaults */ }
  }

  return {
    projectName,
    location,
    city,
    localityPages,
    weeklyPlan: plan.weeklyPlan || [],
    socialCalendar: plan.socialCalendar || [],
  };
}

function generateDefaultPages(
  _projectName: string,
  location: string,
  city: string,
  configurations: string,
  budgets: { label: string }[]
): SuggestedPage[] {
  const configs = configurations ? configurations.split(",").map(c => c.trim()) : ["2BHK", "3BHK"];
  const pages: SuggestedPage[] = [];

  // Config × location pages
  for (const config of configs.slice(0, 3)) {
    pages.push({
      title: `Best ${config} Apartments in ${location}, ${city}`,
      slug: `${config.toLowerCase()}-apartments-${location.toLowerCase().replace(/\s+/g, "-")}-${city.toLowerCase()}`,
      targetKeyword: `${config} apartments in ${location} ${city}`,
      searchVolume: "high",
      difficulty: "medium",
      pageType: "locality",
    });
  }

  // Budget pages
  for (const budget of budgets.slice(0, 3)) {
    pages.push({
      title: `Apartments in ${location} ${budget.label} | ${city}`,
      slug: `apartments-${location.toLowerCase().replace(/\s+/g, "-")}-${budget.label.replace(/\s+/g, "-")}`,
      targetKeyword: `apartments in ${location} ${city} ${budget.label}`,
      searchVolume: "medium",
      difficulty: "easy",
      pageType: "budget",
    });
  }

  // Comparison page
  pages.push({
    title: `Top 10 Residential Projects in ${location}, ${city} (2026)`,
    slug: `best-projects-${location.toLowerCase().replace(/\s+/g, "-")}-${city.toLowerCase()}-2026`,
    targetKeyword: `best residential projects ${location} ${city} 2026`,
    searchVolume: "high",
    difficulty: "hard",
    pageType: "comparison",
  });

  // Guide page
  pages.push({
    title: `Complete Guide to Buying a Home in ${location}, ${city}`,
    slug: `home-buying-guide-${location.toLowerCase().replace(/\s+/g, "-")}-${city.toLowerCase()}`,
    targetKeyword: `buying home ${location} ${city} guide`,
    searchVolume: "medium",
    difficulty: "easy",
    pageType: "guide",
  });

  return pages;
}
