"use client";

import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Bot,
  AlertTriangle,
  ChevronDown,
  Wrench,
  Link2,
  Copy,
  Check,
  FileText,
  Search,
  TrendingUp,
  TrendingDown,
  Target,
  Eye,
  Rocket,
} from "lucide-react";
import { useState } from "react";

interface Props {
  auditResult: any;
  aiVisResult: any;
  backlinkResult: any;
  technicalResult: any;
  competitorResults: any[];
  geoProgress?: any;
  // Newer signals added as the product grew — feed them in so Actions
  // Feed reflects the full picture, not just the first 5 scans.
  siteCrawlResult?: any;
  keywordResearchResult?: any;
  internalLinkingResult?: any;
  contentDecayReport?: any;
  gscData?: any;
  onNavigateToTab?: (tab: string) => void;
}

interface FeedItem {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  priority: "critical" | "high" | "medium" | "low";
  actionTab?: string;
  items?: { title: string; severity: string; description: string; snippet?: string }[];
}

export function ActionsFeed({
  auditResult, aiVisResult, backlinkResult, technicalResult, competitorResults,
  geoProgress, siteCrawlResult, keywordResearchResult, internalLinkingResult,
  contentDecayReport, gscData,
  onNavigateToTab,
}: Props) {
  void competitorResults; // kept in props for stability; not currently rendered as a feed item
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copySnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  // Smart prioritized feed — auto-generated from all scan results
  const feedItems: FeedItem[] = [];

  // GEO — highest priority if brand is invisible
  if (aiVisResult) {
    const mentioned = aiVisResult.queryResults?.filter((q: any) => q.chatgpt?.mentioned || q.gemini?.mentioned).length || 0;
    const total = aiVisResult.queryResults?.length || 0;
    if (mentioned < total * 0.3) {
      feedItems.push({
        id: "geo_invisible",
        icon: <Bot size={16} />,
        iconBg: "bg-red-500/10 text-red-400",
        title: "AI Search Invisible",
        subtitle: `Found in ${mentioned}/${total} queries — buyers can't find you on ChatGPT`,
        priority: "critical",
        actionTab: "aigeo",
      });
    } else if (mentioned < total * 0.7) {
      feedItems.push({
        id: "geo_partial",
        icon: <Bot size={16} />,
        iconBg: "bg-amber-500/10 text-amber-400",
        title: "Partial AI Visibility",
        subtitle: `Found in ${mentioned}/${total} queries — room to improve`,
        priority: "high",
        actionTab: "aigeo",
      });
    }
  }

  // (The "newly lost queries" item is rendered below as an expandable
  //  list with severity badges. A second summary-only push here was a
  //  duplicate React key — removed.)

  // SEO fixes
  if (auditResult?.fixes?.length) {
    const critical = auditResult.fixes.filter((f: any) => f.severity === "critical").length;
    const high = auditResult.fixes.filter((f: any) => f.severity === "high").length;
    feedItems.push({
      id: "seo_fixes",
      icon: <Wrench size={16} />,
      iconBg: critical > 0 ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400",
      title: "SEO & Performance",
      subtitle: `${critical} critical, ${high} high priority fixes`,
      priority: critical > 0 ? "critical" : "high",
      actionTab: "health",
      items: auditResult.fixes,
    });
  }

  // Real estate checks
  if (auditResult?.realEstateChecks) {
    const failed = auditResult.realEstateChecks.filter((c: any) => !c.passed);
    if (failed.length > 0) {
      feedItems.push({
        id: "re_checks",
        icon: <AlertTriangle size={16} />,
        iconBg: "bg-amber-500/10 text-amber-400",
        title: "Real Estate Checks",
        subtitle: `${failed.length} issues — RERA, pricing, CTAs`,
        priority: "high",
        actionTab: "checks",
        items: failed.map((c: any) => ({ title: c.label, severity: "high", description: c.details })),
      });
    }
  }

  // Backlinks
  if (backlinkResult) {
    const da = backlinkResult.domainAuthority || 0;
    if (da < 30) {
      feedItems.push({
        id: "backlinks_low",
        icon: <Link2 size={16} />,
        iconBg: "bg-amber-500/10 text-amber-400",
        title: "Low Domain Authority",
        subtitle: `DA ${da} — need more quality backlinks`,
        priority: "high",
        actionTab: "links",
      });
    }
  }

  // Technical issues
  if (technicalResult?.resourceIssues?.length > 0) {
    feedItems.push({
      id: "technical",
      icon: <Wrench size={16} />,
      iconBg: "bg-zinc-800 text-zinc-400",
      title: "Technical Issues",
      subtitle: `${technicalResult.resourceIssues.length} resource issues found`,
      priority: "medium",
      actionTab: "technical",
    });
  }

  // Content suggestions based on AI readiness
  if (aiVisResult?.aiReadiness) {
    const failed = aiVisResult.aiReadiness.filter((c: any) => !c.passed);
    if (failed.length > 0) {
      feedItems.push({
        id: "ai_readiness",
        icon: <FileText size={16} />,
        iconBg: "bg-zinc-800 text-zinc-400",
        title: "AI Readiness",
        subtitle: `${failed.length} checks failing — fix to improve GEO`,
        priority: "medium",
        actionTab: "aigeo",
      });
    }
  }

  // GEO newly found — positive reinforcement
  if (geoProgress?.newlyFound?.length > 0) {
    feedItems.push({
      id: "geo_won",
      icon: <TrendingUp size={16} />,
      iconBg: "bg-[#7CB342]/10 text-[#7CB342]",
      title: `Won ${geoProgress.newlyFound.length} New ${geoProgress.newlyFound.length === 1 ? "Query" : "Queries"}`,
      subtitle: "Click to see which queries now mention you",
      priority: "low",
      actionTab: "aigeo",
      items: geoProgress.newlyFound.map((q: string) => ({
        title: q,
        severity: "won",
        description: "Now mentioned in ChatGPT/Gemini results",
      })),
    });
  }

  // GEO newly lost — visible downgrade
  if (geoProgress?.newlyLost?.length > 0) {
    feedItems.push({
      id: "geo_lost",
      icon: <TrendingDown size={16} />,
      iconBg: "bg-amber-500/10 text-amber-400",
      title: `Lost ${geoProgress.newlyLost.length} ${geoProgress.newlyLost.length === 1 ? "Query" : "Queries"}`,
      subtitle: "Click to see which queries stopped mentioning you",
      priority: "high",
      actionTab: "aigeo",
      items: geoProgress.newlyLost.map((q: string) => ({
        title: q,
        severity: "lost",
        description: "No longer surfaced in ChatGPT/Gemini — consider publishing targeted content",
      })),
    });
  }

  // Content decay — pages dropping in Google rankings (from GSC history)
  if (contentDecayReport?.decayingPages?.length > 0) {
    const critical = contentDecayReport.decayingPages.filter((p: any) => p.severity === "critical").length;
    feedItems.push({
      id: "content_decay",
      icon: <TrendingDown size={16} />,
      iconBg: critical > 0 ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400",
      title: `${contentDecayReport.decayingPages.length} Page${contentDecayReport.decayingPages.length === 1 ? "" : "s"} Declining`,
      subtitle: critical > 0
        ? `${critical} critical — dropped out of top 10. Refresh content now.`
        : "Google rankings dropped — refresh content before they fall further",
      priority: critical > 0 ? "critical" : "high",
      actionTab: "health",
    });
  }

  // Competitor citation alerts — competitors mentioned for queries you're invisible on
  if (geoProgress?.competitorAlerts?.length > 0) {
    feedItems.push({
      id: "competitor_alerts",
      icon: <Eye size={16} />,
      iconBg: "bg-red-500/10 text-red-400",
      title: `Competitors Winning ${geoProgress.competitorAlerts.length} Quer${geoProgress.competitorAlerts.length === 1 ? "y" : "ies"}`,
      subtitle: "AI recommends your competitors — not you — on these searches",
      priority: "critical",
      actionTab: "aigeo",
    });
  }

  // GSC "almost winning" — positions 4-20 with impressions (easy pushes to top 3)
  if (gscData?.topQueries?.length > 0) {
    const almost = gscData.topQueries.filter((q: any) => q.position > 3 && q.position <= 20 && q.impressions > 10);
    if (almost.length > 0) {
      feedItems.push({
        id: "gsc_almost",
        icon: <TrendingUp size={16} />,
        iconBg: "bg-blue-500/10 text-blue-400",
        title: `${almost.length} Almost-Winning Quer${almost.length === 1 ? "y" : "ies"}`,
        subtitle: "Ranked 4-20 on Google with impressions — push to top 3 for 5-10× clicks",
        priority: "high",
        actionTab: "search",
      });
    }
  }

  // Site crawl findings — orphan pages, thin content, broken links
  if (siteCrawlResult?.summary) {
    const s = siteCrawlResult.summary;
    const criticalIssues = s.pagesWithBrokenLinks + s.noindexPages;
    const highIssues = s.pagesWithThinContent + s.pagesWithoutTitle + s.pagesWithoutH1 + s.orphanPages;
    if (criticalIssues > 0 || highIssues > 3) {
      const parts = [];
      if (s.pagesWithBrokenLinks > 0) parts.push(`${s.pagesWithBrokenLinks} broken`);
      if (s.pagesWithThinContent > 0) parts.push(`${s.pagesWithThinContent} thin`);
      if (s.orphanPages > 0) parts.push(`${s.orphanPages} orphan`);
      if (s.pagesWithoutH1 > 0) parts.push(`${s.pagesWithoutH1} no H1`);
      feedItems.push({
        id: "crawl_issues",
        icon: <Globe size={16} />,
        iconBg: criticalIssues > 0 ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400",
        title: "Site-wide SEO Issues",
        subtitle: `${siteCrawlResult.totalPages} pages crawled — ${parts.join(", ")} pages`,
        priority: criticalIssues > 0 ? "critical" : "high",
        actionTab: "health",
      });
    }
  }

  // Internal linking — orphan pages + link suggestions
  if (internalLinkingResult) {
    const orphans = internalLinkingResult.orphanPages?.length || 0;
    const suggestions = internalLinkingResult.suggestions?.length || 0;
    if (orphans > 0 || suggestions >= 5) {
      feedItems.push({
        id: "internal_linking",
        icon: <Link2 size={16} />,
        iconBg: orphans > 3 ? "bg-amber-500/10 text-amber-400" : "bg-zinc-800 text-zinc-400",
        title: "Internal Linking Gaps",
        subtitle: orphans > 0
          ? `${orphans} orphan page${orphans === 1 ? "" : "s"} + ${suggestions} linking opportunities`
          : `${suggestions} specific link suggestions`,
        priority: orphans > 3 ? "high" : "medium",
        actionTab: "health",
      });
    }
  }

  // Keyword research — high-opportunity keywords worth writing for
  if (keywordResearchResult?.keywords?.length > 0) {
    const highOpp = keywordResearchResult.keywords.filter((k: any) => k.opportunity === "high");
    if (highOpp.length > 0) {
      feedItems.push({
        id: "keyword_opps",
        icon: <Target size={16} />,
        iconBg: "bg-[#7CB342]/10 text-[#7CB342]",
        title: `${highOpp.length} High-Opportunity Keyword${highOpp.length === 1 ? "" : "s"}`,
        subtitle: highOpp[0]?.keyword ? `Start with: "${highOpp[0].keyword}"` : "High volume + low difficulty targets found",
        priority: "high",
        actionTab: "health",
      });
    }
  }

  // Schema not deployed — high-impact easy win
  if (aiVisResult?.aiReadiness) {
    const schemaCheck = aiVisResult.aiReadiness.find((c: any) => c.check?.toLowerCase().includes("schema") || c.check?.toLowerCase().includes("structured data"));
    if (schemaCheck && !schemaCheck.passed) {
      feedItems.push({
        id: "schema_missing",
        icon: <Rocket size={16} />,
        iconBg: "bg-amber-500/10 text-amber-400",
        title: "Schema Not Deployed",
        subtitle: "No JSON-LD on your pages — AI can't understand context. 1-line fix via schema loader.",
        priority: "high",
        actionTab: "content",
      });
    }
  }

  // Empty state
  if (feedItems.length === 0) {
    if (!auditResult && !aiVisResult) {
      feedItems.push({
        id: "welcome",
        icon: <Search size={16} />,
        iconBg: "bg-zinc-800 text-zinc-400",
        title: "Scanning your website...",
        subtitle: "Results will appear here automatically",
        priority: "low",
      });
    } else {
      feedItems.push({
        id: "all_good",
        icon: <Globe size={16} />,
        iconBg: "bg-[#7CB342]/10 text-[#7CB342]",
        title: "Looking good!",
        subtitle: "No critical issues found",
        priority: "low",
      });
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  feedItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const priorityColors: Record<string, string> = {
    critical: "bg-red-500",
    high: "bg-amber-500",
    medium: "bg-zinc-500",
    low: "bg-[#7CB342]",
  };

  const severityStyles: Record<string, string> = {
    critical: "border-red-500/30 text-red-400 bg-red-500/8",
    high: "border-amber-500/30 text-amber-400 bg-amber-500/8",
    medium: "border-zinc-600 text-zinc-400 bg-zinc-800/30",
    low: "border-zinc-700 text-zinc-500 bg-zinc-800/30",
    won: "border-[#7CB342]/30 text-[#7CB342] bg-[#7CB342]/8",
    lost: "border-amber-500/30 text-amber-400 bg-amber-500/8",
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-2 h-2 rounded-full ${feedItems[0]?.priority === "critical" ? "bg-red-500 animate-pulse" : feedItems[0]?.priority === "high" ? "bg-amber-500" : "bg-[#7CB342]"}`} />
        <h3 className="text-[14px] font-semibold text-zinc-100">Actions Feed</h3>
      </div>

      <div className="space-y-2">
        {feedItems.map((item) => {
          const isExpanded = expandedItem === item.id;
          return (
            <div
              key={item.id}
              className="rounded-xl bg-zinc-900/60 border border-white/[0.06] hover:border-white/[0.1] transition-all duration-150 cursor-pointer"
              onClick={() => item.items ? setExpandedItem(isExpanded ? null : item.id) : item.actionTab && onNavigateToTab?.(item.actionTab)}
            >
              <div className="p-3">
                <div className="flex items-start gap-2.5">
                  <div className={`rounded-lg p-2 ${item.iconBg} flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[13px] font-semibold text-zinc-100 leading-snug">{item.title}</h4>
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityColors[item.priority]}`} />
                      {item.items && (
                        <ChevronDown size={14} className={`text-zinc-600 ml-auto transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                      )}
                    </div>
                    <p className="text-[12px] text-zinc-400 mt-0.5">{item.subtitle}</p>
                    {item.actionTab && onNavigateToTab && !item.items && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onNavigateToTab(item.actionTab!); }}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#7CB342]/10 text-[#7CB342] border border-[#7CB342]/20 hover:bg-[#7CB342]/20 active:scale-[0.97] transition-all"
                      >
                        View & Fix →
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && item.items && (
                <div className="px-3 pb-3 space-y-2 border-t border-zinc-800/40 pt-2.5">
                  {item.items.slice(0, 5).map((fix, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className={`text-[10px] h-5 rounded-md font-medium flex-shrink-0 ${severityStyles[fix.severity] || severityStyles.medium}`}>
                          {fix.severity}
                        </Badge>
                        <span className="text-[12px] text-zinc-200 leading-snug">{fix.title}</span>
                      </div>
                      {fix.snippet && (
                        <div className="relative ml-[52px] group/snippet">
                          <pre className="text-[11px] bg-zinc-800/60 rounded-lg p-2.5 pr-9 overflow-x-auto text-zinc-300 border border-zinc-700/30">{fix.snippet}</pre>
                          <button onClick={(e) => { e.stopPropagation(); copySnippet(fix.snippet!, `${item.id}-${i}`); }} className="absolute top-2 right-2 p-1 rounded text-zinc-600 hover:text-zinc-300 opacity-0 group-hover/snippet:opacity-100 transition-all" title="Copy">
                            {copiedSnippet === `${item.id}-${i}` ? <Check size={13} className="text-[#7CB342]" /> : <Copy size={13} />}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {item.items.length > 5 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); item.actionTab && onNavigateToTab?.(item.actionTab); }}
                      className="text-[11px] font-medium text-[#7CB342] hover:text-[#8BC34A] transition-colors"
                    >
                      +{item.items.length - 5} more → View all
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
