export const runtime = "nodejs";
export const maxDuration = 300;
import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";
import { requireActiveSubscription } from "@/lib/db/supabase-server";

/**
 * Marketing-report template registry.
 *
 * Every paid tier gets all four templates — the differences are real
 * (different audiences, different sectioning, different framing for
 * the same underlying scan data) but cost the same to generate, so
 * there's no per-tier gate. Volume of reports is governed by the
 * credit pool, not by which templates the tier can choose from.
 */
type TemplateDef = {
  key: string;
  label: string;
  description: string;
  /** Per-template system prompt nudge appended to the base honesty rules. */
  systemAddendum: string;
  /** Section list the template should produce, replaces the default JSON shape. */
  sectionOrder: Array<{ key: string; label: string; brief: string; words: string }>;
  /** Recommendation count target. */
  recommendationsTarget: string;
  /** Audience framing for the executive summary. */
  audience: string;
};

const REPORT_TEMPLATES: Record<string, TemplateDef> = {
  default: {
    key: "default",
    label: "CMO monthly",
    description: "Standard monthly marketing report — what every paid tier gets.",
    systemAddendum: "",
    audience: "the company's CMO and head of growth.",
    recommendationsTarget: "3-5 recommendations",
    sectionOrder: [
      { key: "seoSection", label: "SEO", brief: "audit scores if available; if not, one line noting the audit hasn't run", words: "150-250" },
      { key: "aiGeoSection", label: "AI/GEO Visibility", brief: "AI/GEO score, platforms tested, mention rate; if not measured, say so", words: "100-200" },
      { key: "contentSection", label: "Content shipped", brief: "what was produced this month using exact numbers; zero is acceptable to state", words: "100-200" },
      { key: "competitiveSection", label: "Competitive", brief: "competitive positioning if competitors tracked; otherwise note absence", words: "100-150" },
    ],
  },
  board_quarterly: {
    key: "board_quarterly",
    label: "Board quarterly",
    description: "Q-on-Q narrative for board meetings — emphasises 90-day shifts, governance signals, and trajectory rather than this-month operations.",
    audience: "the board of directors and the chairman. They will read this once a quarter, alongside financial updates.",
    recommendationsTarget: "3 strategic recommendations (not tactical)",
    systemAddendum: `\nADDITIONAL RULES FOR BOARD AUDIENCE:
- Frame everything as quarter-on-quarter trajectory, not month-on-month.
- Lead with the strategic shift, not the operational metric.
- Boards care about: market position relative to named competitors, regulatory exposure (RERA), brand share-of-voice in AI answers.
- Do not list scans-run, articles-shipped, or ops metrics. The board does not read those.`,
    sectionOrder: [
      { key: "trajectorySection", label: "90-day trajectory", brief: "where the brand started the quarter, where it ended, the single biggest shift; ground in the data", words: "150-220" },
      { key: "marketPositionSection", label: "Market position", brief: "share-of-voice in AI answers, ranking among tracked competitors, portal coverage status — the board's view of 'are we visible?'", words: "150-220" },
      { key: "regulatoryExposureSection", label: "Regulatory exposure", brief: "RERA verification status, expiring registrations, hallucination risks. If clean, say so in one line", words: "80-150" },
      { key: "strategicSection", label: "Strategic outlook", brief: "what changes in the next quarter and why; tied to the data above", words: "120-180" },
    ],
  },
  agency_replacement: {
    key: "agency_replacement",
    label: "Agency replacement",
    description: "Frames the month as a deliverables review against what an SEO agency retainer would have produced. Useful for showing the in-house team this is replacing the agency.",
    audience: "the CMO who is justifying replacing or reducing an agency retainer with Cabbge. They need the deliverables breakdown.",
    recommendationsTarget: "4-5 specific deliverables for next month, framed like an agency SOW",
    systemAddendum: `\nADDITIONAL RULES FOR AGENCY-REPLACEMENT FRAMING:
- Show this month's deliverables as a list a CMO can compare to an agency invoice.
- Use exact counts — articles, scans, audits, fixes — never round up.
- Surface what wasn't done so the CMO sees the honest picture, not a sales pitch.
- The reader is suspicious; do not market to them.`,
    sectionOrder: [
      { key: "deliverablesSection", label: "Deliverables this month", brief: "tabular list: SEO audits run, technical audits, AI visibility scans, articles published, schema deployed, RERA checks, portal coverage. Use exact integers.", words: "120-180" },
      { key: "vsAgencySection", label: "Vs. typical agency retainer", brief: "compare the deliverable cadence to a typical Indian RE agency retainer (monthly/quarterly). Honest only — no fabricated agency numbers.", words: "100-160" },
      { key: "blindSpotsSection", label: "What we couldn't deliver", brief: "data points that didn't get captured, scans that didn't run, gaps in coverage. If everything ran, say so.", words: "80-150" },
      { key: "nextSowSection", label: "Next month's SOW", brief: "deliverable list framed like an agency SOW: this many articles, this many scans, this many fixes targeted", words: "120-180" },
    ],
  },
  weekly_pulse: {
    key: "weekly_pulse",
    label: "Weekly pulse",
    description: "Short, action-focused, sprint-cadence report. For teams reviewing weekly with the marketing lead — not monthly with the CMO.",
    audience: "the marketing operations lead running weekly sprints. They need actions, not narrative.",
    recommendationsTarget: "3 actions for next week — each must be doable within 5 days",
    systemAddendum: `\nADDITIONAL RULES FOR WEEKLY-PULSE FRAMING:
- Total length under 300 words across all sections.
- Lead with the single biggest movement of the week.
- No paragraphs longer than 2 sentences. Bullets preferred.
- Skip context the team already has from the prior pulse.`,
    sectionOrder: [
      { key: "biggestShiftSection", label: "Biggest shift this week", brief: "one specific data movement, with the number. If nothing meaningful moved, say 'flat week' in one line.", words: "60-100" },
      { key: "wonSection", label: "Won this week", brief: "queries newly mentioning the brand, articles published, fixes deployed. Use exact data.", words: "60-100" },
      { key: "lostSection", label: "Lost / at risk", brief: "queries that stopped mentioning the brand, declining pages, expiring RERA. If clean, say so.", words: "60-100" },
    ],
  },
};

function getTemplate(key: string | undefined): TemplateDef {
  if (!key) return REPORT_TEMPLATES.default;
  return REPORT_TEMPLATES[key] ?? REPORT_TEMPLATES.default;
}

export async function POST(req: NextRequest) {
  try {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;

    const {
      companyName,
      projects,
      auditScores,
      aiVisibilityScore,
      domainAuthority,
      competitorCount,
      contentGenerated,
      period,
      templateKey,
    } = await req.json();

    if (!companyName) {
      return NextResponse.json(
        { error: "companyName is required" },
        { status: 400 }
      );
    }

    // Every paid tier picks from the full template set (volume-only
    // pricing). Unknown keys silently fall back to the default report.
    const requestedKey = typeof templateKey === "string" ? templateKey : "default";
    const template = getTemplate(requestedKey);

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

    const systemPrompt = `You write board-ready marketing reports for Indian real estate CMDs. Reports are data-driven and concise.

REPORT AUDIENCE: ${template.audience}

CRITICAL HONESTY RULES:
1. ONLY write about metrics present in the DATA AVAILABLE block. If Domain Authority is "Not available", do not mention DA.
2. NEVER invent numbers. No fabricated MoM deltas. No fabricated traffic estimates. No fabricated keyword ranking counts. No benchmarks pulled from thin air.
3. If a section has no data, say so plainly ("AI/GEO visibility not yet measured — run scan to populate this section"). Short and honest beats long and invented.
4. KPIs: only emit KPIs that appear in DATA AVAILABLE. Omit the rest.
5. No cost-savings comparisons — the report must not estimate agency fees or position Cabbge spend.${template.systemAddendum}

IMPORTANT: Return ONLY valid JSON — no markdown fences, no commentary outside the JSON.`;

    const sectionsJson = template.sectionOrder
      .map((s) => `  "${s.key}": "${s.words} words on ${s.brief}"`)
      .join(",\n");

    const userPrompt = `Generate a marketing report for:

COMPANY: ${companyName}
PROJECTS: ${projectList}
REPORTING PERIOD: ${periodStr}
TEMPLATE: ${template.label} — ${template.description}

DATA AVAILABLE (only these are real — write ONLY about these):
- Website Audit Scores: ${scoresStr}
- AI/GEO Visibility Score: ${aiVisStr}
- Domain Authority: ${daStr}
- Competitor Count Tracked: ${compCountStr}
- Content Generated This Month: ${contentStr}

Return JSON with this structure:
{
  "period": "${periodStr}",
  "executiveSummary": "2-3 sentence summary grounded in the data above, framed for ${template.audience} If most fields are 'Not available', say 'First reporting cycle — baseline metrics captured. Next reporting cycle we'll have comparisons.' No fluff.",
${sectionsJson},
  "recommendations": [
    "${template.recommendationsTarget} — each grounded in a specific gap visible in the data above"
  ],
  "kpis": [
    { "metric": "Website Audit Score", "value": "exact value from DATA AVAILABLE or omit this KPI entirely", "trend": "only if prior data exists, else omit", "target": "realistic next-cycle target" }
  ]
}

Rules:
- ${template.recommendationsTarget} — better to have fewer, specific items than five generic ones.
- Omit KPIs for metrics marked 'Not available' or 'Not measured'. Do not invent a placeholder.
- Tone: confident and honest. A CMD spotting invented numbers destroys trust instantly.`;

    const raw = await aiComplete(systemPrompt, userPrompt, 3000);

    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const result = JSON.parse(cleaned);

    // Build the response dynamically so non-default templates can return
    // their own section keys without dropping content.
    const response: Record<string, unknown> = {
      period: result.period || periodStr,
      template: { key: template.key, label: template.label },
      executiveSummary: result.executiveSummary || "",
      recommendations: result.recommendations || [],
      kpis: result.kpis || [],
    };
    for (const section of template.sectionOrder) {
      response[section.key] = result[section.key] || "";
    }

    return NextResponse.json(response);
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

/**
 * GET /api/marketing-report
 * Returns the templates available to the caller's plan. The dashboard
 * uses this to populate the template-picker dropdown. Volume-only
 * pricing means every paid tier sees every template.
 */
export async function GET(req: NextRequest) {
  const gate = await requireActiveSubscription(req);
  if (!gate.ok) return gate.response;

  // Every paid tier sees every template; volume-only pricing means
  // there's no "locked" state to render. canCustomise stays true so
  // existing UI render paths keep working.
  const all = Object.values(REPORT_TEMPLATES).map((t) => ({
    key: t.key,
    label: t.label,
    description: t.description,
    locked: false,
  }));

  return NextResponse.json({
    templates: all,
    canCustomise: true,
  });
}
