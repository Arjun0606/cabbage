/**
 * Internal Linking Graph — analyzes crawl data to find linking opportunities.
 *
 * Takes the output of siteCrawler and produces:
 * - Orphan pages (zero inbound internal links) that need promotion
 * - Hub pages (too many outbound links — link dilution)
 * - Suggested link insertions based on topical similarity
 *
 * No ML required for this scale — token overlap on title + H1 is enough
 * for real estate sites (most have clear topical clusters already).
 */

import type { CrawledPage, SiteCrawlResult } from "./siteCrawler";

export interface LinkSuggestion {
  fromUrl: string;
  toUrl: string;
  toTitle: string;
  anchorText: string;
  reason: string;
  relevanceScore: number;  // 0-1
}

export interface InternalLinkingReport {
  totalPages: number;
  totalInternalLinks: number;
  avgLinksPerPage: number;
  orphanPages: Array<{ url: string; title: string }>;
  hubPages: Array<{ url: string; title: string; outboundCount: number }>;
  suggestions: LinkSuggestion[];
  topicalClusters: Array<{
    name: string;
    pages: Array<{ url: string; title: string }>;
    avgIntraLinks: number;  // avg internal links within cluster
  }>;
}

// Stop words that don't carry topical signal
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "as", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "must", "shall", "can", "need", "your", "our", "their", "this",
  "that", "these", "those", "home", "homes", "house", "houses", "property",
  "properties", "real", "estate", "india", "new", "best", "top",
]);

function tokenize(text: string): Set<string> {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t))
  );
}

/**
 * Jaccard similarity between two token sets. 0 = no overlap, 1 = identical.
 */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

/**
 * Pick an anchor text for a link — prefer the target page's H1 trimmed,
 * fall back to title, then to URL path.
 */
function pickAnchor(page: CrawledPage): string {
  const source = page.h1 || page.title || "";
  if (source && source.length > 5 && source.length < 100) return source;
  if (source && source.length >= 100) return source.slice(0, 80);
  try { return new URL(page.url).pathname.split("/").filter(Boolean).join(" / ") || "link"; }
  catch { return "link"; }
}

/**
 * Simple topic clustering: group pages where title shares ≥2 meaningful
 * tokens with a cluster centroid.
 */
function clusterPages(pages: CrawledPage[]): InternalLinkingReport["topicalClusters"] {
  const indexed = pages
    .filter((p) => p.title && !p.fetchError)
    .map((p) => ({
      page: p,
      tokens: tokenize(`${p.title} ${p.h1}`),
    }));

  const clusters: Array<{ centroid: Set<string>; members: typeof indexed }> = [];
  for (const item of indexed) {
    let best: typeof clusters[0] | null = null;
    let bestScore = 0;
    for (const c of clusters) {
      const s = jaccard(c.centroid, item.tokens);
      if (s > bestScore && s > 0.2) { bestScore = s; best = c; }
    }
    if (best) {
      best.members.push(item);
      item.tokens.forEach((t) => best.centroid.add(t));
    } else {
      clusters.push({ centroid: new Set(item.tokens), members: [item] });
    }
  }

  return clusters
    .filter((c) => c.members.length >= 2)
    .map((c) => {
      const urlSet = new Set(c.members.map((m) => m.page.url));
      let intraLinks = 0;
      for (const m of c.members) {
        for (const link of m.page.internalLinks) {
          if (urlSet.has(link)) intraLinks += 1;
        }
      }
      // Best label: 3 most common tokens in centroid
      const topTokens = Array.from(c.centroid).slice(0, 3).join(" / ");
      return {
        name: topTokens || "untitled cluster",
        pages: c.members.map((m) => ({ url: m.page.url, title: m.page.title })),
        avgIntraLinks: Math.round((intraLinks / Math.max(1, c.members.length)) * 10) / 10,
      };
    })
    .sort((a, b) => b.pages.length - a.pages.length);
}

export function analyzeInternalLinking(crawl: SiteCrawlResult): InternalLinkingReport {
  const pages = crawl.pages.filter((p) => !p.fetchError);

  // Inbound link counts
  const inboundCount = new Map<string, number>();
  pages.forEach((p) => {
    p.internalLinks.forEach((link) => {
      inboundCount.set(link, (inboundCount.get(link) || 0) + 1);
    });
  });

  // Orphans: zero inbound, not the homepage
  const homepageUrl = pages[0]?.url || "";
  const orphans = pages
    .filter((p) => p.url !== homepageUrl && !inboundCount.has(p.url))
    .map((p) => ({ url: p.url, title: p.title || new URL(p.url).pathname }))
    .slice(0, 20);

  // Hubs: many outbound links
  const hubs = pages
    .filter((p) => p.internalLinks.length >= 20)
    .sort((a, b) => b.internalLinks.length - a.internalLinks.length)
    .slice(0, 10)
    .map((p) => ({ url: p.url, title: p.title || p.url, outboundCount: p.internalLinks.length }));

  // Precompute tokens for all pages once
  const pageTokens = new Map<string, Set<string>>();
  pages.forEach((p) => {
    pageTokens.set(p.url, tokenize(`${p.title} ${p.h1}`));
  });

  // Generate suggestions: for each orphan + low-inbound page, find pages
  // with strong topical similarity that DON'T already link to it.
  const suggestions: LinkSuggestion[] = [];
  const lowInboundThreshold = 2;
  const candidates = pages.filter((p) => {
    const inbound = inboundCount.get(p.url) || 0;
    return inbound < lowInboundThreshold && p.url !== homepageUrl;
  }).slice(0, 30);  // cap to keep compute sensible

  for (const target of candidates) {
    const targetTokens = pageTokens.get(target.url) || new Set();
    if (targetTokens.size === 0) continue;

    const topSources: Array<{ page: CrawledPage; score: number }> = [];
    for (const source of pages) {
      if (source.url === target.url) continue;
      // Skip if source already links to target
      if (source.internalLinks.includes(target.url)) continue;
      // Skip if source has no content to reference from
      if (source.wordCount < 200) continue;

      const sourceTokens = pageTokens.get(source.url) || new Set();
      const score = jaccard(sourceTokens, targetTokens);
      if (score > 0.15) {
        topSources.push({ page: source, score });
      }
    }
    topSources.sort((a, b) => b.score - a.score);

    // Suggest top 2 source pages per target
    for (const { page: source, score } of topSources.slice(0, 2)) {
      const sharedTokens = [...(pageTokens.get(source.url) || new Set())].filter((t) => targetTokens.has(t));
      suggestions.push({
        fromUrl: source.url,
        toUrl: target.url,
        toTitle: target.title || new URL(target.url).pathname,
        anchorText: pickAnchor(target),
        reason: `Both pages discuss ${sharedTokens.slice(0, 3).join(", ")} — ${source.title?.slice(0, 60) || "source"} should link to this.`,
        relevanceScore: Math.round(score * 100) / 100,
      });
    }
  }

  // Sort suggestions by relevance, cap to 50
  suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const totalInternalLinks = pages.reduce((s, p) => s + p.internalLinks.length, 0);

  return {
    totalPages: pages.length,
    totalInternalLinks,
    avgLinksPerPage: Math.round((totalInternalLinks / Math.max(1, pages.length)) * 10) / 10,
    orphanPages: orphans,
    hubPages: hubs,
    suggestions: suggestions.slice(0, 50),
    topicalClusters: clusterPages(pages),
  };
}
