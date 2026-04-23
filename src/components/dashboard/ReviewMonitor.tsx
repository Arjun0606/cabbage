"use client";

/**
 * Review ORM panel.
 *
 * Shows all review-platform mentions the agent surfaced across Housing,
 * 99acres, MagicBricks, Google, Reddit, Quora etc. Groups by project,
 * ranks negative/high-priority first, exposes a "Draft response" button
 * per mention that routes into the article-writer with a defensive
 * response prompt.
 *
 * This is the CMO's most-awaited tool — most Indian developers track
 * reviews in a spreadsheet today, or not at all.
 */

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquareWarning,
  RefreshCw,
  Loader2,
  ExternalLink,
  PenTool,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface ReviewMention {
  platform: string;
  title?: string;
  excerpt?: string;
  url?: string;
  sentiment: "positive" | "neutral" | "negative";
  priority: "high" | "medium" | "low";
  projectName: string;
  postedDate?: string;
}

interface ReviewMonitorResult {
  generatedAt: string;
  totalMentions: number;
  mentions: ReviewMention[];
  counts: {
    byPlatform: Record<string, number>;
    byPriority: { high: number; medium: number; low: number };
    bySentiment: { positive: number; neutral: number; negative: number };
  };
  failedProjects: string[];
}

interface Props {
  result: ReviewMonitorResult | null;
  isRunning?: boolean;
  onRun: () => void;
  onDraftResponse?: (mention: ReviewMention) => void;
}

function sentimentBadge(s: ReviewMention["sentiment"]): string {
  return s === "negative"
    ? "bg-red-500/15 text-red-400"
    : s === "positive"
    ? "bg-[#7CB342]/15 text-[#7CB342]"
    : "bg-zinc-800 text-zinc-400";
}

function priorityBadge(p: ReviewMention["priority"]): string {
  return p === "high"
    ? "bg-red-500/15 text-red-400 border-red-500/30"
    : p === "medium"
    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : "bg-zinc-800 text-zinc-500 border-zinc-700/50";
}

export function ReviewMonitor({ result, isRunning, onRun, onDraftResponse }: Props) {
  const [filter, setFilter] = useState<"all" | "negative" | "high">("all");

  const visibleMentions = useMemo(() => {
    if (!result) return [];
    return result.mentions.filter((m) => {
      if (filter === "negative") return m.sentiment === "negative";
      if (filter === "high") return m.priority === "high";
      return true;
    });
  }, [result, filter]);

  const byProject = useMemo(() => {
    const m = new Map<string, ReviewMention[]>();
    for (const mention of visibleMentions) {
      if (!m.has(mention.projectName)) m.set(mention.projectName, []);
      m.get(mention.projectName)!.push(mention);
    }
    return Array.from(m.entries());
  }, [visibleMentions]);

  return (
    <div className="space-y-4">
      {/* Header + run button */}
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquareWarning size={14} className="text-zinc-300" />
                <h2 className="text-[14px] font-semibold text-zinc-100">Review monitor</h2>
                {result && result.counts.byPriority.high > 0 && (
                  <Badge className="text-[10px] bg-red-500/15 text-red-400 border-0 rounded-md h-5 px-1.5">
                    {result.counts.byPriority.high} urgent
                  </Badge>
                )}
              </div>
              <p className="text-[12px] text-zinc-500">
                Mentions of your projects on Housing, 99acres, MagicBricks, Google, Reddit, and Quora. One unanswered negative review on these platforms kills 10-20 leads.
              </p>
            </div>
            <Button
              onClick={onRun}
              disabled={isRunning}
              size="sm"
              className="bg-zinc-100 text-zinc-900 hover:bg-white h-9 px-3 text-[12px] rounded-lg flex-shrink-0"
            >
              {isRunning ? (
                <><Loader2 size={12} className="animate-spin mr-1.5" />Scanning…</>
              ) : result ? (
                <><RefreshCw size={12} className="mr-1.5" />Rescan</>
              ) : (
                <>Run review scan</>
              )}
            </Button>
          </div>

          {result && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
              <Summary label="Total mentions" value={result.totalMentions} />
              <Summary label="Negative" value={result.counts.bySentiment.negative} tone={result.counts.bySentiment.negative > 0 ? "danger" : "muted"} />
              <Summary label="Positive" value={result.counts.bySentiment.positive} tone="positive" />
              <Summary label="Platforms" value={Object.keys(result.counts.byPlatform).length} />
            </div>
          )}

          {result && result.failedProjects.length > 0 && (
            <div className="mt-3 p-2.5 rounded-lg bg-amber-500/[0.04] border border-amber-500/20 text-[11px] text-amber-400 flex items-center gap-2">
              <AlertTriangle size={12} />
              Web search timed out for {result.failedProjects.length} project
              {result.failedProjects.length === 1 ? "" : "s"}. Click Rescan in a minute.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state — no scan yet */}
      {!result && !isRunning && (
        <Card className="bg-zinc-900/40 border-white/[0.06] rounded-xl">
          <CardContent className="p-8 text-center">
            <MessageSquareWarning size={24} className="text-zinc-500 mx-auto mb-3" />
            <h3 className="text-[14px] font-semibold text-zinc-200 mb-1">No review scan yet</h3>
            <p className="text-[12px] text-zinc-500 max-w-md mx-auto leading-relaxed">
              Click Run review scan to surface everything said about your projects on the Indian review platforms over the last 6 months. Cached for 24h per project.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filter + per-project list */}
      {result && result.mentions.length > 0 && (
        <>
          <div className="flex items-center gap-1.5">
            {(["all", "negative", "high"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                  filter === f
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {f === "all" ? "All" : f === "negative" ? "Negative only" : "Urgent (high priority)"}
              </button>
            ))}
            <span className="text-[11px] text-zinc-600 ml-auto">
              Scanned {new Date(result.generatedAt).toLocaleString()}
            </span>
          </div>

          {byProject.map(([project, mentions]) => (
            <Card key={project} className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-[13px] font-semibold text-zinc-200">{project}</h3>
                  <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border-0 rounded-md h-5 px-1.5">
                    {mentions.length} mention{mentions.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {mentions.map((m, i) => (
                    <div
                      key={`${project}-${i}`}
                      className={`p-3 rounded-lg border ${
                        m.priority === "high"
                          ? "bg-red-500/[0.03] border-red-500/20"
                          : "bg-zinc-900/40 border-zinc-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge className={`text-[9px] h-4 px-1.5 rounded border ${priorityBadge(m.priority)}`}>
                          {m.priority}
                        </Badge>
                        <Badge className={`text-[9px] h-4 px-1.5 rounded border-0 ${sentimentBadge(m.sentiment)}`}>
                          {m.sentiment}
                        </Badge>
                        <Badge className="text-[9px] h-4 px-1.5 rounded bg-zinc-800 text-zinc-300 border-0">
                          {m.platform}
                        </Badge>
                        {m.postedDate && (
                          <span className="text-[10px] text-zinc-500">{m.postedDate}</span>
                        )}
                        <div className="flex items-center gap-1.5 ml-auto">
                          {m.url && (
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                            >
                              View <ExternalLink size={10} />
                            </a>
                          )}
                          {onDraftResponse && m.sentiment !== "positive" && (
                            <button
                              onClick={() => onDraftResponse(m)}
                              className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#7CB342]/15 text-[#7CB342] border border-[#7CB342]/30 hover:bg-[#7CB342]/25 flex items-center gap-1"
                            >
                              <PenTool size={10} />
                              Draft response
                            </button>
                          )}
                        </div>
                      </div>
                      {m.title && (
                        <div className="text-[13px] text-zinc-200 font-medium mb-0.5">{m.title}</div>
                      )}
                      {m.excerpt && (
                        <p className="text-[12px] text-zinc-400 leading-relaxed line-clamp-3">
                          &ldquo;{m.excerpt}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* No mentions found — clean state */}
      {result && result.mentions.length === 0 && !isRunning && (
        <Card className="bg-[#7CB342]/[0.03] border-[#7CB342]/20 rounded-xl">
          <CardContent className="p-5 flex items-center gap-3">
            <CheckCircle2 size={16} className="text-[#7CB342] flex-shrink-0" />
            <div>
              <div className="text-[13px] text-zinc-200 font-medium">No reviews surfaced this scan.</div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Either nothing significant has been posted in the last 6 months, or the platforms we check (Housing / 99acres / MagicBricks / Google / Reddit / Quora) don&apos;t index your projects yet — both are legitimate outcomes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Summary({ label, value, tone = "muted" }: { label: string; value: number; tone?: "muted" | "positive" | "danger" }) {
  return (
    <div className="p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-0.5">{label}</div>
      <div className={`text-[20px] font-bold tabular-nums ${
        tone === "danger"
          ? "text-red-400"
          : tone === "positive"
          ? "text-[#7CB342]"
          : "text-zinc-100"
      }`}>
        {value}
      </div>
    </div>
  );
}
