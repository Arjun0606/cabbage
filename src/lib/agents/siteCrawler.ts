/**
 * Site Crawler — discovers every URL on a site, runs per-URL audit.
 *
 * Starts at the root URL, follows internal links breadth-first, stops
 * at maxPages. For each URL captures SEO signals (title, meta, headings,
 * word count, image alts, broken links, schema) and flags issues.
 *
 * Pure HTML parsing (no headless browser). Real estate sites are mostly
 * static so this covers 95% of audit value at a fraction of the cost.
 */

import { sanitizeUrl } from "@/lib/security";

export interface CrawledPage {
  url: string;
  statusCode: number;
  title: string;
  metaDescription: string;
  h1: string;
  h2Count: number;
  h3Count: number;
  wordCount: number;
  images: { total: number; withAlt: number; withoutAlt: number };
  internalLinks: string[];
  externalLinkCount: number;
  hasSchema: boolean;
  schemaTypes: string[];
  hasCanonical: boolean;
  canonicalUrl: string;
  isIndexable: boolean;  // no noindex meta
  lang: string;
  loadTimeMs: number;
  fetchError?: string;
  // Derived issues
  issues: Array<{ severity: "high" | "medium" | "low"; message: string }>;
}

export interface SiteCrawlResult {
  startUrl: string;
  origin: string;
  crawledAt: string;
  totalPages: number;
  maxPagesReached: boolean;
  durationMs: number;
  pages: CrawledPage[];
  // Site-wide metrics
  summary: {
    pagesWithoutTitle: number;
    pagesWithoutMetaDescription: number;
    pagesWithoutH1: number;
    pagesWithDuplicateTitles: number;
    pagesWithThinContent: number;     // < 300 words
    pagesWithBrokenLinks: number;
    pagesWithoutSchema: number;
    noindexPages: number;
    orphanPages: number;               // zero inbound internal links
    imagesWithoutAlt: number;
  };
}

const DEFAULT_MAX_PAGES = 200;
const FETCH_TIMEOUT_MS = 10_000;
const CRAWL_TIMEOUT_MS = 8 * 60_000; // hard 8-minute cap so a deep site can't hang the request
const CONCURRENCY = 12;              // tuned so a 2000-page crawl completes in ~5 min
const USER_AGENT = "Cabbge/1.0 SEO Crawler (+https://cabbge.com)";

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMatches(html: string, regex: RegExp, groupIdx = 1): string[] {
  const matches: string[] = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    if (m[groupIdx]) matches.push(m[groupIdx]);
  }
  return matches;
}

function countMatches(html: string, regex: RegExp): number {
  const matches = html.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Normalize an internal link: resolve against base, strip fragments + query,
 * drop trailing slash for comparison consistency.
 */
function normalizeLink(href: string, baseUrl: string, origin: string): string | null {
  try {
    const abs = new URL(href, baseUrl);
    // Only same-origin internal links
    if (abs.origin !== origin) return null;
    // Drop fragments and queries — they're usually the same page
    abs.hash = "";
    abs.search = "";
    // Drop trailing slash except for root
    let path = abs.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return `${abs.origin}${path}`;
  } catch {
    return null;
  }
}

async function fetchPage(url: string): Promise<{ html: string; statusCode: number; loadTimeMs: number; error?: string }> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const html = await res.text();
    return { html, statusCode: res.status, loadTimeMs: Date.now() - start };
  } catch (err) {
    return {
      html: "",
      statusCode: 0,
      loadTimeMs: Date.now() - start,
      error: err instanceof Error ? err.message : "fetch failed",
    };
  }
}

/**
 * Seed the crawl queue from /sitemap.xml and /robots.txt so a 2000-page
 * developer site fills the queue in seconds rather than hours of
 * link-walking. Falls back silently to link-discovery when the sitemap
 * isn't there or is unparseable — the caller always has the root URL.
 *
 * We recursively follow sitemap index files (<sitemapindex>) so sites
 * that split their sitemap by month / section still get covered.
 */
async function seedFromSitemap(origin: string, cap: number): Promise<string[]> {
  const seen = new Set<string>();
  const collected: string[] = [];

  // Try robots.txt first — gives us every declared sitemap URL.
  const sitemapUrls = new Set<string>([`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`]);
  try {
    const robots = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }).then((r) => (r.ok ? r.text() : ""));
    for (const line of robots.split(/\r?\n/)) {
      const m = line.match(/^\s*Sitemap:\s*(\S+)/i);
      if (m) sitemapUrls.add(m[1].trim());
    }
  } catch {
    /* no robots.txt — fine */
  }

  const fetchSitemap = async (url: string, depth = 0): Promise<void> => {
    if (depth > 3 || collected.length >= cap) return;
    if (seen.has(url)) return;
    seen.add(url);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) return;
      const xml = await res.text();
      // Handle sitemap-index files (nested sitemap lists)
      const nested = Array.from(xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi))
        .map((m) => m[1].trim());
      for (const n of nested) await fetchSitemap(n, depth + 1);
      // Leaf sitemap URLs
      const urls = Array.from(xml.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/gi))
        .map((m) => m[1].trim());
      for (const u of urls) {
        if (collected.length >= cap) break;
        try {
          const parsed = new URL(u);
          if (parsed.origin !== origin) continue;
          const normalized = normalizeLink(u, u, origin);
          if (normalized) collected.push(normalized);
        } catch {
          /* skip malformed */
        }
      }
    } catch {
      /* unreadable — keep going */
    }
  };

  for (const smUrl of sitemapUrls) {
    if (collected.length >= cap) break;
    await fetchSitemap(smUrl);
  }

  // Dedup preserving order.
  const uniq = new Set<string>();
  return collected.filter((u) => (uniq.has(u) ? false : (uniq.add(u), true)));
}

function auditPage(url: string, html: string, statusCode: number, loadTimeMs: number, origin: string, error?: string): CrawledPage {
  if (error || statusCode >= 400) {
    return {
      url,
      statusCode,
      title: "",
      metaDescription: "",
      h1: "",
      h2Count: 0,
      h3Count: 0,
      wordCount: 0,
      images: { total: 0, withAlt: 0, withoutAlt: 0 },
      internalLinks: [],
      externalLinkCount: 0,
      hasSchema: false,
      schemaTypes: [],
      hasCanonical: false,
      canonicalUrl: "",
      isIndexable: false,
      lang: "",
      loadTimeMs,
      fetchError: error || `HTTP ${statusCode}`,
      issues: [{ severity: "high", message: error || `HTTP ${statusCode}` }],
    };
  }

  // Extract SEO signals
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.trim().replace(/\s+/g, " ") || "";

  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
    ?? html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const metaDescription = metaDescMatch?.[1]?.trim() || "";

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match ? stripHtml(h1Match[1]).slice(0, 200) : "";

  const h2Count = countMatches(html, /<h2[\s>]/gi);
  const h3Count = countMatches(html, /<h3[\s>]/gi);

  const visibleText = stripHtml(html);
  const wordCount = visibleText.split(/\s+/).filter((w) => w.length > 1).length;

  // Images + alt analysis
  const imgTags = html.match(/<img[^>]+>/gi) || [];
  let withAlt = 0;
  let withoutAlt = 0;
  for (const img of imgTags) {
    const hasNonEmptyAlt = /alt=["'][^"']+["']/i.test(img);
    if (hasNonEmptyAlt) withAlt += 1;
    else withoutAlt += 1;
  }

  // Links
  const linkHrefs = extractMatches(html, /<a[^>]+href=["']([^"']+)["']/gi);
  const internalSet = new Set<string>();
  let externalCount = 0;
  for (const href of linkHrefs) {
    const normalized = normalizeLink(href, url, origin);
    if (normalized) {
      internalSet.add(normalized);
    } else if (/^https?:/i.test(href)) {
      externalCount += 1;
    }
  }

  // Schema
  const schemaBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  let hasSchema = false;
  const schemaTypes: string[] = [];
  for (const block of schemaBlocks) {
    try {
      const jsonText = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
      const parsed = JSON.parse(jsonText);
      hasSchema = true;
      if (parsed["@type"]) schemaTypes.push(String(parsed["@type"]));
      if (Array.isArray(parsed["@graph"])) {
        for (const item of parsed["@graph"]) {
          if (item?.["@type"]) schemaTypes.push(String(item["@type"]));
        }
      }
    } catch { /* skip invalid schema */ }
  }

  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  const canonicalUrl = canonicalMatch?.[1] || "";
  const hasCanonical = !!canonicalUrl && canonicalUrl.startsWith("http");

  // Indexability — noindex anywhere in robots meta
  const robotsMetaMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i);
  const robotsContent = robotsMetaMatch?.[1]?.toLowerCase() || "";
  const isIndexable = !robotsContent.includes("noindex");

  const langMatch = html.match(/<html[^>]*\slang=["']([a-z-]+)["']/i);
  const lang = langMatch?.[1] || "";

  // Derive issues
  const issues: CrawledPage["issues"] = [];
  if (!title) issues.push({ severity: "high", message: "Missing <title> tag" });
  else if (title.length < 30) issues.push({ severity: "medium", message: `Title too short (${title.length} chars, aim for 50-60)` });
  else if (title.length > 70) issues.push({ severity: "medium", message: `Title too long (${title.length} chars, max 60)` });

  if (!metaDescription) issues.push({ severity: "high", message: "Missing meta description" });
  else if (metaDescription.length < 50) issues.push({ severity: "medium", message: `Meta description too short (${metaDescription.length} chars, aim for 120-160)` });
  else if (metaDescription.length > 160) issues.push({ severity: "low", message: `Meta description too long (${metaDescription.length} chars)` });

  if (!h1) issues.push({ severity: "high", message: "Missing H1 heading" });
  if (h2Count === 0) issues.push({ severity: "medium", message: "No H2 headings — content lacks structure" });

  if (wordCount < 300) issues.push({ severity: "high", message: `Thin content (${wordCount} words, aim for 500+)` });
  else if (wordCount < 500) issues.push({ severity: "medium", message: `Low word count (${wordCount} words)` });

  if (withoutAlt > 0) issues.push({ severity: "medium", message: `${withoutAlt} image${withoutAlt > 1 ? "s" : ""} missing alt text` });

  if (!hasSchema) issues.push({ severity: "medium", message: "No structured data (JSON-LD) — AI can't understand page context" });
  if (!hasCanonical) issues.push({ severity: "low", message: "Missing canonical URL" });
  if (!isIndexable) issues.push({ severity: "high", message: "Page has noindex meta tag — won't appear in search" });
  if (!lang) issues.push({ severity: "low", message: "Missing <html lang> attribute" });
  if (loadTimeMs > 3000) issues.push({ severity: "medium", message: `Slow page load (${(loadTimeMs / 1000).toFixed(1)}s)` });

  return {
    url,
    statusCode,
    title,
    metaDescription,
    h1,
    h2Count,
    h3Count,
    wordCount,
    images: { total: imgTags.length, withAlt, withoutAlt },
    internalLinks: Array.from(internalSet),
    externalLinkCount: externalCount,
    hasSchema,
    schemaTypes: Array.from(new Set(schemaTypes)).slice(0, 10),
    hasCanonical,
    canonicalUrl,
    isIndexable,
    lang,
    loadTimeMs,
    issues,
  };
}

/**
 * Resumable crawl state. Persisted between cron ticks for chunked
 * crawls so a 3000-page Scale-tier scan finishes across multiple
 * Vercel-function invocations instead of dying at the 5-minute wall.
 */
export interface CrawlState {
  visited: string[];
  queue: string[];
  pages: CrawledPage[];
}

export interface ChunkedCrawlResult {
  /** Partial or final result rendered from whatever's been crawled so far. */
  result: SiteCrawlResult;
  /** Resumable state. Pass back via `prevState` on the next chunk. */
  state: CrawlState;
  /** True when the crawl is finished (queue drained or maxPages reached). */
  done: boolean;
}

interface ChunkOptions {
  /** Hard cap on total pages across the WHOLE crawl. */
  maxPages: number;
  /** Max pages to process inside THIS invocation. Defaults to maxPages —
   *  i.e. single-shot, the existing behaviour. Pass a smaller number
   *  (e.g. 1500) to split across multiple invocations. */
  chunkSize?: number;
  /** Resume from a previous chunk's saved state. */
  prevState?: CrawlState;
  /** Override the per-invocation deadline. Defaults to CRAWL_TIMEOUT_MS. */
  invocationTimeoutMs?: number;
}

/**
 * Chunked variant of runSiteCrawl. The single-shot wrapper below
 * (runSiteCrawl) preserves the original signature; everything chunked
 * goes through this. Inline crawls call it once with chunkSize=maxPages,
 * which is functionally identical to the previous implementation.
 */
export async function runSiteCrawlChunk(
  startUrl: string,
  options: ChunkOptions,
): Promise<ChunkedCrawlResult> {
  const { valid, url: safeUrl, error } = sanitizeUrl(startUrl);
  if (!valid) throw new Error(error || "Invalid URL");

  const maxPages = options.maxPages;
  const chunkSize = Math.min(options.chunkSize ?? maxPages, maxPages);
  const startTime = Date.now();
  const deadline = startTime + (options.invocationTimeoutMs ?? CRAWL_TIMEOUT_MS);
  const origin = new URL(safeUrl).origin;
  const rootUrl = normalizeLink(safeUrl, safeUrl, origin) || safeUrl;

  // Hydrate from prevState if resuming. Sets are rebuilt from arrays
  // since JSON can't ship Set instances directly.
  const visited = new Set<string>(options.prevState?.visited || []);
  const pages: CrawledPage[] = options.prevState?.pages ? [...options.prevState.pages] : [];
  const queued = new Set<string>(options.prevState?.queue || []);
  const queue: string[] = options.prevState?.queue ? [...options.prevState.queue] : [];

  const enqueue = (url: string) => {
    if (!url || visited.has(url) || queued.has(url)) return;
    if (pages.length + queue.length >= maxPages) return;
    queue.push(url);
    queued.add(url);
  };

  // First-tick seeding only — once we're resuming, the queue + visited
  // sets carry every URL we know about.
  if (!options.prevState) {
    enqueue(rootUrl);
    const seeds = await seedFromSitemap(origin, maxPages);
    for (const s of seeds) enqueue(s);
  }

  const pagesAtStart = pages.length;
  const chunkBudget = pagesAtStart + chunkSize;

  // Main crawl loop. Stops when:
  //  - the queue is empty (crawl genuinely finished)
  //  - we've hit the global maxPages cap
  //  - we've hit the per-chunk pages budget (more ticks coming)
  //  - we're 5 seconds from the per-invocation deadline (Vercel safety)
  while (queue.length > 0 && pages.length < maxPages && pages.length < chunkBudget) {
    if (Date.now() > deadline - 5_000) break;
    const batch = queue.splice(0, CONCURRENCY).filter((u) => !visited.has(u));
    batch.forEach((u) => {
      visited.add(u);
      queued.delete(u);
    });

    const results = await Promise.all(
      batch.map(async (url) => {
        const { html, statusCode, loadTimeMs, error: fetchError } = await fetchPage(url);
        return auditPage(url, html, statusCode, loadTimeMs, origin, fetchError);
      })
    );

    for (const page of results) {
      if (pages.length >= maxPages || pages.length >= chunkBudget) break;
      pages.push(page);
      for (const link of page.internalLinks) enqueue(link);
    }
  }

  const done = queue.length === 0 || pages.length >= maxPages;

  // Site-wide summary computed from whatever we have so far. Same shape
  // every chunk; downstream consumers (the dashboard) render with the
  // partial set when `done` is false.
  const titles = new Map<string, number>();
  pages.forEach((p) => { if (p.title) titles.set(p.title, (titles.get(p.title) || 0) + 1); });
  const duplicateTitleCount = Array.from(titles.values()).filter((n) => n > 1).reduce((a, b) => a + b, 0);

  const inboundCounts = new Map<string, number>();
  pages.forEach((p) => {
    p.internalLinks.forEach((link) => {
      inboundCounts.set(link, (inboundCounts.get(link) || 0) + 1);
    });
  });
  const orphanPages = pages.filter((p) => p.url !== rootUrl && !inboundCounts.has(p.url)).length;

  const summary: SiteCrawlResult["summary"] = {
    pagesWithoutTitle: pages.filter((p) => !p.title && !p.fetchError).length,
    pagesWithoutMetaDescription: pages.filter((p) => !p.metaDescription && !p.fetchError).length,
    pagesWithoutH1: pages.filter((p) => !p.h1 && !p.fetchError).length,
    pagesWithDuplicateTitles: duplicateTitleCount,
    pagesWithThinContent: pages.filter((p) => p.wordCount > 0 && p.wordCount < 300).length,
    pagesWithBrokenLinks: pages.filter((p) => p.statusCode >= 400 || p.statusCode === 0).length,
    pagesWithoutSchema: pages.filter((p) => !p.hasSchema && !p.fetchError).length,
    noindexPages: pages.filter((p) => !p.isIndexable && !p.fetchError).length,
    orphanPages,
    imagesWithoutAlt: pages.reduce((sum, p) => sum + p.images.withoutAlt, 0),
  };

  const result: SiteCrawlResult = {
    startUrl: safeUrl,
    origin,
    crawledAt: new Date().toISOString(),
    totalPages: pages.length,
    maxPagesReached: pages.length >= maxPages,
    durationMs: Date.now() - startTime,
    pages,
    summary,
  };

  return {
    result,
    state: {
      visited: Array.from(visited),
      queue,
      pages,
    },
    done,
  };
}

/**
 * Single-shot crawl. Preserved for callers (Starter / Growth tiers,
 * inline scans) that fit inside one invocation. Internally a thin
 * wrapper around runSiteCrawlChunk with chunkSize=maxPages.
 */
export async function runSiteCrawl(
  startUrl: string,
  maxPages: number = DEFAULT_MAX_PAGES,
): Promise<SiteCrawlResult> {
  const { result } = await runSiteCrawlChunk(startUrl, { maxPages });
  return result;
}
