"use client";

/**
 * Per-locality AI visibility rollup.
 *
 * One overall "AI Visibility 68/100" number hides the most important
 * insight for a multi-locality developer: "we're strong in Gachibowli,
 * invisible in Kukatpally, mid in Whitefield". This component slices
 * the current scan's queryResults by locality keyword-match against
 * the company's known project localities and renders a per-locality
 * scorecard so developers see exactly where to invest content effort.
 *
 * The slicing is entirely client-side — no extra API call. We tag a
 * query against a locality whenever the query text contains that
 * locality name (case-insensitive, word-boundary-ish). A query can
 * count toward multiple localities if it names them; that's intended
 * (comparison queries like "Gachibowli vs Kukatpally" lift both).
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, TrendingDown } from "lucide-react";

interface QueryResult {
  query: string;
  chatgpt?: { mentioned?: boolean };
  gemini?: { mentioned?: boolean };
}

interface Props {
  /** Current AI visibility scan result (the shape aiVisibility.ts emits). */
  aiVisResult: { queryResults?: QueryResult[] } | null;
  /** Localities the brand actually serves, derived from projects. */
  localities: string[];
  /** For the empty-state copy. */
  city?: string;
  /** Clicking a locality card should set the locality filter. */
  onSelectLocality?: (locality: string | null) => void;
  /** Currently-selected locality, for highlighting. */
  selectedLocality?: string | null;
}

interface LocalityScore {
  locality: string;
  total: number;      // queries tagged to this locality
  mentioned: number;  // queries where brand was mentioned (either LLM)
  score: number;      // 0-100, rounded
}

function tagLocality(query: string, locality: string): boolean {
  // Word-boundary-ish match that handles hyphens and punctuation.
  const re = new RegExp(`(?:^|[^a-z0-9])${locality.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z0-9]|$)`, "i");
  return re.test(query.toLowerCase());
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-[#7CB342]";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function scoreBg(score: number): string {
  if (score >= 70) return "bg-[#7CB342]/[0.04] border-[#7CB342]/25";
  if (score >= 40) return "bg-amber-500/[0.04] border-amber-500/25";
  return "bg-red-500/[0.04] border-red-500/25";
}

export function LocalityRollup({ aiVisResult, localities, city, onSelectLocality, selectedLocality }: Props) {
  const queryResults = aiVisResult?.queryResults || [];
  if (localities.length < 2 || queryResults.length === 0) return null;

  const scores: LocalityScore[] = localities.map((locality) => {
    let total = 0;
    let mentioned = 0;
    for (const q of queryResults) {
      if (!tagLocality(q.query, locality)) continue;
      total++;
      if (q.chatgpt?.mentioned || q.gemini?.mentioned) mentioned++;
    }
    const score = total > 0 ? Math.round((mentioned / total) * 100) : 0;
    return { locality, total, mentioned, score };
  });

  // Only surface localities the scan actually touched. If nothing
  // matched (zero `total`) the user sees nothing rather than a wall
  // of empty 0-score cards.
  const withData = scores.filter((s) => s.total > 0);
  if (withData.length < 2) return null;

  withData.sort((a, b) => b.score - a.score || b.total - a.total);

  const strongest = withData[0];
  const weakest = withData[withData.length - 1];

  return (
    <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <MapPin size={14} className="text-zinc-300" />
              <h3 className="text-[13px] font-semibold text-zinc-200">AI visibility by locality</h3>
              <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border-0 rounded-md h-5 px-1.5">
                {withData.length} localit{withData.length === 1 ? "y" : "ies"}
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500">
              How AI answers buyer queries that mention each {city ? `${city} ` : ""}locality.
            </p>
          </div>
          {withData.length >= 2 && (
            <div className="text-right text-[11px]">
              <div className="text-zinc-500">Spread</div>
              <div className="font-semibold tabular-nums">
                <span className={scoreColor(strongest.score)}>{strongest.locality} {strongest.score}</span>
                <span className="text-zinc-500 mx-1">→</span>
                <span className={scoreColor(weakest.score)}>{weakest.locality} {weakest.score}</span>
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {withData.map((s) => {
            const selected = selectedLocality?.toLowerCase() === s.locality.toLowerCase();
            return (
              <button
                key={s.locality}
                onClick={() => onSelectLocality?.(selected ? null : s.locality)}
                className={`text-left p-3 rounded-lg border transition-all ${scoreBg(s.score)} ${
                  selected ? "ring-1 ring-zinc-300" : "hover:bg-zinc-800/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] text-zinc-100 font-medium truncate">{s.locality}</span>
                  {s.score >= 70 ? (
                    <TrendingUp size={12} className="text-[#7CB342] flex-shrink-0" />
                  ) : s.score < 40 ? (
                    <TrendingDown size={12} className="text-red-400 flex-shrink-0" />
                  ) : null}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-[20px] font-bold tabular-nums ${scoreColor(s.score)}`}>{s.score}</span>
                  <span className="text-[11px] text-zinc-500">/ 100</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  {s.mentioned} of {s.total} queries cited you
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
