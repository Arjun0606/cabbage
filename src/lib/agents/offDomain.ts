/**
 * Off-domain coverage audit.
 *
 * Research finding (Apr 2026): 82-89% of AI citations come from earned
 * media. This audit measures presence on the high-trust sources AI
 * engines actually cite from.
 *
 * Sources covered:
 * - Wikipedia    AI's #1 entity-grounding lever
 * - Wikidata     2.8× citation lift when present
 * - Trustpilot   high-trust review-site citations
 * - G2           33-75% of B2B SaaS review-site citations across engines
 * - Reddit       17× fewer visits than Google but 3.5× more AI citations
 *
 * Implementation notes (v2):
 * - Wikidata is the entity-resolution anchor. We query it first and
 *   reuse the resulting Q-id to look up Wikipedia via sitelinks
 *   (sidesteps disambiguation collisions like "Stripe" → striped
 *   hyena instead of Stripe, Inc.).
 * - Trustpilot, G2, and (sometimes) Reddit return 403/429 for
 *   data-center IPs, so we route those through ChatGPT's web_search
 *   tool. We already pay for the OpenAI dependency; the marginal
 *   cost is ~$0.01-$0.02 per scan for three short queries.
 * - Direct Reddit JSON works locally + from CI but blocks on Vercel.
 *   We try it first (free + fast when it works) and fall back to
 *   web_search when we get 0 results or a non-200.
 */

import { queryForVisibility, aiLight } from "@/lib/ai";

const FETCH_TIMEOUT_MS = 8_000;
const USER_AGENT =
  "cabbge.com off-domain-checker (https://cabbge.com)";

export type OffDomainSource =
  | "wikipedia"
  | "wikidata"
  | "trustpilot"
  | "g2"
  | "reddit";

export interface OffDomainItem {
  source: OffDomainSource;
  label: string;
  present: boolean;
  url?: string;
  details: string;
  count?: number;
}

interface WikidataHit {
  id: string;
  description?: string;
}

function siteHostname(siteUrl: string): string {
  try {
    return new URL(siteUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

async function safeFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response | null> {
  try {
    return await fetch(url, {
      ...init,
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          (init.headers as Record<string, string>)?.Accept ||
          "application/json",
        ...((init.headers as Record<string, string>) || {}),
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
  } catch {
    return null;
  }
}

// ----------------- Wikidata (anchor) -----------------

async function findWikidataEntity(
  brand: string,
): Promise<WikidataHit | null> {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=5&search=${encodeURIComponent(brand)}`;
  const res = await safeFetch(url);
  if (!res || !res.ok) return null;
  const data = (await res.json().catch(() => null)) as {
    search?: Array<{ id: string; label?: string; description?: string }>;
  } | null;
  // Prefer exact label match. If none, take the first whose
  // description hints at company-ish (instead of taking the first
  // matching word — which is how "Stripe" snags "stripe (pattern)").
  const exact = data?.search?.find(
    (s) => (s.label || "").toLowerCase() === brand.toLowerCase(),
  );
  if (exact) return { id: exact.id, description: exact.description };

  const companyHinted = data?.search?.find((s) => {
    const d = (s.description || "").toLowerCase();
    return /company|corporation|software|platform|service|technology|business|saas|agency|brand|product|publisher|website|app/.test(
      d,
    );
  });
  if (companyHinted)
    return { id: companyHinted.id, description: companyHinted.description };

  return null;
}

async function checkWikidata(
  brand: string,
  hit: WikidataHit | null,
): Promise<OffDomainItem> {
  if (hit) {
    return {
      source: "wikidata",
      label: "Wikidata",
      present: true,
      url: `https://www.wikidata.org/wiki/${hit.id}`,
      details: hit.description
        ? `${hit.id} — ${hit.description}`
        : `Entity ${hit.id} exists`,
    };
  }
  return {
    source: "wikidata",
    label: "Wikidata",
    present: false,
    url: "https://www.wikidata.org/wiki/Special:NewItem",
    details:
      "No Wikidata entity. Brands with Wikidata entries see ~2.8× more AI citations — claim or create one.",
  };
}

// ----------------- Wikipedia (via Wikidata sitelinks) -----------------

async function checkWikipedia(
  brand: string,
  wikidata: WikidataHit | null,
): Promise<OffDomainItem> {
  // Best path: Wikidata gives us the canonical English Wikipedia URL.
  if (wikidata) {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikidata.id}&props=sitelinks/urls&sitefilter=enwiki&format=json`;
    const res = await safeFetch(url);
    if (res && res.ok) {
      const data = (await res.json().catch(() => null)) as {
        entities?: Record<
          string,
          { sitelinks?: { enwiki?: { title?: string; url?: string } } }
        >;
      } | null;
      const enwiki = data?.entities?.[wikidata.id]?.sitelinks?.enwiki;
      if (enwiki?.url) {
        const summary = await fetchWikiSummary(
          enwiki.title || enwiki.url.split("/wiki/")[1] || brand,
        );
        return {
          source: "wikipedia",
          label: "Wikipedia",
          present: true,
          url: enwiki.url,
          details:
            summary?.extract?.slice(0, 240) ||
            `Wikipedia article: ${enwiki.title}`,
        };
      }
    }
  }

  // Fallback: direct slug (works for unambiguous brand names).
  const directSlug = brand.replace(/\s+/g, "_");
  const summary = await fetchWikiSummary(directSlug);
  if (summary && summary.title && summary.type !== "disambiguation") {
    return {
      source: "wikipedia",
      label: "Wikipedia",
      present: true,
      url:
        summary.content_urls?.desktop?.page ||
        `https://en.wikipedia.org/wiki/${encodeURIComponent(directSlug)}`,
      details: summary.extract?.slice(0, 240) || "Wikipedia article exists",
    };
  }

  return {
    source: "wikipedia",
    label: "Wikipedia",
    present: false,
    url: "https://en.wikipedia.org/wiki/Wikipedia:Articles_for_creation",
    details:
      "No Wikipedia article. AI engines use Wikipedia as a primary entity ground-truth — getting an article (notability permitting) is one of the highest-leverage off-domain moves.",
  };
}

interface WikiSummary {
  type?: string;
  title?: string;
  content_urls?: { desktop?: { page?: string } };
  extract?: string;
}

async function fetchWikiSummary(
  slug: string,
): Promise<WikiSummary | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`;
  const res = await safeFetch(url);
  if (!res || !res.ok) return null;
  return (await res.json().catch(() => null)) as WikiSummary | null;
}

// ----------------- LLM-backed sources (G2, Trustpilot) -----------------

interface LlmPresence {
  present: boolean;
  url?: string;
  detail?: string;
}

async function llmCheckPresence(
  brand: string,
  siteUrl: string,
  source: "g2" | "trustpilot",
): Promise<LlmPresence> {
  const sourceLabel = source === "g2" ? "G2 (g2.com)" : "Trustpilot";
  const profileUrlHint =
    source === "g2"
      ? "g2.com/products/<slug>/reviews"
      : "trustpilot.com/review/<domain>";

  const prompt = `Search the web. Does the company "${brand}" (homepage: ${siteUrl}) have a public profile on ${sourceLabel}?

Reply with strict JSON only, no prose:
{
  "present": true | false,
  "url": "https://${profileUrlHint.split("/")[0]}/...",  // canonical profile URL if present, else null
  "detail": "review_count: <n>" or short note
}

Only set present=true if you can cite a real, currently-live profile URL from the search results. Do NOT guess by analogy. If there is doubt, set present=false.`;

  try {
    const { text, source: src } = await queryForVisibility("openai", prompt);
    if (!text || (src !== "web_search" && src !== "grounded")) {
      return { present: false };
    }
    // The model usually returns clean JSON given the prompt, but
    // wrap in a tolerant extractor for the cases it adds prose.
    const m = text.match(/\{[\s\S]*?"present"[\s\S]*?\}/);
    if (!m) return { present: false };
    const parsed = JSON.parse(m[0]);
    if (!parsed.present) return { present: false };
    if (typeof parsed.url !== "string" || !parsed.url.startsWith("http")) {
      return { present: false };
    }
    return {
      present: true,
      url: parsed.url,
      detail: typeof parsed.detail === "string" ? parsed.detail : undefined,
    };
  } catch {
    return { present: false };
  }
}

async function checkG2(
  brand: string,
  siteUrl: string,
): Promise<OffDomainItem> {
  const r = await llmCheckPresence(brand, siteUrl, "g2");
  if (r.present && r.url) {
    return {
      source: "g2",
      label: "G2",
      present: true,
      url: r.url,
      details: r.detail || "G2 product page exists",
    };
  }
  return {
    source: "g2",
    label: "G2",
    present: false,
    url: "https://sell.g2.com",
    details:
      "No G2 product page detected. G2 carries 33-75% of all review-site citations across major AI engines — list your product and seed reviews.",
  };
}

async function checkTrustpilot(
  brand: string,
  siteUrl: string,
): Promise<OffDomainItem> {
  const r = await llmCheckPresence(brand, siteUrl, "trustpilot");
  if (r.present && r.url) {
    return {
      source: "trustpilot",
      label: "Trustpilot",
      present: true,
      url: r.url,
      details: r.detail || "Trustpilot profile exists",
    };
  }
  const host = siteHostname(siteUrl);
  return {
    source: "trustpilot",
    label: "Trustpilot",
    present: false,
    url: host
      ? `https://www.trustpilot.com/review/${host}`
      : "https://business.trustpilot.com/signup",
    details:
      "No Trustpilot profile detected. AI engines weight review-site citations heavily — claim and seed at least 10 reviews.",
  };
}

// ----------------- Reddit (direct + LLM fallback) -----------------

async function checkReddit(brand: string): Promise<OffDomainItem> {
  // Direct Reddit JSON works on developer machines + free CI but
  // routinely 0-results from Vercel data-center IPs. Try it first;
  // if it returns 0 or fails, fall back to web_search.
  const url = `https://www.reddit.com/search.json?q=%22${encodeURIComponent(brand)}%22&sort=relevance&t=year&limit=25`;
  const res = await safeFetch(url, {
    headers: { Accept: "application/json" },
  });
  if (res && res.ok) {
    const data = (await res.json().catch(() => null)) as {
      data?: { children?: Array<{ data?: { permalink?: string } }> };
    } | null;
    const count = data?.data?.children?.length ?? 0;
    if (count > 0) {
      const first = data?.data?.children?.[0]?.data?.permalink;
      return {
        source: "reddit",
        label: "Reddit",
        present: true,
        count,
        url: first
          ? `https://www.reddit.com${first}`
          : `https://www.reddit.com/search/?q=%22${encodeURIComponent(brand)}%22`,
        details: `${count} thread${count === 1 ? "" : "s"} mentioning the brand in the last year`,
      };
    }
  }

  // LLM fallback — ask GPT web_search whether Reddit threads exist.
  try {
    const prompt = `Search the web. Are there any recent (past 12 months) Reddit threads mentioning the brand "${brand}"?

Reply with strict JSON only, no prose:
{
  "present": true | false,
  "url": "https://reddit.com/r/<sub>/comments/...",  // a representative thread URL if any, else null
  "approx_count": "low" | "medium" | "high"  // rough sense of volume
}

Only set present=true if you can cite a real, live Reddit thread URL.`;
    const { text, source: src } = await queryForVisibility("openai", prompt);
    if (text && (src === "web_search" || src === "grounded")) {
      const m = text.match(/\{[\s\S]*?"present"[\s\S]*?\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        if (
          parsed.present &&
          typeof parsed.url === "string" &&
          parsed.url.includes("reddit.com")
        ) {
          return {
            source: "reddit",
            label: "Reddit",
            present: true,
            url: parsed.url,
            details:
              parsed.approx_count === "high"
                ? "Many recent threads mentioning the brand"
                : parsed.approx_count === "medium"
                  ? "Several recent threads mentioning the brand"
                  : "Recent threads mentioning the brand",
          };
        }
      }
    }
  } catch {
    /* fall through to absent */
  }

  return {
    source: "reddit",
    label: "Reddit",
    present: false,
    count: 0,
    url: `https://www.reddit.com/search/?q=%22${encodeURIComponent(brand)}%22`,
    details:
      "No Reddit threads mentioning the brand in the last year. Reddit drives 3.5× more AI citations than its share of traffic — seed authentic discussions in your category subs.",
  };
}

// ----------------- Orchestrator -----------------

export async function runOffDomainCoverage(
  brand: string,
  siteUrl: string,
): Promise<OffDomainItem[]> {
  // Step 1 — anchor on Wikidata (deterministic, free, reliable).
  const wikidata = await findWikidataEntity(brand).catch(() => null);

  // Step 2 — fan out the rest in parallel.
  const [wp, wd, tp, g2, rd] = await Promise.all([
    checkWikipedia(brand, wikidata).catch(() =>
      fallbackUnknown("wikipedia", "Wikipedia"),
    ),
    checkWikidata(brand, wikidata),
    checkTrustpilot(brand, siteUrl).catch(() =>
      fallbackUnknown("trustpilot", "Trustpilot"),
    ),
    checkG2(brand, siteUrl).catch(() => fallbackUnknown("g2", "G2")),
    checkReddit(brand).catch(() => fallbackUnknown("reddit", "Reddit")),
  ]);

  // suppress unused-import warning
  void aiLight;

  return [wp, wd, tp, g2, rd];
}

function fallbackUnknown(
  source: OffDomainSource,
  label: string,
): OffDomainItem {
  return {
    source,
    label,
    present: false,
    details: "Could not check (network or rate limit). We retry weekly.",
  };
}

export function offDomainCoverageScore(items: OffDomainItem[]): number {
  const weights: Record<OffDomainSource, number> = {
    wikipedia: 0.3,
    wikidata: 0.2,
    g2: 0.2,
    reddit: 0.2,
    trustpilot: 0.1,
  };
  let total = 0;
  for (const item of items) {
    const w = weights[item.source] ?? 0;
    if (item.present) total += w;
  }
  return Math.round(total * 100);
}
