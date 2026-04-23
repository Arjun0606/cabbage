"use client";

/**
 * Competitive landscape + sentiment alerts.
 *
 * Large developers (Prestige, DLF, Brigade) care about two things the
 * company-level AI Visibility score doesn't answer:
 *
 *  1. WHO does AI cite alongside us in each locality? If we're in
 *     Whitefield, who are we losing to — or winning against? This
 *     drives content positioning, outreach, and pricing decisions.
 *  2. WHERE is AI saying negative things about us? A negative-
 *     sentiment mention is worse than no mention — it poisons the
 *     citation. Urgent to address.
 *
 * Both are derived from existing scan data (coCitations + sentiment
 * fields already exist on QueryResult). Zero extra API calls.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Swords, AlertTriangle } from "lucide-react";

interface LLMResult {
  mentioned?: boolean;
  sentiment?: "positive" | "neutral" | "negative" | "absent";
  coCitations?: string[];
  context?: string;
}

interface QueryResult {
  query: string;
  chatgpt?: LLMResult;
  gemini?: LLMResult;
}

interface Props {
  aiVisResult: { queryResults?: QueryResult[] } | null;
  /** Company name — excluded from co-citation counts. */
  brand: string;
  /** Localities the brand serves; used to bucket competitive intel. */
  localities: string[];
  /** Click-through when user wants to draft a response article. */
  onWriteArticle?: (query: string) => void;
}

interface LocalityCompetition {
  locality: string;
  totalQueries: number;
  competitors: Array<{ name: string; count: number }>;
}

interface SentimentAlert {
  query: string;
  platform: "ChatGPT" | "Gemini";
  context: string;
  sentiment: "negative" | "neutral";
}

function wordMatch(text: string, needle: string): boolean {
  if (!needle) return false;
  const re = new RegExp(
    `(?:^|[^a-z0-9])${needle.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z0-9]|$)`,
    "i"
  );
  return re.test(text.toLowerCase());
}

function cleanCompetitor(name: string, brand: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === brand.toLowerCase()) return null;
  // Strip generic suffixes that the model often adds
  const normalized = trimmed.replace(/\b(developers?|builders?|group|projects?|india|pvt\.?\s*ltd\.?|limited)\b/gi, "").trim();
  return normalized.length >= 3 ? normalized : trimmed;
}

export function CompetitiveLandscape({ aiVisResult, brand, localities, onWriteArticle }: Props) {
  const queryResults = aiVisResult?.queryResults || [];
  if (queryResults.length === 0) return null;

  // Aggregate co-citations per locality
  const perLocality: LocalityCompetition[] = localities.map((locality) => {
    const counts = new Map<string, number>();
    let totalQueries = 0;
    for (const q of queryResults) {
      if (!wordMatch(q.query, locality)) continue;
      totalQueries++;
      const cites = [
        ...(q.chatgpt?.coCitations || []),
        ...(q.gemini?.coCitations || []),
      ];
      for (const raw of cites) {
        const name = cleanCompetitor(raw, brand);
        if (!name) continue;
        const key = name.toLowerCase();
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    const competitors = Array.from(counts.entries())
      .map(([k, count]) => ({ name: k, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(({ name, count }) => ({
        name: name.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        count,
      }));
    return { locality, totalQueries, competitors };
  }).filter((l) => l.totalQueries > 0 && l.competitors.length > 0);

  // Sentiment alerts — queries where brand was mentioned but negatively
  const alerts: SentimentAlert[] = [];
  for (const q of queryResults) {
    if (q.chatgpt?.mentioned && q.chatgpt.sentiment === "negative") {
      alerts.push({
        query: q.query,
        platform: "ChatGPT",
        context: (q.chatgpt.context || "").slice(0, 260),
        sentiment: "negative",
      });
    }
    if (q.gemini?.mentioned && q.gemini.sentiment === "negative") {
      alerts.push({
        query: q.query,
        platform: "Gemini",
        context: (q.gemini.context || "").slice(0, 260),
        sentiment: "negative",
      });
    }
  }

  if (perLocality.length === 0 && alerts.length === 0) return null;

  return (
    <div className="space-y-4">
      {alerts.length > 0 && (
        <Card className="bg-red-500/[0.04] border-red-500/25 rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-red-400" />
              <h3 className="text-[13px] font-semibold text-red-400">
                Negative-sentiment mentions
              </h3>
              <Badge className="text-[10px] bg-zinc-800 text-red-400 border-0 rounded-md h-5 px-1.5">
                {alerts.length}
              </Badge>
              <span className="text-[11px] text-zinc-500 ml-auto">Fix before they spread</span>
            </div>
            <p className="text-[11px] text-zinc-500 mb-3">
              AI mentioned your brand in a critical or cautionary tone. Write a defensive article that surfaces the positive facts AI is missing — this shifts how future answers frame you.
            </p>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((a, i) => (
                <div key={i} className="p-3 rounded-lg bg-zinc-900/60 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="text-[9px] bg-red-500/15 text-red-400 border-0 rounded-md h-4 px-1.5">
                      {a.platform}
                    </Badge>
                    <span className="text-[12px] text-zinc-200 font-medium truncate flex-1">
                      &ldquo;{a.query}&rdquo;
                    </span>
                    {onWriteArticle && (
                      <button
                        onClick={() => onWriteArticle(`defend against negative sentiment for "${a.query}"`)}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 flex-shrink-0"
                      >
                        Write response
                      </button>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                    {a.context || "No extracted context available."}
                  </div>
                </div>
              ))}
              {alerts.length > 5 && (
                <div className="text-[11px] text-zinc-500 text-center py-1">
                  + {alerts.length - 5} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {perLocality.length > 0 && (
        <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Swords size={14} className="text-zinc-300" />
              <h3 className="text-[13px] font-semibold text-zinc-200">Competitive landscape by locality</h3>
              <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border-0 rounded-md h-5 px-1.5">
                {perLocality.length}
              </Badge>
              <span className="text-[11px] text-zinc-500 ml-auto">Who AI cites alongside you</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {perLocality.map((l) => (
                <div key={l.locality} className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold text-zinc-200">{l.locality}</span>
                    <span className="text-[10px] text-zinc-500 tabular-nums">
                      {l.totalQueries} quer{l.totalQueries === 1 ? "y" : "ies"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {l.competitors.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-[12px] py-1 border-b border-white/[0.04] last:border-0"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] text-zinc-600 tabular-nums w-4">{i + 1}</span>
                          <span className="text-zinc-300 truncate">{c.name}</span>
                        </div>
                        <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border-0 rounded-md h-4 px-1.5 flex-shrink-0">
                          cited {c.count}×
                        </Badge>
                      </div>
                    ))}
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
