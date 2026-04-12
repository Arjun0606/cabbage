"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, MessageSquare } from "lucide-react";

interface Props {
  aiVisResult: any;
  companyName: string;
  city: string;
}

export function PromptVolumes({ aiVisResult, companyName, city }: Props) {
  if (!aiVisResult) return null;

  const totalQueries = aiVisResult.queryResults?.length || 0;
  if (totalQueries === 0) return null;

  const mentionedQueries = aiVisResult.queryResults?.filter(
    (q: any) => q.chatgpt?.mentioned || q.claude?.mentioned || q.perplexity?.mentioned || q.gemini?.mentioned
  ).length || 0;

  const missingQueries = totalQueries - mentionedQueries;
  const mentionRate = Math.round((mentionedQueries / totalQueries) * 100);

  const perLLM = {
    chatgpt: aiVisResult.queryResults?.filter((q: any) => q.chatgpt?.mentioned).length || 0,
    claude: aiVisResult.queryResults?.filter((q: any) => q.claude?.mentioned).length || 0,
    perplexity: aiVisResult.queryResults?.filter((q: any) => q.perplexity?.mentioned).length || 0,
    gemini: aiVisResult.queryResults?.filter((q: any) => q.gemini?.mentioned).length || 0,
  };

  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  for (const q of aiVisResult.queryResults || []) {
    for (const llm of [q.chatgpt, q.claude, q.perplexity, q.gemini]) {
      if (llm?.mentioned) {
        if (llm.sentiment === "positive") positiveCount++;
        else if (llm.sentiment === "negative") negativeCount++;
        else neutralCount++;
      }
    }
  }

  const totalMentions = positiveCount + negativeCount + neutralCount;
  const sentimentLabel = positiveCount > negativeCount ? "Positive" :
    negativeCount > positiveCount ? "Negative" : "Neutral";
  const sentimentColor = positiveCount > negativeCount ? "text-emerald-400" :
    negativeCount > positiveCount ? "text-red-400" : "text-zinc-400";

  const missingQueryList = (aiVisResult.queryResults || [])
    .filter((q: any) => !q.chatgpt?.mentioned && !q.claude?.mentioned && !q.perplexity?.mentioned && !q.gemini?.mentioned)
    .map((q: any) => q.query)
    .slice(0, 5);

  return (
    <Card className="bg-zinc-900/60 border-zinc-800/50 rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
          <MessageSquare size={15} className="text-violet-400" />
          AI Search Presence
          <Badge variant="secondary" className="text-[10px] bg-zinc-800/60 text-zinc-500 ml-auto border-0 rounded-md h-5 px-1.5">
            {totalQueries} queries tested
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Core metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-700/20">
            <div className={`text-2xl font-bold ${mentionRate > 50 ? "text-emerald-400" : mentionRate > 20 ? "text-yellow-400" : "text-red-400"}`}>
              {mentionRate}%
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-medium">Mention rate</div>
            <div className="text-[10px] text-zinc-600">{mentionedQueries}/{totalQueries} queries</div>
          </div>

          <div className="text-center p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-700/20">
            <div className="flex items-center justify-center gap-1">
              {positiveCount > negativeCount ? <TrendingUp size={15} className="text-emerald-400" /> :
               negativeCount > positiveCount ? <TrendingDown size={15} className="text-red-400" /> :
               <Minus size={15} className="text-zinc-400" />}
            </div>
            <div className={`text-lg font-bold mt-1 ${sentimentColor}`}>{sentimentLabel}</div>
            <div className="text-[10px] text-zinc-600">{totalMentions} mentions analyzed</div>
          </div>

          <div className="text-center p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-700/20">
            <div className={`text-2xl font-bold ${missingQueries === 0 ? "text-emerald-400" : "text-red-400"}`}>
              {missingQueries}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-medium">Queries missing</div>
            <div className="text-[10px] text-zinc-600">out of {totalQueries}</div>
          </div>
        </div>

        {/* Per-LLM breakdown */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { name: "ChatGPT", count: perLLM.chatgpt },
            { name: "Claude", count: perLLM.claude },
            { name: "Perplexity", count: perLLM.perplexity },
            { name: "Gemini", count: perLLM.gemini },
          ].map(({ name, count }) => (
            <div key={name} className="text-center p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-700/15">
              <div className={`text-[14px] font-bold ${count > 0 ? "text-zinc-200" : "text-zinc-600"}`}>
                {count}/{totalQueries}
              </div>
              <div className="text-[10px] text-zinc-600 mt-0.5">{name}</div>
            </div>
          ))}
        </div>

        {/* Missing queries */}
        {missingQueryList.length > 0 && (
          <div className="rounded-xl bg-red-950/20 border border-red-900/25 p-4 space-y-2.5">
            <p className="text-[13px] text-red-300 font-medium leading-snug">
              {companyName || "Your brand"} is invisible for {missingQueries} real estate {missingQueries === 1 ? "query" : "queries"}
              {city ? ` in ${city}` : ""}:
            </p>
            <ul className="space-y-1.5">
              {missingQueryList.map((q: string, i: number) => (
                <li key={i} className="text-[12px] text-red-400/80 flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">&#8226;</span>
                  &ldquo;{q}&rdquo;
                </li>
              ))}
            </ul>
            {missingQueries > 5 && (
              <p className="text-[11px] text-red-500">
                + {missingQueries - 5} more queries where your brand doesn&apos;t appear
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
