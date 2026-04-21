import { NextRequest, NextResponse } from "next/server";
import { queryForVisibility, aiLight } from "@/lib/ai";

/**
 * Free AI Visibility Grader — public, no login required.
 *
 * Runs 3 quick queries against ChatGPT + Gemini to check if a brand
 * is being recommended by AI. Returns a score card with:
 * - Which queries found the brand (and which didn't)
 * - Who AI recommends instead (competitors)
 * - A score out of 100
 *
 * This is the top-of-funnel lead magnet. The full product runs 20-40
 * queries with hyper-local config × price variants, tracks progress
 * over time, generates fix content, and publishes it.
 */

export async function POST(req: NextRequest) {
  try {
    const { brand, city } = await req.json();

    if (!brand || !city) {
      return NextResponse.json(
        { error: "Brand name and city are required" },
        { status: 400 }
      );
    }

    // 3 quick queries that cover the buyer journey
    const queries = [
      `best real estate developers in ${city}`,
      `top builders to buy apartments from in ${city} 2026`,
      `which developer should I choose for buying a flat in ${city}`,
    ];

    const results: Array<{
      query: string;
      mentioned: boolean;
      competitors: string[];
      platform: string;
    }> = [];

    async function runQuery(platform: "openai" | "gemini", label: string, query: string) {
      const { text, source } = await queryForVisibility(platform, query);
      if (!text || source === "failed" || source === "missing_key") {
        results.push({ query, mentioned: false, competitors: [], platform: label });
        return;
      }
      const analysis = await aiLight(
        "Analyze this AI response. Return only valid JSON.",
        `Is "${brand}" mentioned in this ${label} response? Also list other companies/brands mentioned.

Response:
"""
${text.slice(0, 3000)}
"""

Return JSON:
{
  "mentioned": true|false,
  "competitors": ["other brands mentioned, max 5"]
}`,
        300
      );
      try {
        const jsonMatch = analysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          results.push({
            query,
            mentioned: Boolean(parsed.mentioned),
            competitors: Array.isArray(parsed.competitors) ? parsed.competitors.slice(0, 5) : [],
            platform: label,
          });
          return;
        }
      } catch { /* fall through */ }
      const mentioned = text.toLowerCase().includes(brand.toLowerCase());
      results.push({ query, mentioned, competitors: [], platform: label });
    }

    // Run each query against BOTH ChatGPT and Gemini — this is what the
    // product promises ("ChatGPT + Gemini"). Running ChatGPT alone was a bug.
    await Promise.all(
      queries.flatMap((q) => [
        runQuery("openai", "ChatGPT", q),
        runQuery("gemini", "Gemini", q),
      ])
    );

    const mentionedCount = results.filter((r) => r.mentioned).length;
    const score = Math.round((mentionedCount / results.length) * 100);

    // Collect all competitors across queries (deduplicated)
    const allCompetitors = Array.from(
      new Set(results.flatMap((r) => r.competitors))
    ).filter((c) => c.toLowerCase() !== brand.toLowerCase()).slice(0, 8);

    return NextResponse.json({
      brand,
      city,
      score,
      mentionedCount,
      totalQueries: results.length,
      results,
      competitors: allCompetitors,
      verdict:
        score === 100
          ? "Your brand is visible in AI search. But are you #1? The full scan tests 20+ hyper-local queries."
          : score > 0
            ? `AI mentions you for ${mentionedCount}/${results.length} queries. You're partially visible — competitors are winning the queries you're missing.`
            : `Your brand is invisible in AI search. When buyers ask ChatGPT for recommendations in ${city}, you don't appear. Your competitors do.`,
    });
  } catch (error) {
    console.error("Grader error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Grader failed" },
      { status: 500 }
    );
  }
}
