"use client";

/**
 * "Pages AI cites" card.
 *
 * When ChatGPT or Gemini generate a recommendation for the brand,
 * they often link the source. For developers paying for Cabbge, the
 * most actionable piece of data is: which of OUR OWN pages does AI
 * actually pull from? Doubling down on those pages (adding fresher
 * content, richer schema, interlinks) lifts every future mention.
 *
 * Data source: `queryResults[].chatgpt.citationSources` +
 * `.gemini.citationSources`, each tagged with type = "own_site" |
 * "competitor" | "portal" | etc. We keep only own_site citations,
 * group by URL, rank by frequency.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink } from "lucide-react";

interface Citation {
  url: string;
  type?: string;
}

interface LLMResult {
  citationSources?: Citation[];
}

interface QueryResult {
  query: string;
  chatgpt?: LLMResult;
  gemini?: LLMResult;
}

interface Props {
  aiVisResult: { queryResults?: QueryResult[] } | null;
  /** Used to filter "own site" citations in case `type` wasn't classified. */
  websiteUrl: string;
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function OwnPagesAICites({ aiVisResult, websiteUrl }: Props) {
  const queryResults = aiVisResult?.queryResults || [];
  if (queryResults.length === 0) return null;

  // Host must match. The upstream LLM mis-tags competitor citations as
  // "own_site" when brand names are similar (e.g., Tridasa scan picking
  // up Praneeth pages because the AI confused parent/sub-brand). The
  // type tag is hint-only; the host is the source of truth — without
  // a known own-host we can't confidently say any page is ours.
  const ownHost = websiteUrl ? hostOf(websiteUrl) : "";
  if (!ownHost) return null;

  const counts = new Map<string, number>();
  for (const q of queryResults) {
    const all = [
      ...(q.chatgpt?.citationSources || []),
      ...(q.gemini?.citationSources || []),
    ];
    for (const c of all) {
      if (!c.url) continue;
      if (hostOf(c.url) !== ownHost) continue;
      counts.set(c.url, (counts.get(c.url) || 0) + 1);
    }
  }

  const rows = Array.from(counts.entries())
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  if (rows.length === 0) return null;

  return (
    <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={14} className="text-zinc-300" />
          <h3 className="text-[13px] font-semibold text-zinc-200">Pages AI is pulling from</h3>
          <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border-0 rounded-md h-5 px-1.5">
            {rows.length}
          </Badge>
          <span className="text-[11px] text-zinc-500 ml-auto">Double down on these</span>
        </div>
        <p className="text-[11px] text-zinc-500 mb-3">
          Every time AI quoted you this scan, it linked one of these URLs. These pages are already doing the work — refresh them first, add richer schema, and interlink to weaker pages.
        </p>
        <div className="space-y-1">
          {rows.map((r) => (
            <div
              key={r.url}
              className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg hover:bg-zinc-800/40"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[12px] text-zinc-200 truncate font-mono">{pathOf(r.url)}</div>
                <div className="text-[10px] text-zinc-500 truncate">{hostOf(r.url)}</div>
              </div>
              <Badge className="text-[10px] bg-[#7CB342]/10 text-[#7CB342] border-0 rounded-md h-5 px-1.5 flex-shrink-0">
                cited {r.count}×
              </Badge>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-zinc-300 flex-shrink-0"
                title="Open page"
              >
                <ExternalLink size={12} />
              </a>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
