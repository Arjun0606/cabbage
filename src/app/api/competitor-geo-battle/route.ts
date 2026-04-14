import { NextRequest, NextResponse } from "next/server";
import { runAIVisibility } from "@/lib/agents/aiVisibility";
import { generateSearchQueries } from "@/lib/agents/localityEngine";

/**
 * Competitor GEO Battle
 *
 * Runs the SAME set of buyer queries against BOTH the user's brand AND their
 * competitor, then shows a head-to-head comparison of who AI recommends more.
 *
 * This is the most powerful sales tool: "ChatGPT recommends your competitor
 * for 12 out of 20 queries. They recommend you for 3. Here's how to fix it."
 *
 * Token cost: 8cr (runs AI visibility for both brands)
 */

export async function POST(req: NextRequest) {
  try {
    const { brand, competitorName, city, projects, websiteUrl } = await req.json();

    if (!brand || !competitorName || !city) {
      return NextResponse.json({ error: "brand, competitorName, and city are required" }, { status: 400 });
    }

    // Generate queries once — use the same set for both brands
    const queries = await generateSearchQueries(city, brand, projects || []);

    // Run visibility for both in parallel
    const [ourResult, competitorResult] = await Promise.all([
      runAIVisibility(websiteUrl || "", brand, projects || [], queries),
      runAIVisibility("", competitorName, [], queries),
    ]);

    // Build head-to-head comparison
    const battle = queries.map((query, i) => {
      const ours = ourResult.queryResults[i];
      const theirs = competitorResult.queryResults[i];

      const ourFound = ours?.chatgpt?.mentioned || ours?.gemini?.mentioned || false;
      const theirFound = theirs?.chatgpt?.mentioned || theirs?.gemini?.mentioned || false;

      let winner: "us" | "them" | "both" | "neither" = "neither";
      if (ourFound && theirFound) winner = "both";
      else if (ourFound) winner = "us";
      else if (theirFound) winner = "them";

      return {
        query,
        ourBrand: {
          mentioned: ourFound,
          chatgpt: ours?.chatgpt?.mentioned || false,
          gemini: ours?.gemini?.mentioned || false,
          sentiment: ours?.chatgpt?.sentiment || ours?.gemini?.sentiment || "absent",
        },
        competitor: {
          mentioned: theirFound,
          chatgpt: theirs?.chatgpt?.mentioned || false,
          gemini: theirs?.gemini?.mentioned || false,
          sentiment: theirs?.chatgpt?.sentiment || theirs?.gemini?.sentiment || "absent",
        },
        winner,
      };
    });

    const ourWins = battle.filter((b) => b.winner === "us").length;
    const theirWins = battle.filter((b) => b.winner === "them").length;
    const bothWin = battle.filter((b) => b.winner === "both").length;
    const neitherWin = battle.filter((b) => b.winner === "neither").length;

    // Queries where competitor beats us — highest priority to fix
    const lostQueries = battle
      .filter((b) => b.winner === "them")
      .map((b) => b.query);

    // Queries where neither appears — opportunity for first-mover advantage
    const uncapturedQueries = battle
      .filter((b) => b.winner === "neither")
      .map((b) => b.query);

    return NextResponse.json({
      brand,
      competitorName,
      city,
      totalQueries: queries.length,
      scores: {
        ours: ourResult.scores,
        theirs: competitorResult.scores,
      },
      summary: {
        ourWins,
        theirWins,
        both: bothWin,
        neither: neitherWin,
        verdict: ourWins > theirWins ? "winning" : ourWins < theirWins ? "losing" : "tied",
      },
      battle,
      lostQueries,
      uncapturedQueries,
      actionPlan: {
        priority1: `Fix ${lostQueries.length} queries where ${competitorName} appears and you don't`,
        priority2: `Capture ${uncapturedQueries.length} queries where neither brand appears (first-mover advantage)`,
        priority3: `Defend ${ourWins + bothWin} queries where you currently appear`,
      },
    });
  } catch (error) {
    console.error("Competitor GEO Battle error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GEO battle failed" },
      { status: 500 }
    );
  }
}
