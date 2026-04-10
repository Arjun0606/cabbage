import Anthropic from "@anthropic-ai/sdk";
import { REAL_ESTATE_SEO_CHECKS } from "@/data/queries";

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
    throw new Error(`PageSpeed API error: ${res.status} ${await res.text()}`);
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

async function runRealEstateChecks(
  _url: string,
  pageHtml: string
): Promise<RealEstateCheck[]> {
  const html = pageHtml.toLowerCase();

  return REAL_ESTATE_SEO_CHECKS.map((check) => {
    let passed = false;
    let details = "";

    switch (check.id) {
      case "rera_visible":
        passed = /rera|registration\s*no/i.test(pageHtml);
        details = passed ? "RERA number found on page" : "No RERA number detected — required by law and builds trust";
        break;
      case "price_band_clear":
        passed = /₹|rs\.|lakh|lakhs|crore|cr\b|price/i.test(pageHtml);
        details = passed ? "Pricing information found" : "No pricing detected — buyers leave without price clarity";
        break;
      case "floor_plan_present":
        passed = /floor\s*plan|layout/i.test(html);
        details = passed ? "Floor plan section detected" : "No floor plans found — top-3 decision factor for buyers";
        break;
      case "location_map":
        passed = /google.*maps|map.*embed|location.*map|proximity/i.test(html);
        details = passed ? "Location/map section found" : "No map or location details — add proximity to IT parks, schools, metro";
        break;
      case "emi_calculator":
        passed = /emi|loan|calculator|home\s*loan/i.test(html);
        details = passed ? "EMI/loan information found" : "No EMI calculator — 70% of Indian buyers use home loans";
        break;
      case "schema_realestate":
        passed = /realestate|realestatelisting|schema.*org.*residence/i.test(html);
        details = passed ? "Real estate schema markup detected" : "Missing RealEstateListing schema — critical for Google rich results";
        break;
      case "project_status":
        passed = /under\s*construction|ready\s*to\s*move|possession|oc\s*received|completion/i.test(html);
        details = passed ? "Project status mentioned" : "Project status unclear — buyers need to know construction stage";
        break;
      case "builder_info":
        passed = /about\s*(us|the\s*builder|developer)|track\s*record|past\s*projects|completed\s*projects/i.test(html);
        details = passed ? "Builder credibility section found" : "No builder track record — add past projects and awards";
        break;
      case "virtual_tour":
        passed = /360|virtual\s*tour|walkthrough|video\s*tour|youtube/i.test(html);
        details = passed ? "Virtual tour/video detected" : "No virtual tour — increasingly expected by NRI and premium buyers";
        break;
      case "contact_cta":
        passed = /enqui|contact|book\s*(a|your)?\s*visit|schedule|callback|get\s*in\s*touch/i.test(
          html.substring(0, Math.min(html.length, 5000))
        );
        details = passed ? "Contact CTA found above fold" : "No enquiry CTA in first viewport — add a prominent button";
        break;
      case "whatsapp_link":
        passed = /whatsapp|wa\.me|api\.whatsapp/i.test(html);
        details = passed ? "WhatsApp link found" : "No WhatsApp link — Indian buyers prefer WhatsApp over forms";
        break;
      case "testimonials":
        passed = /testimonial|review|happy\s*(customer|buyer|homeowner)|feedback/i.test(html);
        details = passed ? "Testimonials section found" : "No testimonials — social proof is critical for high-value purchases";
        break;
      default:
        details = "Check not implemented";
    }

    return {
      id: check.id,
      label: check.label,
      category: check.category,
      passed,
      details,
    };
  });
}

// ---------- AI Analysis ----------

async function generateAuditAnalysis(
  url: string,
  scores: AuditResult["scores"],
  webVitals: AuditResult["coreWebVitals"],
  seoHealth: SeoHealthCheck[],
  realEstateChecks: RealEstateCheck[]
): Promise<AuditFix[]> {
  const anthropic = new Anthropic();

  const failedChecks = seoHealth.filter((c) => c.status !== "pass");
  const failedReChecks = realEstateChecks.filter((c) => !c.passed);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: `You are CabbageSEO, an AI SEO expert specialized in Indian residential real estate developer websites. You analyze audit results and produce actionable fixes prioritized by impact on lead generation and conversions.

Your audience is a marketing head at an Indian residential developer. Be specific, practical, and tie every recommendation to business impact (more site visits, more enquiries, better Google ranking for buyer queries like "3BHK apartments in [location] under [budget]").

Always output valid JSON array of fixes.`,
    messages: [
      {
        role: "user",
        content: `Analyze this SEO audit for ${url} (Indian real estate developer website):

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
{"title": "...", "severity": "critical|high|medium|low", "category": "Technical|On-Page|Content|Conversion|Compliance", "description": "2-3 sentences explaining why and how to fix", "snippet": "optional code snippet or copy to paste"}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
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

  const mobileScores = extractScores(mobileResult);
  const desktopScores = extractScores(desktopResult);
  const webVitals = extractWebVitals(mobileResult);
  const seoHealth = extractSeoHealth(mobileResult);

  const scores = {
    overall: Math.round(
      (mobileScores.seo + desktopScores.performance + mobileScores.accessibility) / 3
    ),
    performanceMobile: mobileScores.performance,
    performanceDesktop: desktopScores.performance,
    accessibility: mobileScores.accessibility,
    bestPractices: mobileScores.bestPractices,
    seo: mobileScores.seo,
  };

  // Fetch the actual page HTML for real-estate-specific checks
  let pageHtml = "";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CabbageSEO/1.0 (SEO Audit Bot)" },
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
