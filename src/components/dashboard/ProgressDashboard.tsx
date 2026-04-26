"use client";

/**
 * Progress dashboard — the "are we compounding?" view.
 *
 * Two parts to the story:
 *   1. Top stat row: current vs baseline for the four metrics that
 *      matter (AI mention rate, citations earned, audit score, articles
 *      shipped). Every card shows the delta from day-1 so the CMO can
 *      copy-paste it into a board update.
 *   2. Multi-line chart: 90-day trajectory with milestone annotations.
 *      The compounding curve. This is the conversion lever for sales
 *      pitches — "here's what 90 days inside Cabbge looks like".
 *
 * Demo mode hits /api/progress and gets a synthetic 90-day curve so the
 * showcase tells the same story it would for a real 6-week-old customer.
 */

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Activity, Sparkles, FileText, Loader2, RefreshCw, Award, Printer } from "lucide-react";
import Link from "next/link";

interface DailyPoint {
  date: string;
  audit?: number | null;
  technical?: number | null;
  backlinks?: number | null;
  aiVisibility?: number | null;
  mentionRate?: number | null;
  citationsCount?: number | null;
}

interface ProgressData {
  rangeDays: number;
  startDate: string;
  endDate: string;
  daily: DailyPoint[];
  summary: {
    aiMentionRate: { current: number | null; baseline: number | null; delta: number | null };
    aiCitations: { total: number; trend: "up" | "down" | "flat" };
    auditScore: { current: number | null; baseline: number | null; delta: number | null };
    articlesPublished: number;
    articlesDrafted: number;
    scansRun: number;
    daysSinceFirstScan: number | null;
  };
  milestones: Array<{ date: string; type: string; label: string }>;
  demo?: boolean;
}

interface Props {
  companyId?: string;
}

const METRIC_KEYS = ["mentionRate", "audit", "technical", "backlinks"] as const;
type MetricKey = typeof METRIC_KEYS[number];

const METRIC_META: Record<MetricKey, { label: string; color: string; legendColor: string }> = {
  mentionRate:  { label: "AI Mention Rate", color: "#7CB342", legendColor: "bg-[#7CB342]" },
  audit:        { label: "Audit Score",     color: "#fbbf24", legendColor: "bg-amber-400" },
  technical:    { label: "Technical",       color: "#60a5fa", legendColor: "bg-blue-400" },
  backlinks:    { label: "Backlinks",       color: "#c084fc", legendColor: "bg-purple-400" },
};

function MultiLineChart({ daily, milestones, visible }: { daily: DailyPoint[]; milestones: ProgressData["milestones"]; visible: Set<MetricKey> }) {
  const w = 800;
  const h = 240;
  const padTop = 14;
  const padBottom = 28;
  const padLeft = 32;
  const padRight = 12;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  if (daily.length === 0) return null;

  const xStep = chartW / Math.max(1, daily.length - 1);
  const xAt = (i: number) => padLeft + i * xStep;
  const yAt = (v: number) => padTop + chartH - (v / 100) * chartH;

  const lineFor = (key: MetricKey): string => {
    const segments: string[] = [];
    let inSegment = false;
    daily.forEach((d, i) => {
      const v = d[key as keyof DailyPoint] as number | null | undefined;
      if (v == null) {
        inSegment = false;
        return;
      }
      const cmd = inSegment ? "L" : "M";
      segments.push(`${cmd}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`);
      inSegment = true;
    });
    return segments.join(" ");
  };

  const lastValue = (key: MetricKey): { v: number; i: number } | null => {
    for (let i = daily.length - 1; i >= 0; i--) {
      const v = daily[i][key as keyof DailyPoint] as number | null | undefined;
      if (v != null) return { v, i };
    }
    return null;
  };

  // X-axis ticks: every ~15 days
  const tickEvery = Math.max(1, Math.floor(daily.length / 6));
  const xTicks: Array<{ x: number; label: string }> = [];
  for (let i = 0; i < daily.length; i += tickEvery) {
    const d = new Date(daily[i].date + "T00:00:00Z");
    xTicks.push({
      x: xAt(i),
      label: d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    });
  }
  if (xTicks[xTicks.length - 1]?.x !== xAt(daily.length - 1)) {
    xTicks.push({
      x: xAt(daily.length - 1),
      label: new Date(daily[daily.length - 1].date + "T00:00:00Z").toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    });
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      {/* Background grid */}
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={padLeft} y1={yAt(v)} x2={w - padRight} y2={yAt(v)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <text x={padLeft - 6} y={yAt(v) + 3} textAnchor="end" fontSize="9" fill="#52525b">{v}</text>
        </g>
      ))}
      {/* Milestones — vertical dashed lines */}
      {milestones.map((m, i) => {
        const idx = daily.findIndex((d) => d.date === m.date);
        if (idx < 0) return null;
        const x = xAt(idx);
        return (
          <g key={i}>
            <line x1={x} y1={padTop} x2={x} y2={padTop + chartH} stroke="rgba(124,179,66,0.2)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={x} cy={padTop} r="3" fill="#7CB342" />
          </g>
        );
      })}
      {/* Lines */}
      {METRIC_KEYS.map((key) => {
        if (!visible.has(key)) return null;
        const meta = METRIC_META[key];
        return (
          <path key={key} d={lineFor(key)} fill="none" stroke={meta.color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
        );
      })}
      {/* Last-value endpoints */}
      {METRIC_KEYS.map((key) => {
        if (!visible.has(key)) return null;
        const last = lastValue(key);
        if (!last) return null;
        return (
          <circle key={`dot-${key}`} cx={xAt(last.i)} cy={yAt(last.v)} r="3" fill={METRIC_META[key].color} />
        );
      })}
      {/* X-axis labels */}
      {xTicks.map((t, i) => (
        <text key={i} x={t.x} y={h - 8} textAnchor="middle" fontSize="9" fill="#52525b">{t.label}</text>
      ))}
    </svg>
  );
}

function StatCard({ label, current, baseline, delta, suffix, icon: Icon, format = "int" }: {
  label: string;
  current: number | null | undefined;
  baseline?: number | null;
  delta?: number | null;
  suffix?: string;
  icon: typeof TrendingUp;
  format?: "int" | "percent";
}) {
  const fmt = (n: number | null | undefined) => {
    if (n == null) return "—";
    if (format === "percent") return `${n}%`;
    return n.toLocaleString("en-IN");
  };
  const trendIcon = delta == null ? <Minus size={11} className="text-zinc-500" />
    : delta > 0 ? <TrendingUp size={11} className="text-[#7CB342]" />
    : delta < 0 ? <TrendingDown size={11} className="text-red-400" />
    : <Minus size={11} className="text-zinc-500" />;
  return (
    <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-1.5">
          <Icon size={11} className="text-zinc-400" />
          {label}
        </div>
        <div className="text-2xl font-bold text-zinc-100 tabular-nums">
          {fmt(current)}
          {suffix && current != null && <span className="text-[14px] font-normal text-zinc-500 ml-0.5">{suffix}</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {trendIcon}
          <span className={`text-[11px] tabular-nums ${delta == null ? "text-zinc-500" : delta > 0 ? "text-[#7CB342]" : delta < 0 ? "text-red-400" : "text-zinc-500"}`}>
            {delta == null ? "no baseline yet" :
              delta === 0 ? "no change" :
              `${delta > 0 ? "+" : ""}${fmt(delta)}${suffix || ""} vs day 1`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProgressDashboard({ companyId }: Props) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState<Set<MetricKey>>(new Set(["mentionRate", "audit", "technical", "backlinks"]));

  const load = async () => {
    setLoading(true);
    try {
      const url = companyId ? `/api/progress?companyId=${encodeURIComponent(companyId)}` : "/api/progress";
      const res = await fetch(url);
      if (!res.ok) {
        setData(null);
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [companyId]);

  const totalScans = data?.summary.scansRun ?? 0;
  const articleConversion = useMemo(() => {
    if (!data) return null;
    const drafted = data.summary.articlesDrafted;
    if (drafted === 0) return null;
    return Math.round((data.summary.articlesPublished / drafted) * 100);
  }, [data]);

  if (loading) {
    return (
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardContent className="p-8 flex items-center justify-center text-zinc-500 text-[13px]">
          <Loader2 size={14} className="animate-spin mr-2" />
          Loading progress data...
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardContent className="p-8 text-center text-zinc-500 text-[13px]">
          No progress data yet. Run your first scan to start the trajectory.
        </CardContent>
      </Card>
    );
  }

  const { summary, daily, milestones, demo } = data;

  return (
    <div className="space-y-5">
      {/* Demo banner */}
      {demo && (
        <div className="rounded-xl bg-amber-500/[0.08] border border-amber-500/30 px-4 py-2.5 flex items-center gap-2">
          <Sparkles size={14} className="text-amber-400" />
          <span className="text-[12px] text-amber-200">
            <span className="font-semibold">Sales demo data</span> — synthetic 90-day curve. A real customer's chart fills the same shape over 60-90 days of usage.
          </span>
        </div>
      )}

      {/* Top stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="AI Mention Rate"
          current={summary.aiMentionRate.current}
          baseline={summary.aiMentionRate.baseline}
          delta={summary.aiMentionRate.delta}
          suffix="%"
          icon={Sparkles}
          format="percent"
        />
        <StatCard
          label="AI Citations Earned"
          current={summary.aiCitations.total}
          delta={null}
          icon={Award}
        />
        <StatCard
          label="Audit Score"
          current={summary.auditScore.current}
          baseline={summary.auditScore.baseline}
          delta={summary.auditScore.delta}
          icon={Activity}
        />
        <StatCard
          label="Articles Published"
          current={summary.articlesPublished}
          delta={null}
          icon={FileText}
        />
      </div>

      {/* The compounding curve */}
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-[14px] font-semibold flex items-center gap-2">
                <TrendingUp size={15} className="text-[#7CB342]" />
                The compounding curve
              </CardTitle>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                {demo
                  ? "What 90 days inside Cabbge looks like for a typical customer."
                  : `${data.rangeDays} days of trajectory. Click a metric below to toggle it on the chart.`}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {companyId && (
                <Link
                  href={`/report/${companyId}`}
                  className="text-[11px] font-semibold text-[#7CB342] hover:text-[#8BC34A] flex items-center gap-1"
                  title="Open the CEO-ready printable report"
                >
                  <Printer size={11} />
                  CEO report
                </Link>
              )}
              <button
                onClick={load}
                disabled={loading}
                className="text-[11px] text-zinc-500 hover:text-zinc-200 flex items-center gap-1 disabled:opacity-40"
                title="Refresh"
              >
                <RefreshCw size={11} />
                Refresh
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Legend / toggles */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {METRIC_KEYS.map((key) => {
              const meta = METRIC_META[key];
              const isOn = visible.has(key);
              return (
                <button
                  key={key}
                  onClick={() => {
                    const next = new Set(visible);
                    if (isOn) next.delete(key); else next.add(key);
                    setVisible(next);
                  }}
                  className={`flex items-center gap-1.5 text-[11px] transition-opacity ${isOn ? "opacity-100" : "opacity-40 hover:opacity-70"}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${meta.legendColor}`} />
                  <span className="text-zinc-300">{meta.label}</span>
                </button>
              );
            })}
            {milestones.length > 0 && (
              <span className="ml-auto text-[10px] text-zinc-600 flex items-center gap-1">
                <span className="w-1 h-3 bg-[#7CB342]/40 rounded" />
                Milestones
              </span>
            )}
          </div>
          {/* Chart */}
          <div className="rounded-lg bg-zinc-900/40 border border-white/[0.04] p-3">
            <MultiLineChart daily={daily} milestones={milestones} visible={visible} />
          </div>

          {/* Milestone log */}
          {milestones.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500 font-semibold mb-2">
                Milestones
              </div>
              <div className="space-y-1">
                {milestones.slice(0, 8).map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px] py-1">
                    <span className="text-zinc-500 tabular-nums w-20 flex-shrink-0">
                      {new Date(m.date + "T00:00:00Z").toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      m.type === "drop" ? "bg-red-400" :
                      m.type === "first_scan" ? "bg-zinc-400" :
                      m.type === "score_jump" || m.type === "mention_rate_jump" ? "bg-[#7CB342]" :
                      "bg-amber-400"
                    }`} />
                    <span className="text-zinc-300">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Output velocity */}
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
            <FileText size={14} className="text-zinc-400" />
            Output velocity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-zinc-800/40 border border-white/[0.04]">
              <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">Articles drafted</div>
              <div className="text-xl font-bold text-zinc-100 tabular-nums">{summary.articlesDrafted}</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/40 border border-white/[0.04]">
              <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">Published</div>
              <div className="text-xl font-bold text-[#7CB342] tabular-nums">{summary.articlesPublished}</div>
              {articleConversion !== null && (
                <div className="text-[10px] text-zinc-500 mt-0.5">{articleConversion}% of drafts</div>
              )}
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/40 border border-white/[0.04]">
              <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">Scans run</div>
              <div className="text-xl font-bold text-zinc-100 tabular-nums">{totalScans}</div>
              {summary.daysSinceFirstScan != null && (
                <div className="text-[10px] text-zinc-500 mt-0.5">over {summary.daysSinceFirstScan} days</div>
              )}
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed">
            Articles compound. Each one published widens the surface AI engines can cite. A customer who ships 5 articles a week typically sees mention rate gains within 21-30 days; the curve above is direct evidence.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
