"use client";

/**
 * Content Queue — the Content tab in a nutshell.
 *
 * Product philosophy: we don't make the customer think about what to
 * write. We mine their brand + city + GSC + GEO scans for gaps, surface
 * them as opportunities, and let them write each one with a single
 * click. Decaying pages become refresh tasks. Every piece of content
 * is tracked through a draft -> published lifecycle so the queue
 * self-empties as they execute.
 *
 * This component replaces the old topic/keyword/type form and the
 * "write article for any keyword" free-text box. Those were reporting,
 * not execution — they forced the customer to do the thinking.
 */

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PenTool,
  Loader2,
  Target,
  TrendingDown,
  TrendingUp,
  FileText,
  Trash2,
  RefreshCw,
  Code,
  ChevronDown,
  ExternalLink,
  Building,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import {
  getArticleQueue,
  deleteTrackedArticle,
  type TrackedArticle,
} from "@/lib/geoHistory";
import { DeployViaLoader } from "./DeployViaLoader";
import { PublishButton } from "./PublishButton";
import { SchemaDeployPanel } from "./SchemaDeployPanel";

interface Opportunity {
  keyword: string;
  source: "gap-ai" | "gap-keyword" | "gsc";
  reason: string;
  volume: number | null;
  difficulty: number | null;
  priority: "high" | "medium" | "low";
}

interface DecayingPage {
  url: string;
  currentPosition: number;
  previousPosition: number;
  positionDrop: number;
  currentClicks: number;
  clickDrop: number;
  severity: "critical" | "high" | "medium" | "low";
}

interface Props {
  city: string;
  /** Multi-city scoping. When set the queue shows "Scoped to {city}". */
  selectedCity?: string | null;
  websiteUrl: string;
  keywordResearchResult: any;
  isResearchingKeywords?: boolean;
  onRefreshKeywords: () => void;
  geoProgress?: any;
  contentDecayReport?: {
    decayingPages: DecayingPage[];
    risingPages: Array<{ url: string; positionGain: number }>;
    comparisonDays: number;
    totalPagesCompared?: number;
  } | null;
  snapshotCount?: number;
  articleResult: any;
  isFixingGeo?: boolean;
  onWriteArticle?: (query: string) => void;
  onRefreshPage?: (url: string) => void;
  onRunGbpPosts?: () => void;
  gbpResult?: any;
  isGeneratingGbp?: boolean;
  onRunSchemaGenerator: () => void;
  schemaResult: any;
  isGeneratingSchema: boolean;
}

function priorityBadge(p: Opportunity["priority"]) {
  return p === "high"
    ? "bg-[#7CB342]/15 text-[#7CB342] border-[#7CB342]/30"
    : p === "medium"
    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : "bg-zinc-800 text-zinc-500 border-zinc-700/50";
}

function severityBadge(s: DecayingPage["severity"]) {
  return s === "critical"
    ? "bg-red-500/15 text-red-400 border-red-500/30"
    : s === "high"
    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : s === "medium"
    ? "bg-zinc-700/40 text-zinc-300 border-zinc-700/50"
    : "bg-zinc-800 text-zinc-500 border-zinc-800";
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export function ContentQueue({
  city,
  selectedCity,
  websiteUrl,
  keywordResearchResult,
  isResearchingKeywords,
  onRefreshKeywords,
  geoProgress,
  contentDecayReport,
  snapshotCount = 0,
  articleResult,
  isFixingGeo,
  onWriteArticle,
  onRefreshPage,
  onRunGbpPosts,
  gbpResult,
  isGeneratingGbp,
  onRunSchemaGenerator,
  schemaResult,
  isGeneratingSchema,
}: Props) {
  const [queue, setQueue] = useState<{ drafts: TrackedArticle[]; published: TrackedArticle[] }>({ drafts: [], published: [] });
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Re-read the draft queue from localStorage whenever the caller tells
  // us a new article was generated (articleResult.title changes) or
  // published. This keeps the queue honest without a global store.
  useEffect(() => {
    setQueue(getArticleQueue());
  }, [articleResult?._trackedArticleId, articleResult?.title]);

  const handleDismiss = (id: string) => {
    deleteTrackedArticle(id);
    setQueue(getArticleQueue());
  };

  // --- Build opportunities list: GEO blind spots + keyword research gaps ---
  const opportunities = useMemo<Opportunity[]>(() => {
    const seen = new Set<string>();
    const out: Opportunity[] = [];

    // 1) GEO blind spots — queries where ChatGPT + Gemini don't mention
    //    the brand. Highest priority because they represent lost demand
    //    AI models are actively answering for competitors.
    const blind: string[] = geoProgress?.neverFound?.length
      ? geoProgress.neverFound
      : (geoProgress?.currentScan?.queries || [])
          .filter((q: any) => !q.chatgpt?.mentioned && !q.gemini?.mentioned)
          .map((q: any) => q.query);

    for (const q of blind.slice(0, 10)) {
      const key = q.toLowerCase().trim();
      if (seen.has(key) || dismissed.has(key)) continue;
      seen.add(key);
      out.push({
        keyword: q,
        source: "gap-ai",
        reason: "AI doesn't mention you — competitors are being cited here",
        volume: null,
        difficulty: null,
        priority: "high",
      });
    }

    // 2) Keyword opportunities from research. We include high AND medium
    //    opportunity rows — medium covers the case where volume/difficulty
    //    came back null (web-search rate-limited) but the keyword is still
    //    worth writing about. GSC-ranking-#1-through-10 keywords are
    //    excluded because the site already owns them.
    const kws = keywordResearchResult?.keywords || [];
    const scored = kws
      .filter((k: any) =>
        (k.opportunity === "high" || k.opportunity === "medium") &&
        (!k.gscPosition || k.gscPosition > 10)
      )
      .slice()
      .sort((a: any, b: any) => {
        if (a.opportunity !== b.opportunity) return a.opportunity === "high" ? -1 : 1;
        const as = (a.monthlyVolume || 0) / Math.max(1, a.difficulty || 50);
        const bs = (b.monthlyVolume || 0) / Math.max(1, b.difficulty || 50);
        return bs - as;
      });

    for (const k of scored.slice(0, 10)) {
      const key = k.keyword.toLowerCase().trim();
      if (seen.has(key) || dismissed.has(key)) continue;
      seen.add(key);
      const priority: Opportunity["priority"] =
        k.opportunity === "high" || (k.monthlyVolume || 0) >= 500 ? "high" : "medium";
      const reason = k.source === "gsc"
        ? `You rank #${Math.round(k.gscPosition || 0)} — write a stronger article to lift it`
        : k.monthlyVolume
        ? "Search demand with manageable difficulty — an untapped ranking opportunity"
        : "Buyer-intent keyword we inferred from your brand and city";
      out.push({
        keyword: k.keyword,
        source: k.source === "gsc" ? "gsc" : "gap-keyword",
        reason,
        volume: k.monthlyVolume ?? null,
        difficulty: k.difficulty ?? null,
        priority,
      });
    }

    // Sort so AI gaps surface first (they're execution-critical for GEO),
    // then by volume.
    return out.sort((a, b) => {
      if (a.source === "gap-ai" && b.source !== "gap-ai") return -1;
      if (b.source === "gap-ai" && a.source !== "gap-ai") return 1;
      return (b.volume || 0) - (a.volume || 0);
    });
  }, [geoProgress, keywordResearchResult, dismissed]);

  const decaying = (contentDecayReport?.decayingPages || []).slice(0, 8);
  const rising = contentDecayReport?.risingPages || [];

  return (
    <div className="space-y-4">
      {/* -------- Queue header -------- */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles size={14} className="text-[#7CB342]" />
            <h2 className="text-[14px] font-semibold text-zinc-100">Content queue</h2>
            {selectedCity && (
              <Badge className="text-[10px] bg-zinc-800 text-zinc-300 border-0 rounded-md h-5 px-1.5">
                {selectedCity} only
              </Badge>
            )}
          </div>
          <p className="text-[12px] text-zinc-500">
            {selectedCity
              ? `Opportunities, drafts, and decay scoped to ${selectedCity}. Switch to "All cities" in the header to see everything.`
              : "We find the gaps, you approve the articles. Keywords, GEO blind spots, and decaying pages all land here."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefreshKeywords}
          disabled={isResearchingKeywords}
          className="border-zinc-800 text-zinc-400 hover:text-zinc-100 h-8 text-[12px] rounded-lg"
        >
          {isResearchingKeywords ? (
            <><Loader2 size={12} className="animate-spin mr-1.5" />Rescanning</>
          ) : (
            <><RefreshCw size={12} className="mr-1.5" />Rescan</>
          )}
        </Button>
      </div>

      {/* -------- Inline preview of the article just generated -------- */}
      {articleResult && (
        <Card className="bg-[#7CB342]/[0.04] border-[#7CB342]/20 rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={13} className="text-[#7CB342]" />
                  <span className="text-[11px] uppercase tracking-wide text-[#7CB342] font-semibold">Just generated</span>
                </div>
                <h4 className="text-[15px] font-semibold text-zinc-100">{articleResult.title}</h4>
                <p className="text-[12px] text-zinc-500 mt-1 line-clamp-2">{articleResult.metaDescription}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                <Badge className="bg-zinc-800 text-zinc-300 border-0 text-[10px] h-5 rounded-md">
                  {articleResult.wordCount} words
                </Badge>
                <DeployViaLoader
                  html={articleResult.content}
                  title={articleResult.title}
                  metaDescription={articleResult.metaDescription}
                  defaultSiteUrl={websiteUrl}
                  contentType="article"
                />
                <PublishButton
                  title={articleResult.title}
                  content={articleResult.content}
                  excerpt={articleResult.metaDescription}
                  targetKeyword={articleResult.targetKeyword}
                  onPublished={() => setQueue(getArticleQueue())}
                />
              </div>
            </div>
            <details className="group">
              <summary className="cursor-pointer text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1">
                <ChevronDown size={11} className="transition-transform group-open:rotate-180" />
                Preview content
              </summary>
              <div className="mt-2 rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4 max-h-[400px] overflow-y-auto">
                <div className="text-[12px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {articleResult.content}
                </div>
              </div>
            </details>
          </CardContent>
        </Card>
      )}

      {/* -------- Opportunities -------- */}
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} className="text-zinc-300" />
            <h3 className="text-[13px] font-semibold text-zinc-200">Opportunities</h3>
            <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border-0 rounded-md h-5 px-1.5">
              {opportunities.length}
            </Badge>
            <span className="text-[11px] text-zinc-500 ml-auto">
              {opportunities.length === 0 && !isResearchingKeywords
                ? "Nothing obvious — rescan after your next GEO scan"
                : "Ranked by AI-gap first, then volume"}
            </span>
          </div>

          {opportunities.length === 0 && isResearchingKeywords && (
            <div className="py-6 text-center text-[12px] text-zinc-500">
              <Loader2 size={16} className="animate-spin text-[#7CB342] mx-auto mb-2" />
              Mining keywords for {city || "your city"}…
            </div>
          )}

          {opportunities.length === 0 && !isResearchingKeywords && (
            <div className="py-5 text-center text-[12px] text-zinc-500">
              No gaps surfaced yet. Run an AI Visibility scan or click Rescan to expand the keyword set.
            </div>
          )}

          {opportunities.length > 0 && (
            <div className="space-y-1.5">
              {opportunities.slice(0, 10).map((opp, i) => (
                <div
                  key={`${opp.keyword}-${i}`}
                  className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-zinc-800/40 group"
                >
                  <Badge className={`text-[9px] h-4 px-1.5 rounded border flex-shrink-0 ${priorityBadge(opp.priority)}`}>
                    {opp.priority}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-zinc-200 truncate">{opp.keyword}</div>
                    <div className="text-[11px] text-zinc-500 truncate">{opp.reason}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-[11px] tabular-nums text-zinc-400">
                    {opp.volume !== null && <span>{opp.volume.toLocaleString()}/mo</span>}
                    {opp.difficulty !== null && <span>KD {opp.difficulty}</span>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onWriteArticle?.(opp.keyword)}
                      disabled={isFixingGeo}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#7CB342]/15 text-[#7CB342] border border-[#7CB342]/30 hover:bg-[#7CB342]/25 disabled:opacity-50 flex items-center gap-1"
                    >
                      <PenTool size={10} /> Write
                    </button>
                    <button
                      onClick={() => setDismissed((d) => new Set(d).add(opp.keyword.toLowerCase().trim()))}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-1 opacity-0 group-hover:opacity-100"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* -------- Decaying pages -------- */}
      {snapshotCount >= 2 && decaying.length > 0 && (
        <Card className="bg-red-500/[0.03] border-red-500/20 rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={14} className="text-red-400" />
              <h3 className="text-[13px] font-semibold text-red-400">Decaying — refresh these</h3>
              <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border-0 rounded-md h-5 px-1.5">
                {decaying.length}
              </Badge>
              <span className="text-[11px] text-zinc-500 ml-auto">
                last {contentDecayReport?.comparisonDays || 30}d
              </span>
            </div>
            <div className="space-y-1.5">
              {decaying.map((p, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-zinc-800/40">
                  <Badge className={`text-[9px] h-4 px-1.5 rounded border flex-shrink-0 ${severityBadge(p.severity)}`}>
                    {p.severity}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-zinc-200 truncate">{pathOf(p.url)}</div>
                    <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                      #{Math.round(p.previousPosition)} → <span className="text-red-400">#{Math.round(p.currentPosition)}</span>
                      {p.clickDrop > 0 && <span className="text-zinc-600">• −{p.clickDrop} clicks</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => onRefreshPage?.(p.url)}
                    disabled={isFixingGeo}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#7CB342]/15 text-[#7CB342] border border-[#7CB342]/30 hover:bg-[#7CB342]/25 disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
                  >
                    <RefreshCw size={10} /> Refresh
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {snapshotCount < 2 && (
        <div className="text-[11px] text-zinc-500 px-1">
          Connect Google Search Console to start tracking content decay. The queue will surface any page losing rank automatically.
        </div>
      )}

      {/* -------- Drafts (generated but not published) -------- */}
      {queue.drafts.length > 0 && (
        <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={14} className="text-zinc-300" />
              <h3 className="text-[13px] font-semibold text-zinc-200">Drafts — ready to publish</h3>
              <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border-0 rounded-md h-5 px-1.5">
                {queue.drafts.length}
              </Badge>
            </div>
            <div className="space-y-1.5">
              {queue.drafts.map((d) => (
                <div key={d.id} className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-zinc-800/40">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-zinc-200 truncate">{d.title}</div>
                    <div className="text-[11px] text-zinc-500 truncate">
                      Targets &ldquo;{d.query}&rdquo; • generated {new Date(d.generatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDismiss(d.id)}
                    className="text-[10px] text-zinc-500 hover:text-red-400 p-1 flex-shrink-0"
                    title="Delete draft"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 mt-3">
              Drafts currently live in browser storage. Use the <strong className="text-zinc-300">Publish</strong> or <strong className="text-zinc-300">Deploy via loader</strong> buttons on the generated article above to push them live.
            </p>
          </CardContent>
        </Card>
      )}

      {/* -------- Published articles + rising/declining summary -------- */}
      {(queue.published.length > 0 || rising.length > 0) && (
        <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-[#7CB342]" />
              <h3 className="text-[13px] font-semibold text-zinc-200">Live content</h3>
              <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border-0 rounded-md h-5 px-1.5">
                {queue.published.length}
              </Badge>
              {rising.length > 0 && (
                <Badge className="text-[10px] bg-[#7CB342]/15 text-[#7CB342] border-0 rounded-md h-5 px-1.5 ml-auto">
                  {rising.length} rising
                </Badge>
              )}
            </div>
            {queue.published.length > 0 && (
              <div className="space-y-1 mb-3">
                {queue.published.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-1.5 px-2.5 rounded-lg text-[12px]">
                    <div className="flex-1 min-w-0">
                      <div className="text-zinc-300 truncate">{p.title}</div>
                    </div>
                    {p.postScore && (
                      <Badge className={`text-[9px] h-4 px-1.5 rounded border-0 ${
                        p.postScore.chatgptMentioned || p.postScore.geminiMentioned
                          ? "bg-[#7CB342]/15 text-[#7CB342]"
                          : "bg-zinc-800 text-zinc-500"
                      }`}>
                        {p.postScore.chatgptMentioned || p.postScore.geminiMentioned ? "Now cited" : "Not yet cited"}
                      </Badge>
                    )}
                    {p.publishUrl && (
                      <a
                        href={p.publishUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-500 hover:text-zinc-300 flex-shrink-0"
                      >
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            {rising.length > 0 && (
              <p className="text-[11px] text-zinc-500">
                {rising.length} existing page{rising.length === 1 ? "" : "s"} climbing in Google rankings this month — Cabbge will keep watching.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* -------- GBP posts -------- */}
      {onRunGbpPosts && (
        <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Building size={14} className="text-zinc-300" />
                  <h3 className="text-[13px] font-semibold text-zinc-200">Google Business Profile posts</h3>
                </div>
                <p className="text-[11px] text-zinc-500">
                  4 weeks of ready-to-post GBP updates with CTAs — keeps your listing active and helps local ranking.
                </p>
              </div>
              <Button
                onClick={onRunGbpPosts}
                disabled={isGeneratingGbp}
                size="sm"
                className="bg-zinc-100 text-zinc-900 hover:bg-white h-8 text-[12px] rounded-lg"
              >
                {isGeneratingGbp ? (
                  <><Loader2 size={12} className="animate-spin mr-1.5" />Generating</>
                ) : gbpResult?.posts?.length ? (
                  <><RefreshCw size={12} className="mr-1.5" />Regenerate</>
                ) : (
                  <>Generate</>
                )}
              </Button>
            </div>
            {gbpResult?.posts?.length > 0 && (
              <div className="space-y-2">
                {gbpResult.posts.slice(0, 4).map((post: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge className="text-[9px] bg-zinc-800 text-zinc-300 border-0 rounded-md h-4 px-1.5">
                        Week {post.week}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] border-zinc-700/50 text-zinc-500 rounded-md">
                        {post.type}
                      </Badge>
                      <span className="text-[12px] text-zinc-200 font-medium truncate">{post.title}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">{post.body}</p>
                  </div>
                ))}
                {gbpResult.posts.length > 4 && (
                  <div className="text-[11px] text-zinc-500 text-center py-1">
                    + {gbpResult.posts.length - 4} more — copy each into business.google.com
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* -------- Schema (collapsible) -------- */}
      <div>
        <button
          onClick={() => setSchemaOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-900/60 border border-zinc-800/50 text-left hover:border-zinc-700 transition-all"
        >
          <span className="flex items-center gap-2 text-[13px] font-semibold text-zinc-200">
            <Code size={14} className="text-zinc-400" /> JSON-LD schema
          </span>
          <ChevronDown
            size={14}
            className={`text-zinc-500 transition-transform ${schemaOpen ? "rotate-180" : ""}`}
          />
        </button>
        {schemaOpen && (
          <div className="mt-3 space-y-3">
            <Button
              onClick={onRunSchemaGenerator}
              disabled={isGeneratingSchema}
              className="w-full bg-zinc-100 text-zinc-900 hover:bg-white h-10 text-[13px] font-medium rounded-lg"
            >
              {isGeneratingSchema ? (
                <><Loader2 size={14} className="animate-spin mr-2" />Generating schemas</>
              ) : schemaResult ? (
                <><RefreshCw size={14} className="mr-2" />Regenerate schemas</>
              ) : (
                <><Code size={14} className="mr-2" />Generate property schema (JSON-LD)</>
              )}
            </Button>
            {schemaResult && (
              <SchemaDeployPanel
                defaultPageUrl={websiteUrl}
                schemaJson={
                  (schemaResult.schemas &&
                    (schemaResult.schemas.realEstate ||
                      schemaResult.schemas.organization ||
                      Object.values(schemaResult.schemas)[0])) as Record<string, unknown> || null
                }
                schemaType={Object.keys(schemaResult.schemas || {})[0] || "Schema"}
              />
            )}
            {!schemaResult && (
              <p className="text-[11px] text-zinc-500 px-1">
                Generates RealEstateListing, Organization, FAQ, BreadcrumbList, and LocalBusiness JSON-LD. Deploys to your site via the same one-line loader as articles.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
