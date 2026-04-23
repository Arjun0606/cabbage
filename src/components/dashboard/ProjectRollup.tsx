"use client";

/**
 * Per-project AI visibility rollup.
 *
 * For a developer with 17 projects, one opaque company-level AI
 * visibility score hides the actual story: "My Home Udyan is famous
 * in Tellapur, but My Home Apas is invisible in Kokapet". This
 * component derives a per-project score from the company-level scan
 * by tagging each query against project names (and optionally their
 * locality/config). Zero extra LLM calls — we use the data we already
 * have.
 *
 * Architecture note: rather than running N separate scans for N
 * projects (which doesn't scale past a handful), we lean on the fact
 * that the company-level query set includes project names + locality
 * + config combos. Each query is tagged to the project whose name or
 * (locality + config) signature it matches. The score for a project
 * is "how many of its tagged queries cite the brand".
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, TrendingUp, TrendingDown } from "lucide-react";

interface QueryResult {
  query: string;
  chatgpt?: { mentioned?: boolean };
  gemini?: { mentioned?: boolean };
}

interface ProjectLike {
  name: string;
  locality?: string | null;
  config_tags?: string[] | null;
  stage?: string | null;
  price_min?: number | null;
  price_max?: number | null;
}

interface Props {
  aiVisResult: { queryResults?: QueryResult[] } | null;
  projects: ProjectLike[];
  onSelectProject?: (idx: number | null) => void;
  selectedProject?: number | null;
}

interface ProjectScore {
  projectName: string;
  idx: number;
  total: number;
  mentioned: number;
  score: number;
  signal: "name" | "locality-match" | "none";
}

function wordMatch(text: string, needle: string): boolean {
  if (!needle) return false;
  const re = new RegExp(`(?:^|[^a-z0-9])${needle.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z0-9]|$)`, "i");
  return re.test(text.toLowerCase());
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

export function ProjectRollup({ aiVisResult, projects, onSelectProject, selectedProject }: Props) {
  const queryResults = aiVisResult?.queryResults || [];
  if (projects.length < 2 || queryResults.length === 0) return null;

  const scores: ProjectScore[] = projects.map((p, idx) => {
    let total = 0;
    let mentioned = 0;
    let signal: ProjectScore["signal"] = "none";

    for (const q of queryResults) {
      // Primary tag: does the query name the project explicitly?
      const nameHit = wordMatch(q.query, p.name);
      // Secondary tag: does the query match the project's (locality +
      // at least one config) signature? Useful when buyers search by
      // locality + config instead of by project name.
      const locHit = p.locality && wordMatch(q.query, p.locality) &&
        (p.config_tags || []).some((c) => wordMatch(q.query, c));

      if (!nameHit && !locHit) continue;
      total++;
      if (nameHit) signal = "name";
      else if (signal === "none") signal = "locality-match";
      if (q.chatgpt?.mentioned || q.gemini?.mentioned) mentioned++;
    }

    const score = total > 0 ? Math.round((mentioned / total) * 100) : 0;
    return { projectName: p.name, idx, total, mentioned, score, signal };
  });

  const withData = scores.filter((s) => s.total > 0);
  if (withData.length === 0) return null;

  withData.sort((a, b) => b.score - a.score || b.total - a.total);

  const strongest = withData[0];
  const weakest = withData[withData.length - 1];

  return (
    <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Building2 size={14} className="text-zinc-300" />
              <h3 className="text-[13px] font-semibold text-zinc-200">AI visibility by project</h3>
              <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border-0 rounded-md h-5 px-1.5">
                {withData.length} project{withData.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500">
              How AI answers buyer queries naming each project directly. Click a project to scope the dashboard to it.
            </p>
          </div>
          {withData.length >= 2 && strongest.score !== weakest.score && (
            <div className="text-right text-[11px]">
              <div className="text-zinc-500">Spread</div>
              <div className="font-semibold tabular-nums">
                <span className={scoreColor(strongest.score)}>{strongest.projectName} {strongest.score}</span>
                <span className="text-zinc-500 mx-1">→</span>
                <span className={scoreColor(weakest.score)}>{weakest.projectName} {weakest.score}</span>
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {withData.slice(0, 12).map((s) => {
            const selected = selectedProject === s.idx;
            return (
              <button
                key={s.idx}
                onClick={() => onSelectProject?.(selected ? null : s.idx)}
                className={`text-left p-3 rounded-lg border transition-all ${scoreBg(s.score)} ${
                  selected ? "ring-1 ring-zinc-300" : "hover:bg-zinc-800/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] text-zinc-100 font-medium truncate">{s.projectName}</span>
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
                  {s.mentioned} of {s.total} queries cited you{s.signal === "locality-match" ? " · matched via locality" : ""}
                </div>
              </button>
            );
          })}
        </div>
        {withData.length > 12 && (
          <p className="text-[11px] text-zinc-500 mt-3 text-center">
            Showing top 12 of {withData.length}. Pick a project in the switcher to see the full drill-down.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
