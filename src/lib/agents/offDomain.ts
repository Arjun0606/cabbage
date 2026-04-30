/**
 * Off-domain coverage audit.
 *
 * Research finding (Apr 2026): 82-89% of AI citations come from earned
 * media — third-party authoritative sources, not the brand's own
 * website. Brands with 10+ independent referring domains see 3.2× the
 * mention rate. This audit measures presence on the high-trust sources
 * AI engines actually cite from.
 *
 * Each check is a fast HTTP probe (with timeout) that says yes/no on
 * presence and links the user to either their existing profile (for
 * fix-on-the-platform actions) or the source's create-page URL (so
 * they can go claim it). No third-party API keys required.
 *
 * Sources covered:
 * - Wikipedia    AI's #1 entity-grounding lever
 * - Wikidata     2.8× citation lift when present (April 2026 research)
 * - Trustpilot   high-trust review-site citations
 * - G2           33-75% of B2B SaaS review-site citations across engines
 * - Reddit       17× fewer visits than Google but 3.5× more AI citations
 */

const FETCH_TIMEOUT_MS = 8_000;
const USER_AGENT = "Cabbge/1.0 (+https://cabbge.com)";

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
  /** Existing profile or evidence URL when found, else "create here" link. */
  url?: string;
  details: string;
  /** For sources that support a count, e.g. Reddit mentions. */
  count?: number;
}

function brandSlug(brand: string): string {
  return brand
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
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
        Accept: init.headers
          ? (init.headers as Record<string, string>)["Accept"] ||
            "application/json"
          : "application/json",
        ...((init.headers as Record<string, string>) || {}),
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
  } catch {
    return null;
  }
}

interface WikiSummary {
  type?: string;
  title?: string;
  content_urls?: { desktop?: { page?: string } };
  extract?: string;
}

async function wikiSummary(slug: string): Promise<WikiSummary | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`;
  const res = await safeFetch(url);
  if (!res || !res.ok) return null;
  return (await res.json().catch(() => null)) as WikiSummary | null;
}

function wikiHit(s: WikiSummary, fallbackSlug: string): OffDomainItem {
  return {
    source: "wikipedia",
    label: "Wikipedia",
    present: true,
    url:
      s.content_urls?.desktop?.page ||
      `https://en.wikipedia.org/wiki/${encodeURIComponent(fallbackSlug)}`,
    details:
      s.extract && s.extract.length > 0
        ? s.extract.slice(0, 240)
        : "Wikipedia article exists",
  };
}

async function checkWikipedia(brand: string): Promise<OffDomainItem> {
  // 1. Try the direct slug — fastest path for unambiguous brands.
  const directSlug = brand.replace(/\s+/g, "_");
  const direct = await wikiSummary(directSlug);
  if (direct && direct.title && direct.type !== "disambiguation") {
    return wikiHit(direct, directSlug);
  }

  // 2. Direct hit was a disambiguation page (common for short brand
  //    names — "Stripe" → disambiguation, real article is "Stripe, Inc.")
  //    or didn't exist. Use the opensearch endpoint to find candidate
  //    titles, then pull each one's summary until we find a real
  //    article. Limit to top 5 candidates so we don't fan out.
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&limit=5&search=${encodeURIComponent(brand)}`;
  const sRes = await safeFetch(searchUrl);
  if (sRes && sRes.ok) {
    const data = (await sRes.json().catch(() => null)) as
      | [string, string[], string[], string[]]
      | null;
    const titles = data?.[1] || [];
    const urls = data?.[3] || [];
    for (let i = 0; i < titles.length; i++) {
      const candidateSlug = titles[i].replace(/\s+/g, "_");
      const summary = await wikiSummary(candidateSlug);
      if (
        summary &&
        summary.title &&
        summary.type !== "disambiguation"
      ) {
        return {
          source: "wikipedia",
          label: "Wikipedia",
          present: true,
          url:
            summary.content_urls?.desktop?.page ||
            urls[i] ||
            `https://en.wikipedia.org/wiki/${encodeURIComponent(candidateSlug)}`,
          details:
            summary.extract && summary.extract.length > 0
              ? summary.extract.slice(0, 240)
              : "Wikipedia article exists",
        };
      }
    }
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

async function checkWikidata(brand: string): Promise<OffDomainItem> {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=5&search=${encodeURIComponent(brand)}`;
  const res = await safeFetch(url);
  if (res && res.ok) {
    const data = (await res.json().catch(() => null)) as {
      search?: Array<{ id: string; label?: string; description?: string }>;
    } | null;
    const hit = data?.search?.find((s) => {
      const label = (s.label || "").toLowerCase();
      const target = brand.toLowerCase();
      return label === target || label.startsWith(target + " ");
    });
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

async function checkTrustpilot(siteUrl: string): Promise<OffDomainItem> {
  const host = siteHostname(siteUrl);
  if (!host) {
    return {
      source: "trustpilot",
      label: "Trustpilot",
      present: false,
      details: "Could not derive hostname.",
    };
  }
  const url = `https://www.trustpilot.com/review/${host}`;
  const res = await safeFetch(url, {
    method: "GET",
    headers: {
      Accept: "text/html",
      "User-Agent":
        "Mozilla/5.0 (compatible; CabbgeBot/1.0; +https://cabbge.com)",
    },
  });
  if (res && res.ok) {
    const html = await res.text();
    // Trustpilot 200s on every URL — claimed business pages, unclaimed
    // pages, and even for hostnames that don't exist (they auto-create
    // a placeholder). A few signals we accept as "real profile":
    //   - aggregateRating JSON-LD block (always present when reviews exist)
    //   - data-business-unit-name attribute
    //   - "TrustScore" text
    //   - "[N] reviews" text where N > 0
    //   - reviewCount JSON-LD field
    const hasAggregate =
      /"@type"\s*:\s*"AggregateRating"/i.test(html) ||
      /aggregateRating/i.test(html);
    const hasBusinessUnit =
      /data-business-unit-name/i.test(html) ||
      /data-business-unit-id/i.test(html);
    const hasTrustScore =
      /trustScore/i.test(html) || /aria-label="[^"]*Rated/i.test(html);
    const reviewCountMatch = html.match(/"reviewCount"\s*:\s*"?(\d+)/i);
    const hasReviews = reviewCountMatch
      ? parseInt(reviewCountMatch[1], 10) > 0
      : false;

    if (hasAggregate || hasBusinessUnit || hasTrustScore || hasReviews) {
      return {
        source: "trustpilot",
        label: "Trustpilot",
        present: true,
        url,
        details: hasReviews
          ? `Trustpilot profile with ${reviewCountMatch![1]} reviews`
          : "Trustpilot profile exists",
      };
    }
  }
  return {
    source: "trustpilot",
    label: "Trustpilot",
    present: false,
    url: "https://business.trustpilot.com/signup",
    details:
      "No Trustpilot profile detected. AI engines weight review-site citations heavily — claim and seed at least 10 reviews.",
  };
}

async function checkG2(brand: string): Promise<OffDomainItem> {
  const slug = brandSlug(brand);
  if (!slug) {
    return {
      source: "g2",
      label: "G2",
      present: false,
      details: "Could not slugify brand name.",
    };
  }
  // G2 product slugs aren't always 1:1 with brand names (e.g. Stripe
  // is at /products/stripe-payments). Use the search endpoint which
  // returns matches across all products, then verify by fetching
  // /products/<slug>.
  const searchUrl = `https://www.g2.com/search?query=${encodeURIComponent(brand)}`;
  const sRes = await safeFetch(searchUrl, {
    method: "GET",
    headers: {
      Accept: "text/html",
      "User-Agent":
        "Mozilla/5.0 (compatible; CabbgeBot/1.0; +https://cabbge.com)",
    },
  });
  if (sRes && sRes.ok) {
    const html = await sRes.text();
    // Look for the first /products/<slug> link in the search results.
    // G2 escapes its product URLs as href="/products/<slug>".
    const m = html.match(
      new RegExp(
        `href="/products/([a-z0-9][a-z0-9-]*?)(?:/reviews|"|/)`,
        "i",
      ),
    );
    const foundSlug = m?.[1];
    if (foundSlug) {
      // Verify the brand name actually appears in the search-result
      // context — guards against G2 returning unrelated suggestions.
      const idx = html.indexOf(`/products/${foundSlug}`);
      const context = html.slice(Math.max(0, idx - 200), idx + 200);
      if (
        new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(
          context,
        ) ||
        foundSlug.includes(slug) ||
        slug.includes(foundSlug.split("-")[0])
      ) {
        return {
          source: "g2",
          label: "G2",
          present: true,
          url: `https://www.g2.com/products/${foundSlug}/reviews`,
          details: "G2 product page exists",
        };
      }
    }
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

async function checkReddit(brand: string): Promise<OffDomainItem> {
  // Reddit aggressively rate-limits / 429s short or generic UAs. The
  // mention-tracker variant uses this same long-form UA and works
  // reliably; mirror it here for consistency.
  const url = `https://www.reddit.com/search.json?q=%22${encodeURIComponent(brand)}%22&sort=relevance&t=year&limit=25`;
  const res = await safeFetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "cabbge.com off-domain-checker (https://cabbge.com)",
    },
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

export async function runOffDomainCoverage(
  brand: string,
  siteUrl: string,
): Promise<OffDomainItem[]> {
  const checks = await Promise.all([
    checkWikipedia(brand).catch(() => fallbackUnknown("wikipedia", "Wikipedia")),
    checkWikidata(brand).catch(() => fallbackUnknown("wikidata", "Wikidata")),
    checkTrustpilot(siteUrl).catch(() =>
      fallbackUnknown("trustpilot", "Trustpilot"),
    ),
    checkG2(brand).catch(() => fallbackUnknown("g2", "G2")),
    checkReddit(brand).catch(() => fallbackUnknown("reddit", "Reddit")),
  ]);
  return checks;
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
  // Each source weighted by approximate AI citation impact.
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
