"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

/**
 * AI Visibility Trend.
 *
 * The headline "improvement over time" widget — turns the snapshot scores
 * into a story (mention rate this month vs last month, queries gained / lost,
 * per-channel deltas). Renders nothing until the user has at least 2 scans
 * with per-query data, since a single point is not a trend.
 */

interface ScanPoint {
  at: string;
  chatgpt: number;
  gemini: number;
  combined: number;
  totalQueries: number;
}

interface QueryTrend {
  query: string;
  history: { at: string; mentioned: boolean }[];
  rate: number;
  currentlyMentioned: boolean;
  initiallyMentioned: boolean;
  movement: "gained" | "lost" | "stable";
}

interface TrendsResponse {
  summary: {
    scans: number;
    days: number;
    current: { chatgpt: number; gemini: number; combined: number };
    delta: { chatgpt: number; gemini: number; combined: number };
    queriesGained: number;
    queriesLost: number;
  };
  series: ScanPoint[];
  queryTrends: QueryTrend[];
}

interface Props {
  companyId?: string;
  /** When this changes (after a fresh scan), refetch the trend. */
  refetchKey?: unknown;
}

const WIDTH = 640;
const HEIGHT = 160;
const PADDING = { top: 16, right: 16, bottom: 24, left: 32 };

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points.reduce((acc, p, i) => acc + (i === 0 ? `M${p.x},${p.y}` : ` L${p.x},${p.y}`), "");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="text-[11px] text-zinc-500">flat</span>;
  }
  const positive = delta > 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  const colour = positive ? "text-emerald-400" : "text-red-400";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${colour}`}>
      <Icon size={11} />
      {positive ? "+" : ""}{delta} pts
    </span>
  );
}

export function AIVisibilityTrend({ companyId, refetchKey }: Props) {
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [showAllQueries, setShowAllQueries] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    fetch(`/api/trends?companyId=${encodeURIComponent(companyId)}&days=90`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        setData(json && typeof json === "object" && "series" in json ? (json as TrendsResponse) : null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, refetchKey]);

  const chart = useMemo(() => {
    if (!data || data.series.length < 2) return null;

    const series = data.series;
    const innerW = WIDTH - PADDING.left - PADDING.right;
    const innerH = HEIGHT - PADDING.top - PADDING.bottom;

    const xFor = (i: number) =>
      PADDING.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
    const yFor = (val: number) => PADDING.top + innerH - (val / 100) * innerH;

    const chatgptPath = buildPath(series.map((p, i) => ({ x: xFor(i), y: yFor(p.chatgpt) })));
    const geminiPath = buildPath(series.map((p, i) => ({ x: xFor(i), y: yFor(p.gemini) })));

    const xLabels = [
      { x: xFor(0), label: formatDate(series[0].at) },
      { x: xFor(series.length - 1), label: formatDate(series[series.length - 1].at) },
    ];

    return { chatgptPath, geminiPath, xLabels };
  }, [data]);

  if (!companyId) return null;
  if (!data || data.series.length < 2) return null;

  const { summary, queryTrends } = data;
  const gainedQueries = queryTrends.filter((q) => q.movement === "gained");
  const lostQueries = queryTrends.filter((q) => q.movement === "lost");
  const visibleGained = showAllQueries ? gainedQueries : gainedQueries.slice(0, 5);
  const visibleLost = showAllQueries ? lostQueries : lostQueries.slice(0, 3);

  return (
    <Card className="bg-zinc-900/60 border-zinc-800/50 rounded-xl">
      <CardContent className="p-5 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-zinc-100" />
              <h4 className="text-[13px] font-semibold text-zinc-200">AI Visibility Trend</h4>
              <Badge className="bg-zinc-800 text-zinc-400 text-[10px] border-0 rounded-md h-5 px-1.5">
                {summary.scans} scans · {summary.days}d
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Share of buyer queries where ChatGPT or Gemini named your brand
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">ChatGPT</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-100 tabular-nums">{summary.current.chatgpt}%</span>
              <DeltaBadge delta={summary.delta.chatgpt} />
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Gemini</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-100 tabular-nums">{summary.current.gemini}%</span>
              <DeltaBadge delta={summary.delta.gemini} />
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Combined</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-100 tabular-nums">{summary.current.combined}%</span>
              <DeltaBadge delta={summary.delta.combined} />
            </div>
          </div>
        </div>

        {chart && (
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/50 p-2">
            <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block">
              {[0, 25, 50, 75, 100].map((tick) => {
                const y = PADDING.top + (HEIGHT - PADDING.top - PADDING.bottom) - (tick / 100) * (HEIGHT - PADDING.top - PADDING.bottom);
                return (
                  <g key={tick}>
                    <line x1={PADDING.left} y1={y} x2={WIDTH - PADDING.right} y2={y} stroke="rgb(39 39 42)" strokeDasharray="2,3" strokeWidth="0.5" />
                    <text x={PADDING.left - 6} y={y + 3} fontSize="9" fill="rgb(113 113 122)" textAnchor="end">{tick}</text>
                  </g>
                );
              })}
              <path d={chart.geminiPath} fill="none" stroke="rgb(251 146 60)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              <path d={chart.chatgptPath} fill="none" stroke="rgb(94 234 212)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              {chart.xLabels.map((lbl, i) => (
                <text key={i} x={lbl.x} y={HEIGHT - 6} fontSize="9" fill="rgb(113 113 122)" textAnchor={i === 0 ? "start" : "end"}>{lbl.label}</text>
              ))}
            </svg>
            <div className="flex items-center gap-4 px-2 pb-1 text-[10px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-0.5 bg-teal-300" /> ChatGPT
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-0.5 bg-orange-400" /> Gemini
              </span>
            </div>
          </div>
        )}

        {(gainedQueries.length > 0 || lostQueries.length > 0) && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 mb-2">
                <ArrowUpRight size={12} />
                {gainedQueries.length} queries gained mentions
              </div>
              <ul className="space-y-1">
                {visibleGained.map((q) => (
                  <li key={q.query} className="text-[11px] text-zinc-300 truncate" title={q.query}>
                    {q.query}
                  </li>
                ))}
                {visibleGained.length === 0 && (
                  <li className="text-[11px] text-zinc-600">None in this window</li>
                )}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-red-400 mb-2">
                <TrendingDown size={12} />
                {lostQueries.length} queries lost mentions
              </div>
              <ul className="space-y-1">
                {visibleLost.map((q) => (
                  <li key={q.query} className="text-[11px] text-zinc-300 truncate" title={q.query}>
                    {q.query}
                  </li>
                ))}
                {visibleLost.length === 0 && (
                  <li className="text-[11px] text-zinc-600">None in this window</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {(gainedQueries.length > 5 || lostQueries.length > 3) && (
          <button
            onClick={() => setShowAllQueries((v) => !v)}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showAllQueries ? "Show less" : `Show all (${gainedQueries.length + lostQueries.length})`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
