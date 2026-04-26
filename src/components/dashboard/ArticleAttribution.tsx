"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingDown, MinusCircle, FileText } from "lucide-react";

/**
 * Article Attribution.
 *
 * The "you wrote this, ChatGPT noticed" widget. Pulls the per-article
 * before/after mention deltas computed by /api/article-attribution and
 * surfaces the wins (and regressions). Quiet when there are no published
 * articles.
 */

type Outcome = "lifted" | "stable_mentioned" | "stable_absent" | "regressed" | "no_data";

interface Attribution {
  articleId: string;
  query: string;
  title: string | null;
  publishedAt: string;
  daysSincePublish: number;
  pre: { chatgpt: boolean; gemini: boolean; combined: boolean; capturedAt: string } | null;
  post: { chatgpt: boolean; gemini: boolean; combined: boolean; capturedAt: string } | null;
  outcome: Outcome;
}

interface AttributionResponse {
  attributions: Attribution[];
  summary: {
    total: number;
    lifted: number;
    regressed: number;
    stableMentioned: number;
    stableAbsent: number;
    noData: number;
  };
}

interface Props {
  companyId?: string;
  refetchKey?: unknown;
}

function OutcomeBadge({ outcome, daysSincePublish }: { outcome: Outcome; daysSincePublish: number }) {
  const ageLabel = daysSincePublish < 7 ? `${daysSincePublish}d` : `${Math.round(daysSincePublish / 7)}wk`;
  switch (outcome) {
    case "lifted":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border-0 rounded-md text-[10px] h-5 px-1.5">
          Lifted in {ageLabel}
        </Badge>
      );
    case "stable_mentioned":
      return (
        <Badge className="bg-zinc-800 text-zinc-300 border-0 rounded-md text-[10px] h-5 px-1.5">
          Cited
        </Badge>
      );
    case "stable_absent":
      return (
        <Badge className="bg-zinc-800 text-zinc-500 border-0 rounded-md text-[10px] h-5 px-1.5">
          Not yet
        </Badge>
      );
    case "regressed":
      return (
        <Badge className="bg-red-500/15 text-red-400 border-0 rounded-md text-[10px] h-5 px-1.5">
          Lost mention
        </Badge>
      );
    default:
      return (
        <Badge className="bg-zinc-800 text-zinc-500 border-0 rounded-md text-[10px] h-5 px-1.5">
          No data
        </Badge>
      );
  }
}

export function ArticleAttribution({ companyId, refetchKey }: Props) {
  const [data, setData] = useState<AttributionResponse | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    fetch(`/api/article-attribution?companyId=${encodeURIComponent(companyId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        setData(json && typeof json === "object" && "attributions" in json ? (json as AttributionResponse) : null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, refetchKey]);

  if (!companyId) return null;
  if (!data || data.attributions.length === 0) return null;

  const { summary, attributions } = data;
  const lifted = attributions.filter((a) => a.outcome === "lifted");
  const regressed = attributions.filter((a) => a.outcome === "regressed");
  const visibleAttributions = attributions.slice(0, 8);

  return (
    <Card className="bg-zinc-900/60 border-zinc-800/50 rounded-xl">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-zinc-100" />
              <h4 className="text-[13px] font-semibold text-zinc-200">Article impact</h4>
              <Badge className="bg-zinc-800 text-zinc-400 text-[10px] border-0 rounded-md h-5 px-1.5">
                {summary.total} published
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Before / after mention rate for each article&apos;s targeted query
            </p>
          </div>

          <div className="flex items-center gap-3">
            {summary.lifted > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                <Sparkles size={11} />
                <span className="font-medium">{summary.lifted} lifted</span>
              </div>
            )}
            {summary.regressed > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-red-400">
                <TrendingDown size={11} />
                <span className="font-medium">{summary.regressed} regressed</span>
              </div>
            )}
            {summary.lifted === 0 && summary.regressed === 0 && (
              <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                <MinusCircle size={11} />
                <span>No movement yet</span>
              </div>
            )}
          </div>
        </div>

        {(lifted.length > 0 || regressed.length > 0) && (
          <div className="grid gap-3">
            {lifted.slice(0, 3).map((a) => (
              <div key={a.articleId} className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] p-3">
                <div className="flex items-start gap-2">
                  <Sparkles size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-zinc-200 truncate">{a.title || a.query}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                      Query: <span className="text-zinc-400">{a.query}</span>
                    </div>
                    <div className="text-[10px] text-emerald-400/80 mt-1">
                      Wasn&apos;t cited before publish · cited now (after {a.daysSincePublish}d)
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {regressed.slice(0, 2).map((a) => (
              <div key={a.articleId} className="rounded-lg border border-red-500/15 bg-red-500/[0.04] p-3">
                <div className="flex items-start gap-2">
                  <TrendingDown size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-zinc-200 truncate">{a.title || a.query}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                      Query: <span className="text-zinc-400">{a.query}</span>
                    </div>
                    <div className="text-[10px] text-red-400/80 mt-1">
                      Was cited before · no longer cited (refresh recommended)
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-zinc-800/50 pt-3 space-y-1">
          {visibleAttributions.map((a) => (
            <div key={a.articleId} className="flex items-center gap-2 text-[12px]">
              <FileText size={11} className="text-zinc-600 flex-shrink-0" />
              <span className="text-zinc-300 truncate flex-1" title={a.query}>{a.title || a.query}</span>
              <OutcomeBadge outcome={a.outcome} daysSincePublish={a.daysSincePublish} />
            </div>
          ))}
          {attributions.length > visibleAttributions.length && (
            <p className="text-[11px] text-zinc-600 pt-1">
              + {attributions.length - visibleAttributions.length} more articles tracked
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
