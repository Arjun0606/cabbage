import Anthropic from "@anthropic-ai/sdk";

// ---------- Types ----------

export interface LocalContentResult {
  projectName: string;
  location: string;
  city: string;
  localityPages: LocalityPage[];
  blogTopics: BlogTopic[];
  linkedinPosts: string[];
  instagramReels: ReelScript[];
  whatsappMessages: string[];
}

interface LocalityPage {
  title: string;
  slug: string;
  metaDescription: string;
  targetKeyword: string;
  outline: string[];
}

interface BlogTopic {
  title: string;
  targetKeyword: string;
  estimatedWordCount: number;
  outline: string[];
}

interface ReelScript {
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
}

import { getLocalities } from "@/data/localities";

// ---------- Programmatic Locality Pages ----------

function generateLocalityPages(
  projectName: string,
  location: string,
  city: string,
  configurations: string,
  priceRange: string
): LocalityPage[] {
  const localities = getLocalities(city);
  const nearbyLocalities = Object.entries(localities).find(([key]) =>
    location.toLowerCase().includes(key.toLowerCase())
  )?.[1] || [];

  const allLocations = [location, ...nearbyLocalities];
  const configs = configurations ? configurations.split(",").map((c) => c.trim()) : ["2BHK", "3BHK"];

  const pages: LocalityPage[] = [];

  // Location × Config pages
  for (const loc of allLocations.slice(0, 5)) {
    for (const config of configs.slice(0, 3)) {
      const keyword = `${config} apartments in ${loc} ${city}`;
      pages.push({
        title: `Best ${config} Apartments in ${loc}, ${city} | ${projectName}`,
        slug: `${config.toLowerCase()}-apartments-${loc.toLowerCase().replace(/\s+/g, "-")}-${city.toLowerCase()}`,
        metaDescription: `Discover premium ${config} apartments in ${loc}, ${city}. ${projectName} offers modern living with world-class amenities. Starting from ${priceRange || "competitive prices"}. RERA approved.`,
        targetKeyword: keyword,
        outline: [
          `Why ${loc} is the best location for homebuyers in ${city}`,
          `${projectName} — ${config} configurations and pricing`,
          `Amenities and lifestyle at ${projectName}`,
          `Connectivity: IT parks, schools, hospitals, metro near ${loc}`,
          `Investment potential: ${loc} property appreciation trends`,
          `How to book a site visit`,
        ],
      });
    }
  }

  // Comparison pages
  pages.push({
    title: `Top 10 Residential Projects in ${location}, ${city} (2026)`,
    slug: `best-residential-projects-${location.toLowerCase().replace(/\s+/g, "-")}-${city.toLowerCase()}-2026`,
    metaDescription: `Compare the best residential projects in ${location}, ${city}. Prices, amenities, RERA status, and expert ratings for ${city}'s top developments in 2026.`,
    targetKeyword: `best residential projects in ${location} ${city}`,
    outline: [
      `Overview of ${location} real estate market in 2026`,
      `Top 10 projects with pricing comparison table`,
      `${projectName} — why it stands out`,
      `RERA verification guide for all listed projects`,
      `How to choose the right project for your budget`,
      `Expert tips for first-time homebuyers in ${location}`,
    ],
  });

  // Budget-based pages
  const budgetRanges = ["under 50 lakhs", "under 80 lakhs", "under 1 crore", "1 to 2 crore"];
  for (const budget of budgetRanges.slice(0, 2)) {
    pages.push({
      title: `Apartments in ${location} ${budget} | ${city} Real Estate`,
      slug: `apartments-${location.toLowerCase().replace(/\s+/g, "-")}-${budget.replace(/\s+/g, "-")}`,
      metaDescription: `Find the best apartments in ${location}, ${city} ${budget}. Compare prices, amenities, and RERA-approved projects including ${projectName}.`,
      targetKeyword: `apartments in ${location} ${city} ${budget}`,
      outline: [
        `Market overview: ${location} properties ${budget}`,
        `Best projects in this budget range`,
        `${projectName} — value proposition`,
        `Home loan EMI calculator for this budget`,
        `Tips for maximizing value in this price segment`,
      ],
    });
  }

  return pages;
}

// ---------- AI Content Generation ----------

export async function generateLocalContent(
  projectName: string,
  developerName: string,
  location: string,
  city: string,
  configurations: string,
  priceRange: string,
  usps: string
): Promise<LocalContentResult> {
  const anthropic = new Anthropic();

  // Generate programmatic locality pages
  const localityPages = generateLocalityPages(
    projectName, location, city, configurations, priceRange
  );

  // Generate blog topics + LinkedIn + Instagram + WhatsApp via AI
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    system: `You are a content strategist for Indian residential real estate. Generate marketing content for a specific project. Be specific to the location, use local landmarks, and write in a tone that resonates with Indian homebuyers. Mix English and Hindi/Telugu naturally where appropriate for social media content.

Output valid JSON only.`,
    messages: [{
      role: "user",
      content: `Generate marketing content for:
- Project: ${projectName} by ${developerName}
- Location: ${location}, ${city}
- Configurations: ${configurations}
- Price Range: ${priceRange}
- USPs: ${usps}

Return JSON with:
{
  "blogTopics": [5 SEO blog topics with { "title", "targetKeyword", "estimatedWordCount", "outline": [5 sections] }],
  "linkedinPosts": [3 LinkedIn posts for the developer's marketing head, 150-200 words each, professional but warm],
  "instagramReels": [3 reel scripts with { "hook" (first 3 seconds), "body" (15 seconds), "cta" (5 seconds), "hashtags": [8 hashtags] }],
  "whatsappMessages": [3 WhatsApp broadcast messages for the sales team to send to prospects, under 100 words each, with emojis sparingly]
}`
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  let aiContent = { blogTopics: [], linkedinPosts: [], instagramReels: [], whatsappMessages: [] };

  if (jsonMatch) {
    try {
      aiContent = JSON.parse(jsonMatch[0]);
    } catch {
      // Use defaults if parsing fails
    }
  }

  return {
    projectName,
    location,
    city,
    localityPages,
    blogTopics: aiContent.blogTopics || [],
    linkedinPosts: aiContent.linkedinPosts || [],
    instagramReels: aiContent.instagramReels || [],
    whatsappMessages: aiContent.whatsappMessages || [],
  };
}
