import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const {
      companyName,
      projects,
      auditScores,
      aiVisibilityScore,
      domainAuthority,
      competitorCount,
      contentGenerated,
      period,
    } = await req.json();

    if (!companyName) {
      return NextResponse.json(
        { error: "companyName is required" },
        { status: 400 }
      );
    }

    const projectList = Array.isArray(projects) && projects.length > 0
      ? projects.map((p: { name: string; location?: string; city?: string }) =>
          `${p.name} (${p.location || "N/A"}, ${p.city || "N/A"})`
        ).join("; ")
      : "Not specified";

    const scoresStr = auditScores
      ? `Overall: ${auditScores.overall ?? "N/A"}/100, SEO: ${auditScores.seo ?? "N/A"}/100, Performance: ${auditScores.performance ?? "N/A"}/100`
      : "Not available";

    const aiVisStr = aiVisibilityScore ?? "Not measured";
    const daStr = domainAuthority ?? "Not available";
    const compCountStr = competitorCount ?? "Not analyzed";
    const contentStr = contentGenerated
      ? `Articles: ${contentGenerated.articles ?? 0}, Social Posts: ${contentGenerated.posts ?? 0}, Campaigns: ${contentGenerated.campaigns ?? 0}`
      : "Not tracked";
    const periodStr = period || new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });

    const systemPrompt = `You are a senior digital marketing strategist who writes board-ready monthly marketing reports for Indian real estate companies. Your reports are data-driven, concise, and actionable. You speak the language of CMDs and board members — ROI, competitive positioning, market share, brand visibility. Use specific numbers where provided and realistic industry benchmarks where data is missing.

IMPORTANT: Return ONLY valid JSON — no markdown fences, no commentary outside the JSON.`;

    const userPrompt = `Generate a comprehensive monthly marketing report for:

COMPANY: ${companyName}
PROJECTS: ${projectList}
REPORTING PERIOD: ${periodStr}

DATA AVAILABLE:
- Website Audit Scores: ${scoresStr}
- AI/GEO Visibility Score: ${aiVisStr}
- Domain Authority: ${daStr}
- Competitor Count Tracked: ${compCountStr}
- Content Generated This Month: ${contentStr}

Return JSON with this EXACT structure:
{
  "period": "${periodStr}",
  "executiveSummary": "3-4 sentence executive summary for the CMD/Board. Lead with the most impactful metric. Mention SEO improvements, AI visibility, and content output. End with a forward-looking statement. Tone: confident, data-first, no fluff.",
  "seoSection": "SEO performance section (200-300 words). Cover: current scores and month-over-month improvement (use the provided scores, estimate MoM delta if not given), key technical fixes implemented (mobile speed, Core Web Vitals, schema markup, sitemap optimization), keyword ranking improvements, organic traffic trend. Use specific but realistic numbers.",
  "aiGeoSection": "AI/GEO visibility section (150-250 words). Cover: which AI platforms (ChatGPT, Google AI Overview, Perplexity, Gemini) mention the company/projects, competitive position vs other developers in the city, what content is being cited, strategy for improving AI visibility. This is a differentiator — emphasize why it matters.",
  "contentSection": "Content performance section (150-250 words). Cover: what was published (articles, social posts, campaigns), engagement highlights (use realistic metrics), top-performing content pieces, content themes that resonated, upcoming content calendar preview.",
  "competitiveSection": "Competitive intelligence section (150-200 words). Cover: what competitors are doing (new launches, campaigns, digital moves), where we're ahead, gaps to close, market trends affecting positioning.",
  "recommendations": [
    "Priority 1 — most impactful recommendation for next month",
    "Priority 2 — second recommendation",
    "Priority 3 — third recommendation",
    "Priority 4 — fourth recommendation",
    "Priority 5 — fifth recommendation"
  ],
  "kpis": [
    { "metric": "Website Audit Score", "value": "use provided or estimate", "trend": "up/down/stable", "target": "realistic target" },
    { "metric": "AI Visibility Score", "value": "...", "trend": "...", "target": "..." },
    { "metric": "Domain Authority", "value": "...", "trend": "...", "target": "..." },
    { "metric": "Organic Traffic", "value": "estimated monthly visits", "trend": "...", "target": "..." },
    { "metric": "Content Pieces Published", "value": "...", "trend": "...", "target": "..." },
    { "metric": "Keyword Rankings (Top 10)", "value": "estimated count", "trend": "...", "target": "..." }
  ],
  "costSavings": {
    "agencyCost": "Estimated monthly cost if using a traditional digital marketing agency (in INR, e.g., '3,00,000')",
    "cabbageCost": "CabbageSEO monthly cost (use '41,500' as standard plan)",
    "savings": "Monthly savings amount in INR"
  }
}

Rules:
- Use the provided data points wherever available. Where data is missing, use realistic industry benchmarks for Indian real estate.
- KPI values should be strings (they display in a dashboard).
- Recommendations should be specific and actionable, not generic.
- Cost savings should compare CabbageSEO (Rs 41,500/month) vs a typical agency (Rs 2-4 lakh/month for equivalent services).
- Write for a board audience — no technical jargon without context.
- The report should make the CMD feel confident about ROI.`;

    const raw = await aiComplete(systemPrompt, userPrompt, 3000);

    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const result = JSON.parse(cleaned);

    return NextResponse.json({
      period: result.period || periodStr,
      executiveSummary: result.executiveSummary || "",
      seoSection: result.seoSection || "",
      aiGeoSection: result.aiGeoSection || "",
      contentSection: result.contentSection || "",
      competitiveSection: result.competitiveSection || "",
      recommendations: result.recommendations || [],
      kpis: result.kpis || [],
      costSavings: result.costSavings || {
        agencyCost: "3,00,000",
        cabbageCost: "41,500",
        savings: "2,58,500",
      },
    });
  } catch (error) {
    console.error("Marketing report error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Marketing report generation failed",
      },
      { status: 500 }
    );
  }
}
