"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link as LinkIcon, ArrowRight, Layers, AlertCircle, Loader2, Zap } from "lucide-react";

interface LinkSuggestion {
  fromUrl: string;
  toUrl: string;
  toTitle: string;
  anchorText: string;
  reason: string;
  relevanceScore: number;
}

interface InternalLinkingReport {
  totalPages: number;
  totalInternalLinks: number;
  avgLinksPerPage: number;
  orphanPages: Array<{ url: string; title: string }>;
  hubPages: Array<{ url: string; title: string; outboundCount: number }>;
  suggestions: LinkSuggestion[];
  topicalClusters: Array<{
    name: string;
    pages: Array<{ url: string; title: string }>;
    avgIntraLinks: number;
  }>;
}

interface Props {
  data: InternalLinkingReport | null;
  isLoading?: boolean;
  hasCrawl: boolean;
  onAnalyze: () => void;
}

function pathOf(url: string): string {
  try { return new URL(url).pathname; } catch { return url; }
}

export function InternalLinkingPanel({ data, isLoading, hasCrawl, onAnalyze }: Props) {
  const [tab, setTab] = useState<"suggestions" | "orphans" | "clusters">("suggestions");

  if (!hasCrawl) {
    return (
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardContent className="p-6 text-center">
          <LinkIcon size={24} className="text-zinc-500 mx-auto mb-2" />
          <h3 className="text-[13px] font-semibold mb-1">Internal linking analysis</h3>
          <p className="text-[11px] text-zinc-500 mb-3 max-w-md mx-auto">
            Run &quot;Crawl Site&quot; first. Internal linking uses the crawl data to find orphan pages
            and suggest specific links between topically-related pages.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data && !isLoading) {
    return (
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardContent className="p-6 text-center">
          <LinkIcon size={24} className="text-[#7CB342] mx-auto mb-2" />
          <h3 className="text-[13px] font-semibold mb-1">Analyze internal linking</h3>
          <p className="text-[11px] text-zinc-500 mb-3 max-w-md mx-auto">
            Uses your site crawl to find orphan pages, hub overload, and suggest specific
            &quot;link from X to Y&quot; opportunities based on topical relevance.
          </p>
          <button
            onClick={onAnalyze}
            className="h-8 px-4 rounded-lg bg-[#7CB342] text-zinc-950 text-[12px] font-semibold hover:bg-[#8BC34A] active:scale-[0.97]"
          >
            Analyze Linking
          </button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardContent className="p-6 text-center">
          <Loader2 size={20} className="animate-spin text-[#7CB342] mx-auto mb-2" />
          <p className="text-[12px] text-zinc-500">Analyzing linking graph...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <LinkIcon size={15} className="text-[#7CB342]" />
            <CardTitle className="text-[14px] font-semibold">Internal Linking Graph</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Total pages", value: data.totalPages, color: "text-zinc-200" },
              { label: "Internal links", value: data.totalInternalLinks, color: "text-zinc-200" },
              { label: "Avg / page", value: data.avgLinksPerPage, color: "text-zinc-200" },
              { label: "Orphans", value: data.orphanPages.length, color: data.orphanPages.length > 0 ? "text-amber-400" : "text-[#7CB342]" },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-2.5 rounded-lg bg-zinc-800/40 border border-white/[0.04]">
                <div className={`text-[18px] font-bold tabular-nums ${color}`}>{value}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-[11px]">
            {([
              { k: "suggestions" as const, label: `Suggestions (${data.suggestions.length})` },
              { k: "orphans" as const, label: `Orphans (${data.orphanPages.length})` },
              { k: "clusters" as const, label: `Clusters (${data.topicalClusters.length})` },
            ]).map(({ k, label }) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  tab === k ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {tab === "suggestions" && (
            <>
              {data.suggestions.length === 0 ? (
                <div className="text-center py-6 text-[12px] text-zinc-500">
                  No linking opportunities found — your internal linking looks solid.
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-zinc-500 mb-2 flex items-center gap-1.5">
                    <Zap size={11} className="text-[#7CB342]" />
                    Specific link insertions that would boost orphan / low-inbound pages.
                  </p>
                  {data.suggestions.slice(0, 20).map((s, i) => (
                    <div key={i} className="p-3 rounded-lg bg-zinc-800/40 border border-white/[0.04]">
                      <div className="flex items-center gap-2 mb-1.5 text-[12px]">
                        <span className="text-zinc-500 truncate flex-1">{pathOf(s.fromUrl)}</span>
                        <ArrowRight size={12} className="text-[#7CB342] flex-shrink-0" />
                        <span className="text-zinc-200 font-medium truncate flex-1 text-right">{pathOf(s.toUrl)}</span>
                        <Badge className="text-[9px] h-4 px-1.5 rounded bg-[#7CB342]/10 text-[#7CB342] border-0 flex-shrink-0 tabular-nums">
                          {Math.round(s.relevanceScore * 100)}%
                        </Badge>
                      </div>
                      <div className="text-[11px] text-zinc-400 mb-1">{s.reason}</div>
                      <div className="text-[11px] text-zinc-500">
                        Suggested anchor: <span className="text-zinc-300">&quot;{s.anchorText.slice(0, 60)}&quot;</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "orphans" && (
            <>
              {data.orphanPages.length === 0 ? (
                <div className="text-center py-6 text-[12px] text-zinc-500">No orphan pages. Every page has inbound links.</div>
              ) : (
                <div className="space-y-1">
                  <p className="text-[11px] text-zinc-500 mb-2 flex items-center gap-1.5">
                    <AlertCircle size={11} className="text-amber-400" />
                    These pages have no internal links pointing to them — Google may not crawl or rank them.
                  </p>
                  {data.orphanPages.map((p, i) => (
                    <a
                      key={i}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-800/40 text-[12px]"
                    >
                      <AlertCircle size={11} className="text-amber-400 flex-shrink-0" />
                      <span className="text-zinc-300 truncate flex-1">{p.title}</span>
                      <span className="text-zinc-500 truncate text-[11px] max-w-[300px]">{pathOf(p.url)}</span>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "clusters" && (
            <>
              {data.topicalClusters.length === 0 ? (
                <div className="text-center py-6 text-[12px] text-zinc-500">No topic clusters detected yet. Add more content on related topics.</div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] text-zinc-500 mb-1 flex items-center gap-1.5">
                    <Layers size={11} className="text-[#7CB342]" />
                    Topically-related pages grouped together. Higher intra-cluster links = better topical authority.
                  </p>
                  {data.topicalClusters.slice(0, 8).map((c, i) => (
                    <div key={i} className="p-3 rounded-lg bg-zinc-800/40 border border-white/[0.04]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] font-medium text-zinc-200 truncate">{c.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className="text-[9px] h-4 px-1.5 rounded bg-zinc-700/50 text-zinc-300 border-0 tabular-nums">
                            {c.pages.length} pages
                          </Badge>
                          <Badge className="text-[9px] h-4 px-1.5 rounded bg-[#7CB342]/10 text-[#7CB342] border-0 tabular-nums">
                            {c.avgIntraLinks} intra-links
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        {c.pages.slice(0, 5).map((p, j) => (
                          <div key={j} className="text-[11px] text-zinc-500 truncate">• {p.title || pathOf(p.url)}</div>
                        ))}
                        {c.pages.length > 5 && (
                          <div className="text-[10px] text-zinc-600">+ {c.pages.length - 5} more</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
