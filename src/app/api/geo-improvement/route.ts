import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

// ---------- Types ----------

interface Project {
  name: string;
  location: string;
}

interface ActionItem {
  action: string;
  why: string;
  cabbageFeature?: string;
  priority: "must-do" | "should-do" | "nice-to-have";
  timeEstimate: string;
}

interface Week {
  week: number;
  theme: string;
  actions: ActionItem[];
}

interface GeoImprovementPlan {
  currentScore: number;
  targetScore: number;
  weeks: Week[];
  quickWins: string[];
  expectedTimeline: string;
}

// ---------- Route Handler ----------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      companyName,
      website,
      city,
      currentScore,
      currentMentionRate,
      missingQueries,
      failedChecks,
      projects,
    } = body;

    if (!companyName || !website) {
      return NextResponse.json(
        { error: "companyName and website are required" },
        { status: 400 }
      );
    }

    const score = currentScore ?? 0;
    const mentionRate = currentMentionRate ?? 0;

    const projectList = (projects || [])
      .map((p: Project) => `- ${p.name} (${p.location})`)
      .join("\n");

    const missingList = (missingQueries || [])
      .map((q: string) => `- "${q}"`)
      .join("\n");

    const failedList = (failedChecks || [])
      .map((c: string) => `- ${c}`)
      .join("\n");

    const systemPrompt = `You are a GEO (Generative Engine Optimization) specialist for Indian real estate companies. You create detailed, prioritized action plans to improve AI visibility — meaning how often AI search engines (ChatGPT, Perplexity, Google AI Overview, Gemini) mention and recommend a real estate brand.

You MUST return valid JSON only. No markdown fences, no extra text.`;

    const userPrompt = `Create a 4-week GEO improvement action plan for:

**Company:** ${companyName}
**Website:** ${website}
**City:** ${city || "Not specified"}
**Current AI Visibility Score:** ${score}%
**Current Mention Rate:** ${mentionRate}%
**Projects:**
${projectList || "No projects specified"}

**Queries where AI does NOT mention this brand:**
${missingList || "Not specified"}

**Failed checks:**
${failedList || "Not specified"}

Return this exact JSON structure:
{
  "currentScore": ${score},
  "targetScore": <realistic target after 4 weeks — typically current + 30-50 points, max 70>,
  "weeks": [
    {
      "week": 1,
      "theme": "Foundation — Become Discoverable (${score}% → ${Math.min(score + 20, 100)}%)",
      "actions": [
        {
          "action": "<specific, clear action in non-technical language>",
          "why": "<why this helps AI visibility — which platforms it impacts>",
          "cabbageFeature": "<which CabbageSEO tab/feature generates this, or null>",
          "priority": "must-do",
          "timeEstimate": "5 min"
        }
      ]
    },
    {
      "week": 2,
      "theme": "Content Depth — Give AI More to Reference (${Math.min(score + 20, 100)}% → ${Math.min(score + 35, 100)}%)",
      "actions": [...]
    },
    {
      "week": 3,
      "theme": "Authority Building — Become the Recommended Choice (${Math.min(score + 35, 100)}% → ${Math.min(score + 50, 100)}%)",
      "actions": [...]
    },
    {
      "week": 4,
      "theme": "Monitoring & Refinement",
      "actions": [...]
    }
  ],
  "quickWins": ["<3-5 things they can do RIGHT NOW in under 10 minutes each>"],
  "expectedTimeline": "<realistic timeline description>"
}

IMPORTANT GUIDELINES:
- Week 1 actions (Foundation): Upload llms.txt (CabbageSEO generates it), add FAQ schema to homepage and project pages (use Schema tab), add RealEstateListing structured data (use Schema tab), fix meta descriptions to be keyword-rich, ensure each project page has 1000+ words of unique content.
- Week 2 actions (Content Depth): Publish 3-5 location guide articles (use Article Writer), publish comparison articles vs nearby projects, add detailed amenity descriptions not just bullet lists, create "Why [Location]" pages for each project micro-market.
- Week 3 actions (Authority Building): Get listed on property portals (99acres, MagicBricks, Housing.com) with full descriptions, create a Wikipedia-style About page, publish thought leadership on LinkedIn, get press coverage or builder association mentions.
- Week 4 actions (Monitoring): Re-run AI Visibility scan, identify which queries now mention the brand, double down on content for remaining missing queries, update FAQ pages with questions AI models are asking.

For each action specify:
- priority: "must-do" / "should-do" / "nice-to-have"
- timeEstimate: "5 min" / "15 min" / "30 min" / "1 hour" / "2 hours"
- cabbageFeature: reference specific CabbageSEO features like "llms.txt Generator", "Schema Generator", "Article Writer", "AI Visibility Scanner", "Content Planner", or null if it's a manual action

Include 5-6 actions per week. Personalize based on the company name, city, projects, and missing queries provided.

Quick wins should be things they can literally do in the next 10 minutes using CabbageSEO.`;

    const raw = await aiComplete(systemPrompt, userPrompt, 3000);

    // Parse the AI response
    let plan: GeoImprovementPlan;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      plan = JSON.parse(cleaned);
    } catch {
      // Fallback: return a sensible default plan
      plan = buildFallbackPlan(companyName, website, city, score, projects || []);
    }

    // Ensure score fields are present
    plan.currentScore = score;
    if (!plan.targetScore) {
      plan.targetScore = Math.min(score + 45, 70);
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("GEO improvement error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GEO improvement plan generation failed" },
      { status: 500 }
    );
  }
}

// ---------- Fallback Plan ----------

function buildFallbackPlan(
  companyName: string,
  website: string,
  city: string,
  currentScore: number,
  projects: Project[]
): GeoImprovementPlan {
  const projectNames = projects.map((p) => p.name).join(", ") || "your projects";

  return {
    currentScore,
    targetScore: Math.min(currentScore + 45, 70),
    weeks: [
      {
        week: 1,
        theme: `Foundation — Become Discoverable (${currentScore}% → ${Math.min(currentScore + 20, 100)}%)`,
        actions: [
          {
            action: `Upload llms.txt to ${website}/llms.txt — this tells AI crawlers what ${companyName} is about`,
            why: "AI models like ChatGPT and Perplexity check for llms.txt to understand your company. Without it, they have no structured way to learn about your projects.",
            cabbageFeature: "llms.txt Generator",
            priority: "must-do",
            timeEstimate: "5 min",
          },
          {
            action: `Add FAQ schema markup to your homepage and each project page`,
            why: "FAQ schema helps Google AI Overview and Gemini pull your answers directly when users ask questions about projects in ${city}.",
            cabbageFeature: "Schema Generator",
            priority: "must-do",
            timeEstimate: "15 min",
          },
          {
            action: `Add RealEstateListing structured data to each project page`,
            why: "Structured data helps AI models understand your project details (price, location, configurations) in a machine-readable format.",
            cabbageFeature: "Schema Generator",
            priority: "must-do",
            timeEstimate: "15 min",
          },
          {
            action: `Rewrite meta descriptions for all project pages to include city, location, price range, and configurations`,
            why: "AI models often use meta descriptions as a summary. Generic descriptions like 'Welcome to our project' get ignored.",
            cabbageFeature: "",
            priority: "must-do",
            timeEstimate: "30 min",
          },
          {
            action: `Ensure every project page has at least 1000 words of unique, detailed content`,
            why: "AI models prefer pages with comprehensive information. Thin pages with just a form and bullet points rarely get cited.",
            cabbageFeature: "Article Writer",
            priority: "should-do",
            timeEstimate: "2 hours",
          },
        ],
      },
      {
        week: 2,
        theme: `Content Depth — Give AI More to Reference (${Math.min(currentScore + 20, 100)}% → ${Math.min(currentScore + 35, 100)}%)`,
        actions: [
          {
            action: `Publish 3-5 location guide articles for areas where ${projectNames} are located`,
            why: "When someone asks 'best areas to buy in ${city}', AI models look for comprehensive location guides. These articles make you the source.",
            cabbageFeature: "Article Writer",
            priority: "must-do",
            timeEstimate: "1 hour",
          },
          {
            action: `Publish comparison articles: '${projects[0]?.name || "Your Project"} vs other projects in ${projects[0]?.location || city}'`,
            why: "Comparison queries are extremely common in AI search. If you publish the comparison, AI cites your version.",
            cabbageFeature: "Article Writer",
            priority: "should-do",
            timeEstimate: "1 hour",
          },
          {
            action: `Convert bullet-point amenity lists into detailed amenity descriptions with photos`,
            why: "AI models extract and summarize descriptive text. Bullet points like 'Swimming Pool, Gym' give AI nothing useful to cite.",
            cabbageFeature: "",
            priority: "should-do",
            timeEstimate: "2 hours",
          },
          {
            action: `Create 'Why ${projects[0]?.location || city}' micro-market guide pages`,
            why: "These pages target the exact queries AI models answer: 'Why should I buy in [location]?' — and your brand gets mentioned in the answer.",
            cabbageFeature: "Article Writer",
            priority: "should-do",
            timeEstimate: "1 hour",
          },
          {
            action: `Add a detailed pricing page with transparent price breakdowns per configuration`,
            why: "Price transparency signals credibility. AI models prefer citing sources that provide clear, detailed pricing.",
            cabbageFeature: "",
            priority: "nice-to-have",
            timeEstimate: "1 hour",
          },
        ],
      },
      {
        week: 3,
        theme: `Authority Building — Become the Recommended Choice (${Math.min(currentScore + 35, 100)}% → ${Math.min(currentScore + 50, 100)}%)`,
        actions: [
          {
            action: `Ensure ${companyName} is listed on 99acres, MagicBricks, and Housing.com with complete project descriptions`,
            why: "AI models cross-reference multiple sources. Being mentioned on property portals corroborates your brand and increases citation likelihood.",
            cabbageFeature: "",
            priority: "must-do",
            timeEstimate: "2 hours",
          },
          {
            action: `Create a comprehensive Wikipedia-style 'About ${companyName}' page with company history, milestones, and leadership`,
            why: "AI models heavily weight authoritative 'About' pages. A detailed company page helps models confidently recommend your brand.",
            cabbageFeature: "",
            priority: "should-do",
            timeEstimate: "2 hours",
          },
          {
            action: `Publish 2-3 thought leadership articles on LinkedIn about the ${city} real estate market`,
            why: "Perplexity and ChatGPT index LinkedIn content. Thought leadership positions ${companyName} as an authority in ${city} real estate.",
            cabbageFeature: "",
            priority: "should-do",
            timeEstimate: "2 hours",
          },
          {
            action: `Get mentioned in local press or builder association directories (CREDAI, NAREDCO)`,
            why: "Third-party mentions are the strongest signal for AI models. A press mention makes AI far more likely to recommend your brand.",
            cabbageFeature: "",
            priority: "nice-to-have",
            timeEstimate: "2 hours",
          },
          {
            action: `Collect and publish detailed customer testimonials with project names and locations`,
            why: "Testimonials add social proof that AI models can reference when recommending developers.",
            cabbageFeature: "",
            priority: "nice-to-have",
            timeEstimate: "1 hour",
          },
        ],
      },
      {
        week: 4,
        theme: "Monitoring & Refinement",
        actions: [
          {
            action: `Re-run the AI Visibility scan on CabbageSEO to measure your new score`,
            why: "You need to measure progress. The scan checks all major AI platforms and shows exactly which queries now mention ${companyName}.",
            cabbageFeature: "AI Visibility Scanner",
            priority: "must-do",
            timeEstimate: "5 min",
          },
          {
            action: `Review which queries now mention ${companyName} vs which still don't`,
            why: "This tells you where your content strategy is working and where you need to double down.",
            cabbageFeature: "AI Visibility Scanner",
            priority: "must-do",
            timeEstimate: "15 min",
          },
          {
            action: `For remaining missing queries, create targeted content pages addressing those exact questions`,
            why: "Each missing query is a specific content gap. Creating a page that answers that exact question is the fastest path to getting cited.",
            cabbageFeature: "Article Writer",
            priority: "should-do",
            timeEstimate: "2 hours",
          },
          {
            action: `Update FAQ sections with the actual questions AI models are asking about your projects`,
            why: "AI models often surface FAQ content directly. Aligning your FAQs with real AI queries increases match rate.",
            cabbageFeature: "Schema Generator",
            priority: "should-do",
            timeEstimate: "30 min",
          },
          {
            action: `Set up a monthly AI Visibility check schedule to track progress over time`,
            why: "GEO is not a one-time fix. Monthly monitoring ensures you stay visible as AI models update their knowledge.",
            cabbageFeature: "AI Visibility Scanner",
            priority: "nice-to-have",
            timeEstimate: "5 min",
          },
        ],
      },
    ],
    quickWins: [
      "Generate and upload llms.txt using CabbageSEO — takes 2 minutes",
      "Generate FAQ schema for your homepage using the Schema tab — paste it in your HTML head",
      "Generate RealEstateListing schema for your top project — paste it in the project page",
      "Rewrite your homepage meta description to include your brand name, city, and what you build",
      "Add your company name and project names to your page titles (many developers forget this)",
    ],
    expectedTimeline: `With consistent effort, ${companyName} can realistically move from ${currentScore}% to ${Math.min(currentScore + 45, 70)}% AI visibility within 4-6 weeks. The biggest jump (0% to 20%) happens in Week 1 just from llms.txt and structured data. Content depth in Weeks 2-3 compounds over time as AI models re-index.`,
  };
}
