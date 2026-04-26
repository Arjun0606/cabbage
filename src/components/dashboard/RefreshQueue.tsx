"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, AlertTriangle } from "lucide-react";

/**
 * Refresh queue — articles whose freshness score has dipped below the
 * threshold. Combines age (days since publish) with GSC click decay
 * (clicks last 14d vs days 14-28). Hidden when nothing needs refresh.
 *
 * onRefreshArticle wires through to the article-writer so the user can
 * regenerate in one click — credit-priced, so this card is a real
 * upsell surface.
 */

interface FreshnessItem {
  articleId: string;
  query: string;
  title: string | null;
  publishedAt: string;
  publishUrl: string | null;
  daysSincePublish: number;
  ageScore: number;
  decayScore: number | null;
  clickDecayPct: number | null;
  recentClicks: number | null;
  baselineClicks: number | null;
  freshness: number;
  needsRefresh: boolean;
  reason: string;
}

interface FreshnessResponse {
  articles: FreshnessItem[];
  summary: {
    total: number;
    refreshNeeded: number;
    avgFreshness: number;
    gscConnected: boolean;
  };
}

interface Props {
  companyId?: string;
  refetchKey?: unknown;
  onRefreshArticle?: (query: string) => void;
}

function freshnessColor(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

export function RefreshQueue({ companyId, refetchKey, onRefreshArticle }: Props) {
  const [data, setData] = useState<FreshnessResponse | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    fetch(`/api/article-freshness?companyId=${encodeURIComponent(companyId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        setData(json && typeof json === "object" && "articles" in json ? (json as FreshnessResponse) : null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, refetchKey]);

  if (!companyId) return null;
  if (!data || data.summary.refreshNeeded === 0) return null;

  const needsRefresh = data.articles.filter((a) => a.needsRefresh);

  return (
    <Card className="bg-zinc-900/60 border-zinc-800/50 rounded-xl">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <RefreshCw size={15} className="text-amber-400" />
              <h4 className="text-[13px] font-semibold text-zinc-200">Refresh queue</h4>
              <Badge className="bg-amber-500/15 text-amber-400 border-0 rounded-md text-[10px] h-5 px-1.5">
                {data.summary.refreshNeeded} need refresh
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Articles below freshness threshold — regenerate to recapture rankings
              {!data.summary.gscConnected && " (connect GSC for click-decay scoring)"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Avg freshness</div>
            <div className={`text-2xl font-bold tabular-nums ${freshnessColor(data.summary.avgFreshness)}`}>
              {data.summary.avgFreshness}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {needsRefresh.slice(0, 6).map((a) => (
            <div
              key={a.articleId}
              className="flex items-center gap-3 rounded-lg border border-zinc-800/50 bg-zinc-950/40 p-3"
            >
              <AlertTriangle size={14} className={`flex-shrink-0 ${freshnessColor(a.freshness)}`} />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] text-zinc-200 truncate">{a.title || a.query}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[11px] font-medium tabular-nums ${freshnessColor(a.freshness)}`}>
                    {a.freshness}
                  </span>
                  <Clock size={10} className="text-zinc-600" />
                  <span className="text-[11px] text-zinc-500 truncate">{a.reason}</span>
                </div>
                {a.clickDecayPct !== null && a.recentClicks !== null && a.baselineClicks !== null && (
                  <div className="text-[10px] text-zinc-600 mt-0.5">
                    {a.baselineClicks} → {a.recentClicks} clicks
                  </div>
                )}
              </div>
              {onRefreshArticle && (
                <Button
                  onClick={() => onRefreshArticle(a.query)}
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] px-2.5 border-zinc-700 hover:bg-zinc-800 flex-shrink-0"
                >
                  <RefreshCw size={10} className="mr-1" />
                  Refresh
                </Button>
              )}
            </div>
          ))}
        </div>

        {needsRefresh.length > 6 && (
          <p className="text-[11px] text-zinc-600">
            + {needsRefresh.length - 6} more articles need attention
          </p>
        )}
      </CardContent>
    </Card>
  );
}
