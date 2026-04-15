"use client";

import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Bot,
  AlertTriangle,
  ChevronDown,
  Wrench,
  Link2,
  Users,
  Copy,
  Check,
  FileText,
  MapPin,
  Search,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

interface Props {
  auditResult: any;
  aiVisResult: any;
  backlinkResult: any;
  technicalResult: any;
  competitorResults: any[];
  geoProgress?: any;
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

export function ActionsFeed({ auditResult, aiVisResult, backlinkResult, technicalResult, competitorResults, geoProgress, onNavigateToTab }: Props) {
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

  // GEO Progress — newly lost queries
  if (geoProgress?.newlyLost?.length > 0) {
    feedItems.push({
      id: "geo_lost",
      icon: <TrendingUp size={16} />,
      iconBg: "bg-red-500/10 text-red-400",
      title: `Lost ${geoProgress.newlyLost.length} Queries`,
      subtitle: "Competitors may have overtaken you — act now",
      priority: "critical",
      actionTab: "aigeo",
    });
  }

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
      title: `Won ${geoProgress.newlyFound.length} New Queries`,
      subtitle: "Your visibility is improving — keep going",
      priority: "low",
      actionTab: "aigeo",
    });
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
