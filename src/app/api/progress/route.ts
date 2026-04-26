export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { isDemoRequest } from "@/lib/demo";

/**
 * GET /api/progress?companyId=...
 *
 * The "are we compounding?" endpoint. Returns time-series metrics that
 * answer the question every CMO has after week 2: "is what we're
 * doing inside Cabbge actually working?"
 *
 * Pulls from:
 *   - scan_history: per-day audit / technical / backlinks / AI visibility
 *     scores. The trajectory of these = the compounding curve.
 *   - generated_content: articles drafted vs published. Output volume
 *     is the leading indicator of mention-rate gains.
 *   - The latest ai_visibility scan's queryResults: today's AI mention
 *     state across ChatGPT + Gemini.
 *
 * Returns a single JSON document the dashboard can render without
 * additional queries.
 *
 * Demo mode returns synthetic-but-plausible data so the showcase has
 * a compelling "look what 90 days of this looks like" curve. Demo
 * data is clearly labelled `demo: true` so the UI can stamp it.
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

interface DailyPoint {
  date: string; // YYYY-MM-DD
  audit?: number | null;
  technical?: number | null;
  backlinks?: number | null;
  aiVisibility?: number | null;
  mentionRate?: number | null;
  citationsCount?: number | null;
}

interface ProgressResult {
  rangeDays: number;
  startDate: string;
  endDate: string;
  daily: DailyPoint[];
  // Headline numbers — the cards that render at the top of the page.
  summary: {
    aiMentionRate: { current: number | null; baseline: number | null; delta: number | null };
    aiCitations: { total: number; trend: "up" | "down" | "flat" };
    auditScore: { current: number | null; baseline: number | null; delta: number | null };
    articlesPublished: number;
    articlesDrafted: number;
    scansRun: number;
    daysSinceFirstScan: number | null;
  };
  // Discrete events worth annotating on the chart.
  milestones: Array<{
    date: string;
    type: "first_scan" | "article_published" | "score_jump" | "mention_rate_jump" | "drop";
    label: string;
  }>;
  demo?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}

function trendOf(points: number[]): "up" | "down" | "flat" {
  if (points.length < 2) return "flat";
  const last = points[points.length - 1];
  const first = points[0];
  if (last > first * 1.05) return "up";
  if (last < first * 0.95) return "down";
  return "flat";
}

function computeMentionRate(results: unknown): { rate: number | null; citations: number } {
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

/**
 * Synthetic data for demo mode. Generates a 90-day compounding curve
 * with realistic noise so the showcase tells the same story it would
 * for a real customer six weeks in.
 */
function buildDemoProgress(): ProgressResult {
  const now = new Date();
  const startDate = new Date(now.getTime() - 90 * DAY_MS);
  const daily: DailyPoint[] = [];
  const milestones: ProgressResult["milestones"] = [];

  // Compounding model: starts at 12% mention rate, grows to 58% over 90
  // days, with a stochastic 4-pp daily wobble (matches Foundation's 20-30%
  // observed scan-to-scan volatility).
  const seed = (i: number) => Math.sin(i * 1.3 + 0.7) * 4;
  let cumulativeCitations = 0;

  for (let i = 0; i < 90; i++) {
    const d = new Date(startDate.getTime() + i * DAY_MS);
    const progress = i / 89;
    const baseRate = 12 + progress * 46; // 12 → 58
    const noisyRate = Math.max(0, Math.min(100, baseRate + seed(i)));
    const dailyCitations = Math.round(20 + progress * 80 + Math.abs(seed(i) * 4));
    cumulativeCitations += dailyCitations;

    const auditBase = 52 + progress * 32;
    const techBase = 60 + progress * 28;
    const backBase = 28 + progress * 25;

    daily.push({
      date: dateKey(d),
      audit: Math.round(auditBase + seed(i) * 0.6),
      technical: Math.round(techBase + seed(i) * 0.4),
      backlinks: Math.round(backBase + seed(i) * 0.8),
      aiVisibility: Math.round(noisyRate),
      mentionRate: Math.round(noisyRate),
      citationsCount: dailyCitations,
    });

    // Annotate a few milestones along the curve
    if (i === 2) milestones.push({ date: dateKey(d), type: "first_scan", label: "First Cabbge scan" });
    if (i === 7) milestones.push({ date: dateKey(d), type: "article_published", label: "First 5 articles published" });
    if (i === 21) milestones.push({ date: dateKey(d), type: "mention_rate_jump", label: "Mention rate crosses 30%" });
    if (i === 45) milestones.push({ date: dateKey(d), type: "article_published", label: "20 articles live" });
    if (i === 67) milestones.push({ date: dateKey(d), type: "score_jump", label: "Audit score crosses 80" });
  }

  const first = daily[0];
  const last = daily[daily.length - 1];

  return {
    rangeDays: 90,
    startDate: dateKey(startDate),
    endDate: dateKey(now),
    daily,
    summary: {
      aiMentionRate: { current: last.mentionRate ?? null, baseline: first.mentionRate ?? null, delta: (last.mentionRate ?? 0) - (first.mentionRate ?? 0) },
      aiCitations: { total: cumulativeCitations, trend: "up" },
      auditScore: { current: last.audit ?? null, baseline: first.audit ?? null, delta: (last.audit ?? 0) - (first.audit ?? 0) },
      articlesPublished: 26,
      articlesDrafted: 41,
      scansRun: 90,
      daysSinceFirstScan: 90,
    },
    milestones,
    demo: true,
  };
}

export async function GET(req: NextRequest) {
  // Demo mode returns the synthetic compounding curve so sales pitches
  // can show "this is what 90 days inside Cabbge looks like" without
  // needing 90 days of real data.
  if (isDemoRequest(req)) {
    return NextResponse.json(buildDemoProgress());
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const companyId = req.nextUrl.searchParams.get("companyId");
  const rangeDays = Math.min(Math.max(Number(req.nextUrl.searchParams.get("days")) || 90, 7), 365);

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const db = getServiceClient();

  // Confirm ownership.
  const { data: company } = await db
    .from("companies")
    .select("id, owner_id")
    .eq("id", companyId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const startDate = new Date(Date.now() - rangeDays * DAY_MS);

  // Pull every scan + content event for the period in two indexed reads.
  const [{ data: scans }, { data: content }] = await Promise.all([
    db
      .from("scan_history")
      .select("scan_type, score, created_at, results")
      .eq("company_id", companyId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true }),
    db
      .from("generated_content")
      .select("status, created_at")
      .eq("company_id", companyId)
      .gte("created_at", startDate.toISOString()),
  ]);

  const scanRows: ScanRow[] = (scans || []) as ScanRow[];
  const contentRows: ContentRow[] = (content || []) as ContentRow[];

  // Bucket scans by date + scan_type, taking the latest scan of each
  // type within a day (a customer who runs the same scan 3× in a day
  // gets the most recent result on the chart).
  const buckets = new Map<string, DailyPoint>();
  for (const s of scanRows) {
    const key = dateKey(s.created_at);
    const point = buckets.get(key) || { date: key };
    if (s.scan_type === "audit") point.audit = s.score;
    else if (s.scan_type === "technical") point.technical = s.score;
    else if (s.scan_type === "backlinks") point.backlinks = s.score;
    else if (s.scan_type === "ai_visibility") {
      point.aiVisibility = s.score;
      const { rate, citations } = computeMentionRate(s.results);
      point.mentionRate = rate;
      point.citationsCount = (point.citationsCount || 0) + citations;
    }
    buckets.set(key, point);
  }

  // Fill date gaps so the chart x-axis is continuous (front-fill latest
  // known value — the dashboard can render this as a step line).
  const daily: DailyPoint[] = [];
  let lastKnown: DailyPoint = { date: "" };
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(startDate.getTime() + i * DAY_MS);
    const key = dateKey(d);
    const fresh = buckets.get(key);
    if (fresh) lastKnown = { ...lastKnown, ...fresh, date: key };
    else lastKnown = { ...lastKnown, date: key };
    daily.push({ ...lastKnown });
  }

  // Summary numbers — explicitly handle empty histories so a customer
  // who just signed up doesn't see NaN cards.
  const aiVisHistory = scanRows.filter((s) => s.scan_type === "ai_visibility");
  const auditHistory = scanRows.filter((s) => s.scan_type === "audit");
  const firstScan = scanRows[0]?.created_at;

  const articlesPublished = contentRows.filter((c) => c.status === "published").length;
  const articlesDrafted = contentRows.length;

  const baselineMentionRate = aiVisHistory.length > 0 ? computeMentionRate(aiVisHistory[0].results).rate : null;
  const currentMentionRate = aiVisHistory.length > 0 ? computeMentionRate(aiVisHistory[aiVisHistory.length - 1].results).rate : null;
  const totalCitations = aiVisHistory.reduce((acc, s) => acc + computeMentionRate(s.results).citations, 0);

  const baselineAudit = auditHistory[0]?.score ?? null;
  const currentAudit = auditHistory[auditHistory.length - 1]?.score ?? null;

  const summary: ProgressResult["summary"] = {
    aiMentionRate: {
      current: currentMentionRate,
      baseline: baselineMentionRate,
      delta: currentMentionRate !== null && baselineMentionRate !== null ? currentMentionRate - baselineMentionRate : null,
    },
    aiCitations: {
      total: totalCitations,
      trend: trendOf(aiVisHistory.map((s) => computeMentionRate(s.results).citations)),
    },
    auditScore: {
      current: currentAudit,
      baseline: baselineAudit,
      delta: currentAudit !== null && baselineAudit !== null ? currentAudit - baselineAudit : null,
    },
    articlesPublished,
    articlesDrafted,
    scansRun: scanRows.length,
    daysSinceFirstScan: firstScan ? Math.ceil((Date.now() - new Date(firstScan).getTime()) / DAY_MS) : null,
  };

  // Milestones — annotate moments worth celebrating on the chart.
  const milestones: ProgressResult["milestones"] = [];
  if (firstScan) milestones.push({ date: dateKey(firstScan), type: "first_scan", label: "First Cabbge scan" });

  // Article publish events
  const publishDays = new Map<string, number>();
  for (const c of contentRows) {
    if (c.status !== "published") continue;
    const k = dateKey(c.created_at);
    publishDays.set(k, (publishDays.get(k) || 0) + 1);
  }
  for (const [date, count] of publishDays.entries()) {
    if (count >= 3) milestones.push({ date, type: "article_published", label: `${count} articles published` });
  }

  // Score jumps — find the day where audit score crossed 80 (or another
  // round threshold) for the first time. Same for mention rate at 30%.
  for (let i = 1; i < daily.length; i++) {
    const prev = daily[i - 1];
    const cur = daily[i];
    if ((prev.audit ?? 0) < 80 && (cur.audit ?? 0) >= 80) {
      milestones.push({ date: cur.date, type: "score_jump", label: "Audit score crossed 80" });
    }
    if ((prev.mentionRate ?? 0) < 30 && (cur.mentionRate ?? 0) >= 30) {
      milestones.push({ date: cur.date, type: "mention_rate_jump", label: "Mention rate crossed 30%" });
    }
    if ((prev.mentionRate ?? 0) >= 50 && (cur.mentionRate ?? 0) < 40) {
      milestones.push({ date: cur.date, type: "drop", label: "Mention rate dropped — investigate" });
    }
  }

  const result: ProgressResult = {
    rangeDays,
    startDate: dateKey(startDate),
    endDate: dateKey(new Date()),
    daily,
    summary,
    milestones,
  };

  return NextResponse.json(result);
}
