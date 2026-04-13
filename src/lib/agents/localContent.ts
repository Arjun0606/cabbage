/**
 * Local Content Agent
 *
 * Generates GEO-optimized content using full brand context.
 * Every piece of content is structured to be cited by AI search engines.
 */

import { searchLocality } from "@/lib/agents/localityEngine";
import { aiComplete } from "@/lib/ai";

// ---------- Types ----------

export interface BrandContext {
  brandVoice?: string;
  brandValues?: string;
  brandVision?: string;
  targetAudience?: string;
  productInfo?: string;
  marketingStrategy?: string;
  amenities?: string;
  reraNumber?: string;
  status?: string;
  allProjects?: { name: string; location: string; configurations?: string; priceRange?: string; status?: string }[];
  competitors?: string[];
}

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
  usps: string,
  brandContext?: BrandContext
): Promise<LocalContentResult> {
  const localityData = await searchLocality(city, location, projectName, configurations, priceRange);

  // Build rich brand context block for the prompt
  const brandBlock = buildBrandBlock(developerName, brandContext);

  const system = `You are a GEO-optimized content strategist who deeply understands the real estate brand you're writing for. You write content that:
1. Gets CITED by ChatGPT and Google AI Overview (question-based H2s, 40-60 word answer blocks)
2. Reflects the brand's actual voice, values, and positioning
3. References real project details, not generic marketing language
Output valid JSON only.`;

  const prompt = `Generate marketing content for:
- Project: ${projectName} by ${developerName}
- Location: ${location}, ${city}
- Configurations: ${configurations || "Not specified"}
- Price Range: ${priceRange || "Not specified"}
- USPs: ${usps || "Not specified"}
${brandContext?.reraNumber ? `- RERA: ${brandContext.reraNumber}` : ""}
${brandContext?.amenities ? `- Amenities: ${brandContext.amenities}` : ""}
${brandContext?.status ? `- Project Status: ${brandContext.status}` : ""}

${brandBlock}

**Market Intelligence (from locality analysis):**
- Nearby areas: ${localityData.nearbyAreas.join(", ")}
- Competing projects: ${localityData.competingProjects.join(", ")}
- Buyer profiles: ${localityData.buyerProfiles.map((b: any) => `${b.type} (${b.preferredConfig}, ${b.budgetRange})`).join("; ")}
- Market insight: ${localityData.marketInsight}
${brandContext?.allProjects && brandContext.allProjects.length > 1 ? `\n**Other projects by ${developerName}:** ${brandContext.allProjects.filter(p => p.name !== projectName).map(p => `${p.name} in ${p.location}`).join(", ")}` : ""}
${brandContext?.competitors?.length ? `**Direct competitors:** ${brandContext.competitors.join(", ")}` : ""}

Return JSON:
{
  "blogTopics": [5 topics — each title MUST be a question buyers ask, with { "title": "question format", "targetKeyword", "estimatedWordCount": 1500-2000, "outline": [5 sections, each as a question] }],
  "linkedinPosts": [3 LinkedIn posts, 150-200 words each. Written in ${brandContext?.brandVoice ? "the brand's voice: " + brandContext.brandVoice.substring(0, 200) : "professional thought-leadership tone"}. Include 1 specific statistic, always use "${projectName}" by name],
  "whatsappMessages": [5 WhatsApp broadcasts, under 100 words each. Include price, location "${location}", ${brandContext?.reraNumber ? "RERA: " + brandContext.reraNumber : "and RERA number if available"}]
}

CRITICAL RULES:
1. Blog titles = questions buyers type into ChatGPT. "What is the price of 3BHK in ${location}?" NOT "Discover Your Dream Home"
2. Always use "${projectName}", "${developerName}", "${location}" — never "our project", "we", "they"
3. Content must reflect what ACTUALLY makes ${developerName} different (use the brand context above)
4. Every LinkedIn post needs a real data point about ${location} or ${city} market
5. WhatsApp messages should feel personal, include starting price ${priceRange ? "(" + priceRange + ")" : ""}`;

  const text = await aiComplete(system, prompt, 3000);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  let aiContent = { blogTopics: [], linkedinPosts: [], whatsappMessages: [] };
  if (jsonMatch) {
    try { aiContent = JSON.parse(jsonMatch[0]); } catch { /* use defaults */ }
  }

  const localityPages = localityData.suggestedPages.map(p => ({
    title: p.title,
    slug: p.slug,
    metaDescription: `${p.targetKeyword} — compare prices, amenities, and RERA-approved projects by ${developerName} in ${location}, ${city}.`,
    targetKeyword: p.targetKeyword,
    outline: [
      `What is the real estate market like in ${location}, ${city}?`,
      `What are the top projects and pricing in ${location}?`,
      `Why does ${projectName} by ${developerName} stand out?`,
      `What infrastructure and connectivity does ${location} offer?`,
      `How to book a site visit at ${projectName}?`,
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

function buildBrandBlock(developerName: string, ctx?: BrandContext): string {
  if (!ctx) return "";
  const parts: string[] = [];
  parts.push(`**Brand Context for ${developerName}:**`);
  if (ctx.brandVoice) parts.push(`- Brand Voice: ${ctx.brandVoice.substring(0, 500)}`);
  if (ctx.brandValues) parts.push(`- Brand Values: ${ctx.brandValues.substring(0, 500)}`);
  if (ctx.brandVision) parts.push(`- Vision: ${ctx.brandVision.substring(0, 300)}`);
  if (ctx.targetAudience) parts.push(`- Target Audience: ${ctx.targetAudience.substring(0, 500)}`);
  if (ctx.productInfo) parts.push(`- Product Details: ${ctx.productInfo.substring(0, 500)}`);
  if (ctx.marketingStrategy) parts.push(`- Strategy: ${ctx.marketingStrategy.substring(0, 300)}`);
  return parts.length > 1 ? parts.join("\n") : "";
}
