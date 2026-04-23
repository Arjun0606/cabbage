"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe, CheckCircle2, XCircle, AlertTriangle, Link as LinkIcon, FileText, Image,
  ChevronDown, ChevronRight, ExternalLink, Activity,
} from "lucide-react";

interface CrawledPage {
  url: string;
  statusCode: number;
  title: string;
  metaDescription: string;
  h1: string;
  h2Count: number;
  h3Count: number;
  wordCount: number;
  images: { total: number; withAlt: number; withoutAlt: number };
  internalLinks: string[];
  externalLinkCount: number;
  hasSchema: boolean;
  schemaTypes: string[];
  hasCanonical: boolean;
  isIndexable: boolean;
  loadTimeMs: number;
  fetchError?: string;
  issues: Array<{ severity: "high" | "medium" | "low"; message: string }>;
}

interface SiteCrawlResult {
  startUrl: string;
  origin: string;
  crawledAt: string;
  totalPages: number;
  maxPagesReached: boolean;
  durationMs: number;
  pages: CrawledPage[];
  summary: {
    pagesWithoutTitle: number;
    pagesWithoutMetaDescription: number;
    pagesWithoutH1: number;
    pagesWithDuplicateTitles: number;
    pagesWithThinContent: number;
    pagesWithBrokenLinks: number;
    pagesWithoutSchema: number;
    noindexPages: number;
    orphanPages: number;
    imagesWithoutAlt: number;
  };
}

interface Props {
  data: SiteCrawlResult | null;
  onRunCrawl?: () => void;
  isRunning?: boolean;
  /** Optional handler: user clicks "Fix" on a specific page */
  onFixPage?: (url: string, issues: CrawledPage["issues"]) => void;
}

function severityColor(s: "high" | "medium" | "low"): string {
  return s === "high" ? "bg-red-500/10 text-red-400 border-red-500/20"
    : s === "medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
    : "bg-zinc-700/40 text-zinc-400 border-zinc-700/50";
}

export function SiteCrawlPanel({ data, onRunCrawl, isRunning, onFixPage }: Props) {
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "issues" | "errors">("issues");

  if (!data && !isRunning) {
    return (
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardContent className="p-8 text-center">
          <Globe size={28} className="text-zinc-500 mx-auto mb-3" />
          <h3 className="text-[14px] font-semibold mb-1">Full-site SEO Audit</h3>
          <p className="text-[12px] text-zinc-500 mb-4 max-w-md mx-auto">
            Crawl every page of your site and audit each URL individually.
            Finds thin content, missing meta tags, broken links, orphan pages, and more.
          </p>
          {onRunCrawl && (
            <button
              onClick={onRunCrawl}
              className="h-9 px-4 rounded-lg bg-[#7CB342] text-zinc-950 text-[13px] font-semibold hover:bg-[#8BC34A] active:scale-[0.97] transition-all inline-flex items-center gap-1.5"
            >
              <Activity size={13} /> Crawl Site
            </button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isRunning) {
    return (
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardContent className="p-8 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-[#7CB342] animate-spin mx-auto mb-3" />
          <h3 className="text-[14px] font-semibold mb-1">Crawling your site…</h3>
          <p className="text-[12px] text-zinc-500">Visiting pages, auditing each URL. This takes 30-90 seconds.</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const pagesWithIssues = data.pages.filter((p) => p.issues.length > 0);
  const errorPages = data.pages.filter((p) => !!p.fetchError);

  const filteredPages =
    filter === "errors" ? errorPages :
    filter === "issues" ? pagesWithIssues :
    data.pages;

  const summaryCards: Array<{ label: string; value: number; color: string }> = [
    { label: "Total pages", value: data.totalPages, color: "text-zinc-200" },
    { label: "With issues", value: pagesWithIssues.length, color: pagesWithIssues.length > 0 ? "text-amber-400" : "text-[#7CB342]" },
    { label: "Broken / errored", value: errorPages.length, color: errorPages.length > 0 ? "text-red-400" : "text-[#7CB342]" },
    { label: "Thin content", value: data.summary.pagesWithThinContent, color: data.summary.pagesWithThinContent > 0 ? "text-amber-400" : "text-zinc-400" },
    { label: "No H1", value: data.summary.pagesWithoutH1, color: data.summary.pagesWithoutH1 > 0 ? "text-amber-400" : "text-zinc-400" },
    { label: "No meta desc", value: data.summary.pagesWithoutMetaDescription, color: data.summary.pagesWithoutMetaDescription > 0 ? "text-amber-400" : "text-zinc-400" },
    { label: "Orphan pages", value: data.summary.orphanPages, color: data.summary.orphanPages > 0 ? "text-amber-400" : "text-zinc-400" },
    { label: "Noindex'd", value: data.summary.noindexPages, color: data.summary.noindexPages > 0 ? "text-red-400" : "text-[#7CB342]" },
  ];

  return (
    <div className="space-y-4">
      {/* Header + summary */}
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <Globe size={15} className="text-[#7CB342]" />
            <CardTitle className="text-[14px] font-semibold">Full-site Audit</CardTitle>
            <Badge className="text-[10px] bg-zinc-800 text-zinc-500 border-0 rounded-md h-5 px-1.5 ml-auto">
              {data.totalPages} pages • {(data.durationMs / 1000).toFixed(1)}s
            </Badge>
            {onRunCrawl && (
              <button
                onClick={onRunCrawl}
                className="h-7 px-2.5 rounded-md text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-700 border border-white/[0.06] flex items-center gap-1"
              >
                <Activity size={11} /> Recrawl
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {summaryCards.map(({ label, value, color }) => (
              <div key={label} className="p-2.5 rounded-lg bg-zinc-800/40 border border-white/[0.04]">
                <div className={`text-[18px] font-bold tabular-nums ${color}`}>{value}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          {data.maxPagesReached && (
            <div className="mt-3 p-2.5 rounded-lg bg-amber-500/[0.04] border border-amber-500/20 text-[11px] text-amber-400 flex items-center gap-2">
              <AlertTriangle size={12} />
              Hit crawl limit of {data.totalPages} pages. Cabbge caps at 3000 — rerun with a higher limit if your site has more URLs.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter + page list */}
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[13px] font-semibold">Pages</CardTitle>
            <div className="flex gap-1 text-[11px]">
              {(["issues", "errors", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    filter === f ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {f === "issues" ? `Issues (${pagesWithIssues.length})` :
                   f === "errors" ? `Errors (${errorPages.length})` :
                   `All (${data.pages.length})`}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPages.length === 0 ? (
            <div className="text-center py-6 text-[12px] text-zinc-500">
              {filter === "issues" ? "No issues found. Every page looks good!" : "No pages match this filter."}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredPages.slice(0, 100).map((page) => {
                const isExpanded = expandedUrl === page.url;
                const path = new URL(page.url).pathname;
                const highestSeverity = page.issues.find((i) => i.severity === "high")
                  ? "high"
                  : page.issues.find((i) => i.severity === "medium")
                    ? "medium"
                    : page.issues.length > 0 ? "low" : null;
                return (
                  <div
                    key={page.url}
                    className="rounded-lg border border-white/[0.04] bg-zinc-800/20 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedUrl(isExpanded ? null : page.url)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800/40 transition-colors"
                    >
                      {isExpanded ? <ChevronDown size={12} className="text-zinc-500 flex-shrink-0" /> : <ChevronRight size={12} className="text-zinc-500 flex-shrink-0" />}
                      {page.fetchError ? (
                        <XCircle size={12} className="text-red-400 flex-shrink-0" />
                      ) : page.issues.length === 0 ? (
                        <CheckCircle2 size={12} className="text-[#7CB342] flex-shrink-0" />
                      ) : (
                        <AlertTriangle size={12} className={highestSeverity === "high" ? "text-red-400 flex-shrink-0" : "text-amber-400 flex-shrink-0"} />
                      )}
                      <span className="text-[12px] text-zinc-300 truncate flex-1">{path}</span>
                      <span className="text-[10px] tabular-nums text-zinc-500 flex-shrink-0">
                        {page.wordCount > 0 ? `${page.wordCount} words` : page.fetchError ? "error" : "—"}
                      </span>
                      {page.issues.length > 0 && (
                        <Badge className={`text-[9px] h-4 px-1.5 rounded border flex-shrink-0 ${severityColor(highestSeverity || "low")}`}>
                          {page.issues.length} issue{page.issues.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-white/[0.04] bg-zinc-800/10">
                        {/* Key meta info */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] mt-2 mb-2">
                          <div><span className="text-zinc-500">Title:</span> <span className="text-zinc-300">{page.title || <em className="text-red-400">missing</em>}</span></div>
                          <div><span className="text-zinc-500">Meta desc:</span> <span className="text-zinc-300">{page.metaDescription?.slice(0, 80) || <em className="text-red-400">missing</em>}</span></div>
                          <div><span className="text-zinc-500">H1:</span> <span className="text-zinc-300">{page.h1 || <em className="text-red-400">missing</em>}</span></div>
                          <div><span className="text-zinc-500">H2s:</span> <span className="text-zinc-300">{page.h2Count}</span></div>
                          <div className="flex items-center gap-1"><Image size={10} className="text-zinc-500" aria-hidden /> <span className="text-zinc-300">{page.images.total} ({page.images.withoutAlt} no alt)</span></div>
                          <div className="flex items-center gap-1"><LinkIcon size={10} className="text-zinc-500" /> <span className="text-zinc-300">{page.internalLinks.length} internal, {page.externalLinkCount} external</span></div>
                          <div className="flex items-center gap-1"><FileText size={10} className="text-zinc-500" /> <span className="text-zinc-300">{page.hasSchema ? `Schema: ${page.schemaTypes.join(", ") || "yes"}` : "No schema"}</span></div>
                          <div><span className="text-zinc-500">Load:</span> <span className="text-zinc-300">{(page.loadTimeMs / 1000).toFixed(2)}s</span></div>
                        </div>
                        {/* Issues list */}
                        {page.issues.length > 0 && (
                          <div className="space-y-1 mt-2">
                            {page.issues.map((issue, i) => (
                              <div key={i} className="flex items-center gap-2 text-[11px]">
                                <Badge className={`text-[9px] h-4 px-1.5 rounded border flex-shrink-0 ${severityColor(issue.severity)}`}>
                                  {issue.severity}
                                </Badge>
                                <span className="text-zinc-300">{issue.message}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                          >
                            Visit <ExternalLink size={9} />
                          </a>
                          {onFixPage && page.issues.length > 0 && (
                            <button
                              onClick={() => onFixPage(page.url, page.issues)}
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#7CB342]/10 text-[#7CB342] border border-[#7CB342]/20 hover:bg-[#7CB342]/20 ml-auto"
                            >
                              Fix this page
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
