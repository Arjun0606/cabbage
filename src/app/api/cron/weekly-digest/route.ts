export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { sendDigest } from "@/lib/email/sendDigest";

/**
 * Weekly digest cron — every Monday at 03:30 UTC (~09:00 IST).
 *
 * For each company with an active subscription:
 *   1. Compute this week's deltas vs last week (mention rate, citations,
 *      articles, scans).
 *   2. Surface 3 wins + 3 actions derived from scan_history events.
 *   3. Send a single email via Resend with a clean HTML template.
 *
 * Resend infra is env-flag gated: if RESEND_API_KEY is unset the cron
 * still runs (collects + computes the data, useful for testing) but
 * sendDigest no-ops with skipped=true. Flip the env var when ready.
 */

interface ScanRow {
  scan_type: string;
  score: number | null;
  created_at: string;
  results: unknown;
}

interface ContentRow {
  status: string;
  created_at: string;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function mentionRateFromResults(results: unknown): { rate: number | null; citations: number } {
  if (!results || typeof results !== "object") return { rate: null, citations: 0 };
  const r = results as { queryResults?: Array<{ chatgpt?: { mentioned?: boolean; citationSources?: unknown[] }; gemini?: { mentioned?: boolean; citationSources?: unknown[] } }> };
  const qrs = r.queryResults || [];
  if (qrs.length === 0) return { rate: null, citations: 0 };
  let mentioned = 0;
  let total = 0;
  let citations = 0;
  for (const q of qrs) {
    for (const llm of [q.chatgpt, q.gemini]) {
      if (!llm) continue;
      total++;
      if (llm.mentioned) mentioned++;
      if (Array.isArray(llm.citationSources)) citations += llm.citationSources.length;
    }
  }
  return {
    rate: total > 0 ? Math.round((mentioned / total) * 100) : null,
    citations,
  };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  // Active customers only — we don't email trial-expired or cancelled
  // accounts. Pull profile (for name) + email join from auth.users via
  // profiles. Limit 100 per run; multi-run if we ever exceed that.
  const { data: subs, error: subsErr } = await supabase
    .from("subscriptions")
    .select("user_id, status, plan")
    .in("status", ["active", "trialing"])
    .limit(100);
  if (subsErr) {
    return NextResponse.json({ error: subsErr.message }, { status: 500 });
  }
  if (!subs?.length) {
    return NextResponse.json({ message: "No active subscriptions", sent: 0, skipped: 0 });
  }

  const userIds = subs.map((s) => s.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds);
  const profileById = new Map((profiles || []).map((p) => [p.id, p]));

  const now = new Date();
  const weekStart = new Date(now.getTime() - WEEK_MS);
  const prevWeekStart = new Date(weekStart.getTime() - WEEK_MS);

  const dashboardUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cabbge.com";

  let sent = 0;
  let skipped = 0;
  const failures: Array<{ user: string; reason: string }> = [];

  for (const sub of subs) {
    const profile = profileById.get(sub.user_id);
    if (!profile?.email) { skipped++; continue; }

    // Find the company tied to this user.
    const { data: company } = await supabase
      .from("companies")
      .select("id, name")
      .eq("owner_id", sub.user_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!company) { skipped++; continue; }

    // Pull this-week + prev-week scan + content rows.
    const [{ data: weekScans }, { data: prevScans }, { data: weekContent }] = await Promise.all([
      supabase
        .from("scan_history")
        .select("scan_type, score, created_at, results")
        .eq("company_id", company.id)
        .gte("created_at", weekStart.toISOString()),
      supabase
        .from("scan_history")
        .select("scan_type, score, created_at, results")
        .eq("company_id", company.id)
        .gte("created_at", prevWeekStart.toISOString())
        .lt("created_at", weekStart.toISOString()),
      supabase
        .from("generated_content")
        .select("status, created_at")
        .eq("company_id", company.id)
        .gte("created_at", weekStart.toISOString()),
    ]);

    const weekScanRows: ScanRow[] = (weekScans || []) as ScanRow[];
    const prevScanRows: ScanRow[] = (prevScans || []) as ScanRow[];
    const weekContentRows: ContentRow[] = (weekContent || []) as ContentRow[];

    const weekAiVis = weekScanRows.filter((s) => s.scan_type === "ai_visibility");
    const prevAiVis = prevScanRows.filter((s) => s.scan_type === "ai_visibility");

    const latestThisWeek = weekAiVis[weekAiVis.length - 1];
    const latestPrevWeek = prevAiVis[prevAiVis.length - 1];
    const currentRate = latestThisWeek ? mentionRateFromResults(latestThisWeek.results).rate : null;
    const prevRate = latestPrevWeek ? mentionRateFromResults(latestPrevWeek.results).rate : null;
    const deltaWoW = currentRate != null && prevRate != null ? currentRate - prevRate : null;

    const weekCitations = weekAiVis.reduce((acc, s) => acc + mentionRateFromResults(s.results).citations, 0);
    const cumulativeCitationsRow = await supabase
      .from("scan_history")
      .select("results")
      .eq("company_id", company.id)
      .eq("scan_type", "ai_visibility");
    const cumulativeCitations = (cumulativeCitationsRow.data || []).reduce(
      (acc, s) => acc + mentionRateFromResults(s.results).citations,
      0
    );

    const articlesPublished = weekContentRows.filter((c) => c.status === "published").length;
    const articlesDrafted = weekContentRows.length;

    // Three wins (best-effort heuristics).
    const wins: string[] = [];
    if (deltaWoW != null && deltaWoW > 0) wins.push(`AI mention rate climbed ${deltaWoW}pp to ${currentRate}%`);
    if (articlesPublished > 0) wins.push(`${articlesPublished} article${articlesPublished === 1 ? "" : "s"} shipped this week`);
    if (weekCitations > 0) wins.push(`Earned ${weekCitations} new AI citation${weekCitations === 1 ? "" : "s"} across ChatGPT + Gemini`);
    if (wins.length === 0) wins.push("Cabbge ran scans on schedule. Curve is being seeded — week 2-3 is when compounding usually shows.");

    // Three actions (best-effort heuristics).
    const actions: Array<{ label: string; url: string }> = [];
    if (currentRate != null && currentRate < 40 && articlesPublished < 3) {
      actions.push({ label: "Ship 5 articles to widen the AI citation surface", url: `${dashboardUrl}/dashboard?tab=content` });
    }
    if (deltaWoW != null && deltaWoW < -3) {
      actions.push({ label: "Mention rate dropped — open Citation Drift to see who took your queries", url: `${dashboardUrl}/dashboard?tab=aigeo` });
    }
    if (articlesDrafted > 0 && articlesPublished === 0) {
      actions.push({ label: `Publish the ${articlesDrafted} articles waiting in draft`, url: `${dashboardUrl}/dashboard?tab=content` });
    }
    if (actions.length < 3) {
      actions.push({ label: "Run query fanout on a top buyer query to find hidden ceilings", url: `${dashboardUrl}/dashboard?tab=aigeo` });
    }

    const result = await sendDigest({
      toEmail: profile.email,
      toName: profile.full_name || undefined,
      brandName: company.name,
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: now.toISOString().slice(0, 10),
      mentionRate: { current: currentRate, deltaWoW },
      citations: { week: weekCitations, cumulative: cumulativeCitations },
      articlesPublished,
      scansRun: weekScanRows.length,
      wins,
      actions: actions.slice(0, 3),
      dashboardUrl: `${dashboardUrl}/dashboard`,
      reportUrl: `${dashboardUrl}/report/${company.id}`,
    });

    if (result.ok) {
      sent++;
    } else if (result.skipped) {
      skipped++;
    } else {
      failures.push({ user: profile.email, reason: result.reason || "unknown" });
    }
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    candidatesProcessed: subs.length,
    sent,
    skipped,
    failuresCount: failures.length,
    failures: failures.slice(0, 5),
  });
}
