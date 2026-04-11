import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Free Report API — no signup required.
 * Gives a quick SEO + AI Visibility snapshot to hook prospects.
 * Uses only free APIs (PageSpeed) + one Claude call for analysis.
 * Costs ~₹5 per report in API fees. Worth it for lead gen.
 */

const PSI_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

    // Run PageSpeed (mobile only for speed)
    const psiParams = new URLSearchParams();
    psiParams.set("url", normalizedUrl);
    psiParams.set("strategy", "mobile");
    psiParams.append("category", "performance");
    psiParams.append("category", "seo");

    const [psiRes, htmlRes] = await Promise.all([
      fetch(`${PSI_API}?${psiParams}`).then(r => r.json()).catch(() => null),
      fetch(normalizedUrl, { headers: { "User-Agent": "CabbageSEO/1.0" } }).then(r => r.text()).catch(() => ""),
    ]);

    // Extract scores
    const categories = psiRes?.lighthouseResult?.categories || {};
    const perfScore = Math.round((categories.performance?.score || 0) * 100);
    const seoScore = Math.round((categories.seo?.score || 0) * 100);

    // Quick HTML checks
    const html = htmlRes || "";
    const hasRera = /rera|registration\s*no/i.test(html);
    const hasPrice = /₹|rs\.|lakh|lakhs|crore|cr\b|price/i.test(html);
    const hasWhatsApp = /whatsapp|wa\.me/i.test(html);
    const hasSchema = /schema\.org|application\/ld\+json/i.test(html);
    const hasFloorPlan = /floor\s*plan|layout/i.test(html);
    const hasCTA = /enqui|contact|book\s*(a|your)?\s*visit|schedule|callback/i.test(html.substring(0, 5000));
    const hasLlmsTxt = await fetch(`${new URL(normalizedUrl).origin}/llms.txt`).then(r => r.ok && !r.url.includes("404")).catch(() => false);
    const hasSitemap = await fetch(`${new URL(normalizedUrl).origin}/sitemap.xml`).then(r => r.ok).catch(() => false);

    // Calculate overall score
    const reChecks = [hasRera, hasPrice, hasWhatsApp, hasSchema, hasFloorPlan, hasCTA];
    const reScore = Math.round((reChecks.filter(Boolean).length / reChecks.length) * 100);
    const overallScore = Math.round((perfScore + seoScore + reScore) / 3);

    // AI-generated top 5 fixes
    const anthropic = new Anthropic();
    const analysis = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: "You are CabbageSEO. Give exactly 5 high-impact fixes for this real estate website. Be specific and actionable. Return a JSON array of 5 strings, each under 100 characters.",
      messages: [{
        role: "user",
        content: `Real estate website: ${normalizedUrl}
Performance: ${perfScore}/100, SEO: ${seoScore}/100
RERA visible: ${hasRera}, Pricing shown: ${hasPrice}, WhatsApp: ${hasWhatsApp}
Schema markup: ${hasSchema}, Floor plans: ${hasFloorPlan}, CTA above fold: ${hasCTA}
llms.txt: ${hasLlmsTxt}, Sitemap: ${hasSitemap}

Return JSON array of exactly 5 one-line fix recommendations, most impactful first.`,
      }],
    });

    const fixText = analysis.content[0].type === "text" ? analysis.content[0].text : "[]";
    const fixMatch = fixText.match(/\[[\s\S]*\]/);
    let fixes: string[] = [];
    if (fixMatch) {
      try { fixes = JSON.parse(fixMatch[0]); } catch { fixes = []; }
    }

    return NextResponse.json({
      url: normalizedUrl,
      scores: {
        overall: overallScore,
        performance: perfScore,
        seo: seoScore,
        realEstate: reScore,
      },
      checks: {
        rera: hasRera,
        pricing: hasPrice,
        whatsapp: hasWhatsApp,
        schema: hasSchema,
        floorPlans: hasFloorPlan,
        ctaAboveFold: hasCTA,
        llmsTxt: hasLlmsTxt,
        sitemap: hasSitemap,
      },
      fixes,
      cta: "Get the full report with AI Visibility, Backlinks, Technical SEO, Competitor Intelligence, and Content Recommendations.",
    });
  } catch (error) {
    console.error("Free report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Report generation failed" },
      { status: 500 }
    );
  }
}
