import { aiComplete, aiLight, queryForVisibility } from "@/lib/ai";

/**
 * Real estate audit checks are now fully AI-generated per website.
 * The AI reads the actual page content and determines:
 * - What market this developer operates in (India, UAE, USA, etc.)
 * - Which compliance signals matter for that market
 * - Which conversion elements matter for that market's buyer behavior
 * - Which content depth elements matter for the segment
 * No hardcoded checklist — everything is inferred per scan.
 */

// ---------- Types ----------

export interface AuditResult {
  url: string;
  scores: {
    overall: number;
    performanceMobile: number;
    performanceDesktop: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  coreWebVitals: {
    lcp: number; // ms
    fcp: number; // ms
    tbt: number; // ms
    cls: number;
  };
  seoHealth: SeoHealthCheck[];
  realEstateChecks: RealEstateCheck[];
  fixes: AuditFix[];
  rawPagespeed: {
    mobile: Record<string, unknown>;
    desktop: Record<string, unknown>;
  };
}

interface SeoHealthCheck {
  check: string;
  status: "pass" | "warn" | "fail";
  value: string;
}

interface RealEstateCheck {
  id: string;
  label: string;
  category: string;
  passed: boolean;
  details: string;
}

export interface AuditFix {
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  description: string;
  snippet?: string;
}

// ---------- PageSpeed Insights ----------

const PSI_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

async function fetchPageSpeed(url: string, strategy: "mobile" | "desktop") {
  const params = new URLSearchParams();
  params.set("url", url);
  params.set("strategy", strategy);
  params.append("category", "performance");
  params.append("category", "accessibility");
  params.append("category", "best-practices");
  params.append("category", "seo");

  // Add API key if available (higher rate limits)
  const apiKey = process.env.GOOGLE_PSI_API_KEY;
  if (apiKey) params.set("key", apiKey);

  const res = await fetch(`${PSI_API}?${params}`, { next: { revalidate: 0 } });
  if (!res.ok) {
    // Return empty result instead of crashing — audit continues with HTML checks
    console.warn(`PageSpeed API error (${res.status}) for ${url} — continuing with HTML-only checks`);
    return null;
  }
  return res.json();
}

function extractScores(psiResult: Record<string, unknown>) {
  const categories = (psiResult as any).lighthouseResult?.categories || {};
  return {
    performance: Math.round((categories.performance?.score || 0) * 100),
    accessibility: Math.round((categories.accessibility?.score || 0) * 100),
    bestPractices: Math.round((categories["best-practices"]?.score || 0) * 100),
    seo: Math.round((categories.seo?.score || 0) * 100),
  };
}

function extractWebVitals(psiResult: Record<string, unknown>) {
  const audits = (psiResult as any).lighthouseResult?.audits || {};
  return {
    lcp: audits["largest-contentful-paint"]?.numericValue || 0,
    fcp: audits["first-contentful-paint"]?.numericValue || 0,
    tbt: audits["total-blocking-time"]?.numericValue || 0,
    cls: audits["cumulative-layout-shift"]?.numericValue || 0,
  };
}

function extractSeoHealth(psiResult: Record<string, unknown>): SeoHealthCheck[] {
  const audits = (psiResult as any).lighthouseResult?.audits || {};
  const checks: SeoHealthCheck[] = [];
  const seoAudits = [
    { key: "document-title", label: "Meta Title" },
    { key: "meta-description", label: "Meta Description" },
    { key: "canonical", label: "Canonical URL" },
    { key: "html-has-lang", label: "Language" },
    { key: "viewport", label: "Mobile Friendly" },
    { key: "image-alt", label: "Image Alt Tags" },
    { key: "link-text", label: "Internal Links" },
    { key: "crawlable-anchors", label: "External Links" },
  ];

  for (const { key, label } of seoAudits) {
    const audit = audits[key];
    if (audit) {
      checks.push({
        check: label,
        status: audit.score === 1 ? "pass" : audit.score === null ? "warn" : "fail",
        value: audit.displayValue || (audit.score === 1 ? "OK" : "Missing"),
      });
    }
  }

  return checks;
}

/**
 * HTML-only SEO health check. Used when PageSpeed Insights fails (no
 * API key, rate-limited, or network hiccup). Produces a meaningful
 * Checks tab even without Lighthouse.
 *
 * We fetch the URL, parse the HTML, and derive pass/warn/fail for the
 * core on-page signals that drive both Google ranking and AI citability.
 * This is deliberately strict — better to under-count passes than to
 * mark broken fundamentals as "OK".
 */
async function htmlBasedSeoHealth(url: string): Promise<SeoHealthCheck[]> {
  const checks: SeoHealthCheck[] = [];
  let html = "";
  let hasHttps = false;
  let robotsOk = false;
  let sitemapOk = false;
  let llmsOk = false;

  try {
    if (!url.startsWith("http")) url = `https://${url}`;
    hasHttps = url.startsWith("https://");
    const res = await fetch(url, {
      headers: { "User-Agent": "Cabbge/1.0 (SEO Audit Bot)" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) html = await res.text();
  } catch { /* HTML missing → every check degrades gracefully below */ }

  const base = (() => { try { return new URL(url).origin; } catch { return ""; } })();
  try {
    const r = await fetch(`${base}/robots.txt`, { signal: AbortSignal.timeout(8000) });
    robotsOk = r.ok && /^\s*(user-agent|disallow|allow|sitemap)\s*:/im.test(await r.text());
  } catch { /* ignore */ }
  try {
    const r = await fetch(`${base}/sitemap.xml`, { signal: AbortSignal.timeout(8000) });
    sitemapOk = r.ok;
  } catch { /* ignore */ }
  try {
    const r = await fetch(`${base}/llms.txt`, { signal: AbortSignal.timeout(8000) });
    llmsOk = r.ok;
  } catch { /* ignore */ }

  const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleM?.[1]?.trim() || "";
  const metaDescM = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const metaDesc = metaDescM?.[1]?.trim() || "";
  const canonicalM = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  const canonical = canonicalM?.[1] || "";
  const htmlLangM = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
  const hasLang = !!htmlLangM?.[1];
  const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  const imgCount = (html.match(/<img\s/gi) || []).length;
  const imgWithAlt = (html.match(/<img[^>]*\salt=["'][^"']+["']/gi) || []).length;
  const hasJsonLd = /<script[^>]*type=["']application\/ld\+json["']/i.test(html);
  const hasOg = /<meta[^>]*property=["']og:/i.test(html);
  const hasFaq = /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?"@type"\s*:\s*"FAQPage"/i.test(html);

  const push = (check: string, status: SeoHealthCheck["status"], value: string) =>
    checks.push({ check, status, value });

  push(
    "Meta Title",
    title.length >= 30 && title.length <= 60 ? "pass" : title ? "warn" : "fail",
    title ? `${title.length} chars` : "Missing"
  );
  push(
    "Meta Description",
    metaDesc.length >= 70 && metaDesc.length <= 160 ? "pass" : metaDesc ? "warn" : "fail",
    metaDesc ? `${metaDesc.length} chars` : "Missing"
  );
  push(
    "Single H1",
    h1Count === 1 ? "pass" : h1Count === 0 ? "fail" : "warn",
    h1Count === 0 ? "None" : h1Count === 1 ? "OK" : `${h1Count} found`
  );
  push("Canonical URL", canonical ? "pass" : "fail", canonical ? "OK" : "Missing");
  push("Language tag", hasLang ? "pass" : "warn", hasLang ? htmlLangM![1] : "Missing");
  push("Viewport meta (mobile)", hasViewport ? "pass" : "fail", hasViewport ? "OK" : "Missing");
  push("HTTPS", hasHttps ? "pass" : "fail", hasHttps ? "OK" : "No");
  push(
    "Image Alt Coverage",
    imgCount === 0 ? "warn" : imgWithAlt / imgCount >= 0.8 ? "pass" : imgWithAlt / imgCount >= 0.5 ? "warn" : "fail",
    imgCount === 0 ? "No images" : `${imgWithAlt}/${imgCount}`
  );
  push("Schema (JSON-LD)", hasJsonLd ? "pass" : "fail", hasJsonLd ? "Present" : "Missing");
  push("FAQ Schema (AI citation signal)", hasFaq ? "pass" : "warn", hasFaq ? "Present" : "Missing");
  push("OpenGraph tags", hasOg ? "pass" : "warn", hasOg ? "Present" : "Missing");
  push("robots.txt", robotsOk ? "pass" : "fail", robotsOk ? "Valid" : "Missing");
  push("sitemap.xml", sitemapOk ? "pass" : "fail", sitemapOk ? "Present" : "Missing");
  push("llms.txt (AI crawler hint)", llmsOk ? "pass" : "warn", llmsOk ? "Present" : "Missing");

  return checks;
}

// ---------- RERA Verification via Web Search ----------

interface RERAVerification {
  found: boolean;
  numbers: string[];
  verified: boolean;
  verificationDetails: string;
}

async function verifyRERA(pageHtml: string): Promise<RERAVerification> {
  const visibleText = pageHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ");

  // Common RERA number patterns across Indian states
  const reraPatterns = [
    /P\d{11,13}/g,
    /PR[A-Z]{2}\d{6,10}/g,
    /PRM\/[A-Z]{2}\/RERA\/\d+\/\d+\/[A-Z0-9/]+/g,
    /PR\/[A-Z]{2}\/\d+\/\d+/g,
    /UPRERAPRJ\d+/g,
    /RERA[A-Z]*\d{5,}/g,
    /[A-Z]{2,5}\/\d{4,}\/\d{4}/g,
    /RC\/[A-Z]+\/RERA\/\d+\/\d+/g,
  ];

  const allMatches = new Set<string>();
  for (const pattern of reraPatterns) {
    const matches = visibleText.match(pattern);
    if (matches) matches.forEach((m) => allMatches.add(m));
  }
  const numbers = Array.from(allMatches);

  if (numbers.length === 0) {
    return { found: false, numbers: [], verified: false, verificationDetails: "No RERA registration numbers found on page." };
  }

  // Verify up to 2 RERA numbers via web search
  const toVerify = numbers.slice(0, 2);
  const results: string[] = [];
  let anyVerified = false;

  for (const reraNumber of toVerify) {
    try {
      const { text, source } = await queryForVisibility(
        "openai",
        `Is RERA registration number ${reraNumber} valid? Check rera.gov.in or the relevant state RERA website. What project and developer is it registered to?`
      );
      if (text && (source === "web_search" || source === "grounded")) {
        const parseResult = await aiLight(
          "Determine if a RERA number was verified. Return only valid JSON.",
          `Based on this web search result, is RERA number ${reraNumber} verified as valid?\n\n"${text.slice(0, 2000)}"\n\nReturn JSON: {"verified": true|false, "summary": "one line summary"}`,
          200
        );
        const jsonMatch = parseResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.verified) anyVerified = true;
          results.push(`${reraNumber}: ${parsed.summary || (parsed.verified ? "Verified" : "Not verified")}`);
        } else {
          results.push(`${reraNumber}: Web search returned data but could not parse verification`);
        }
      } else {
        results.push(`${reraNumber}: Could not verify (web search unavailable)`);
      }
    } catch {
      results.push(`${reraNumber}: Verification check failed`);
    }
  }
  if (numbers.length > 2) results.push(`...and ${numbers.length - 2} more RERA numbers found`);

  return { found: true, numbers, verified: anyVerified, verificationDetails: results.join("; ") };
}

// ---------- Real Estate Specific Checks ----------
// Fully AI-powered: analyzes the actual page content to determine what's present
// and what matters for THIS market (country-aware, industry-aware).
// No regex keyword matching — the AI reads the page and decides.

async function runRealEstateChecks(
  url: string,
  pageHtml: string
): Promise<RealEstateCheck[]> {
  // Strip HTML tags, keep visible text
  const visibleText = pageHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);

  // Also extract script/link tags to check for schema, whatsapp links, etc.
  const headAndScripts = pageHtml.slice(0, 15000);

  const system = `You audit real estate developer websites and return a JSON array of check results.
You read the actual page content and determine what is present, what is missing, and what matters for THIS specific market (country-aware, local compliance, local buyer behavior).

Return ONLY valid JSON. No markdown fences.`;

  const prompt = `Audit this real estate developer page:

URL: ${url}

VISIBLE PAGE TEXT (first 8000 chars):
"""
${visibleText}
"""

HTML HEAD AND SCRIPTS (first 15000 chars — check for schema, tracking, links):
"""
${headAndScripts}
"""

Determine which market this developer operates in (India, UAE, USA, UK, etc.) based on the content, then audit for:
1. LEGAL/COMPLIANCE signals relevant to that market (RERA for India, Dubai Land Dept for UAE, MLS for USA, etc.)
2. CONVERSION elements (pricing visibility, CTAs above fold, preferred contact method in that market — WhatsApp for India, phone for USA, email for UK, etc.)
3. CONTENT depth (floor plans, virtual tours, amenities, specifications, location/map)
4. TECHNICAL signals (schema markup, structured data, AI crawler readiness)
5. TRUST signals relevant to buyer psychology in that market

Return JSON array of checks — generate AS MANY as matter for this specific website and market. For each check:
{
  "id": "<short snake_case id>",
  "label": "<human-readable check name>",
  "category": "Compliance" | "Conversion" | "Content" | "Technical" | "Trust",
  "passed": true | false,
  "details": "<specific finding — what was found or exactly what's missing and why it matters for THIS market>"
}

IMPORTANT:
- If RERA isn't relevant (non-Indian site), don't include it. Check the relevant local regulatory number instead.
- WhatsApp only matters for markets where it's the dominant messenger. For US/UK, check phone/email/live chat.
- Pricing display format matters locally (₹/crore in India, AED in UAE, $ in USA).
- Include checks specific to what you see on THIS page — if they have a Book-Site-Visit button, check its placement; if they have a gallery, check its quality.
- Be strict: "RERA passed" means the actual registration number is displayed in a visible trustworthy place, NOT just the word "RERA" appearing anywhere.

Generate 10-15 checks that matter most for THIS website. Ordered by importance. Keep each check's details field under 100 chars to fit within the response.`;

  try {
    const raw = await aiComplete(system, prompt, 3000);
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    // Handle truncated JSON — try to salvage partial arrays
    let jsonStr = cleaned;
    try {
      JSON.parse(jsonStr);
    } catch {
      // If truncated, try to close the array
      const lastComplete = jsonStr.lastIndexOf("}");
      if (lastComplete > 0) {
        jsonStr = jsonStr.slice(0, lastComplete + 1) + "]";
      }
    }
    const parsed = JSON.parse(jsonStr);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .filter((c) => c && c.id && c.label && typeof c.passed === "boolean")
        .map((c) => ({
          id: String(c.id),
          label: String(c.label),
          category: String(c.category || "Content"),
          passed: Boolean(c.passed),
          details: String(c.details || ""),
        }));
    }
  } catch { /* fall through */ }

  // If AI fails entirely, return empty — no hardcoded fallback
  return [];
}

// ---------- AI Analysis ----------

async function generateAuditAnalysis(
  url: string,
  scores: AuditResult["scores"],
  webVitals: AuditResult["coreWebVitals"],
  seoHealth: SeoHealthCheck[],
  realEstateChecks: RealEstateCheck[]
): Promise<AuditFix[]> {
  const failedChecks = seoHealth.filter((c) => c.status !== "pass");
  const failedReChecks = realEstateChecks.filter((c) => !c.passed);

  const system = `You are Cabbge, an AI SEO expert specialized in Indian residential real estate developer websites. You analyze audit results and produce actionable fixes prioritized by impact on lead generation and conversions.

Your audience is a marketing head at an Indian residential developer. Be specific, practical, and tie every recommendation to business impact (more site visits, more enquiries, better Google ranking for buyer queries like "3BHK apartments in [location] under [budget]").

Always output valid JSON array of fixes.`;

  const prompt = `Analyze this SEO audit for ${url} (Indian real estate developer website):

## Scores
- Overall: ${scores.overall}/100
- Mobile Performance: ${scores.performanceMobile}/100
- Desktop Performance: ${scores.performanceDesktop}/100
- Accessibility: ${scores.accessibility}/100
- SEO: ${scores.seo}/100

## Core Web Vitals
- LCP: ${(webVitals.lcp / 1000).toFixed(1)}s
- FCP: ${(webVitals.fcp / 1000).toFixed(1)}s
- TBT: ${webVitals.tbt}ms
- CLS: ${webVitals.cls.toFixed(3)}

## Failed SEO Health Checks
${failedChecks.map((c) => `- ${c.check}: ${c.value}`).join("\n") || "None"}

## Failed Real Estate Checks
${failedReChecks.map((c) => `- ${c.label}: ${c.details}`).join("\n") || "None"}

Produce a JSON array of the top 10 fixes, ordered by impact. Each fix:
{"title": "...", "severity": "critical|high|medium|low", "category": "Technical|On-Page|Content|Conversion|Compliance", "description": "2-3 sentences explaining why and how to fix", "snippet": "optional code snippet or copy to paste"}`;

  const text = await aiComplete(system, prompt, 2500);
  // Extract JSON from the response — handle truncated arrays
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Truncated — salvage partial
      const partial = jsonMatch[0];
      const lastObj = partial.lastIndexOf("}");
      if (lastObj > 0) {
        try { return JSON.parse(partial.slice(0, lastObj + 1) + "]"); } catch { /* give up */ }
      }
    }
  }
  return [];
}

// ---------- Main Audit Function ----------

export async function runSiteAudit(url: string): Promise<AuditResult> {
  // Normalize URL
  if (!url.startsWith("http")) url = `https://${url}`;

  // Run PageSpeed for mobile and desktop in parallel
  const [mobileResult, desktopResult] = await Promise.all([
    fetchPageSpeed(url, "mobile"),
    fetchPageSpeed(url, "desktop"),
  ]);

  const mobileScores = mobileResult ? extractScores(mobileResult) : { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 };
  const desktopScores = desktopResult ? extractScores(desktopResult) : { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 };
  const webVitals = mobileResult ? extractWebVitals(mobileResult) : { lcp: 0, fcp: 0, tbt: 0, cls: 0 };
  // When PSI is unavailable we run an HTML-only fallback so the Checks
  // tab always has something actionable. Better a conservative in-house
  // check than an empty "Passed (0)" card that looks broken.
  const seoHealth = mobileResult
    ? extractSeoHealth(mobileResult)
    : await htmlBasedSeoHealth(url);

  const hasPageSpeed = mobileResult !== null;
  // Overall = average of the four mobile Lighthouse categories (what
  // Google ranks on). Previously this mixed mobile.seo + desktop.performance
  // + mobile.accessibility which isn't a meaningful composite — and dropped
  // best-practices entirely.
  const scores = {
    overall: hasPageSpeed
      ? Math.round(
          (mobileScores.performance + mobileScores.seo + mobileScores.accessibility + mobileScores.bestPractices) / 4
        )
      : 0,
    performanceMobile: mobileScores.performance,
    performanceDesktop: desktopScores.performance,
    accessibility: mobileScores.accessibility,
    bestPractices: mobileScores.bestPractices,
    seo: mobileScores.seo,
    pageSpeedAvailable: hasPageSpeed,
  };

  // Fetch the actual page HTML for real-estate-specific checks
  let pageHtml = "";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Cabbge/1.0 (SEO Audit Bot)" },
    });
    pageHtml = await res.text();
  } catch {
    // If we can't fetch the page directly, proceed with empty HTML
    pageHtml = "";
  }

  // Run real estate AI checks + RERA verification in parallel
  const [aiChecks, reraResult] = await Promise.all([
    runRealEstateChecks(url, pageHtml),
    pageHtml ? verifyRERA(pageHtml) : Promise.resolve({ found: false, numbers: [], verified: false, verificationDetails: "Page not fetched" }),
  ]);

  // Inject RERA verification into the checks — but ONLY for Indian sites.
  // Previously a "Compliance"-category check from any locale (Dubai Land
  // Department, UK HMRC, etc.) triggered the RERA check, which doesn't
  // exist outside India.
  const realEstateChecks = aiChecks.filter((c) => !c.id.includes("rera"));
  const hostIsIndian = /\.in($|\/|:)/i.test(url);
  const contentLooksIndian = /\b(RERA|₹|Lakh|Crore|Cr\.|Lac|Rs\.?|INR)\b/.test(pageHtml);
  const isIndianSite = hostIsIndian || contentLooksIndian || reraResult.found;
  if (isIndianSite) {
    realEstateChecks.unshift({
      id: "rera_verification",
      label: "RERA Registration Verification",
      category: "Compliance",
      passed: reraResult.found && reraResult.verified,
      details: reraResult.found && reraResult.verified
        ? `RERA found AND verified via rera.gov.in. ${reraResult.verificationDetails}`
        : reraResult.found
          ? `RERA numbers found on page but not verified: ${reraResult.numbers.join(", ")}. ${reraResult.verificationDetails}`
          : "No RERA registration numbers found on the page.",
    });
  }

  // Generate AI-powered fix recommendations
  const fixes = await generateAuditAnalysis(
    url,
    scores,
    webVitals,
    seoHealth,
    realEstateChecks
  );

  return {
    url,
    scores,
    coreWebVitals: webVitals,
    seoHealth,
    realEstateChecks,
    fixes,
    rawPagespeed: {
      mobile: mobileResult,
      desktop: desktopResult,
    },
  };
}
