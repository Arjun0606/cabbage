"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, ArrowRight, Clock, PenTool } from "lucide-react";

interface DecayingPage {
  url: string;
  currentPosition: number;
  previousPosition: number;
  positionDrop: number;
  currentClicks: number;
  previousClicks: number;
  clickDrop: number;
  severity: "critical" | "high" | "medium" | "low";
  daysSincePrevious: number;
}

interface ContentDecayReport {
  siteUrl: string;
  comparisonDays: number;
  decayingPages: DecayingPage[];
  risingPages: Array<{ url: string; currentPosition: number; previousPosition: number; positionGain: number }>;
  totalPagesCompared: number;
  newPages: string[];
}

interface Props {
  report: ContentDecayReport | null;
  snapshotCount: number;
  onRefreshPage?: (url: string) => void;
}

function severityColor(s: DecayingPage["severity"]): string {
  return s === "critical" ? "bg-red-500/10 text-red-400 border-red-500/20"
    : s === "high" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
    : s === "medium" ? "bg-zinc-700/40 text-zinc-400 border-zinc-700/50"
    : "bg-zinc-800 text-zinc-500 border-zinc-800";
}

function pathOf(url: string): string {
  try { return new URL(url).pathname; } catch { return url; }
}

export function ContentDecayPanel({ report, snapshotCount, onRefreshPage }: Props) {
  if (snapshotCount < 2) {
    return (
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardContent className="p-6 text-center">
          <Clock size={20} className="text-zinc-500 mx-auto mb-2" />
          <h3 className="text-[13px] font-semibold mb-1">Content decay — building baseline</h3>
          <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
            {snapshotCount === 0
              ? "Connect Google Search Console to start tracking per-page ranking history. Decay detection kicks in after 2+ snapshots."
              : `We have ${snapshotCount} snapshot${snapshotCount === 1 ? "" : "s"}. Check back tomorrow — we capture a new snapshot each time GSC data loads, and decay analysis runs once we have history.`}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!report || (report.decayingPages.length === 0 && report.risingPages.length === 0)) {
    return (
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardContent className="p-6 text-center">
          <TrendingUp size={20} className="text-[#7CB342] mx-auto mb-2" />
          <h3 className="text-[13px] font-semibold mb-1">No decay detected</h3>
          <p className="text-[11px] text-zinc-500">
            Your rankings are stable across {report?.totalPagesCompared || 0} pages over the last {report?.comparisonDays || 0} days.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Decaying pages */}
      {report.decayingPages.length > 0 && (
        <Card className="bg-red-500/[0.03] border-red-500/20 rounded-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <TrendingDown size={15} className="text-red-400" />
              <CardTitle className="text-[13px] font-semibold text-red-400">
                Declining Rankings ({report.decayingPages.length})
              </CardTitle>
              <Badge className="text-[10px] bg-zinc-800 text-zinc-500 border-0 rounded-md h-5 px-1.5 ml-auto">
                last {report.comparisonDays}d
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-zinc-500 mb-3">
              These pages have dropped in Google rankings — refresh the content before they fall further.
            </p>
            <div className="space-y-2">
              {report.decayingPages.slice(0, 15).map((p, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-zinc-800/40 border border-white/[0.04]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge className={`text-[9px] h-4 px-1.5 rounded border flex-shrink-0 ${severityColor(p.severity)}`}>
                      {p.severity}
                    </Badge>
                    <span className="text-[12px] text-zinc-300 truncate flex-1">{pathOf(p.url)}</span>
                    {onRefreshPage && (
                      <button
                        onClick={() => onRefreshPage(p.url)}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#7CB342]/10 text-[#7CB342] border border-[#7CB342]/20 hover:bg-[#7CB342]/20 flex items-center gap-0.5 flex-shrink-0"
                      >
                        <PenTool size={9} /> Refresh
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-zinc-500">Position:</span>
                    <span className="text-zinc-400 tabular-nums">#{Math.round(p.previousPosition)}</span>
                    <ArrowRight size={10} className="text-red-400" />
                    <span className="text-red-400 tabular-nums font-medium">#{Math.round(p.currentPosition)}</span>
                    <span className="text-zinc-600 text-[10px] tabular-nums">(+{p.positionDrop.toFixed(1)} drop)</span>
                    {p.clickDrop > 0 && (
                      <>
                        <span className="text-zinc-600 mx-1">•</span>
                        <span className="text-zinc-500">Clicks:</span>
                        <span className="text-red-400 tabular-nums">-{p.clickDrop}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rising pages — dopamine hit */}
      {report.risingPages.length > 0 && (
        <Card className="bg-[#7CB342]/[0.04] border-[#7CB342]/20 rounded-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <TrendingUp size={15} className="text-[#7CB342]" />
              <CardTitle className="text-[13px] font-semibold text-[#7CB342]">
                Rising Rankings ({report.risingPages.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {report.risingPages.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px] py-1">
                  <TrendingUp size={11} className="text-[#7CB342] flex-shrink-0" />
                  <span className="text-zinc-300 truncate flex-1">{pathOf(p.url)}</span>
                  <span className="text-zinc-500 tabular-nums text-[11px]">#{Math.round(p.previousPosition)}</span>
                  <ArrowRight size={10} className="text-[#7CB342]" />
                  <span className="text-[#7CB342] tabular-nums font-medium text-[11px]">#{Math.round(p.currentPosition)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
