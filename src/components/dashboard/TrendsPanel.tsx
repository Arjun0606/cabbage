"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { TrendData } from "@/lib/scanHistory";

interface Props {
  trends: Record<string, TrendData>;
  url: string;
}

function TrendIndicator({ trend }: { trend: TrendData }) {
  if (trend.direction === "new" || trend.previous === null) {
    return <span className="text-[10px] text-zinc-600">First scan</span>;
  }

  const icon = trend.direction === "improving"
    ? <TrendingUp size={12} className="text-emerald-400" />
    : trend.direction === "declining"
    ? <TrendingDown size={12} className="text-red-400" />
    : <Minus size={12} className="text-zinc-500" />;

  const color = trend.direction === "improving"
    ? "text-emerald-400"
    : trend.direction === "declining"
    ? "text-red-400"
    : "text-zinc-500";

  return (
    <div className={`flex items-center gap-1 text-[11px] ${color}`}>
      {icon}
      {trend.change > 0 ? "+" : ""}{trend.change} pts
    </div>
  );
}

function MiniChart({ history }: { history: { date: string; score: number }[] }) {
  if (history.length < 2) return null;

  const max = Math.max(...history.map(h => h.score), 100);
  const min = Math.min(...history.map(h => h.score), 0);
  const range = max - min || 1;
  const width = 120;
  const height = 32;
  const padding = 2;

  const points = history.map((h, i) => {
    const x = padding + (i / (history.length - 1)) * (width - padding * 2);
    const y = height - padding - ((h.score - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke="rgb(52 211 153)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrendsPanel({ trends }: Props) {
  const hasAnyData = Object.values(trends).some(t => t.history.length > 0);

  if (!hasAnyData) return null;

  // Only show metrics that come from real APIs (not AI-estimated)
  // Backlinks DA is excluded unless Moz API is connected
  // because AI estimates can fluctuate and look misleading
  const trendItems = [
    { key: "audit", label: "SEO Score", trend: trends.audit },
    { key: "technical", label: "Technical", trend: trends.technical },
    { key: "ai_visibility", label: "AI Visibility", trend: trends.ai_visibility },
  ].filter(t => t.trend.history.length > 0);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={14} className="text-emerald-400" />
          <h4 className="text-sm font-medium text-zinc-200">Progress Over Time</h4>
          {trendItems.some(t => t.trend.direction === "improving") && (
            <Badge className="bg-emerald-900/50 text-emerald-400 text-[9px] ml-auto">Improving</Badge>
          )}
        </div>

        <div className="space-y-3">
          {trendItems.map(({ key, label, trend }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">{label}</span>
                  <TrendIndicator trend={trend} />
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-bold text-zinc-100">{trend.current}</span>
                  {trend.previous !== null && (
                    <span className="text-[10px] text-zinc-600">from {trend.previous}</span>
                  )}
                </div>
              </div>
              <MiniChart history={trend.history} />
            </div>
          ))}
        </div>

        {trendItems[0]?.trend.history.length >= 2 && (
          <p className="text-[10px] text-zinc-600 mt-3 border-t border-zinc-800 pt-2">
            Tracking since {trendItems[0].trend.history[0].date}. Run scans regularly to see progress.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
