"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link as LinkIcon, ArrowRight, Layers, AlertCircle, Loader2, Zap, Copy, Check } from "lucide-react";

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
  /** If provided, the "no crawl yet" state shows a Crawl Now button that triggers this. */
  onRunCrawl?: () => void;
  isCrawling?: boolean;
  /** Customer site URL — used to deploy internal-link snippets via
   *  the loader. When absent, only Copy HTML is offered. */
  siteUrl?: string;
}

function pathOf(url: string): string {
  try { return new URL(url).pathname; } catch { return url; }
}

export function InternalLinkingPanel({ data, isLoading, hasCrawl, onAnalyze, onRunCrawl, isCrawling, siteUrl }: Props) {
  const [tab, setTab] = useState<"suggestions" | "orphans" | "clusters">("suggestions");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [deployedIdx, setDeployedIdx] = useState<number | null>(null);
  const [deploySnippetForIdx, setDeploySnippetForIdx] = useState<number | null>(null);
  const [deployedSlots, setDeployedSlots] = useState<Map<number, string>>(new Map());

  // Build the HTML snippet a customer can paste into their CMS to
  // deploy a single internal-link suggestion. Real deployment requires
  // editing the source page's content; this v1 hands the customer the
  // exact HTML so they can drop it into the right paragraph in their
  // editor without retyping the anchor or URL.
  const linkHtmlFor = (s: LinkSuggestion): string => {
    // Sanitize: only http/https URLs, escape angle brackets in anchor.
    const safeUrl = /^https?:\/\//i.test(s.toUrl) ? s.toUrl : "";
    const safeAnchor = (s.anchorText || s.toTitle || "Read more")
      .replace(/[<>]/g, "")
      .slice(0, 120);
    return safeUrl ? `<a href="${safeUrl}">${safeAnchor}</a>` : "";
  };

  const copySnippet = (idx: number, snippet: string) => {
    if (!snippet || typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(snippet).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1500);
    }).catch(() => { /* swallow */ });
  };

  // Stable slot for a (toUrl, anchor) pair. Same suggestion always maps
  // to the same slot so re-deploying overwrites in place rather than
  // piling duplicates. Lowercase + alphanumeric so the dashed slot is
  // safe to embed in HTML attributes.
  const slotFor = (s: LinkSuggestion): string => {
    const sluggify = (raw: string) =>
      raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    let host = "";
    try { host = new URL(s.toUrl).hostname.replace(/^www\./, "").replace(/\./g, "-"); } catch { host = ""; }
    return `inlink-${host}-${sluggify(s.anchorText || s.toTitle || "link")}`;
  };

  // Deploy via loader: POST the anchor HTML to /api/content-deploy under
  // a stable slot, then show the customer the <span> placeholder they
  // paste into the source page where they want the link to land. The
  // existing loader (already a one-line install) handles render at
  // page load.
  const deployViaLoader = async (idx: number, s: LinkSuggestion) => {
    if (!siteUrl) return;
    const snippet = linkHtmlFor(s);
    if (!snippet) return;
    const slot = slotFor(s);
    try {
      const res = await fetch("/api/content-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl,
          slot,
          contentType: "internal_link",
          html: snippet,
          meta: {
            fromUrl: s.fromUrl,
            toUrl: s.toUrl,
            anchorText: s.anchorText,
          },
        }),
      });
      if (!res.ok) return;
      setDeployedSlots((prev) => {
        const next = new Map(prev);
        next.set(idx, slot);
        return next;
      });
      setDeployedIdx(idx);
      setDeploySnippetForIdx(idx);
    } catch { /* swallow — UI shows nothing changed */ }
  };

  const placeholderSpanFor = (slot: string): string =>
    `<span data-cabbge-slot="${slot}"></span>`;

  if (!hasCrawl) {
    return (
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardContent className="p-6 text-center">
          <LinkIcon size={24} className="text-zinc-500 mx-auto mb-2" />
          <h3 className="text-[13px] font-semibold mb-1">Internal linking analysis</h3>
          <p className="text-[11px] text-zinc-500 mb-3 max-w-md mx-auto">
            Uses site-crawl data to find orphan pages and suggest specific link insertions
            between topically-related pages. Takes ~60 seconds.
          </p>
          {onRunCrawl && (
            <button
              onClick={onRunCrawl}
              disabled={isCrawling}
              className="h-8 px-4 rounded-lg bg-[#7CB342] text-zinc-950 text-[12px] font-semibold hover:bg-[#8BC34A] active:scale-[0.97] disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              {isCrawling ? <Loader2 size={12} className="animate-spin" /> : null}
              {isCrawling ? "Crawling..." : "Crawl Site now"}
            </button>
          )}
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
                  {data.suggestions.slice(0, 20).map((s, i) => {
                    const snippet = linkHtmlFor(s);
                    return (
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
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-zinc-500">Suggested anchor:</span>
                          <code className="text-zinc-300 bg-zinc-900/60 px-1.5 py-0.5 rounded text-[10px] truncate flex-1">
                            {s.anchorText.slice(0, 80)}
                          </code>
                          {snippet && (
                            <button
                              onClick={() => copySnippet(i, snippet)}
                              className="text-[10px] font-medium px-2 py-1 rounded-md bg-zinc-700 text-zinc-200 hover:bg-zinc-600 inline-flex items-center gap-1 flex-shrink-0"
                              title="Copy HTML snippet — paste into your CMS at the source page"
                            >
                              {copiedIdx === i ? (
                                <><Check size={10} className="text-[#7CB342]" />Copied</>
                              ) : (
                                <><Copy size={10} />Copy HTML</>
                              )}
                            </button>
                          )}
                          {snippet && siteUrl && (
                            <button
                              onClick={() => deployViaLoader(i, s)}
                              className="text-[10px] font-medium px-2 py-1 rounded-md bg-[#7CB342] text-zinc-950 hover:bg-[#8BC34A] inline-flex items-center gap-1 flex-shrink-0"
                              title="Push link HTML to the Cabbge loader. You'll get a placeholder <span> to paste once into the source page."
                            >
                              {deployedIdx === i ? (
                                <><Check size={10} />Deployed</>
                              ) : (
                                <>Deploy via loader</>
                              )}
                            </button>
                          )}
                        </div>
                        {deploySnippetForIdx === i && deployedSlots.get(i) && (
                          <div className="mt-2 p-2 rounded-md bg-zinc-950 border border-[#7CB342]/30 space-y-1">
                            <div className="text-[10px] text-[#7CB342] font-semibold">
                              Paste this once into {pathOf(s.fromUrl)} where you want the link to land:
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="text-[10px] text-zinc-200 bg-zinc-900 px-2 py-1 rounded font-mono flex-1 truncate">
                                {placeholderSpanFor(deployedSlots.get(i)!)}
                              </code>
                              <button
                                onClick={() => copySnippet(-1 - i, placeholderSpanFor(deployedSlots.get(i)!))}
                                className="text-[10px] px-2 py-1 rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600 inline-flex items-center gap-1 flex-shrink-0"
                              >
                                {copiedIdx === -1 - i ? <><Check size={10} className="text-[#7CB342]" />Copied</> : <><Copy size={10} />Copy</>}
                              </button>
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              Loader fills it on next page load. Re-deploy this suggestion anytime to update the anchor.
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
