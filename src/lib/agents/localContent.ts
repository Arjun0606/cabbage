/**
 * Local Content Agent
 *
 * Thin wrapper around the locality engine for backward compatibility
 * with the /api/local-content route. All logic is dynamic via AI.
 */

import { searchLocality } from "@/lib/agents/localityEngine";
import Anthropic from "@anthropic-ai/sdk";

// ---------- Types ----------

export interface LocalContentResult {
  projectName: string;
  location: string;
  city: string;
  localityPages: { title: string; slug: string; metaDescription: string; targetKeyword: string; outline: string[] }[];
  blogTopics: { title: string; targetKeyword: string; estimatedWordCount: number; outline: string[] }[];
  linkedinPosts: string[];
  instagramReels: { hook: string; body: string; cta: string; hashtags: string[] }[];
  whatsappMessages: string[];
}

// ---------- Main Function ----------

export async function generateLocalContent(
  projectName: string,
  developerName: string,
  location: string,
  city: string,
  configurations: string,
  priceRange: string,
  usps: string
): Promise<LocalContentResult> {
  // Use the locality engine for page suggestions
  const localityData = await searchLocality(city, location, projectName, configurations, priceRange);

  // Generate social/blog content via AI
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: `You are a content strategist for real estate. Generate marketing content for a specific project. Be specific to the location and use local context. Output valid JSON only.`,
    messages: [{
      role: "user",
      content: `Generate marketing content for:
- Project: ${projectName} by ${developerName}
- Location: ${location}, ${city}
- Configurations: ${configurations}
- Price Range: ${priceRange}
- USPs: ${usps}
- Nearby areas: ${localityData.nearbyAreas.join(", ")}
- Competing projects: ${localityData.competingProjects.join(", ")}

Return JSON:
{
  "blogTopics": [5 topics with { "title", "targetKeyword", "estimatedWordCount", "outline": [5 sections] }],
  "linkedinPosts": [3 LinkedIn posts, 150-200 words each],
  "instagramReels": [3 reel scripts with { "hook", "body", "cta", "hashtags": [8] }],
  "whatsappMessages": [3 WhatsApp broadcasts under 100 words each]
}`
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  let aiContent = { blogTopics: [], linkedinPosts: [], instagramReels: [], whatsappMessages: [] };
  if (jsonMatch) {
    try { aiContent = JSON.parse(jsonMatch[0]); } catch { /* use defaults */ }
  }

  // Convert locality engine pages to local content format
  const localityPages = localityData.suggestedPages.map(p => ({
    title: p.title,
    slug: p.slug,
    metaDescription: `Find ${p.targetKeyword}. Compare prices, amenities, and RERA-approved projects.`,
    targetKeyword: p.targetKeyword,
    outline: [
      `Overview of ${location}, ${city} real estate market`,
      `Top projects and pricing comparison`,
      `Why ${projectName} stands out`,
      `Nearby infrastructure and connectivity`,
      `How to book a site visit`,
    ],
  }));

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
