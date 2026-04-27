"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, CheckCircle2, Sparkles } from "lucide-react";

/**
 * Plan Match.
 *
 * Surfaces the smallest tier that fits the customer's actual portfolio
 * vs whatever they're currently on. Shown when the recommended plan is
 * higher than the current — turns "self-select a tier" (where most
 * prospects bounce) into "we computed Scale fits your portfolio". As
 * customers grow, this card becomes the upgrade nudge.
 *
 * Hidden when no upgrade is needed — silent success is fine.
 */

interface Reason {
  signal: string;
  observed: number;
  starterCap: number | "unlimited";
  starterFits: boolean;
  recommendedCap?: number;
}

interface Recommendation {
  currentPlan: "starter" | "pro" | "scale" | "trial" | "none";
  recommendedPlan: "starter" | "pro" | "scale";
  recommendedLabel: string;
  recommendedPriceInr: number;
  recommendedPriceUsd: number;
  shouldUpgrade: boolean;
  shouldDowngrade: boolean;
  reasons: Reason[];
  signals: {
    projects: number;
    cities: number;
    competitors: number;
    estimatedArticlesNeeded: number;
  };
}

interface Props {
  companyId?: string;
  refetchKey?: unknown;
  onChoosePlan?: (plan: string) => void;
}

const SIGNAL_LABEL: Record<string, string> = {
  projects: "Projects in portfolio",
  cities: "Cities served",
  competitors: "Competitors tracked",
  articles: "Articles needed / month",
};

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function PlanMatch({ companyId, refetchKey, onChoosePlan }: Props) {
  const [data, setData] = useState<Recommendation | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    fetch(`/api/plan-recommendation?companyId=${encodeURIComponent(companyId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        setData(json && typeof json === "object" && "recommendedPlan" in json ? (json as Recommendation) : null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, refetchKey]);

  if (!companyId || !data) return null;

  // Quiet when the customer is already on the right plan or above. No
  // need to clutter the dashboard with "you're correctly tiered" noise.
  if (!data.shouldUpgrade) return null;

  const isInitialPick = data.currentPlan === "none" || data.currentPlan === "trial";
  const headline = isInitialPick
    ? `${data.recommendedLabel} fits your portfolio`
    : `Time to upgrade to ${data.recommendedLabel}`;

  const sub = isInitialPick
    ? "Based on what we discovered — projects, cities, competitors, and the article volume you'd need to close the AI visibility gap."
    : "Your portfolio has grown past your current plan's caps. Upgrade to keep every scan and article on cadence.";

  return (
    <Card className="bg-gradient-to-br from-emerald-500/[0.04] to-zinc-900/60 border-emerald-500/15 rounded-xl">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isInitialPick ? (
                <Sparkles size={15} className="text-emerald-400" />
              ) : (
                <ArrowUpCircle size={15} className="text-emerald-400" />
              )}
              <h4 className="text-[13px] font-semibold text-zinc-100">{headline}</h4>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-0 rounded-md text-[10px] h-5 px-1.5">
                Recommended
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500">{sub}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-bold text-zinc-100 tabular-nums">{formatINR(data.recommendedPriceInr)}</div>
            <div className="text-[10px] text-zinc-500">/ month</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {data.reasons.map((r) => {
            const label = SIGNAL_LABEL[r.signal] ?? r.signal;
            const exceedsStarter = !r.starterFits;
            return (
              <div
                key={r.signal}
                className="rounded-lg border border-zinc-800/50 bg-zinc-950/40 p-2.5"
              >
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg font-bold text-zinc-100 tabular-nums">{r.observed}</span>
                  {exceedsStarter && (
                    <span className="text-[10px] text-emerald-400">
                      &gt; Starter cap
                    </span>
                  )}
                  {!exceedsStarter && (
                    <span className="text-[10px] text-zinc-600">
                      Starter ok
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <CheckCircle2 size={11} className="text-emerald-400" />
            Auto-recomputed every scan — we&apos;ll nudge you again only if you outgrow this tier.
          </div>
          <Button
            onClick={() => {
              if (onChoosePlan) {
                onChoosePlan(data.recommendedPlan);
              } else if (typeof window !== "undefined") {
                window.location.href = `/pricing?plan=${data.recommendedPlan}`;
              }
            }}
            size="sm"
            className="h-8 text-[12px] bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold flex-shrink-0"
          >
            {isInitialPick ? `Start ${data.recommendedLabel}` : `Upgrade to ${data.recommendedLabel}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
