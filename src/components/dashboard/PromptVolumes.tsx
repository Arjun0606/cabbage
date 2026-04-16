"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, MessageSquare, PenTool, Loader2, Zap, Clock, AlertCircle } from "lucide-react";
import { useState } from "react";

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
}

export function PromptVolumes({ aiVisResult, companyName, city, onFixQuery, onFixAll, isFixing, articleCost = 5, bulkFixCost = 15, lastScanDate }: Props) {
  const [fixingQuery, setFixingQuery] = useState<string | null>(null);

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
                    Fix All ({bulkFixCost}cr)
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
                        <><PenTool size={10} />{articleCost}cr Fix</>
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
