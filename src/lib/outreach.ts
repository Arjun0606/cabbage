import { gradeUrl, type PublicGrade } from "@/lib/agents/grader";
import { buildPlaybook, type PlaybookAction } from "@/lib/agents/playbook";
import { sanitizeUrl } from "@/lib/security";
import type { AIVisibilityResult } from "@/lib/agents/aiVisibility";
import type { OffDomainItem } from "@/lib/agents/offDomain";

/**
 * Cold-outreach kit. Paste 50-200 URLs (indie SaaS, Shopify stores,
 * SMB targets), get back per-URL drafted emails + LinkedIn DMs +
 * /visibility/[slug] permalink. The founder's outbound bottleneck-
 * buster — every email is genuinely personalized because it cites
 * real findings from a real scan.
 *
 * Concurrency 4, hard cap 100, ~1-3 minutes per batch depending on
 * cache hit ratio. 1 credit per URL whether cache hit or fresh —
 * keeps accounting simple.
 */

const OUTREACH_CONCURRENCY = 4;
const OUTREACH_MAX_URLS = 100;

export interface OutreachItem {
  url: string;
  slug?: string;
  brand?: string;
  category?: string;
  score?: number;
  cacheHit?: boolean;
  topActions?: PlaybookAction[];
  emailSubject?: string;
  emailBody?: string;
  linkedinDm?: string;
  visibilityUrl?: string;
  error?: string;
}

function shortenRationale(rationale: string, max = 140): string {
  if (rationale.length <= max) return rationale;
  const truncated = rationale.slice(0, max);
  const lastDot = truncated.lastIndexOf(".");
  return (lastDot > 60 ? truncated.slice(0, lastDot + 1) : truncated) + "…";
}

function emailFor(
  grade: PublicGrade,
  actions: PlaybookAction[],
  baseUrl: string,
): { subject: string; body: string } {
  const visibilityUrl = `${baseUrl}/visibility/${grade.slug}`;
  const topActions = actions.slice(0, 2);
  const findingsBlock =
    topActions.length > 0
      ? topActions
          .map(
            (a, i) =>
              `${i + 1}. ${a.title} — ${shortenRationale(a.rationale)}`,
          )
          .join("\n")
      : "1. Your AI visibility score is well below where it should be for your category — there are concrete schema, content, and off-domain fixes worth shipping.";

  const subject = `${grade.brand} scored ${grade.scores.overall} on AI visibility`;
  const enginesPhrase = `ChatGPT, Gemini${grade.scores.perplexity != null ? ", Perplexity" : ""}${grade.scores.claude != null ? ", Claude" : ""}${grade.scores.grok != null ? ", and Grok" : ""}`;
  const body = `Hi,

Quick scan of ${grade.brand}: ${grade.scores.overall}/100 across ${enginesPhrase}. Two things stood out:

${findingsBlock}

Full breakdown (no signup): ${visibilityUrl}

If it's useful, cabbge ships the schema, FAQ pages, and citation work to fix what's broken for $49/mo. No demo call.

— `;
  return { subject, body };
}

function linkedinFor(grade: PublicGrade, baseUrl: string): string {
  const visibilityUrl = `${baseUrl}/visibility/${grade.slug}`;
  return `Hey — ran an AI visibility scan on ${grade.brand}: ${grade.scores.overall}/100 across the major engines. The breakdown is at ${visibilityUrl}. Happy to share what's specifically holding the score down if useful.`;
}

/**
 * Build a synthetic AIVisibilityResult from a PublicGrade so we can
 * reuse buildPlaybook (which expects the full result shape). We
 * only use the fields the rule engine reads — readiness, off-domain,
 * scores. No queryResults needed.
 */
export function gradeToScan(grade: PublicGrade): AIVisibilityResult {
  return {
    brand: grade.brand,
    projects: [],
    scores: {
      chatgpt: grade.scores.chatgpt,
      gemini: grade.scores.gemini,
      perplexity: grade.scores.perplexity,
      claude: grade.scores.claude,
      grok: grade.scores.grok,
      overall: grade.scores.overall,
      readiness: grade.scores.readiness,
      mentions: grade.scores.mentions,
      offDomain: grade.scores.offDomain,
    },
    queryResults: [],
    aiReadiness: grade.aiReadiness,
    offDomainCoverage: (grade.offDomainCoverage ?? []) as OffDomainItem[],
    configuredLLMs: [],
    platformHealth: {
      chatgpt: { status: "live", liveQueries: 0, fallbackQueries: 0, failedQueries: 0 },
      gemini: { status: "live", liveQueries: 0, fallbackQueries: 0, failedQueries: 0 },
    },
  };
}

async function processOne(
  url: string,
  baseUrl: string,
): Promise<OutreachItem> {
  const { valid, url: clean, error } = sanitizeUrl(url);
  if (!valid) return { url, error: error || "Invalid URL" };

  try {
    const grade = await gradeUrl(clean);
    const actions = buildPlaybook(gradeToScan(grade), grade.brand).slice(0, 4);

    const { subject, body } = emailFor(grade, actions, baseUrl);
    const linkedinDm = linkedinFor(grade, baseUrl);

    return {
      url: clean,
      slug: grade.slug,
      brand: grade.brand,
      category: grade.category,
      score: grade.scores.overall,
      cacheHit: grade.cacheHit,
      topActions: actions,
      emailSubject: subject,
      emailBody: body,
      linkedinDm,
      visibilityUrl: `${baseUrl}/visibility/${grade.slug}`,
    };
  } catch (err) {
    return {
      url: clean,
      error: err instanceof Error ? err.message : "Grade failed",
    };
  }
}

export async function runOutreachBatch(
  urls: string[],
  baseUrl: string,
): Promise<{ results: OutreachItem[]; processed: number; cacheHits: number }> {
  const list = urls
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, OUTREACH_MAX_URLS);

  const results: OutreachItem[] = new Array(list.length);
  let cursor = 0;
  let cacheHits = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= list.length) return;
      const item = await processOne(list[idx], baseUrl);
      if (item.cacheHit) cacheHits++;
      results[idx] = item;
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(OUTREACH_CONCURRENCY, list.length) }, () =>
      worker(),
    ),
  );

  return { results, processed: list.length, cacheHits };
}

export const OUTREACH_LIMITS = {
  maxUrlsPerBatch: OUTREACH_MAX_URLS,
  concurrency: OUTREACH_CONCURRENCY,
};
