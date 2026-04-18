"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Search, MousePointerClick, Eye, BarChart3, ExternalLink } from "lucide-react";

interface GSCQueryResult {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCPageResult {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCOverview {
  siteUrl: string;
  dateRange: { start: string; end: string };
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  topQueries: GSCQueryResult[];
  topPages: GSCPageResult[];
  queryTrends: { date: string; clicks: number; impressions: number }[];
}

interface Props {
  data: GSCOverview;
  /** Queries from the GEO scan — used to highlight overlap */
  geoQueries?: string[];
}

function MiniTrendChart({ trends }: { trends: { date: string; clicks: number }[] }) {
  if (trends.length < 3) return null;
  const width = 260;
  const height = 48;
  const pad = 4;
  const max = Math.max(...trends.map((t) => t.clicks), 1);

  const points = trends.map((t, i) => ({
    x: pad + (i / (trends.length - 1)) * (width - pad * 2),
    y: height - pad - (t.clicks / max) * (height - pad * 2),
  }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
  const area = `${line} L ${points[points.length - 1].x},${height - pad} L ${points[0].x},${height - pad} Z`;

  return (
    <svg width={width} height={height} className="w-full">
      <defs>
        <linearGradient id="gscGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#gscGrad)" />
      <path d={line} fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function positionColor(pos: number): string {
  if (pos <= 3) return "text-[#7CB342]";
  if (pos <= 10) return "text-blue-400";
  if (pos <= 20) return "text-amber-400";
  return "text-zinc-500";
}

function positionBadgeColor(pos: number): string {
  if (pos <= 3) return "bg-[#7CB342]/10 text-[#7CB342]";
  if (pos <= 10) return "bg-blue-500/10 text-blue-400";
  if (pos <= 20) return "bg-amber-500/10 text-amber-400";
  return "bg-zinc-800 text-zinc-500";
}

export function GSCPanel({ data, geoQueries }: Props) {
  const geoQuerySet = new Set((geoQueries || []).map((q) => q.toLowerCase()));

  // Identify "almost winning" queries — position 4-20, high impressions
  const almostWinning = data.topQueries
    .filter((q) => q.position > 3 && q.position <= 20 && q.impressions > 10)
    .sort((a, b) => a.position - b.position)
    .slice(0, 5);

  // Queries that overlap between GSC rankings and GEO scans
  const overlapping = data.topQueries.filter((q) =>
    geoQuerySet.has(q.query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <Search size={15} className="text-blue-400" />
            <CardTitle className="text-[14px] font-semibold">Google Search Performance</CardTitle>
            <Badge className="text-[10px] bg-zinc-800 text-zinc-500 ml-auto border-0 rounded-md h-5 px-1.5">
              {data.dateRange.start} → {data.dateRange.end}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Clicks", value: data.totalClicks.toLocaleString(), icon: MousePointerClick, color: "text-blue-400" },
              { label: "Impressions", value: data.totalImpressions.toLocaleString(), icon: Eye, color: "text-zinc-300" },
              { label: "Avg CTR", value: `${data.averageCtr}%`, icon: TrendingUp, color: data.averageCtr > 3 ? "text-[#7CB342]" : "text-amber-400" },
              { label: "Avg Position", value: data.averagePosition.toFixed(1), icon: BarChart3, color: positionColor(data.averagePosition) },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="p-3 rounded-lg bg-zinc-800/40 border border-white/[0.04]">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className={color} />
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</span>
                </div>
                <span className={`text-[18px] font-bold tabular-nums ${color}`}>{value}</span>
              </div>
            ))}
          </div>
          {data.queryTrends.length > 0 && (
            <div>
              <span className="text-[11px] text-zinc-500">Clicks over 30 days</span>
              <MiniTrendChart trends={data.queryTrends} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Almost winning — the GEO opportunity */}
      {almostWinning.length > 0 && (
        <Card className="bg-blue-500/[0.03] border-blue-500/20 rounded-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-400" />
              <CardTitle className="text-[13px] font-semibold text-blue-400">Almost Winning — Push Harder</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-zinc-500 mb-3">
              These queries get impressions but you&apos;re not in the top 3. Publishing GEO-optimized content can push these to position 1-3 where clicks multiply 5-10x.
            </p>
            <div className="space-y-1.5">
              {almostWinning.map((q) => (
                <div key={q.query} className="flex items-center justify-between py-1.5 text-[12px]">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge className={`text-[9px] h-4 px-1.5 rounded border-0 ${positionBadgeColor(q.position)}`}>
                      #{Math.round(q.position)}
                    </Badge>
                    <span className="text-zinc-300 truncate">&quot;{q.query}&quot;</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2 text-[11px]">
                    <span className="text-zinc-500">{q.impressions.toLocaleString()} imp</span>
                    <span className="text-blue-400">{q.clicks} clicks</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top ranking queries */}
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2.5">
            <BarChart3 size={14} className="text-zinc-400" />
            <CardTitle className="text-[13px] font-semibold">Top Ranking Queries</CardTitle>
            <Badge className="text-[10px] bg-zinc-800 text-zinc-500 ml-auto border-0 rounded-md h-5 px-1.5">
              {data.topQueries.length} queries
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-0.5">
            {data.topQueries.slice(0, 15).map((q) => {
              const isGeoTracked = geoQuerySet.has(q.query.toLowerCase());
              return (
                <div key={q.query} className={`flex items-center justify-between py-2 text-[12px] rounded-lg -mx-2 px-2 ${isGeoTracked ? "bg-[#7CB342]/[0.03]" : ""}`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge className={`text-[9px] h-4 px-1.5 rounded border-0 flex-shrink-0 ${positionBadgeColor(q.position)}`}>
                      #{Math.round(q.position)}
                    </Badge>
                    <span className="text-zinc-300 truncate">&quot;{q.query}&quot;</span>
                    {isGeoTracked && (
                      <Badge className="text-[8px] h-3.5 px-1 rounded bg-[#7CB342]/10 text-[#7CB342] border-0">GEO</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-2 text-[11px] tabular-nums">
                    <span className="text-zinc-500 w-14 text-right">{q.impressions.toLocaleString()} imp</span>
                    <span className="text-blue-400 w-10 text-right">{q.clicks} clk</span>
                    <span className="text-zinc-400 w-10 text-right">{q.ctr}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top pages */}
      {data.topPages.length > 0 && (
        <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-semibold">Top Pages by Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {data.topPages.slice(0, 8).map((p) => {
                const path = new URL(p.page).pathname;
                return (
                  <div key={p.page} className="flex items-center justify-between py-1.5 text-[12px]">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <ExternalLink size={10} className="text-zinc-600 flex-shrink-0" />
                      <span className="text-zinc-400 truncate">{path}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2 text-[11px] tabular-nums">
                      <span className="text-blue-400">{p.clicks} clicks</span>
                      <span className={positionColor(p.position)}>#{Math.round(p.position)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* GEO ↔ SEO overlap */}
      {overlapping.length > 0 && (
        <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px] font-semibold">GEO ↔ SEO Overlap</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-zinc-500 mb-3">
              Queries where you rank in both traditional Google search AND AI search. These are your strongest positions — defend them.
            </p>
            <div className="space-y-1.5">
              {overlapping.slice(0, 10).map((q) => (
                <div key={q.query} className="flex items-center justify-between py-1.5 text-[12px]">
                  <span className="text-zinc-300 truncate">&quot;{q.query}&quot;</span>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <Badge className="text-[9px] h-4 px-1.5 rounded bg-blue-500/10 text-blue-400 border-0">
                      Google #{Math.round(q.position)}
                    </Badge>
                    <Badge className="text-[9px] h-4 px-1.5 rounded bg-[#7CB342]/10 text-[#7CB342] border-0">
                      AI ✓
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
