/**
 * Local Content Agent
 *
 * Thin wrapper around the locality engine for backward compatibility
 * with the /api/local-content route. All logic is dynamic via AI.
 */

import { searchLocality } from "@/lib/agents/localityEngine";
import { aiComplete } from "@/lib/ai";

// ---------- Types ----------

export interface LocalContentResult {
  projectName: string;
  location: string;
  city: string;
  localityPages: { title: string; slug: string; metaDescription: string; targetKeyword: string; outline: string[] }[];
  blogTopics: { title: string; targetKeyword: string; estimatedWordCount: number; outline: string[] }[];
  linkedinPosts: string[];
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
  const system = `You are a GEO-optimized content strategist for Indian real estate. Every piece of content you create is designed to be CITED BY AI SEARCH ENGINES (ChatGPT, Google AI Overview). Output valid JSON only.`;

  const prompt = `Generate marketing content for:
- Project: ${projectName} by ${developerName}
- Location: ${location}, ${city}
- Configurations: ${configurations}
- Price Range: ${priceRange}
- USPs: ${usps}
- Nearby areas: ${localityData.nearbyAreas.join(", ")}
- Competing projects: ${localityData.competingProjects.join(", ")}

Return JSON:
{
  "blogTopics": [5 topics — each title MUST be a question buyers ask (e.g., "What is the price of 3BHK flats in ${location}?"), with { "title": "question format", "targetKeyword", "estimatedWordCount": 1500-2000, "outline": [5 sections, each as a question] }],
  "linkedinPosts": [3 LinkedIn posts for the marketing head, 150-200 words each. Each must include: 1 specific statistic (price/sq ft, growth %, distance), the full project name (never "our project"), and a clear insight — NOT marketing fluff],
  "whatsappMessages": [5 WhatsApp broadcasts, under 100 words each. Include specific price, location, and RERA number. Personal tone but factual, not salesy]
}

IMPORTANT: Blog topic titles must be QUESTIONS that home buyers type into ChatGPT/Google, not marketing headlines. Example: "What are the best 3BHK apartments near Hitech City under ₹1.5 Cr?" NOT "Discover Your Dream Home in Hitech City".`;

  const text = await aiComplete(system, prompt, 3000);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  let aiContent = { blogTopics: [], linkedinPosts: [], whatsappMessages: [] };
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
    whatsappMessages: aiContent.whatsappMessages || [],
  };
}
