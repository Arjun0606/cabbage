import { runAIVisibility } from "@/lib/agents/aiVisibility";
import { classifyUrl, type Vertical } from "@/lib/agents/classifier";
import { buildPackFor } from "@/lib/prompts";
import { getServiceClient } from "@/lib/db/supabase";
import { sanitizeUrl } from "@/lib/security";

/**
 * Public grader. The marketing funnel — anyone can paste a URL on
 * the homepage and get a real visibility score in ~60 seconds. Every
 * grade is cached in public_grades for 7 days; subsequent visitors
 * (and the /visibility/[slug] permalink) read from cache.
 *
 * Cost discipline: 8 prompts only (vs 40+ in a paid scan), real
 * 5-engine call (when keys present), so the result is honest.
 * Caching means a single popular brand costs us once a week, not
 * once per visitor.
 */

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PUBLIC_GRADE_QUERIES = 8;

export interface PublicGradeQuerySummary {
  query: string;
  intent: string;
  chatgpt: { mentioned: boolean; position: number };
  gemini: { mentioned: boolean; position: number };
  perplexity?: { mentioned: boolean; position: number };
  claude?: { mentioned: boolean; position: number };
  grok?: { mentioned: boolean; position: number };
}

export interface PublicGrade {
  origin: string;
  slug: string;
  brand: string;
  category: string;
  vertical: Vertical;
  subcategory: string | null;
  scores: {
    overall: number;
    chatgpt: number;
    gemini: number;
    perplexity?: number;
    claude?: number;
    grok?: number;
    readiness: number;
    mentions: number;
    offDomain?: number;
  };
  aiReadiness: Array<{ check: string; passed: boolean; details: string }>;
  offDomainCoverage?: Array<{
    source: string;
    label: string;
    present: boolean;
    url?: string;
    details: string;
    count?: number;
  }>;
  queryResults: PublicGradeQuerySummary[];
  totalQueries: number;
  competitors: string[];
  scannedAt: string;
  scanCount: number;
  cacheHit: boolean;
}

interface PublicGradeRow {
  origin: string;
  slug: string;
  brand: string;
  category: string | null;
  vertical: string | null;
  subcategory: string | null;
  scores: PublicGrade["scores"] | null;
  ai_readiness: PublicGrade["aiReadiness"] | null;
  off_domain_coverage: PublicGrade["offDomainCoverage"] | null;
  query_results: PublicGradeQuerySummary[] | null;
  total_queries: number | null;
  competitors: string[] | null;
  scanned_at: string;
  scan_count: number | null;
}

function originToSlug(origin: string): string {
  return new URL(origin).hostname.replace(/^www\./, "");
}

function rowToGrade(row: PublicGradeRow, cacheHit: boolean): PublicGrade {
  return {
    origin: row.origin,
    slug: row.slug,
    brand: row.brand,
    category: row.category || "",
    vertical: (row.vertical || "unknown") as Vertical,
    subcategory: row.subcategory ?? null,
    scores: row.scores ?? {
      overall: 0,
      chatgpt: 0,
      gemini: 0,
      readiness: 0,
      mentions: 0,
    },
    aiReadiness: row.ai_readiness ?? [],
    offDomainCoverage: row.off_domain_coverage ?? undefined,
    queryResults: row.query_results ?? [],
    totalQueries: row.total_queries ?? 0,
    competitors: row.competitors ?? [],
    scannedAt: row.scanned_at,
    scanCount: row.scan_count ?? 1,
    cacheHit,
  };
}

export async function lookupGrade(slug: string): Promise<PublicGrade | null> {
  const service = getServiceClient();
  const cleanSlug = slug.replace(/^www\./, "").toLowerCase();
  const { data } = await service
    .from("public_grades")
    .select("*")
    .eq("slug", cleanSlug)
    .maybeSingle<PublicGradeRow>();
  if (!data) return null;
  return rowToGrade(data, true);
}

export async function gradeUrl(
  inputUrl: string,
  opts: { fresh?: boolean } = {},
): Promise<PublicGrade> {
  const { valid, url, error } = sanitizeUrl(inputUrl);
  if (!valid) throw new Error(error || "Invalid URL");

  const origin = new URL(url).origin;
  const slug = originToSlug(origin);
  const service = getServiceClient();

  // Cache check
  const { data: cached } = await service
    .from("public_grades")
    .select("*")
    .eq("origin", origin)
    .maybeSingle<PublicGradeRow>();

  if (cached && !opts.fresh) {
    const age = Date.now() - new Date(cached.scanned_at).getTime();
    if (age < CACHE_TTL_MS) return rowToGrade(cached, true);
  }

  // Fresh scan: classify → build pack → 5-engine visibility scan
  const classified = await classifyUrl(url);
  const fullPack = buildPackFor(classified.classification.vertical, {
    brand: classified.brand,
    aliases: classified.brandAliases,
    category: classified.category,
    competitors: classified.competitorHypotheses,
  });
  const queries = fullPack.slice(0, PUBLIC_GRADE_QUERIES);

  const result = await runAIVisibility(
    url,
    classified.brand,
    [],
    queries,
    {
      aliases: classified.brandAliases,
    },
  );

  const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;
  const hasGrok = !!process.env.XAI_API_KEY;

  const querySummaries: PublicGradeQuerySummary[] = result.queryResults.map(
    (q) => {
      const summary: PublicGradeQuerySummary = {
        query: q.query,
        intent: String(q.intent || "research"),
        chatgpt: {
          mentioned: q.chatgpt.mentioned,
          position: q.chatgpt.position,
        },
        gemini: {
          mentioned: q.gemini.mentioned,
          position: q.gemini.position,
        },
      };
      if (hasPerplexity) {
        summary.perplexity = {
          mentioned: q.perplexity.mentioned,
          position: q.perplexity.position,
        };
      }
      if (hasClaude) {
        summary.claude = {
          mentioned: q.claude.mentioned,
          position: q.claude.position,
        };
      }
      if (hasGrok) {
        summary.grok = {
          mentioned: q.grok.mentioned,
          position: q.grok.position,
        };
      }
      return summary;
    },
  );

  const upsertPayload = {
    origin,
    slug,
    brand: classified.brand,
    category: classified.category,
    vertical: classified.classification.vertical,
    subcategory: classified.classification.subcategory ?? null,
    scores: result.scores,
    ai_readiness: result.aiReadiness,
    off_domain_coverage: result.offDomainCoverage ?? null,
    query_results: querySummaries,
    total_queries: queries.length,
    competitors: classified.competitorHypotheses,
    scanned_at: new Date().toISOString(),
    scan_count: (cached?.scan_count ?? 0) + 1,
  };

  const { data: saved } = await service
    .from("public_grades")
    .upsert(upsertPayload, { onConflict: "origin" })
    .select()
    .single<PublicGradeRow>();

  return rowToGrade(saved ?? (upsertPayload as PublicGradeRow), false);
}
