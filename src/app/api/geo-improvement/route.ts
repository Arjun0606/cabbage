import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";
import { formatWritingInstructions } from "@/lib/writingInstructions";
import { getTopIndianPropertyPortals } from "@/lib/marketKnowledge";

/**
 * 30-day GEO improvement plan generator.
 *
 * Every tab label / feature reference flows through TAB_LABELS below,
 * matching the actual UI. Portal names are discovered live (not
 * hardcoded 99acres / MagicBricks / Housing.com in the prompt). Dead
 * features (Construction Updates) are gone.
 */

// Canonical tab labels — keep in sync with AnalyticsPanel.tsx TabsList.
const TAB = {
  overview: "Overview tab",
  aiSearch: "AI Search tab",
  content: "Content tab",
  portals: "Portals & Ads tab",
  report: "Report tab",
  locality: "Locality tab",
  technical: "Technical tab",
} as const;

interface ActionItem {
  day: number;
  action: string;
  why: string;
  cabbageFeature: string;
  priority: "must-do" | "should-do" | "nice-to-have";
  timeEstimate: string;
  category: "technical" | "content" | "authority" | "monitoring";
}

interface GeoImprovementPlan {
  currentScore: number;
  targetScore: number;
  days: ActionItem[];
  quickWins: string[];
  expectedTimeline: string;
  weekSummaries: { week: number; theme: string; expectedScore: number }[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, website, city, currentScore, currentMentionRate, missingQueries, failedChecks, projects, writingInstructions } = body;

    if (!companyName || !website) {
      return NextResponse.json({ error: "companyName and website are required" }, { status: 400 });
    }

    const score = currentScore ?? 0;
    const projectList = (projects || []).map((p: any) => `- ${p.name} (${p.location})`).join("\n");
    const missingList = (missingQueries || []).map((q: string) => `- "${q}"`).join("\n");
    const failedList = (failedChecks || []).map((c: string) => `- ${c}`).join("\n");

    // Discover top Indian property portals live — feeds days 15-17 + 24
    // without hardcoding brand names into the prompt.
    const portals = await getTopIndianPropertyPortals();
    const topPortalNames = portals.slice(0, 3).map((p) => p.name);
    const portalLine = topPortalNames.length > 0
      ? topPortalNames.join(", ")
      : "the top Indian residential property portals for your city";

    const systemPrompt = `You are a GEO specialist for Indian real estate. You create 30-day daily action plans. Return valid JSON only.`;

    const userPrompt = `Create a 30-day DAILY action plan for ${companyName} (${website}) in ${city || "India"}.
Current AI visibility: ${score}%. Mention rate: ${currentMentionRate || 0}%.
Projects: ${projectList || "Not specified"}
Missing AI queries: ${missingList || "Not specified"}
Failed checks: ${failedList || "Not specified"}

Top Indian property portals for this market (live list, use these names when referencing portals — do NOT substitute others): ${portalLine}

Return JSON:
{
  "currentScore": ${score},
  "targetScore": <realistic target based on gaps + market competition in ${city || "India"}>,
  "weekSummaries": [
    { "week": 1, "theme": "Foundation — Technical SEO & AI Readiness", "expectedScore": <realistic> },
    { "week": 2, "theme": "Content — Location Pages & Articles", "expectedScore": <realistic> },
    { "week": 3, "theme": "Authority — Portals, GBP & Brand Mentions", "expectedScore": <realistic> },
    { "week": 4, "theme": "Optimize — Measure, Fix Gaps, Double Down", "expectedScore": <realistic> }
  ],
  "days": [ /* exactly 30 entries, one per day */ ],
  "quickWins": ["5 things to do TODAY"],
  "expectedTimeline": "<realistic — do NOT use a fixed +45 formula>"
}

RULES:
- Exactly 30 days, one clear action per day.
- Each action takes 15-45 minutes MAX.
- cabbageFeature must use EXACT tab labels from this list: "${TAB.overview}", "${TAB.aiSearch}", "${TAB.content}", "${TAB.portals}", "${TAB.report}", "${TAB.locality}", "${TAB.technical}". For specific tools inside a tab, append " → [Tool]" e.g. "${TAB.aiSearch} → Citability Audit".
- For manual actions not in Cabbge, say "Manual — [where to do it]".
- When referencing Indian property portals, use ONLY the names from the "Top Indian property portals" list above.
- Categories: "technical", "content", "authority", "monitoring".

Rough structure (adapt to their situation):
Week 1 (Days 1-7) — Technical Foundation: llms.txt, schema, crawler access, citability audit, meta descriptions, full audit.
Week 2 (Days 8-14) — Content Depth: locality guides, investment articles, comparison pieces, buyer guides, FAQ pages, re-scan.
Week 3 (Days 15-21) — Authority: portal listings (use the discovered portal names), GBP, LinkedIn, brand presence scan, channel partner pack.
Week 4 (Days 22-28) — Optimize & Scale: festive campaigns, 2nd location guide, additional portal passes, ads, neighborhood analysis, re-scan.
Days 29-30 — Report & Plan.

Personalise everything to ${companyName}, ${city}, and the projects + missing queries above.
${formatWritingInstructions(writingInstructions, "geoImprovement", "GEO improvement plan")}`;

    const raw = await aiComplete(systemPrompt, userPrompt, 4000);

    let plan: GeoImprovementPlan;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      plan = JSON.parse(cleaned);
    } catch {
      plan = buildFallbackPlan(companyName, city, score, projects || [], topPortalNames);
    }

    plan.currentScore = score;
    if (!plan.targetScore) plan.targetScore = realisticTarget(score);

    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Plan generation failed" },
      { status: 500 }
    );
  }
}

function realisticTarget(currentScore: number): number {
  const headroom = Math.max(0, 100 - currentScore);
  const gain = Math.max(10, Math.round(headroom * 0.4));
  return Math.min(currentScore + gain, 85);
}

function buildFallbackPlan(
  companyName: string,
  city: string,
  currentScore: number,
  projects: any[],
  topPortalNames: string[]
): GeoImprovementPlan {
  const projectName = projects[0]?.name || companyName;
  const location = projects[0]?.location || city || "your city";

  // First three discovered portals — used for days 15-17 + 24. If
  // discovery came back empty (e.g. no OpenAI key) we fall back to
  // generic "property portal" copy rather than invented brand names.
  const p1 = topPortalNames[0] || "your top property portal";
  const p2 = topPortalNames[1] || "the #2 portal in your market";
  const p3 = topPortalNames[2] || "the #3 portal in your market";

  const days: ActionItem[] = [
    { day: 1, action: `Upload llms.txt to ${companyName}'s website root`, why: "Tells AI crawlers about your brand — #1 GEO quick win.", cabbageFeature: `${TAB.aiSearch} → Generate llms.txt`, priority: "must-do", timeEstimate: "10 min", category: "technical" },
    { day: 2, action: `Add RealEstateListing + Organization schema to homepage`, why: "Structured data helps AI understand your projects in machine-readable format.", cabbageFeature: `${TAB.content} → Schema`, priority: "must-do", timeEstimate: "15 min", category: "technical" },
    { day: 3, action: `Add FAQ schema to ${projectName} project page`, why: "FAQ schema gets directly pulled into Google AI Overviews.", cabbageFeature: `${TAB.content} → Schema`, priority: "must-do", timeEstimate: "15 min", category: "technical" },
    { day: 4, action: `Check robots.txt — ensure GPTBot and Google-Extended are NOT blocked`, why: "If you block AI crawlers, no amount of content will help.", cabbageFeature: `${TAB.aiSearch} → Crawler Access`, priority: "must-do", timeEstimate: "10 min", category: "technical" },
    { day: 5, action: `Run citability audit and rewrite your worst page's headings as questions`, why: "Question-based H2s are what Google AI Overviews extract.", cabbageFeature: `${TAB.aiSearch} → Citability Audit`, priority: "must-do", timeEstimate: "30 min", category: "technical" },
    { day: 6, action: `Rewrite meta descriptions for all project pages — include city, config, price`, why: "AI models use meta descriptions as summaries — generic ones get ignored.", cabbageFeature: "Manual — your CMS", priority: "must-do", timeEstimate: "30 min", category: "technical" },
    { day: 7, action: `Run full SEO audit and fix top 3 critical issues`, why: "Technical SEO is the foundation — broken pages can't rank anywhere.", cabbageFeature: `${TAB.overview} → Run Audit`, priority: "must-do", timeEstimate: "45 min", category: "technical" },
    { day: 8, action: `Write locality guide: "Living in ${location} — Complete Guide"`, why: "Location guides are the #1 content type that AI cites for area queries.", cabbageFeature: `${TAB.content} → Full Articles → Locality Guide`, priority: "must-do", timeEstimate: "20 min", category: "content" },
    { day: 9, action: `Write "Why Invest in ${location}" article`, why: "Investment articles get cited when buyers ask ChatGPT about property investment.", cabbageFeature: `${TAB.content} → Full Articles → Investment`, priority: "must-do", timeEstimate: "20 min", category: "content" },
    { day: 10, action: `Write comparison article: ${projectName} vs top 2 competitors`, why: "Comparison content is exactly what AI recommends when buyers ask 'which is better'.", cabbageFeature: `${TAB.content} → Full Articles → Comparison`, priority: "must-do", timeEstimate: "20 min", category: "content" },
    { day: 11, action: `Write buyer guide for ${city}`, why: "Buyer guides answer process questions — RERA, documentation, loans — that AI gets asked constantly.", cabbageFeature: `${TAB.content} → Full Articles → Buyer Guide`, priority: "should-do", timeEstimate: "20 min", category: "content" },
    { day: 12, action: `Write NRI buyer guide for ${projectName}`, why: "NRI queries are high-intent and underserved in AI answers.", cabbageFeature: `${TAB.content} → Full Articles → NRI Guide`, priority: "should-do", timeEstimate: "20 min", category: "content" },
    { day: 13, action: `Create FAQ page with 20 questions buyers ask about ${projectName}`, why: "FAQ pages with question-answer pairs are the most-cited format by AI.", cabbageFeature: `${TAB.content} → Full Articles → Buyer Guide`, priority: "must-do", timeEstimate: "30 min", category: "content" },
    { day: 14, action: `Re-run AI visibility check — measure improvement from Day 1`, why: "Track your progress — you should see readiness score jump significantly.", cabbageFeature: `${TAB.aiSearch} → Check AI Visibility`, priority: "must-do", timeEstimate: "5 min", category: "monitoring" },
    { day: 15, action: `Optimize ${p1} listing for ${projectName}`, why: "Portal listings feed into AI answers — optimized descriptions rank better.", cabbageFeature: `${TAB.portals} → Portal Optimizer`, priority: "must-do", timeEstimate: "20 min", category: "authority" },
    { day: 16, action: `Optimize ${p2} listing for ${projectName}`, why: "Second portal = second pipeline of buyers. ChatGPT cites multiple portal pages per answer.", cabbageFeature: `${TAB.portals} → Portal Optimizer`, priority: "must-do", timeEstimate: "20 min", category: "authority" },
    { day: 17, action: `Optimize ${p3} listing for ${projectName}`, why: "More portal presence = higher chance of AI citing you.", cabbageFeature: `${TAB.portals} → Portal Optimizer`, priority: "should-do", timeEstimate: "20 min", category: "authority" },
    { day: 18, action: `Update Google Business Profile with full description and photos`, why: "Google AI Overviews draws heavily from Google Business Profile data.", cabbageFeature: "Manual — business.google.com", priority: "must-do", timeEstimate: "30 min", category: "authority" },
    { day: 19, action: `Publish 2 LinkedIn posts about ${projectName}`, why: "LinkedIn content builds brand authority that AI models recognize.", cabbageFeature: `${TAB.content} → Content Topics`, priority: "should-do", timeEstimate: "15 min", category: "authority" },
    { day: 20, action: `Run brand presence scan — identify remaining gaps`, why: "Check which platforms still don't mention your brand.", cabbageFeature: `${TAB.aiSearch} → Brand Presence`, priority: "should-do", timeEstimate: "5 min", category: "monitoring" },
    { day: 21, action: `Send channel partner content pack to top 5 brokers`, why: "Broker mentions and referrals create organic brand signals AI picks up.", cabbageFeature: `${TAB.content} → Channel Partners`, priority: "should-do", timeEstimate: "15 min", category: "authority" },
    { day: 22, action: `Generate festive campaign content for the next upcoming festival`, why: "Seasonal content shows freshness — AI models prefer recently updated sites.", cabbageFeature: `${TAB.content} → Festive Campaigns`, priority: "nice-to-have", timeEstimate: "15 min", category: "content" },
    { day: 23, action: `Write locality guide for 2nd project location`, why: "Each location guide captures a new set of buyer queries in AI.", cabbageFeature: `${TAB.content} → Full Articles → Locality Guide`, priority: "should-do", timeEstimate: "20 min", category: "content" },
    { day: 24, action: `Refresh ${p1} + ${p2} listings with the latest content`, why: "Portal algorithms boost recently-updated listings.", cabbageFeature: `${TAB.portals} → Portal Optimizer`, priority: "should-do", timeEstimate: "30 min", category: "authority" },
    { day: 25, action: `Generate Google + Meta ad copy for ${projectName}`, why: "Paid ads drive branded search volume, which AI models track as an authority signal.", cabbageFeature: `${TAB.portals} → Google + Meta Ads`, priority: "nice-to-have", timeEstimate: "15 min", category: "authority" },
    { day: 26, action: `Run neighborhood analysis for ${location}`, why: "Neighborhood data enriches your location pages and improves citability.", cabbageFeature: `${TAB.locality} → Neighborhood`, priority: "should-do", timeEstimate: "10 min", category: "content" },
    { day: 27, action: `Generate internal linking suggestions from the site crawl`, why: "Internal links pass authority and help AI crawlers find related pages.", cabbageFeature: `${TAB.overview} → Internal Linking`, priority: "should-do", timeEstimate: "20 min", category: "technical" },
    { day: 28, action: `Re-run FULL AI visibility scan — compare with Day 1 and Day 14`, why: "This is your 4-week checkpoint — expect meaningful improvement.", cabbageFeature: `${TAB.aiSearch} → Check AI Visibility`, priority: "must-do", timeEstimate: "5 min", category: "monitoring" },
    { day: 29, action: `Generate monthly marketing report`, why: "Show your management/board the ROI — scores improved, content published, visibility gained.", cabbageFeature: TAB.report, priority: "must-do", timeEstimate: "5 min", category: "monitoring" },
    { day: 30, action: `Review report, set 3 priorities for next month, share with team`, why: "Consistent monthly cycles compound — month 2 is where AI mention rates really climb.", cabbageFeature: TAB.report, priority: "must-do", timeEstimate: "30 min", category: "monitoring" },
  ];

  const target = realisticTarget(currentScore);
  const stepA = Math.min(currentScore + Math.round((target - currentScore) * 0.33), 100);
  const stepB = Math.min(currentScore + Math.round((target - currentScore) * 0.55), 100);
  const stepC = Math.min(currentScore + Math.round((target - currentScore) * 0.78), 100);
  return {
    currentScore,
    targetScore: target,
    days,
    quickWins: [
      `Generate and upload llms.txt (${TAB.aiSearch} → 10 min)`,
      `Generate property schema and paste into your website head (${TAB.content} → Schema → 15 min)`,
      `Run Crawler Access check — make sure you're not blocking GPTBot (${TAB.aiSearch} → 2 min)`,
      `Run Citability Audit — see what's wrong with your content structure (${TAB.aiSearch} → 3 min)`,
      `Optimize your ${p1} listing description (${TAB.portals} → 20 min)`,
    ],
    expectedTimeline: `30 days to go from ${currentScore}% to ~${target}%. Most improvement in first 2 weeks.`,
    weekSummaries: [
      { week: 1, theme: "Foundation — Technical SEO & AI Readiness", expectedScore: stepA },
      { week: 2, theme: "Content Depth — Location Pages & Articles", expectedScore: stepB },
      { week: 3, theme: "Authority — Portals, GBP & Brand Mentions", expectedScore: stepC },
      { week: 4, theme: "Optimize — Measure, Fix Gaps, Double Down", expectedScore: target },
    ],
  };
}
