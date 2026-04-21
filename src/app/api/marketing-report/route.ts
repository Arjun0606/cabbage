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

    const systemPrompt = `You write board-ready monthly marketing reports for Indian real estate CMDs. Reports are data-driven and concise.

CRITICAL HONESTY RULES:
1. ONLY write about metrics present in the DATA AVAILABLE block. If Domain Authority is "Not available", do not mention DA.
2. NEVER invent numbers. No fabricated MoM deltas. No fabricated traffic estimates. No fabricated keyword ranking counts. No benchmarks pulled from thin air.
3. If a section has no data, say so plainly ("AI/GEO visibility not yet measured — run scan to populate this section"). Short and honest beats long and invented.
4. KPIs: only emit KPIs that appear in DATA AVAILABLE. Omit the rest.
5. No cost-savings comparisons — the report must not estimate agency fees or position Cabbge spend.

IMPORTANT: Return ONLY valid JSON — no markdown fences, no commentary outside the JSON.`;

    const userPrompt = `Generate a monthly marketing report for:

COMPANY: ${companyName}
PROJECTS: ${projectList}
REPORTING PERIOD: ${periodStr}

DATA AVAILABLE (only these are real — write ONLY about these):
- Website Audit Scores: ${scoresStr}
- AI/GEO Visibility Score: ${aiVisStr}
- Domain Authority: ${daStr}
- Competitor Count Tracked: ${compCountStr}
- Content Generated This Month: ${contentStr}

Return JSON with this structure:
{
  "period": "${periodStr}",
  "executiveSummary": "2-3 sentence summary grounded in the data above. If most fields are 'Not available', say 'First reporting cycle — baseline metrics captured. Next month we'll have MoM comparisons.' No fluff.",
  "seoSection": "150-250 words on audit scores if available. If not available, write one line noting the audit hasn't been run. Do NOT invent traffic, rankings, or MoM deltas.",
  "aiGeoSection": "100-200 words on AI/GEO score if available. Include which AI platforms were tested and mention rate. If not measured, say so.",
  "contentSection": "100-200 words on what was produced this month (use the exact numbers above). If zero across the board, state that.",
  "competitiveSection": "100-150 words on competitive positioning if competitors were tracked. Otherwise, one line noting competitors haven't been tracked yet.",
  "recommendations": [
    "Priority 1 — specific action grounded in a gap visible in the data above",
    "Priority 2 — ...",
    "Priority 3 — ..."
  ],
  "kpis": [
    { "metric": "Website Audit Score", "value": "exact value from DATA AVAILABLE or omit this KPI entirely", "trend": "only if prior data exists, else omit", "target": "realistic next-month target" }
  ]
}

Rules:
- 3-5 recommendations is enough. Better to have fewer, specific items than five generic ones.
- Omit KPIs for metrics marked 'Not available' or 'Not measured'. Do not invent a placeholder.
- Tone: confident and honest. A CMD spotting invented numbers destroys trust instantly.`;

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
