import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";
import { requireActiveSubscription } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";

/**
 * Monthly CMO digest.
 *
 * The CMO at a residential developer has one recurring chore — "tell
 * the CEO what moved this month". This endpoint generates an email-
 * ready summary by pulling the last 30 days of scan history for the
 * company and asking the LLM to turn it into a crisp digest. No
 * scraping, no new scans; we summarise what's already in
 * scan_history, the tracked_articles queue, and the content decay
 * report the dashboard already has.
 *
 * Response: a markdown-formatted digest the CMO can forward to their
 * CEO (subject line, executive summary, per-section detail, next-30-
 * day action list).
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;

    const body = await req.json();
    const { companyId, companyName, city, brand } = body;

    if (!companyName) {
      return NextResponse.json(
        { error: "companyName is required" },
        { status: 400 }
      );
    }

    const service = getServiceClient();

    // Pull last 30 days of scan_history for this company. We cap at a
    // generous 200 rows so a daily-cron customer with multiple sites
    // has enough context, but anything older is noise for a monthly
    // digest.
    let scanHistory: Array<{ scan_type: string; score: number; created_at: string; results?: any }> = [];
    if (companyId) {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data } = await service
        .from("scan_history")
        .select("scan_type, score, created_at, results")
        .eq("company_id", companyId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);
      scanHistory = data || [];
    }

    // Summarise scan history into a compact struct the LLM can
    // reason about without sending 200 JSON blobs.
    const byType = new Map<string, Array<{ score: number; date: string }>>();
    for (const s of scanHistory) {
      if (!byType.has(s.scan_type)) byType.set(s.scan_type, []);
      byType.get(s.scan_type)!.push({ score: s.score || 0, date: s.created_at });
    }
    const movements: Array<{ scanType: string; first: number; last: number; delta: number; samples: number }> = [];
    for (const [scanType, entries] of byType) {
      if (entries.length === 0) continue;
      const sorted = entries.slice().sort((a, b) => a.date.localeCompare(b.date));
      const first = sorted[0].score;
      const last = sorted[sorted.length - 1].score;
      movements.push({
        scanType,
        first,
        last,
        delta: last - first,
        samples: sorted.length,
      });
    }

    // Best recent AI visibility scan for mention-count reporting.
    const latestAiVis = scanHistory.find((s) => s.scan_type === "ai_visibility");
    const mentionCount = latestAiVis?.results?.queryResults
      ? (latestAiVis.results.queryResults as any[]).filter(
          (q: any) => q?.chatgpt?.mentioned || q?.gemini?.mentioned
        ).length
      : 0;
    const totalQueries = latestAiVis?.results?.queryResults?.length || 0;

    const system = `You write monthly CMO digests for Indian residential real estate developers.
Output clean markdown. No preamble. No sign-off. Direct, executive-tone, specific to the data provided.

Do NOT invent numbers — use only the values given. If data is missing, say so briefly. Never fabricate leads, sales, or conversions.`;

    const prompt = `Write a monthly CMO digest for ${companyName}${city ? ` (${city})` : ""}${brand ? ` — brand "${brand}"` : ""}.

SCAN MOVEMENTS THIS MONTH:
${movements.length === 0
  ? "No scan movements recorded in the last 30 days."
  : movements.map((m) => `- ${m.scanType}: ${m.first} → ${m.last} (${m.delta >= 0 ? "+" : ""}${m.delta}) across ${m.samples} scan${m.samples === 1 ? "" : "s"}`).join("\n")}

LATEST AI VISIBILITY:
${latestAiVis
  ? `- Overall score: ${latestAiVis.score}/100
- Brand cited in ${mentionCount} of ${totalQueries} buyer queries
- Scan date: ${latestAiVis.created_at}`
  : "- No AI Visibility scan recorded this month."}

WRITE THE DIGEST IN THIS SHAPE:

# Monthly digest — ${companyName}
**Subject line** (short, CEO-facing, numeric if possible)

## Executive summary
3-4 sentences. Lead with the biggest movement (positive or negative). Frame for the CEO, not the marketing team.

## What moved
Bullet list of the specific changes with the numbers. One bullet per meaningful shift.

## What worked
2-3 concrete wins with evidence from the data. If nothing obvious, say so.

## What needs attention
2-3 specific issues flagged by the data — declining scores, missing scans, blind spots. Each with a one-line suggested fix.

## Next 30 days
3-5 action items, specific and sized. Think: "Publish 5 landing pages for top-opportunity localities", "Fix the 2 projects past RERA possession date", "Run AI visibility scan in {secondary city}".

Keep it under 400 words total. No filler. No em-dashes.`;

    const digest = await aiComplete(system, prompt, 1400);

    return NextResponse.json({
      digest,
      generatedAt: new Date().toISOString(),
      meta: {
        scansAnalysed: scanHistory.length,
        movements,
        mentionCount,
        totalQueries,
      },
    });
  } catch (error) {
    console.error("CMO digest error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Digest generation failed",
      },
      { status: 500 }
    );
  }
}
