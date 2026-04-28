"use client";

import { useEffect, useState } from "react";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendPoint {
  scannedAt: string | null;
  url: string | null;
  performance: number | null;
  lcp: number | null;
  fcp: number | null;
  tbt: number | null;
  cls: number | null;
}

interface TrendResponse {
  points: TrendPoint[];
  deltas: {
    performance: number | null;
    lcpMs: number | null;
    cls: number | null;
  };
  sampleCount: number;
}

/**
 * CWV regression panel.
 *
 * Reads audit scan history for the customer's site and renders a trend
 * for performance score, LCP, and CLS — the three Core Web Vitals
 * signals AI overviews and Google search both use to downrank slow
 * pages. The single-shot CWV display in AnalyticsPanel shows "now";
 * this panel shows whether "now" is better or worse than two weeks
 * ago, so the customer can catch performance regressions before they
 * compound into a ranking hit.
 *
 * Hidden when fewer than 2 scans exist (no trend to draw).
 */
export function CWVRegressionPanel({ companyId }: { companyId?: string | null }) {
  const [data, setData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/cwv-trend?companyId=${encodeURIComponent(companyId)}&limit=20`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as TrendResponse;
      })
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load CWV trend");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (!companyId) return null;
  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4 text-[12px] text-zinc-500">
        Loading CWV trend…
      </div>
    );
  }
  if (error) return null;
  if (!data || data.sampleCount < 2) return null;

  const perfPoints = data.points.map((p) => (typeof p.performance === "number" ? p.performance : null));
  const lcpPoints = data.points.map((p) => (typeof p.lcp === "number" ? p.lcp / 1000 : null));
  const clsPoints = data.points.map((p) => (typeof p.cls === "number" ? p.cls : null));

  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.04]">
        <Activity size={13} className="text-[#7CB342]" />
        <span className="text-[13px] font-semibold text-zinc-200">Core Web Vitals · trend</span>
        <span className="text-[10px] text-zinc-500 ml-auto">last {data.sampleCount} audit scans</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
        <MetricCell
          label="Performance"
          unit="score"
          delta={data.deltas.performance}
          deltaUnit="pts"
          deltaInverse={false}
          points={perfPoints}
          formatPoint={(v) => `${Math.round(v)}`}
        />
        <MetricCell
          label="LCP"
          unit="seconds"
          delta={data.deltas.lcpMs !== null ? data.deltas.lcpMs / 1000 : null}
          deltaUnit="s"
          deltaInverse={true}
          points={lcpPoints}
          formatPoint={(v) => `${v.toFixed(1)}s`}
        />
        <MetricCell
          label="CLS"
          unit="layout shift"
          delta={data.deltas.cls}
          deltaUnit=""
          deltaInverse={true}
          points={clsPoints}
          formatPoint={(v) => v.toFixed(2)}
        />
      </div>
    </div>
  );
}

function MetricCell({
  label,
  unit,
  delta,
  deltaUnit,
  deltaInverse,
  points,
  formatPoint,
}: {
  label: string;
  unit: string;
  delta: number | null;
  deltaUnit: string;
  /** True if a *higher* delta is bad (LCP, CLS — lower is better). */
  deltaInverse: boolean;
  points: Array<number | null>;
  formatPoint: (v: number) => string;
}) {
  const validPoints = points.filter((p): p is number => typeof p === "number");
  const last = validPoints[validPoints.length - 1];
  const trendDirection: "up" | "down" | "flat" =
    delta === null || Math.abs(delta) < 0.01 ? "flat" : delta > 0 ? "up" : "down";

  // "Up" is good for performance score, bad for LCP/CLS — color logic
  // depends on whether the metric is inverse (lower = better).
  const isImproving =
    trendDirection === "flat"
      ? null
      : deltaInverse
        ? trendDirection === "down"
        : trendDirection === "up";

  const TrendIcon = trendDirection === "up" ? TrendingUp : trendDirection === "down" ? TrendingDown : Minus;
  const trendColor =
    isImproving === null
      ? "text-zinc-500"
      : isImproving
        ? "text-emerald-400"
        : "text-rose-400";

  const formattedDelta =
    delta === null
      ? "—"
      : `${delta > 0 ? "+" : ""}${delta.toFixed(deltaUnit === "s" || deltaUnit === "" ? 2 : 0)}${deltaUnit}`;

  return (
    <div className="rounded-lg border border-white/[0.04] bg-zinc-950/40 p-3">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
        <div className={`flex items-center gap-1 text-[11px] ${trendColor}`}>
          <TrendIcon size={11} />
          <span className="tabular-nums">{formattedDelta}</span>
        </div>
      </div>
      <div className="text-[20px] font-bold text-zinc-100 tabular-nums">
        {typeof last === "number" ? formatPoint(last) : "—"}
      </div>
      <div className="text-[10px] text-zinc-500 mb-2">{unit}</div>
      <Sparkline points={points} inverse={deltaInverse} />
    </div>
  );
}

function Sparkline({ points, inverse }: { points: Array<number | null>; inverse: boolean }) {
  const valid = points.filter((p): p is number => typeof p === "number");
  if (valid.length < 2) {
    return <div className="h-[24px] flex items-center text-[10px] text-zinc-600">not enough data</div>;
  }
  const w = 100;
  const h = 24;
  const max = Math.max(...valid);
  const min = Math.min(...valid);
  const range = max - min || 1;
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  const yFor = (v: number | null) => (v === null ? null : h - ((v - min) / range) * h);

  // Build path with breaks where data is missing.
  let path = "";
  let first = true;
  points.forEach((v, i) => {
    const y = yFor(v);
    if (y === null) {
      first = true;
      return;
    }
    path += `${first ? "M" : "L"}${(i * step).toFixed(1)},${y.toFixed(1)} `;
    first = false;
  });

  // Stroke color: improving = green, regressing = red, mixed = neutral.
  const firstVal = valid[0];
  const lastVal = valid[valid.length - 1];
  const delta = lastVal - firstVal;
  const improving = inverse ? delta < 0 : delta > 0;
  const stroke = Math.abs(delta) < 0.01 ? "#52525b" : improving ? "#7CB342" : "#f87171";

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="block">
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}
