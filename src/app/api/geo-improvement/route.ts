import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

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
    const { companyName, website, city, currentScore, currentMentionRate, missingQueries, failedChecks, projects } = body;

    if (!companyName || !website) {
      return NextResponse.json({ error: "companyName and website are required" }, { status: 400 });
    }

    const score = currentScore ?? 0;
    const projectList = (projects || []).map((p: any) => `- ${p.name} (${p.location})`).join("\n");
    const missingList = (missingQueries || []).map((q: string) => `- "${q}"`).join("\n");
    const failedList = (failedChecks || []).map((c: string) => `- ${c}`).join("\n");

    const systemPrompt = `You are a GEO specialist for Indian real estate. You create 30-day daily action plans. Return valid JSON only.`;

    const userPrompt = `Create a 30-day DAILY action plan for ${companyName} (${website}) in ${city || "India"}.
Current AI visibility: ${score}%. Mention rate: ${currentMentionRate || 0}%.
Projects: ${projectList || "Not specified"}
Missing AI queries: ${missingList || "Not specified"}
Failed checks: ${failedList || "Not specified"}

Return JSON:
{
  "currentScore": ${score},
  "targetScore": <realistic target after 30 days, typically +30-50 points>,
  "weekSummaries": [
    { "week": 1, "theme": "Foundation — Technical SEO & AI Readiness", "expectedScore": ${Math.min(score + 15, 100)} },
    { "week": 2, "theme": "Content — Location Pages & Articles", "expectedScore": ${Math.min(score + 25, 100)} },
    { "week": 3, "theme": "Authority — Portals, GBP & Brand Mentions", "expectedScore": ${Math.min(score + 35, 100)} },
    { "week": 4, "theme": "Optimize — Measure, Fix Gaps, Double Down", "expectedScore": ${Math.min(score + 45, 100)} }
  ],
  "days": [
    {
      "day": 1,
      "action": "Upload llms.txt to your website root — this tells AI crawlers about your brand and projects",
      "why": "Without llms.txt, AI crawlers don't know what your site is about. This is the #1 quick win for GEO.",
      "cabbageFeature": "AI/GEO tab → Generate llms.txt",
      "priority": "must-do",
      "timeEstimate": "10 min",
      "category": "technical"
    },
    ... (30 days total)
  ],
  "quickWins": ["5 things to do TODAY"],
  "expectedTimeline": "30 days to go from ${score}% to ~${Math.min(score + 45, 70)}%"
}

RULES:
- Exactly 30 days, one clear action per day
- Each action should take 15-45 minutes MAX (these are busy marketing teams)
- Reference specific CabbageSEO features: "AI/GEO tab → Generate llms.txt", "Content tab → Full Articles", "Content tab → Landing Pages", "Schema tab", "Ads & Portals tab → Portal Optimizer", "AI/GEO tab → Citability Audit", "Content tab → Festive Campaigns", "Content tab → Channel Partners", "Health tab → Run Audit", "Locality tab → Neighborhood", "Report tab", "AI/GEO tab → Brand Presence", "AI/GEO tab → Crawler Access"
- If it's a manual action (not in CabbageSEO), say "Manual — [where to do it]"
- Categories: "technical" (schema, robots, speed), "content" (articles, pages, posts), "authority" (portals, GBP, mentions), "monitoring" (re-scan, compare, adjust)

Day-by-day structure:
Week 1 (Days 1-7) — Technical Foundation:
Day 1: Upload llms.txt (CabbageSEO generates it)
Day 2: Add RealEstateListing + Organization schema to homepage
Day 3: Add FAQ schema to each project page
Day 4: Check and fix AI crawler access (robots.txt)
Day 5: Run citability audit, rewrite worst-scoring page's H2s as questions
Day 6: Fix meta descriptions for all project pages (keyword-rich, include city + config + price)
Day 7: Run full SEO audit and fix top 3 critical issues

Week 2 (Days 8-14) — Content Depth:
Day 8: Write locality guide article for main project location
Day 9: Write "Why invest in [Location]" article
Day 10: Write comparison article: your project vs 2 competitors
Day 11: Write buyer guide for your city
Day 12: Write NRI guide if applicable
Day 13: Create FAQ page with 20 questions buyers ask about your projects
Day 14: Re-run AI visibility check — measure improvement

Week 3 (Days 15-21) — Authority & Portals:
Day 15: Optimize 99acres listing using Portal Optimizer
Day 16: Optimize MagicBricks listing
Day 17: Optimize Housing.com listing
Day 18: Update Google Business Profile
Day 19: Publish 2 LinkedIn posts (use Content tab)
Day 20: Run brand presence scan — identify remaining gaps
Day 21: Generate and send channel partner content pack to top 5 brokers

Week 4 (Days 22-28) — Optimize & Scale:
Day 22: Generate festive campaign content for next upcoming festival
Day 23: Write location guide for 2nd project location
Day 24: Create landing page for site visits
Day 25: Generate Google + Meta ad copy
Day 26: Run neighborhood analysis for all project locations
Day 27: Generate construction progress update content
Day 28: Re-run full AI visibility scan — measure improvement from Day 1

Days 29-30 — Report & Plan:
Day 29: Generate monthly marketing report
Day 30: Review report, identify top 3 priorities for next month, share report with management

Personalize EVERYTHING to ${companyName}, ${city}, and the specific projects and missing queries listed above.`;

    const raw = await aiComplete(systemPrompt, userPrompt, 4000);

    let plan: GeoImprovementPlan;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      plan = JSON.parse(cleaned);
    } catch {
      plan = buildFallbackPlan(companyName, city, score, projects || []);
    }

    plan.currentScore = score;
    if (!plan.targetScore) plan.targetScore = Math.min(score + 45, 70);

    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Plan generation failed" },
      { status: 500 }
    );
  }
}

function buildFallbackPlan(companyName: string, city: string, currentScore: number, projects: any[]): GeoImprovementPlan {
  const projectName = projects[0]?.name || companyName;
  const location = projects[0]?.location || city || "your city";

  const days: ActionItem[] = [
    { day: 1, action: `Upload llms.txt to ${companyName}'s website root`, why: "Tells AI crawlers about your brand — #1 GEO quick win", cabbageFeature: "AI/GEO tab → Generate llms.txt", priority: "must-do", timeEstimate: "10 min", category: "technical" },
    { day: 2, action: `Add RealEstateListing + Organization schema to homepage`, why: "Structured data helps AI understand your projects in machine-readable format", cabbageFeature: "Content tab → Schema", priority: "must-do", timeEstimate: "15 min", category: "technical" },
    { day: 3, action: `Add FAQ schema to ${projectName} project page`, why: "FAQ schema gets directly pulled into Google AI Overviews", cabbageFeature: "Content tab → Schema", priority: "must-do", timeEstimate: "15 min", category: "technical" },
    { day: 4, action: `Check robots.txt — ensure GPTBot and Google-Extended are NOT blocked`, why: "If you block AI crawlers, no amount of content will help", cabbageFeature: "AI/GEO tab → Crawler Access", priority: "must-do", timeEstimate: "10 min", category: "technical" },
    { day: 5, action: `Run citability audit and rewrite your worst page's headings as questions`, why: "Question-based H2s are what Google AI Overviews extract", cabbageFeature: "AI/GEO tab → Citability Audit", priority: "must-do", timeEstimate: "30 min", category: "technical" },
    { day: 6, action: `Rewrite meta descriptions for all project pages — include city, config, price`, why: "AI models use meta descriptions as summaries — generic ones get ignored", cabbageFeature: "", priority: "must-do", timeEstimate: "30 min", category: "technical" },
    { day: 7, action: `Run full SEO audit and fix top 3 critical issues`, why: "Technical SEO is the foundation — broken pages can't rank anywhere", cabbageFeature: "Health tab → Run Audit", priority: "must-do", timeEstimate: "45 min", category: "technical" },
    { day: 8, action: `Write locality guide: "Living in ${location} — Complete Guide"`, why: "Location guides are the #1 content type that AI cites for area queries", cabbageFeature: "Content tab → Full Articles → Locality Guide", priority: "must-do", timeEstimate: "20 min", category: "content" },
    { day: 9, action: `Write "Why Invest in ${location}" article`, why: "Investment articles get cited when buyers ask ChatGPT about property investment", cabbageFeature: "Content tab → Full Articles → Investment", priority: "must-do", timeEstimate: "20 min", category: "content" },
    { day: 10, action: `Write comparison article: ${projectName} vs top 2 competitors`, why: "Comparison content is exactly what AI recommends when buyers ask 'which is better'", cabbageFeature: "Content tab → Full Articles → Comparison", priority: "must-do", timeEstimate: "20 min", category: "content" },
    { day: 11, action: `Write buyer guide for ${city}`, why: "Buyer guides answer process questions — RERA, documentation, loans — that AI gets asked constantly", cabbageFeature: "Content tab → Full Articles → Buyer Guide", priority: "should-do", timeEstimate: "20 min", category: "content" },
    { day: 12, action: `Write NRI buyer guide for ${projectName}`, why: "NRI queries are high-intent and underserved in AI answers", cabbageFeature: "Content tab → Full Articles → NRI Guide", priority: "should-do", timeEstimate: "20 min", category: "content" },
    { day: 13, action: `Create FAQ page with 20 questions buyers ask about ${projectName}`, why: "FAQ pages with question-answer pairs are the most-cited format by AI", cabbageFeature: "Content tab → Full Articles → Buyer Guide", priority: "must-do", timeEstimate: "30 min", category: "content" },
    { day: 14, action: `Re-run AI visibility check — measure improvement from Day 1`, why: "Track your progress — you should see readiness score jump significantly", cabbageFeature: "AI/GEO tab → Check AI Visibility", priority: "must-do", timeEstimate: "5 min", category: "monitoring" },
    { day: 15, action: `Optimize 99acres listing for ${projectName}`, why: "Portal listings feed into AI answers — optimized descriptions rank better", cabbageFeature: "Ads & Portals tab → Portal Optimizer", priority: "must-do", timeEstimate: "20 min", category: "authority" },
    { day: 16, action: `Optimize MagicBricks listing for ${projectName}`, why: "MagicBricks is frequently cited by ChatGPT for Indian real estate", cabbageFeature: "Ads & Portals tab → Portal Optimizer", priority: "must-do", timeEstimate: "20 min", category: "authority" },
    { day: 17, action: `Optimize Housing.com listing for ${projectName}`, why: "More portal presence = higher chance of AI citing you", cabbageFeature: "Ads & Portals tab → Portal Optimizer", priority: "should-do", timeEstimate: "20 min", category: "authority" },
    { day: 18, action: `Update Google Business Profile with full description and photos`, why: "Google AI Overviews draws heavily from Google Business Profile data", cabbageFeature: "Manual — business.google.com", priority: "must-do", timeEstimate: "30 min", category: "authority" },
    { day: 19, action: `Publish 2 LinkedIn posts about ${projectName}`, why: "LinkedIn content builds brand authority that AI models recognize", cabbageFeature: "Content tab → Content Topics", priority: "should-do", timeEstimate: "15 min", category: "authority" },
    { day: 20, action: `Run brand presence scan — identify remaining gaps`, why: "Check which platforms still don't mention your brand", cabbageFeature: "AI/GEO tab → Brand Presence", priority: "should-do", timeEstimate: "5 min", category: "monitoring" },
    { day: 21, action: `Send channel partner content pack to top 5 brokers`, why: "Broker mentions and referrals create organic brand signals AI picks up", cabbageFeature: "Content tab → Channel Partners", priority: "should-do", timeEstimate: "15 min", category: "authority" },
    { day: 22, action: `Generate festive campaign content for the next upcoming festival`, why: "Seasonal content shows freshness — AI models prefer recently updated sites", cabbageFeature: "Content tab → Festive Campaigns", priority: "nice-to-have", timeEstimate: "15 min", category: "content" },
    { day: 23, action: `Write locality guide for 2nd project location`, why: "Each location guide captures a new set of buyer queries in AI", cabbageFeature: "Content tab → Full Articles → Locality Guide", priority: "should-do", timeEstimate: "20 min", category: "content" },
    { day: 24, action: `Create site visit landing page for ${projectName}`, why: "Dedicated landing pages with structured data rank in AI shopping results", cabbageFeature: "Content tab → Landing Pages", priority: "should-do", timeEstimate: "15 min", category: "content" },
    { day: 25, action: `Generate Google + Meta ad copy for ${projectName}`, why: "Paid ads drive branded search volume, which AI models track as authority signal", cabbageFeature: "Ads & Portals tab → Google + Meta Ads", priority: "nice-to-have", timeEstimate: "15 min", category: "authority" },
    { day: 26, action: `Run neighborhood analysis for ${location}`, why: "Neighborhood data enriches your location pages and improves citability", cabbageFeature: "Locality tab → Neighborhood", priority: "should-do", timeEstimate: "10 min", category: "content" },
    { day: 27, action: `Publish construction progress update for ${projectName}`, why: "Progress updates show the project is active and trustworthy", cabbageFeature: "Content tab → Construction Updates", priority: "nice-to-have", timeEstimate: "15 min", category: "content" },
    { day: 28, action: `Re-run FULL AI visibility scan — compare with Day 1 and Day 14`, why: "This is your 4-week checkpoint — expect 25-40 point improvement", cabbageFeature: "AI/GEO tab → Check AI Visibility", priority: "must-do", timeEstimate: "5 min", category: "monitoring" },
    { day: 29, action: `Generate monthly marketing report`, why: "Show your management/board the ROI — scores improved, content published, visibility gained", cabbageFeature: "Report tab", priority: "must-do", timeEstimate: "5 min", category: "monitoring" },
    { day: 30, action: `Review report, set 3 priorities for next month, share with team`, why: "Consistent monthly cycles compound — month 2 is where AI mention rates really climb", cabbageFeature: "Report tab", priority: "must-do", timeEstimate: "30 min", category: "monitoring" },
  ];

  return {
    currentScore,
    targetScore: Math.min(currentScore + 45, 70),
    days,
    quickWins: [
      "Generate and upload llms.txt (AI/GEO tab → 10 min)",
      "Generate property schema and paste into your website head (Content tab → Schema → 15 min)",
      "Run Crawler Access check — make sure you're not blocking GPTBot (AI/GEO tab → 2 min)",
      "Run Citability Audit — see what's wrong with your content structure (AI/GEO tab → 3 min)",
      "Optimize your 99acres listing description (Ads & Portals tab → 20 min)",
    ],
    expectedTimeline: `30 days to go from ${currentScore}% to ~${Math.min(currentScore + 45, 70)}%. Most improvement in first 2 weeks.`,
    weekSummaries: [
      { week: 1, theme: "Foundation — Technical SEO & AI Readiness", expectedScore: Math.min(currentScore + 15, 100) },
      { week: 2, theme: "Content Depth — Location Pages & Articles", expectedScore: Math.min(currentScore + 25, 100) },
      { week: 3, theme: "Authority — Portals, GBP & Brand Mentions", expectedScore: Math.min(currentScore + 35, 100) },
      { week: 4, theme: "Optimize — Measure, Fix Gaps, Double Down", expectedScore: Math.min(currentScore + 45, 100) },
    ],
  };
}
