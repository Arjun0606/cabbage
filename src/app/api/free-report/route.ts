import { NextRequest, NextResponse } from "next/server";
import { aiLight } from "@/lib/ai";
import { sanitizeUrl } from "@/lib/security";

/**
 * Free Report API — no signup required.
 * Runs even if PageSpeed API is unavailable (quota exceeded, etc.)
 * Always returns results from HTML analysis + AI fixes.
 */

const PSI_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const { valid, url: normalizedUrl, error } = sanitizeUrl(url);
    if (!valid) return NextResponse.json({ error }, { status: 400 });

    // Fetch HTML and PageSpeed in parallel — PageSpeed can fail gracefully
    let perfScore = -1; // -1 means "unavailable"
    let seoScore = -1;
    let html = "";

    const [psiResult, htmlResult] = await Promise.allSettled([
      (async () => {
        const psiParams = new URLSearchParams();
        psiParams.set("url", normalizedUrl);
        psiParams.set("strategy", "mobile");
        psiParams.append("category", "performance");
        psiParams.append("category", "seo");
        const apiKey = process.env.GOOGLE_PSI_API_KEY;
        if (apiKey) psiParams.set("key", apiKey);

        const res = await fetch(`${PSI_API}?${psiParams}`);
        if (!res.ok) return null;
        return res.json();
      })(),
      fetch(normalizedUrl, {
        headers: { "User-Agent": "CabbageSEO/1.0" },
        redirect: "follow",
      }).then(r => r.text()).catch(() => ""),
    ]);

    // Extract PageSpeed scores (if available)
    if (psiResult.status === "fulfilled" && psiResult.value) {
      const categories = psiResult.value?.lighthouseResult?.categories || {};
      perfScore = Math.round((categories.performance?.score || 0) * 100);
      seoScore = Math.round((categories.seo?.score || 0) * 100);
    }

    html = htmlResult.status === "fulfilled" ? (htmlResult.value || "") : "";

    // HTML-based checks — these always work regardless of PageSpeed
    const hasRera = /rera|registration\s*no/i.test(html);
    const hasPrice = /₹|rs\.|lakh|lakhs|crore|cr\b|price|starting\s*from/i.test(html);
    const hasWhatsApp = /whatsapp|wa\.me|api\.whatsapp/i.test(html);
    const hasSchema = /schema\.org|application\/ld\+json/i.test(html);
    const hasFloorPlan = /floor\s*plan|layout|master\s*plan/i.test(html);
    const hasCTA = /enqui|contact|book\s*(a|your)?\s*visit|schedule|callback|get\s*in\s*touch/i.test(
      html.substring(0, Math.min(html.length, 8000))
    );
    const hasEMI = /emi|loan|calculator|home\s*loan|finance/i.test(html);
    const hasLocationMap = /google.*maps|map.*embed|location.*map|proximity|landmark/i.test(html);

    // Site file checks
    const baseUrl = new URL(normalizedUrl).origin;
    const [hasLlmsTxt, hasSitemap] = await Promise.all([
      fetch(`${baseUrl}/llms.txt`, { headers: { "User-Agent": "CabbageSEO/1.0" } })
        .then(r => r.ok && r.status === 200)
        .catch(() => false),
      fetch(`${baseUrl}/sitemap.xml`, { headers: { "User-Agent": "CabbageSEO/1.0" } })
        .then(r => r.ok && r.status === 200)
        .catch(() => false),
    ]);

    // Calculate scores
    const reChecks = [hasRera, hasPrice, hasWhatsApp, hasSchema, hasFloorPlan, hasCTA, hasEMI, hasLocationMap];
    const reScore = Math.round((reChecks.filter(Boolean).length / reChecks.length) * 100);

    let overallScore: number;
    if (perfScore >= 0 && seoScore >= 0) {
      overallScore = Math.round((perfScore + seoScore + reScore) / 3);
    } else {
      // PageSpeed unavailable — score based on what we can check
      overallScore = reScore;
    }

    // AI-generated top 5 fixes
    const fixText = await aiLight(
      "You are CabbageSEO. Give exactly 5 high-impact fixes for this website. Be specific and actionable. Return a JSON array of 5 strings, each under 120 characters.",
      `Website: ${normalizedUrl}
${perfScore >= 0 ? `Performance: ${perfScore}/100, SEO: ${seoScore}/100` : "PageSpeed data unavailable"}
RERA visible: ${hasRera}, Pricing shown: ${hasPrice}, WhatsApp: ${hasWhatsApp}
Schema markup: ${hasSchema}, Floor plans: ${hasFloorPlan}, CTA above fold: ${hasCTA}
EMI/Loan info: ${hasEMI}, Location map: ${hasLocationMap}
llms.txt: ${hasLlmsTxt}, Sitemap: ${hasSitemap}

Return JSON array of exactly 5 one-line fix recommendations, most impactful first.`,
      800
    );
    const fixMatch = fixText.match(/\[[\s\S]*\]/);
    let fixes: string[] = [];
    if (fixMatch) {
      try { fixes = JSON.parse(fixMatch[0]); } catch { fixes = []; }
    }

    return NextResponse.json({
      url: normalizedUrl,
      scores: {
        overall: overallScore,
        performance: perfScore >= 0 ? perfScore : null,
        seo: seoScore >= 0 ? seoScore : null,
        realEstate: reScore,
      },
      checks: {
        rera: hasRera,
        pricing: hasPrice,
        whatsapp: hasWhatsApp,
        schema: hasSchema,
        floorPlans: hasFloorPlan,
        ctaAboveFold: hasCTA,
        emiLoan: hasEMI,
        locationMap: hasLocationMap,
        llmsTxt: hasLlmsTxt,
        sitemap: hasSitemap,
      },
      fixes,
    });
  } catch (error) {
    console.error("Free report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Report generation failed" },
      { status: 500 }
    );
  }
}
