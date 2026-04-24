"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, MessageSquare, PenTool, Loader2, Zap, Clock, AlertCircle, Pin, PinOff, Activity } from "lucide-react";
import { useState, useMemo } from "react";
import type { QueryVolatility } from "@/lib/agents/volatility";

interface Props {
  aiVisResult: any;
  companyName: string;
  city: string;
  onFixQuery?: (query: string) => void;
  onFixAll?: () => void;
  isFixing?: boolean;
  articleCost?: number;
  bulkFixCost?: number;
  lastScanDate?: string;
  /** User-pinned queries — these are tracked every scan and get a dedicated section. */
  goldenPrompts?: string[];
  /** Per-query score history + stddev across recent scans. Enables sparklines + stability labels. */
  volatility?: QueryVolatility[];
  onPinQuery?: (query: string) => void;
  onUnpinQuery?: (query: string) => void;
}

const GOLDEN_MAX = 20;

function Sparkline({ points, label }: { points: number[]; label: "stable" | "moderate" | "volatile" | "insufficient-data" }) {
  if (!points || points.length === 0) {
    return <div className="w-[80px] h-[18px] flex items-center text-[10px] text-zinc-600">—</div>;
  }
  const w = 80;
  const h = 18;
  const max = 100;
  const min = 0;
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  const y = (v: number) => h - ((v - min) / (max - min)) * h;
  const path = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const stroke =
    label === "volatile" ? "#f87171" : label === "moderate" ? "#fbbf24" : label === "stable" ? "#7CB342" : "#52525b";
  const last = points[points.length - 1];
  return (
    <svg width={w} height={h} className="flex-shrink-0" aria-hidden>
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" />
      {points.length > 0 && (
        <circle cx={(points.length - 1) * step} cy={y(last)} r="1.8" fill={stroke} />
      )}
    </svg>
  );
}

function StabilityBadge({ v }: { v: QueryVolatility }) {
  if (v.label === "insufficient-data") {
    return (
      <Badge className="text-[10px] bg-zinc-800 text-zinc-500 border-0 rounded-md h-5 px-1.5">
        {v.history.length}/3 runs
      </Badge>
    );
  }
  const styles = {
    stable: "bg-[#7CB342]/10 text-[#7CB342]",
    moderate: "bg-amber-500/10 text-amber-400",
    volatile: "bg-red-500/10 text-red-400",
  } as const;
  return (
    <Badge className={`text-[10px] border-0 rounded-md h-5 px-1.5 ${styles[v.label]}`}>
      {v.label} · ±{Math.round(v.stddev)}pp
    </Badge>
  );
}

export function PromptVolumes({
  aiVisResult,
  companyName,
  city,
  onFixQuery,
  onFixAll,
  isFixing,
  articleCost = 5,
  bulkFixCost = 15,
  lastScanDate,
  goldenPrompts = [],
  volatility = [],
  onPinQuery,
  onUnpinQuery,
}: Props) {
  const [fixingQuery, setFixingQuery] = useState<string | null>(null);

  // Fast lookups used throughout the render tree
  const pinnedSet = useMemo(() => new Set(goldenPrompts.map((q) => q.trim().toLowerCase())), [goldenPrompts]);
  const volatilityByQuery = useMemo(() => {
    const m = new Map<string, QueryVolatility>();
    for (const v of volatility) m.set(v.query.trim().toLowerCase(), v);
    return m;
  }, [volatility]);

  const isPinned = (q: string) => pinnedSet.has(q.trim().toLowerCase());
  const canPinMore = pinnedSet.size < GOLDEN_MAX;

  if (!aiVisResult) return null;

  const totalQueries = aiVisResult.queryResults?.length || 0;
  if (totalQueries === 0) return null;

  const chatgptMentions = aiVisResult.queryResults?.filter((q: any) => q.chatgpt?.mentioned).length || 0;
  const googleAIMentions = aiVisResult.queryResults?.filter((q: any) => q.gemini?.mentioned).length || 0;

  const mentionedQueries = aiVisResult.queryResults?.filter(
    (q: any) => q.chatgpt?.mentioned || q.gemini?.mentioned
  ).length || 0;

  const missingQueries = totalQueries - mentionedQueries;
  const mentionRate = Math.round((mentionedQueries / totalQueries) * 100);

  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  for (const q of aiVisResult.queryResults || []) {
    for (const llm of [q.chatgpt, q.gemini]) {
      if (llm?.mentioned) {
        if (llm.sentiment === "positive") positiveCount++;
        else if (llm.sentiment === "negative") negativeCount++;
        else neutralCount++;
      }
    }
  }

  const totalMentions = positiveCount + negativeCount + neutralCount;
  const sentimentLabel = totalMentions === 0 ? "No data" :
    positiveCount > negativeCount ? "Positive" :
    negativeCount > positiveCount ? "Negative" : "Neutral";
  const sentimentColor = totalMentions === 0 ? "text-zinc-500" :
    positiveCount > negativeCount ? "text-[#7CB342]" :
    negativeCount > positiveCount ? "text-red-400" : "text-zinc-400";

  // Get ALL missing queries (not just 5)
  const missingQueriesList = (aiVisResult.queryResults || [])
    .filter((q: any) => !q.chatgpt?.mentioned && !q.gemini?.mentioned)
    .map((q: any) => q.query);

  // Staleness detection
  const daysSinceScan = lastScanDate ? Math.floor((Date.now() - new Date(lastScanDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const isStale = daysSinceScan >= 7;
  const isVeryStale = daysSinceScan >= 14;

  return (
    <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
          <MessageSquare size={15} className="text-zinc-400" />
          AI Search Presence
          {lastScanDate && (
            <Badge className={`text-[10px] ml-auto border-0 rounded-md h-5 px-1.5 ${
              isVeryStale ? "bg-red-500/10 text-red-400" :
              isStale ? "bg-amber-500/10 text-amber-400" :
              "bg-zinc-800 text-zinc-500"
            }`}>
              <Clock size={10} className="inline mr-1" />
              {daysSinceScan === 0 ? "Just scanned" : `${daysSinceScan}d ago`}
            </Badge>
          )}
          {!lastScanDate && (
            <Badge className="text-[10px] bg-zinc-800 text-zinc-500 ml-auto border-0 rounded-md h-5 px-1.5">
              {totalQueries} queries
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stale scan warning — re-engagement trigger */}
        {isVeryStale && (
          <div className="p-3 rounded-lg bg-red-500/[0.04] border border-red-500/20 flex items-start gap-2.5">
            <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[12px] font-semibold text-red-400">Scan is {daysSinceScan} days old</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">AI answers drift 40-60% per month. Re-scan to see what changed — competitors may have overtaken you.</div>
            </div>
          </div>
        )}
        {isStale && !isVeryStale && (
          <div className="p-3 rounded-lg bg-amber-500/[0.04] border border-amber-500/20 flex items-start gap-2.5">
            <Clock size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[12px] font-semibold text-amber-400">Data getting stale ({daysSinceScan} days old)</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Fresh content you published may already be indexed. Re-scan to see progress.</div>
            </div>
          </div>
        )}

        {/* Core metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3.5 rounded-xl bg-zinc-800/40 border border-white/[0.04]">
            <div className={`text-2xl font-bold tabular-nums ${mentionRate > 50 ? "text-[#7CB342]" : mentionRate > 20 ? "text-amber-400" : "text-red-400"}`}>
              {mentionRate}%
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-medium">Mention rate</div>
            <div className="text-[10px] text-zinc-600">{mentionedQueries}/{totalQueries} queries</div>
          </div>

          <div className="text-center p-3.5 rounded-xl bg-zinc-800/40 border border-white/[0.04]">
            <div className="flex items-center justify-center gap-1">
              {sentimentLabel === "Positive" ? <TrendingUp size={15} className="text-[#7CB342]" /> :
               sentimentLabel === "Negative" ? <TrendingDown size={15} className="text-red-400" /> :
               <Minus size={15} className="text-zinc-400" />}
            </div>
            <div className={`text-lg font-bold mt-1 ${sentimentColor}`}>{sentimentLabel}</div>
            <div className="text-[10px] text-zinc-600">{totalMentions} mentions</div>
          </div>

          <div className="text-center p-3.5 rounded-xl bg-zinc-800/40 border border-white/[0.04]">
            <div className={`text-2xl font-bold tabular-nums ${missingQueries === 0 ? "text-[#7CB342]" : "text-red-400"}`}>
              {missingQueries}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-medium">Blind spots</div>
            <div className="text-[10px] text-zinc-600">out of {totalQueries}</div>
          </div>
        </div>

        {/* Platform breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-800/40 border border-white/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300">C</div>
                <span className="text-[13px] text-zinc-300 font-medium">ChatGPT</span>
              </div>
              <span className={`text-[10px] ${chatgptMentions / totalQueries >= 0.5 ? "text-[#7CB342]" : chatgptMentions / totalQueries >= 0.2 ? "text-amber-400" : "text-red-400"}`}>
                {Math.round((chatgptMentions / totalQueries) * 100)}%
              </span>
            </div>
            <div className={`text-xl font-bold tabular-nums ${chatgptMentions > 0 ? "text-zinc-200" : "text-zinc-600"}`}>
              {chatgptMentions}/{totalQueries}
            </div>
            <div className="w-full h-1 rounded-full bg-zinc-800 mt-2 overflow-hidden">
              <div className="h-full rounded-full bg-[#7CB342] transition-all duration-500" style={{ width: `${(chatgptMentions / totalQueries) * 100}%` }} />
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-800/40 border border-white/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300">G</div>
                <span className="text-[13px] text-zinc-300 font-medium">Google AI</span>
              </div>
              {googleAIMentions > 0 && (
                <span className={`text-[10px] ${googleAIMentions / totalQueries >= 0.5 ? "text-[#7CB342]" : googleAIMentions / totalQueries >= 0.2 ? "text-amber-400" : "text-red-400"}`}>
                  {Math.round((googleAIMentions / totalQueries) * 100)}%
                </span>
              )}
            </div>
            <div className={`text-xl font-bold tabular-nums ${googleAIMentions > 0 ? "text-zinc-200" : "text-zinc-600"}`}>
              {googleAIMentions > 0 ? `${googleAIMentions}/${totalQueries}` : "—"}
            </div>
            {googleAIMentions > 0 ? (
              <div className="w-full h-1 rounded-full bg-zinc-800 mt-2 overflow-hidden">
                <div className="h-full rounded-full bg-[#7CB342] transition-all duration-500" style={{ width: `${(googleAIMentions / totalQueries) * 100}%` }} />
              </div>
            ) : (
              <div className="text-[10px] text-zinc-600 mt-1">Add Gemini key to enable</div>
            )}
          </div>
        </div>

        {/* Golden Prompts — user-locked queries tracked every scan. These show
            volatility + delta across runs so drift reads as signal vs noise.
            Foundation's GEO research: AI visibility swings 20-30% baseline
            between runs; without a fixed prompt set, there's no way to tell
            a real regression from noise. */}
        {(goldenPrompts.length > 0 || volatility.length > 0) && (
          <div className="rounded-xl bg-zinc-800/30 border border-white/[0.04] overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.04]">
              <Pin size={12} className="text-zinc-400" />
              <span className="text-[12px] font-semibold text-zinc-200">Golden prompts</span>
              <Badge className="text-[10px] bg-zinc-800 text-zinc-500 border-0 rounded-md h-5 px-1.5">
                {pinnedSet.size}/{GOLDEN_MAX}
              </Badge>
              <span className="text-[10px] text-zinc-500 ml-auto">
                {volatility.length >= 3
                  ? `Stability tracked across last ${Math.min(volatility[0]?.history?.length || 0, 10)} scans`
                  : "Pin up to 20 queries — volatility unlocks after 3 scans"}
              </span>
            </div>

            {goldenPrompts.length === 0 ? (
              <div className="p-4 text-[11px] text-zinc-500 leading-relaxed">
                You haven&apos;t pinned any queries yet. Click the pin icon next to a query in your scan results to track it every run — this is how you separate real regressions from the 20-30% noise floor that hits every AI-visibility run.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {goldenPrompts.map((q, i) => {
                  const v = volatilityByQuery.get(q.trim().toLowerCase());
                  const history = v?.history || [];
                  const scores = history.map((h) => h.score);
                  const current = v?.current ?? 0;
                  const delta = v?.lastDelta ?? 0;
                  return (
                    <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
                      <span className="text-zinc-600 text-[10px] tabular-nums w-5 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-zinc-200 truncate" title={q}>&ldquo;{q}&rdquo;</div>
                      </div>
                      <Sparkline points={scores} label={v?.label || "insufficient-data"} />
                      <div className="text-right w-16 flex-shrink-0">
                        <div className={`text-[13px] font-semibold tabular-nums ${current >= 50 ? "text-[#7CB342]" : current >= 20 ? "text-amber-400" : "text-red-400"}`}>
                          {current}%
                        </div>
                        {v && v.history.length >= 2 && (
                          <div className={`text-[10px] tabular-nums ${delta > 0 ? "text-[#7CB342]" : delta < 0 ? "text-red-400" : "text-zinc-500"}`}>
                            {delta > 0 ? "+" : ""}{delta}pp
                          </div>
                        )}
                      </div>
                      {v && <StabilityBadge v={v} />}
                      {onUnpinQuery && (
                        <button
                          onClick={() => onUnpinQuery(q)}
                          className="text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0 p-1 rounded hover:bg-red-500/10"
                          title="Unpin"
                        >
                          <PinOff size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* All queries — compact list with pin buttons so user can
            promote any scanned query into their golden set. Only shows
            when there's an active scan + onPinQuery callback wired. */}
        {onPinQuery && totalQueries > 0 && (
          <div className="rounded-xl bg-zinc-800/20 border border-white/[0.04] overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.04]">
              <Activity size={12} className="text-zinc-400" />
              <span className="text-[12px] font-semibold text-zinc-200">All queries · this scan</span>
              <span className="text-[10px] text-zinc-500 ml-auto">
                Pin the ones that matter — they&apos;ll show up in Golden prompts every run
              </span>
            </div>
            <div className="divide-y divide-white/[0.04] max-h-[320px] overflow-y-auto">
              {(aiVisResult.queryResults || []).map((qr: any, i: number) => {
                const q = qr.query;
                const mentioned = qr.chatgpt?.mentioned || qr.gemini?.mentioned;
                const pinned = isPinned(q);
                const v = volatilityByQuery.get(q.trim().toLowerCase());
                return (
                  <div key={i} className="flex items-center gap-2 px-3.5 py-2 hover:bg-white/[0.02] transition-colors">
                    <span className={`text-[10px] tabular-nums w-5 flex-shrink-0 ${mentioned ? "text-[#7CB342]/60" : "text-red-500/60"}`}>
                      {mentioned ? "●" : "○"}
                    </span>
                    <span className="text-[12px] text-zinc-300 flex-1 truncate" title={q}>&ldquo;{q}&rdquo;</span>
                    {v && v.history.length >= 2 && (
                      <Sparkline points={v.history.map((h) => h.score)} label={v.label} />
                    )}
                    <button
                      onClick={() => (pinned ? onUnpinQuery?.(q) : onPinQuery(q))}
                      disabled={!pinned && !canPinMore}
                      className={`p-1 rounded transition-colors flex-shrink-0 ${
                        pinned
                          ? "text-[#7CB342] hover:bg-[#7CB342]/10"
                          : canPinMore
                          ? "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
                          : "text-zinc-700 cursor-not-allowed"
                      }`}
                      title={pinned ? "Unpin" : canPinMore ? "Pin to Golden prompts" : `Max ${GOLDEN_MAX} pinned — unpin one first`}
                    >
                      {pinned ? <Pin size={12} /> : <Pin size={12} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic blind spots list — ALL queries, each with fix action */}
        {missingQueriesList.length > 0 && (
          <div className="rounded-xl bg-red-500/[0.03] border border-red-500/15 overflow-hidden">
            <div className="p-3.5 border-b border-red-500/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] text-red-300 font-semibold">
                    {companyName || "Your brand"} is invisible for {missingQueries} {missingQueries === 1 ? "query" : "queries"}
                    {city ? ` in ${city}` : ""}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Buyers asking these questions get recommended to your competitors</p>
                </div>
                {onFixAll && missingQueries > 1 && (
                  <button
                    onClick={onFixAll}
                    disabled={isFixing}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-md bg-[#7CB342] text-zinc-900 hover:bg-[#8BC34A] active:scale-[0.97] transition-all disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
                  >
                    {isFixing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    Fix All
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {missingQueriesList.map((query: string, i: number) => (
                <div key={i} className="flex items-center gap-2 px-3.5 py-2 hover:bg-red-500/[0.05] transition-colors border-b border-red-500/[0.06] last:border-b-0">
                  <span className="text-red-500/60 text-[10px] tabular-nums w-5 flex-shrink-0">{i + 1}</span>
                  <span className="text-[12px] text-zinc-300 flex-1 truncate">&ldquo;{query}&rdquo;</span>
                  {onFixQuery && (
                    <button
                      onClick={() => { setFixingQuery(query); onFixQuery(query); }}
                      disabled={isFixing && fixingQuery === query}
                      className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#7CB342]/10 text-[#7CB342] border border-[#7CB342]/20 hover:bg-[#7CB342]/20 active:scale-[0.97] transition-all disabled:opacity-40 flex items-center gap-1 flex-shrink-0"
                    >
                      {isFixing && fixingQuery === query ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <><PenTool size={10} /> Fix</>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="p-2.5 bg-zinc-900/40 border-t border-red-500/10">
              <p className="text-[11px] text-zinc-500">
                Each &ldquo;Fix&rdquo; generates a GEO-optimized article targeting that exact query. Publish it to your site, then re-scan to watch the number go down.
              </p>
            </div>
          </div>
        )}

        {/* Co-citations: show which competitors AI IS recommending */}
        {mentionedQueries < totalQueries && aiVisResult.queryResults?.some((q: any) => q.chatgpt?.coCitations?.length || q.gemini?.coCitations?.length) && (
          <div className="p-3 rounded-lg bg-zinc-800/40 border border-white/[0.04]">
            <div className="text-[12px] font-semibold text-zinc-300 mb-2">Who AI recommends instead</div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set(
                (aiVisResult.queryResults || []).flatMap((q: any) =>
                  [...(q.chatgpt?.coCitations || []), ...(q.gemini?.coCitations || [])]
                )
              )).slice(0, 10).map((comp: any, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px] border-zinc-700/50 text-zinc-400 rounded-md">
                  {comp}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
