"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Target, Loader2, PenTool } from "lucide-react";

interface KeywordResult {
  keyword: string;
  monthlyVolume: number | null;
  difficulty: number | null;
  cpc: number | null;
  intent: string;
  gscImpressions?: number;
  gscPosition?: number;
  gscClicks?: number;
  opportunity: "high" | "medium" | "low";
  source: "gsc" | "web_search" | "inferred";
  seedCity?: string;
  seedProject?: string;
  seedConfig?: string;
  seedLocality?: string;
}

interface KeywordResearchResult {
  seed: string;
  city?: string;
  totalKeywords: number;
  keywords: KeywordResult[];
  seedsUsed?: Array<{ seed: string; city?: string; project?: string; config?: string; locality?: string; dimension: string }>;
  clusters: Array<{
    name: string;
    keywordCount: number;
    totalVolume: number;
    avgDifficulty: number;
    keywords: string[];
  }>;
}

interface Props {
  city: string;
  data: KeywordResearchResult | null;
  isLoading?: boolean;
  onSearch: (seed: string) => void;
  onFixKeyword?: (keyword: string) => void;
}

function diffColor(d: number | null): string {
  if (d === null) return "text-zinc-500";
  if (d <= 30) return "text-[#7CB342]";
  if (d <= 60) return "text-amber-400";
  return "text-red-400";
}

function oppBadgeColor(opp: "high" | "medium" | "low"): string {
  return opp === "high" ? "bg-[#7CB342]/10 text-[#7CB342]"
    : opp === "medium" ? "bg-amber-500/10 text-amber-400"
    : "bg-zinc-700/40 text-zinc-500";
}

export function KeywordResearchPanel({ city, data, isLoading, onSearch, onFixKeyword }: Props) {
  const [seed, setSeed] = useState("");
  const [filter, setFilter] = useState<"all" | "high" | "gsc">("all");
  const [dimensionFilter, setDimensionFilter] = useState<string>("all");

  const handleSearch = () => {
    if (seed.trim()) onSearch(seed.trim());
  };

  // Collect unique dimension values from actual results
  const dimensionOptions = (() => {
    if (!data?.keywords) return [] as Array<{ key: string; label: string; type: string }>;
    const seen = new Map<string, { key: string; label: string; type: string }>();
    for (const k of data.keywords) {
      if (k.seedConfig) seen.set(`config:${k.seedConfig}`, { key: `config:${k.seedConfig}`, label: k.seedConfig, type: "config" });
      if (k.seedLocality) seen.set(`locality:${k.seedLocality}`, { key: `locality:${k.seedLocality}`, label: k.seedLocality, type: "locality" });
      if (k.seedCity) seen.set(`city:${k.seedCity}`, { key: `city:${k.seedCity}`, label: k.seedCity, type: "city" });
    }
    return Array.from(seen.values());
  })();

  const filtered = data?.keywords.filter((k) => {
    if (filter === "high" && k.opportunity !== "high") return false;
    if (filter === "gsc" && k.source !== "gsc") return false;
    if (dimensionFilter !== "all") {
      const [type, val] = dimensionFilter.split(":");
      if (type === "config" && k.seedConfig !== val) return false;
      if (type === "locality" && k.seedLocality !== val) return false;
      if (type === "city" && k.seedCity !== val) return false;
    }
    return true;
  }) || [];

  return (
    <div className="space-y-4">
      {/* Search */}
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <Search size={15} className="text-[#7CB342]" />
            <CardTitle className="text-[14px] font-semibold">Keyword Research</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder={`e.g. "3BHK apartments ${city}" or "real estate investment ${city}"`}
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="bg-zinc-800/60 border-white/[0.06] text-[13px] h-9 flex-1"
            />
            <button
              onClick={handleSearch}
              disabled={!seed.trim() || isLoading}
              className="h-9 px-4 rounded-lg bg-[#7CB342] text-zinc-950 text-[12px] font-semibold hover:bg-[#8BC34A] active:scale-[0.97] disabled:opacity-40 flex items-center gap-1.5"
            >
              {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              Research
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">
            We&apos;ve already researched keywords around your primary project automatically. Enter a different seed above to explore another angle — we&apos;ll expand it into 20 related queries with real search volume, difficulty, and CPC.
          </p>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading && (
        <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
          <CardContent className="p-8 text-center">
            <Loader2 size={24} className="animate-spin text-[#7CB342] mx-auto mb-3" />
            <p className="text-[12px] text-zinc-500">Expanding keywords and pulling real search data...</p>
          </CardContent>
        </Card>
      )}

      {data && !isLoading && (
        <>
          {/* Top Opportunities — the "what should I do next" answer */}
          {(() => {
            const scored = data.keywords
              .filter((k) => k.opportunity === "high" && k.monthlyVolume !== null && k.monthlyVolume > 0)
              .slice()
              .sort((a, b) => {
                const aScore = (a.monthlyVolume || 0) / Math.max(1, a.difficulty || 50);
                const bScore = (b.monthlyVolume || 0) / Math.max(1, b.difficulty || 50);
                return bScore - aScore;
              })
              .slice(0, 5);
            if (scored.length === 0) return null;
            return (
              <Card className="bg-[#7CB342]/[0.04] border-[#7CB342]/20 rounded-xl">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Target size={14} className="text-[#7CB342]" />
                    <CardTitle className="text-[13px] font-semibold">Top 5 Opportunities</CardTitle>
                    <span className="text-[11px] text-zinc-500 ml-auto">High volume, low difficulty — write articles for these first</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {scored.map((kw, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-1.5 text-[13px] border-b border-white/[0.04] last:border-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[10px] text-zinc-600 tabular-nums w-4">{i + 1}</span>
                        <span className="text-zinc-200 truncate">{kw.keyword}</span>
                        {kw.source === "gsc" && (
                          <Badge className="text-[9px] h-3.5 px-1 rounded bg-blue-500/10 text-blue-400 border-0 flex-shrink-0">GSC</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 text-[11px] tabular-nums">
                        <span className="text-zinc-300">{(kw.monthlyVolume || 0).toLocaleString()}/mo</span>
                        <span className={diffColor(kw.difficulty)}>KD {kw.difficulty ?? "—"}</span>
                        {onFixKeyword && (
                          <button
                            onClick={() => onFixKeyword(kw.keyword)}
                            className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#7CB342]/15 text-[#7CB342] border border-[#7CB342]/30 hover:bg-[#7CB342]/25 flex items-center gap-1"
                          >
                            <PenTool size={9} /> Write
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })()}

          {/* Clusters summary */}
          {data.clusters.length > 1 && (
            <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-[13px] font-semibold">Topic Clusters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {data.clusters.slice(0, 6).map((c) => (
                    <div key={c.name} className="p-2.5 rounded-lg bg-zinc-800/40 border border-white/[0.04]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-medium text-zinc-200 uppercase tracking-wide">{c.name}</span>
                        <span className="text-[10px] text-zinc-500 tabular-nums">{c.keywordCount} kw</span>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {c.totalVolume.toLocaleString()} vol/mo • KD {c.avgDifficulty}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Keywords table */}
          <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[13px] font-semibold">
                  Keywords ({filtered.length})
                </CardTitle>
                <div className="flex gap-1 text-[11px]">
                  {(["all", "high", "gsc"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        filter === f ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {f === "all" ? "All" : f === "high" ? "High opportunity" : "Already ranking"}
                    </button>
                  ))}
                </div>
              </div>
              {dimensionOptions.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-2 mt-1 border-t border-white/[0.04]">
                  <span className="text-[10px] uppercase tracking-wide text-zinc-500 mr-1">Slice by</span>
                  <button
                    onClick={() => setDimensionFilter("all")}
                    className={`px-2 py-0.5 rounded-md text-[11px] transition-colors ${
                      dimensionFilter === "all" ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    All dimensions
                  </button>
                  {dimensionOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setDimensionFilter(opt.key)}
                      className={`px-2 py-0.5 rounded-md text-[11px] transition-colors flex items-center gap-1 ${
                        dimensionFilter === opt.key ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <span className="text-[9px] uppercase tracking-wide text-zinc-600">{opt.type}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <div className="text-center py-6 text-[12px] text-zinc-500">No keywords match this filter.</div>
              ) : (
                <div className="space-y-1">
                  {/* Header row */}
                  <div className="grid grid-cols-[1fr,70px,60px,60px,80px,70px] gap-2 px-2 py-1.5 text-[10px] uppercase tracking-wide text-zinc-500 border-b border-white/[0.04]">
                    <div>Keyword</div>
                    <div className="text-right">Volume</div>
                    <div className="text-right">KD</div>
                    <div className="text-right">CPC</div>
                    <div className="text-right">Rank</div>
                    <div className="text-right">Opp.</div>
                  </div>
                  {filtered.map((kw, i) => (
                    <div key={i} className="grid grid-cols-[1fr,70px,60px,60px,80px,70px] gap-2 px-2 py-2 text-[12px] items-center hover:bg-zinc-800/20 rounded-md group">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-zinc-300 truncate">{kw.keyword}</span>
                        {kw.source === "gsc" && (
                          <Badge className="text-[9px] h-3.5 px-1 rounded bg-blue-500/10 text-blue-400 border-0 flex-shrink-0">
                            GSC
                          </Badge>
                        )}
                        {onFixKeyword && kw.opportunity !== "low" && (
                          <button
                            onClick={() => onFixKeyword(kw.keyword)}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#7CB342]/10 text-[#7CB342] border border-[#7CB342]/20 hover:bg-[#7CB342]/20 opacity-0 group-hover:opacity-100 flex-shrink-0 flex items-center gap-0.5"
                          >
                            <PenTool size={9} /> Article
                          </button>
                        )}
                      </div>
                      <div className="text-right tabular-nums text-zinc-300">
                        {kw.monthlyVolume !== null ? kw.monthlyVolume.toLocaleString() : "—"}
                      </div>
                      <div className={`text-right tabular-nums ${diffColor(kw.difficulty)}`}>
                        {kw.difficulty !== null ? kw.difficulty : "—"}
                      </div>
                      <div className="text-right tabular-nums text-zinc-400">
                        {kw.cpc !== null ? `₹${kw.cpc.toFixed(0)}` : "—"}
                      </div>
                      <div className="text-right tabular-nums text-zinc-400">
                        {kw.gscPosition ? `#${Math.round(kw.gscPosition)}` : "—"}
                      </div>
                      <div className="text-right">
                        <Badge className={`text-[9px] h-4 px-1.5 rounded border-0 ${oppBadgeColor(kw.opportunity)}`}>
                          {kw.opportunity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state — only shown if we don't have a city yet (auto-seed can't fire) */}
      {!data && !isLoading && (
        <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
          <CardContent className="p-8 text-center">
            <Target size={28} className="text-zinc-500 mx-auto mb-3" />
            <h3 className="text-[14px] font-semibold mb-1">Keyword research runs automatically</h3>
            <p className="text-[12px] text-zinc-500 max-w-md mx-auto">
              Once your city and projects are set, Cabbge auto-researches keywords around your primary project.
              Or enter any seed above to explore a different angle.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

