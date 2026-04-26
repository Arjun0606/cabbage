"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Zap, AlertCircle } from "lucide-react";

/**
 * Usage Warning.
 *
 * Surfaces this month's article usage vs cap and the linear-pace
 * forecast. Designed to make Starter customers feel the cap before
 * they hit it — the upgrade nudge fires when forecast says "you'll
 * blow past your cap by day 22". Hidden when the customer is well
 * under pace (no point shouting "you've used 4/30").
 */

interface UsageResponse {
  plan: string;
  planLabel: string;
  articlesUsed: number;
  articlesCap: number;
  daysElapsed: number;
  daysInMonth: number;
  paceForecast: number;
  forecastExceedsCap: boolean;
  daysUntilCapHit: number | null;
  nextTier: string | null;
  nextTierLabel: string | null;
  nextTierCap: number | null;
  nextTierPriceInr: number | null;
}

interface Props {
  companyId?: string;
  refetchKey?: unknown;
}

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function UsageWarning({ companyId, refetchKey }: Props) {
  const [data, setData] = useState<UsageResponse | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    fetch(`/api/usage-summary?companyId=${encodeURIComponent(companyId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        setData(json && typeof json === "object" && "articlesCap" in json ? (json as UsageResponse) : null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, refetchKey]);

  if (!companyId || !data) return null;
  if (data.articlesCap <= 0) return null;

  const pct = Math.min(100, Math.round((data.articlesUsed / data.articlesCap) * 100));
  const usageHigh = pct >= 70 || data.forecastExceedsCap;

  // Quiet under 70% with a healthy pace. We only shout when the
  // customer is approaching a real ceiling.
  if (!usageHigh) return null;

  const tone = data.forecastExceedsCap ? "alert" : "warn";
  const borderClass =
    tone === "alert" ? "border-red-500/30" : "border-amber-500/30";
  const accentText =
    tone === "alert" ? "text-red-400" : "text-amber-400";
  const fillBg =
    tone === "alert" ? "bg-red-400" : "bg-amber-400";

  return (
    <Card className={`bg-zinc-900/60 rounded-xl ${borderClass}`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {data.forecastExceedsCap ? (
                <AlertCircle size={15} className={accentText} />
              ) : (
                <TrendingUp size={15} className={accentText} />
              )}
              <h4 className="text-[13px] font-semibold text-zinc-100">
                {data.forecastExceedsCap
                  ? "You're on pace to blow past your article cap"
                  : "Approaching your monthly article cap"}
              </h4>
              <Badge className="bg-zinc-800 text-zinc-400 border-0 rounded-md text-[10px] h-5 px-1.5">
                {data.planLabel}
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500">
              {data.forecastExceedsCap && data.nextTier
                ? `At today's pace you'll need ${data.paceForecast} articles this month — your ${data.planLabel} plan caps at ${data.articlesCap}. ${data.nextTierLabel} unlocks ${data.nextTierCap}.`
                : data.daysUntilCapHit !== null
                  ? `You'll hit your cap in roughly ${data.daysUntilCapHit} day${data.daysUntilCapHit === 1 ? "" : "s"} at this pace.`
                  : "Usage is climbing fast this month."}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className={`text-2xl font-bold tabular-nums ${accentText}`}>
              {data.articlesUsed}
              <span className="text-zinc-600 text-lg">/{data.articlesCap}</span>
            </div>
            <div className="text-[10px] text-zinc-500">articles this month</div>
          </div>
        </div>

        {/* Progress bar — shows current usage AND projected pace as a
            ghosted segment past it, so the user sees the trajectory */}
        <div className="space-y-1">
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
            <div
              className={`h-full transition-all duration-500 ${fillBg}`}
              style={{ width: `${pct}%` }}
            />
            {data.forecastExceedsCap && (
              <div
                className="h-full absolute top-0 bg-red-500/20 border-l border-red-500/40"
                style={{
                  left: `${pct}%`,
                  width: `${Math.min(100 - pct, Math.round(((data.paceForecast - data.articlesUsed) / data.articlesCap) * 100))}%`,
                }}
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-zinc-600">
            <span>{data.daysElapsed} of {data.daysInMonth} days elapsed</span>
            {data.forecastExceedsCap && (
              <span className="text-red-400">
                Pace forecast: {data.paceForecast} ({data.paceForecast - data.articlesCap > 0 ? "+" : ""}
                {data.paceForecast - data.articlesCap} over cap)
              </span>
            )}
          </div>
        </div>

        {data.nextTier && data.nextTierPriceInr && (
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-zinc-800/50">
            <div className="text-[12px] text-zinc-300">
              <span className="font-semibold text-zinc-100">{data.nextTierLabel}</span>{" "}
              <span className="text-zinc-500">— {data.nextTierCap} articles · {formatINR(data.nextTierPriceInr)}/mo</span>
            </div>
            <Button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = `/pricing?plan=${data.nextTier}`;
                }
              }}
              size="sm"
              className="h-8 text-[12px] bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold flex-shrink-0"
            >
              <Zap size={11} className="mr-1" />
              Upgrade to {data.nextTierLabel}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
