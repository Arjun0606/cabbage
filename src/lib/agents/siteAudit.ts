import { aiComplete } from "@/lib/ai";

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

Generate 12-20 checks that matter most for THIS website. Ordered by importance.`;

  try {
    const raw = await aiComplete(system, prompt, 2500);
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

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

  const text = await aiComplete(system, prompt, 2000);
  // Extract JSON from the response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
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
  const seoHealth = mobileResult ? extractSeoHealth(mobileResult) : [];

  const hasPageSpeed = mobileResult !== null;
  const scores = {
    overall: hasPageSpeed
      ? Math.round((mobileScores.seo + desktopScores.performance + mobileScores.accessibility) / 3)
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

  const realEstateChecks = await runRealEstateChecks(url, pageHtml);

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
