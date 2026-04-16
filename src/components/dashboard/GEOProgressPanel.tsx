"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Eye, EyeOff, BarChart3, ArrowRight, PenTool, Loader2, Zap, Clock } from "lucide-react";
import { GEOProgress, formatScanDate } from "@/lib/geoHistory";

interface Props {
  progress: GEOProgress;
  onWriteArticleForQuery?: (query: string) => void;
  onFixAllBlindSpots?: () => void;
  isGenerating?: boolean;
  articleCost?: number;
  bulkFixCost?: number;
}

function MentionTrendChart({ scans }: { scans: { date: string; rate: number }[] }) {
  if (scans.length < 2) return null;
  const width = 280;
  const height = 56;
  const padding = 4;
  const max = 100;

  const points = scans.map((s, i) => {
    const x = padding + (i / (scans.length - 1)) * (width - padding * 2);
    const y = height - padding - (s.rate / max) * (height - padding * 2);
    return { x, y, rate: s.rate, date: s.date };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x},${height - padding} L ${points[0].x},${height - padding} Z`;

  return (
    <svg width={width} height={height} className="w-full">
      <defs>
        <linearGradient id="geoGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7CB342" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#7CB342" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#geoGradient)" />
      <path d={linePath} fill="none" stroke="#7CB342" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#0a0a0b" stroke="#7CB342" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

export function GEOProgressPanel({ progress, onWriteArticleForQuery, onFixAllBlindSpots, isGenerating, articleCost = 5, bulkFixCost = 15 }: Props) {
  if (!progress.currentScan) return null;

  const { currentScan, previousScan, allScans, mentionRate, previousMentionRate, mentionRateChange, newlyFound, newlyLost, neverFound, trajectory, daysSinceLastScan, isStale, isVeryStale, weeklyScan, weeklyMentionRateChange, weeklyNewlyFound, weeklyNewlyLost, perCityBreakdown } = progress;

  const trendScans = allScans.map((s) => ({
    date: formatScanDate(s.timestamp),
    rate: s.totalQueries > 0 ? Math.round((s.mentionedCount / s.totalQueries) * 100) : 0,
  }));

  const TrajectoryIcon = trajectory === "improving" ? TrendingUp : trajectory === "declining" ? TrendingDown : Minus;
  const trajectoryColor = trajectory === "improving" ? "text-[#7CB342]" : trajectory === "declining" ? "text-red-400" : "text-zinc-500";
  const trajectoryBg = trajectory === "improving" ? "bg-[#7CB342]/10" : trajectory === "declining" ? "bg-red-500/10" : "bg-zinc-800";

  return (
    <div className="space-y-4">
      {/* Stale scan banner — re-engagement trigger */}
      {isVeryStale && (
        <Card className="bg-red-500/[0.04] border-red-500/20 rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock size={16} className="text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-red-400">Your scan is {daysSinceLastScan} days old</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">AI answers drift 40-60% per month. Re-scan to see if competitors overtook you on queries where you were winning.</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header card — the big number */}
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardContent className="p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <BarChart3 size={15} className="text-[#7CB342]" />
            <h4 className="text-[14px] font-semibold text-zinc-100">GEO Visibility Progress</h4>
            {isStale && !isVeryStale && (
              <Badge className="text-[10px] bg-amber-500/10 text-amber-400 border-0 rounded-md h-5 px-1.5">
                <Clock size={10} className="inline mr-1" />{daysSinceLastScan}d stale
              </Badge>
            )}
            {allScans.length > 1 && (
              <Badge className={`text-[10px] ${isStale ? "" : "ml-auto"} border-0 rounded-md h-5 px-1.5 ${trajectoryBg} ${trajectoryColor}`}>
                <TrajectoryIcon size={11} className="inline mr-0.5" />
                {trajectory === "improving" ? "Improving" : trajectory === "declining" ? "Declining" : "Stable"}
              </Badge>
            )}
          </div>

          {/* Weekly delta row — shows progress over the last 7 days specifically */}
          {weeklyScan && (
            <div className="mb-4 p-3 rounded-lg bg-zinc-800/40 border border-white/[0.04]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">This week</span>
                  <span className={`text-[13px] font-bold tabular-nums ${weeklyMentionRateChange > 0 ? "text-[#7CB342]" : weeklyMentionRateChange < 0 ? "text-red-400" : "text-zinc-400"}`}>
                    {weeklyMentionRateChange > 0 ? "+" : ""}{weeklyMentionRateChange}%
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  {weeklyNewlyFound.length > 0 && (
                    <span className="text-[#7CB342]">+{weeklyNewlyFound.length} won</span>
                  )}
                  {weeklyNewlyLost.length > 0 && (
                    <span className="text-red-400">-{weeklyNewlyLost.length} lost</span>
                  )}
                  {weeklyNewlyFound.length === 0 && weeklyNewlyLost.length === 0 && (
                    <span className="text-zinc-500">No changes</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-zinc-100 tabular-nums">{currentScan.mentionedCount}</span>
                <span className="text-lg text-zinc-500">/ {currentScan.totalQueries}</span>
              </div>
              <p className="text-[13px] text-zinc-400 mt-1">queries mention your brand in AI search</p>
              {previousScan && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={`text-[13px] font-medium ${mentionRateChange > 0 ? "text-[#7CB342]" : mentionRateChange < 0 ? "text-red-400" : "text-zinc-500"}`}>
                    {mentionRateChange > 0 ? "+" : ""}{mentionRateChange}%
                  </span>
                  <span className="text-[12px] text-zinc-500">vs last scan ({previousMentionRate}% → {mentionRate}%)</span>
                </div>
              )}
              {!previousScan && (
                <p className="text-[12px] text-zinc-500 mt-2">Run another scan after making changes to track progress</p>
              )}
            </div>

            {/* Mini trend chart */}
            {trendScans.length >= 2 && (
              <div className="w-[140px]">
                <MentionTrendChart scans={trendScans} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Per-city breakdown — for multi-city developers */}
      {perCityBreakdown && perCityBreakdown.length > 1 && (
        <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <BarChart3 size={14} className="text-zinc-400" />
              <h4 className="text-[13px] font-semibold text-zinc-200">Per-City Visibility</h4>
              <Badge className="text-[10px] bg-zinc-800 text-zinc-500 ml-auto border-0 rounded-md h-5 px-1.5">
                {perCityBreakdown.length} cities
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500 mb-3">Breakdown of AI visibility across every city you operate in</p>
            <div className="space-y-2">
              {perCityBreakdown.map((cityData) => {
                const rateColor = cityData.mentionRate >= 50 ? "text-[#7CB342]" : cityData.mentionRate >= 20 ? "text-amber-400" : "text-red-400";
                const barColor = cityData.mentionRate >= 50 ? "bg-[#7CB342]" : cityData.mentionRate >= 20 ? "bg-amber-500" : "bg-red-500";
                return (
                  <div key={cityData.city} className="p-3 rounded-lg bg-zinc-800/40 border border-white/[0.04]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-zinc-200">{cityData.city}</span>
                        <Badge className="text-[10px] bg-zinc-800 text-zinc-500 border-0 rounded-md h-5 px-1.5">
                          {cityData.totalQueries} queries
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] font-bold tabular-nums ${rateColor}`}>
                          {cityData.mentionedCount}/{cityData.totalQueries}
                        </span>
                        <span className={`text-[11px] tabular-nums ${rateColor}`}>
                          ({cityData.mentionRate}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${cityData.mentionRate}%` }} />
                    </div>
                    {cityData.missingQueries.length > 0 && (
                      <div className="text-[10px] text-zinc-500 mt-1.5">
                        {cityData.missingQueries.length} blind spot{cityData.missingQueries.length !== 1 ? "s" : ""} in {cityData.city}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Newly found — the dopamine hit */}
      {newlyFound.length > 0 && (
        <Card className="bg-[#7CB342]/[0.04] border-[#7CB342]/20 rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={14} className="text-[#7CB342]" />
              <h4 className="text-[13px] font-semibold text-[#7CB342]">Newly Visible ({newlyFound.length})</h4>
            </div>
            <div className="space-y-1.5">
              {newlyFound.map((q, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  <ArrowRight size={11} className="text-[#7CB342] flex-shrink-0" />
                  <span className="text-zinc-300">"{q}"</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 mt-3">AI models now recommend you for these searches</p>
          </CardContent>
        </Card>
      )}

      {/* Newly lost — urgent attention */}
      {newlyLost.length > 0 && (
        <Card className="bg-red-500/[0.04] border-red-500/20 rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <EyeOff size={14} className="text-red-400" />
              <h4 className="text-[13px] font-semibold text-red-400">Lost Visibility ({newlyLost.length})</h4>
            </div>
            <div className="space-y-1.5">
              {newlyLost.map((q, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  <ArrowRight size={11} className="text-red-400 flex-shrink-0" />
                  <span className="text-zinc-400">"{q}"</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 mt-3">Competitors may have overtaken you on these queries</p>
          </CardContent>
        </Card>
      )}

      {/* Query-level detail — per-query breakdown */}
      {currentScan.queries.length > 0 && (
        <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
          <CardContent className="p-5">
            <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Query-by-Query Breakdown</h4>
            <div className="space-y-1">
              {currentScan.queries.map((q, i) => {
                const found = q.chatgpt.mentioned || q.gemini.mentioned;
                const platforms: string[] = [];
                if (q.chatgpt.mentioned) platforms.push("ChatGPT");
                if (q.gemini.mentioned) platforms.push("Gemini");

                // Check if this was newly found
                const wasNew = newlyFound.some((nf) => nf.toLowerCase() === q.query.toLowerCase());

                return (
                  <div key={i} className={`flex items-center justify-between py-2 text-[12px] rounded-lg ${
                    wasNew ? "bg-[#7CB342]/[0.04] -mx-2 px-2" :
                    !found ? "bg-red-500/[0.02] -mx-2 px-2" : "-mx-2 px-2"
                  }`}>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${found ? "bg-[#7CB342]" : "bg-red-400"}`} />
                      <span className={`truncate ${found ? "text-zinc-300" : "text-zinc-500"}`}>"{q.query}"</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {platforms.length > 0 ? (
                        platforms.map((p) => (
                          <Badge key={p} className="text-[9px] h-4 px-1.5 rounded bg-[#7CB342]/10 text-[#7CB342] border-0">
                            {p}
                          </Badge>
                        ))
                      ) : (
                        <>
                          <span className="text-[11px] text-zinc-600">Not found</span>
                          {onWriteArticleForQuery && (
                            <button
                              onClick={() => onWriteArticleForQuery(q.query)}
                              disabled={isGenerating}
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#7CB342]/10 text-[#7CB342] border border-[#7CB342]/20 hover:bg-[#7CB342]/20 active:scale-[0.97] transition-all disabled:opacity-40"
                            >
                              {isGenerating ? <Loader2 size={10} className="animate-spin" /> : <><PenTool size={9} className="inline mr-0.5" />{articleCost}cr Fix</>}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Never found — the opportunity gap */}
      {neverFound.length > 0 && allScans.length >= 2 && (
        <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[13px] font-semibold text-zinc-300">Persistent Blind Spots ({neverFound.length})</h4>
              {onFixAllBlindSpots && neverFound.length > 0 && (
                <button
                  onClick={onFixAllBlindSpots}
                  disabled={isGenerating}
                  className="text-[11px] font-medium px-3 py-1.5 rounded-md bg-[#7CB342] text-zinc-900 hover:bg-[#8BC34A] active:scale-[0.97] transition-all disabled:opacity-40 flex items-center gap-1.5"
                >
                  {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                  Fix All ({bulkFixCost}cr)
                </button>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mb-3">Your brand has never appeared for these queries across {allScans.length} scans.</p>
            <div className="flex flex-wrap gap-1.5">
              {neverFound.slice(0, 10).map((q, i) => (
                <Badge key={i} variant="outline" className="text-[10px] border-red-500/20 text-red-400/80 bg-red-500/[0.04] rounded-md">
                  {q}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan history timeline */}
      {allScans.length >= 2 && (
        <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
          <CardContent className="p-4">
            <h4 className="text-[13px] font-semibold text-zinc-300 mb-3">Scan History</h4>
            <div className="space-y-2">
              {allScans.slice(-6).reverse().map((scan, i) => {
                const rate = scan.totalQueries > 0 ? Math.round((scan.mentionedCount / scan.totalQueries) * 100) : 0;
                return (
                  <div key={scan.id} className="flex items-center justify-between text-[12px]">
                    <span className="text-zinc-500">{formatScanDate(scan.timestamp)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-300 tabular-nums">{scan.mentionedCount}/{scan.totalQueries}</span>
                      <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#7CB342] transition-all duration-500"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <span className="text-zinc-400 tabular-nums w-8 text-right">{rate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
