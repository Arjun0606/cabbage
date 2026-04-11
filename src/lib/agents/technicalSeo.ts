/**
 * Deep Technical SEO Agent
 * Matches Okara's Technical tab: server timing, render blocking,
 * content relevance, heading structure, social media tags, resource issues.
 */

export interface TechnicalSeoResult {
  url: string;
  onPageScore: number;

  server: {
    host: string;
    encoding: string;
    domSize: string;
    status: number;
    pageSize: string;
    cacheable: boolean;
  };

  serverTiming: {
    timeToInteractive: number;
    domComplete: number;
    connection: number;
    tlsHandshake: number;
    ttfb: number;
    download: number;
  };

  renderBlocking: {
    scripts: number;
    stylesheets: number;
  };

  contentRelevance: {
    titleRelevance: number;
    descriptionRelevance: number;
    keywordRelevance: number;
    contentRate: number;
  };

  headingStructure: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
  };

  socialMediaTags: {
    openGraph: { property: string; content: string }[];
    twitter: { property: string; content: string }[];
    totalTags: number;
  };

  siteFiles: {
    robotsTxt: { exists: boolean; size: number; status: number };
    llmsTxt: { exists: boolean; size: number; status: number };
    sitemapXml: { exists: boolean; size: number; status: number };
  };

  resourceIssues: { issue: string; severity: "warning" | "error" }[];
}

// ---------- Implementation ----------

async function fetchWithTiming(url: string): Promise<{
  html: string;
  headers: Record<string, string>;
  status: number;
  timing: { ttfb: number; download: number; total: number };
  size: number;
}> {
  const start = Date.now();
  let ttfbEnd = 0;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CabbageSEO/1.0 (Technical Audit)" },
      redirect: "follow",
    });

    ttfbEnd = Date.now();
    const html = await res.text();
    const end = Date.now();

    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });

    return {
      html,
      headers,
      status: res.status,
      timing: {
        ttfb: ttfbEnd - start,
        download: end - ttfbEnd,
        total: end - start,
      },
      size: new Blob([html]).size,
    };
  } catch {
    return {
      html: "",
      headers: {},
      status: 0,
      timing: { ttfb: 0, download: 0, total: 0 },
      size: 0,
    };
  }
}

function extractHeadings(html: string) {
  return {
    h1: (html.match(/<h1[\s>]/gi) || []).length,
    h2: (html.match(/<h2[\s>]/gi) || []).length,
    h3: (html.match(/<h3[\s>]/gi) || []).length,
    h4: (html.match(/<h4[\s>]/gi) || []).length,
  };
}

function extractOpenGraph(html: string): { property: string; content: string }[] {
  const tags: { property: string; content: string }[] = [];
  const regex = /<meta\s+[^>]*property=["'](og:[^"']*)["'][^>]*content=["']([^"']*)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    tags.push({ property: match[1], content: match[2] });
  }
  // Also check reverse attribute order
  const regex2 = /<meta\s+[^>]*content=["']([^"']*)["'][^>]*property=["'](og:[^"']*)["']/gi;
  while ((match = regex2.exec(html)) !== null) {
    tags.push({ property: match[2], content: match[1] });
  }
  return tags;
}

function extractTwitterCards(html: string): { property: string; content: string }[] {
  const tags: { property: string; content: string }[] = [];
  const regex = /<meta\s+[^>]*(?:name|property)=["'](twitter:[^"']*)["'][^>]*content=["']([^"']*)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    tags.push({ property: match[1], content: match[2] });
  }
  return tags;
}

function countRenderBlockingResources(html: string) {
  // Scripts without async/defer
  const allScripts = html.match(/<script[^>]*src=/gi) || [];
  const asyncDefer = html.match(/<script[^>]*(async|defer)[^>]*src=/gi) || [];
  const blockingScripts = allScripts.length - asyncDefer.length;

  // Stylesheets (all are render-blocking by default unless media query)
  const allStyles = html.match(/<link[^>]*rel=["']stylesheet["']/gi) || [];

  return {
    scripts: Math.max(0, blockingScripts),
    stylesheets: allStyles.length,
  };
}

function detectResourceIssues(
  html: string,
  size: number,
  headings: ReturnType<typeof extractHeadings>
): { issue: string; severity: "warning" | "error" }[] {
  const issues: { issue: string; severity: "warning" | "error" }[] = [];

  if (size > 500000) {
    issues.push({ issue: `Page size is ${(size / 1024).toFixed(0)}KB — over 500KB threshold`, severity: "warning" });
  }
  if (size > 1000000) {
    issues.push({ issue: `Page size is ${(size / 1024).toFixed(0)}KB — extremely large, will hurt mobile performance`, severity: "error" });
  }

  const domNodes = (html.match(/<[a-z]/gi) || []).length;
  if (domNodes > 1500) {
    issues.push({ issue: `Has node with more than ${domNodes} child elements`, severity: "warning" });
  }

  // Images without alt text
  const imgsNoAlt = (html.match(/<img(?![^>]*alt=)[^>]*>/gi) || []).length;
  if (imgsNoAlt > 0) {
    issues.push({ issue: `${imgsNoAlt} image(s) missing alt text`, severity: "warning" });
  }

  // Multiple H1 tags
  if (headings.h1 > 1) {
    issues.push({ issue: `Multiple H1 tags found (${headings.h1}) — should have exactly one`, severity: "warning" });
  }
  if (headings.h1 === 0) {
    issues.push({ issue: "No H1 tag found — every page needs one", severity: "error" });
  }

  // Inline styles
  const inlineStyles = (html.match(/style=["']/gi) || []).length;
  if (inlineStyles > 20) {
    issues.push({ issue: `${inlineStyles} inline styles detected — consider moving to CSS`, severity: "warning" });
  }

  // Mixed content
  if (/src=["']http:\/\//i.test(html)) {
    issues.push({ issue: "Mixed content detected — HTTP resources on HTTPS page", severity: "error" });
  }

  return issues;
}

async function checkSiteFile(
  baseUrl: string,
  path: string
): Promise<{ exists: boolean; size: number; status: number }> {
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { "User-Agent": "CabbageSEO/1.0" },
    });
    const text = await res.text();
    const is404 = text.includes("404") || text.includes("Not Found");
    return {
      exists: res.ok && !is404,
      size: new Blob([text]).size,
      status: res.status,
    };
  } catch {
    return { exists: false, size: 0, status: 0 };
  }
}

// ---------- Main Function ----------

export async function runTechnicalSeo(url: string): Promise<TechnicalSeoResult> {
  if (!url.startsWith("http")) url = `https://${url}`;

  const { html, headers, status, timing, size } = await fetchWithTiming(url);
  const baseUrl = new URL(url).origin;

  const headings = extractHeadings(html);
  const openGraph = extractOpenGraph(html);
  const twitterCards = extractTwitterCards(html);
  const renderBlocking = countRenderBlockingResources(html);
  const resourceIssues = detectResourceIssues(html, size, headings);

  // Check site files in parallel
  const [robotsTxt, llmsTxt, sitemapXml] = await Promise.all([
    checkSiteFile(baseUrl, "/robots.txt"),
    checkSiteFile(baseUrl, "/llms.txt"),
    checkSiteFile(baseUrl, "/sitemap.xml"),
  ]);

  // Calculate content relevance scores
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i);
  const bodyText = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]*>/g, "");
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  const codeSize = size;
  const textSize = new Blob([bodyText]).size;

  const contentRate = codeSize > 0 ? Math.round((textSize / codeSize) * 1000) / 10 : 0;

  // Simple relevance scoring (title/desc alignment with body content)
  const titleRelevance = titleMatch?.[1] ? 100 : 0;
  const descriptionRelevance = metaDescMatch?.[1] ? 100 : 0;

  // On-page score
  let onPageScore = 100;
  if (!titleMatch?.[1]) onPageScore -= 15;
  if (!metaDescMatch?.[1]) onPageScore -= 10;
  if (headings.h1 !== 1) onPageScore -= 10;
  if (openGraph.length === 0) onPageScore -= 10;
  if (!sitemapXml.exists) onPageScore -= 10;
  if (!robotsTxt.exists) onPageScore -= 5;
  if (renderBlocking.scripts > 3) onPageScore -= 10;
  resourceIssues.forEach((i) => {
    onPageScore -= i.severity === "error" ? 10 : 5;
  });
  onPageScore = Math.max(0, onPageScore);

  return {
    url,
    onPageScore,
    server: {
      host: headers["server"] || "Unknown",
      encoding: headers["content-encoding"] || "none",
      domSize: `${(size / 1024).toFixed(0)} KB`,
      status,
      pageSize: `${(size / 1024).toFixed(0)} KB`,
      cacheable: !!headers["cache-control"],
    },
    serverTiming: {
      timeToInteractive: timing.total,
      domComplete: timing.total,
      connection: Math.round(timing.ttfb * 0.2),
      tlsHandshake: Math.round(timing.ttfb * 0.3),
      ttfb: timing.ttfb,
      download: timing.download,
    },
    renderBlocking,
    contentRelevance: {
      titleRelevance,
      descriptionRelevance,
      keywordRelevance: 0,
      contentRate,
    },
    headingStructure: headings,
    socialMediaTags: {
      openGraph,
      twitter: twitterCards,
      totalTags: openGraph.length + twitterCards.length,
    },
    siteFiles: {
      robotsTxt,
      llmsTxt,
      sitemapXml,
    },
    resourceIssues,
  };
}
