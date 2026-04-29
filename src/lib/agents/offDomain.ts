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

async function checkWikipedia(brand: string): Promise<OffDomainItem> {
  const slug = brand.replace(/\s+/g, "_");
  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`;
  const res = await safeFetch(summaryUrl);
  if (res && res.ok) {
    const data = (await res.json().catch(() => null)) as {
      type?: string;
      title?: string;
      content_urls?: { desktop?: { page?: string } };
      extract?: string;
    } | null;
    if (data && data.type !== "disambiguation" && data.title) {
      return {
        source: "wikipedia",
        label: "Wikipedia",
        present: true,
        url:
          data.content_urls?.desktop?.page ||
          `https://en.wikipedia.org/wiki/${encodeURIComponent(slug)}`,
        details:
          data.extract && data.extract.length > 0
            ? data.extract.slice(0, 240)
            : "Wikipedia article exists",
      };
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
  const res = await safeFetch(url, { method: "GET" });
  if (res && res.ok) {
    const html = await res.text();
    // Trustpilot returns a 200 with a "claim your business" page even
    // for unclaimed sites. Distinguish a real profile by the presence
    // of a TrustScore element.
    const hasTrustScore =
      /trustScore/i.test(html) || /aria-label="[^"]*Rated/i.test(html);
    if (hasTrustScore) {
      return {
        source: "trustpilot",
        label: "Trustpilot",
        present: true,
        url,
        details: "Trustpilot profile exists",
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
  const url = `https://www.g2.com/products/${slug}/reviews`;
  const res = await safeFetch(url, { method: "GET" });
  if (res && res.ok) {
    const html = await res.text();
    if (/<title[^>]*>[\s\S]*?G2[\s\S]*?Reviews/i.test(html)) {
      return {
        source: "g2",
        label: "G2",
        present: true,
        url,
        details: "G2 product page exists",
      };
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
