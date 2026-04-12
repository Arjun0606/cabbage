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
} from "lucide-react";
import { useState } from "react";

interface Props {
  auditResult: any;
  aiVisResult: any;
  backlinkResult: any;
  technicalResult: any;
  competitorResults: any[];
}

interface FeedItem {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  items?: { title: string; severity: string; description: string; snippet?: string }[];
}

export function ActionsFeed({ auditResult, aiVisResult, backlinkResult, technicalResult, competitorResults }: Props) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const feedItems: FeedItem[] = [];

  if (auditResult?.fixes?.length) {
    const critical = auditResult.fixes.filter((f: any) => f.severity === "critical").length;
    const high = auditResult.fixes.filter((f: any) => f.severity === "high").length;
    feedItems.push({
      id: "seo_fixes",
      icon: <Wrench size={16} />,
      iconBg: "bg-blue-500/15 text-blue-400",
      title: "SEO & Performance Fixes",
      subtitle: `${critical} critical, ${high} high priority`,
      items: auditResult.fixes,
    });
  }

  if (auditResult?.realEstateChecks) {
    const failed = auditResult.realEstateChecks.filter((c: any) => !c.passed);
    if (failed.length > 0) {
      feedItems.push({
        id: "re_checks",
        icon: <AlertTriangle size={16} />,
        iconBg: "bg-orange-500/15 text-orange-400",
        title: "Real Estate SEO Issues",
        subtitle: `${failed.length} issues found`,
        items: failed.map((c: any) => ({ title: c.label, severity: "high", description: c.details })),
      });
    }
  }

  if (aiVisResult) {
    const failedChecks = aiVisResult.aiReadiness?.filter((c: any) => !c.passed) || [];
    const missingQueries = aiVisResult.queryResults?.filter(
      (q: any) => !q.chatgpt.mentioned && !q.claude.mentioned && !q.perplexity.mentioned && !q.gemini.mentioned
    ) || [];
    if (failedChecks.length > 0 || missingQueries.length > 0) {
      feedItems.push({
        id: "ai_geo",
        icon: <Bot size={16} />,
        iconBg: "bg-violet-500/15 text-violet-400",
        title: "AI/GEO Recommendations",
        subtitle: `${failedChecks.length + missingQueries.length} issues found`,
        items: [
          ...failedChecks.map((c: any) => ({ title: c.check, severity: "high", description: c.details })),
          ...missingQueries.slice(0, 5).map((q: any) => ({
            title: `Not found for: "${q.query}"`,
            severity: "medium",
            description: `Your brand doesn't appear in any AI answer for this query. Create content targeting this keyword to improve visibility.`,
          })),
        ],
      });
    }
  }

  if (backlinkResult?.recommendations?.length) {
    feedItems.push({
      id: "backlinks",
      icon: <Link2 size={16} />,
      iconBg: "bg-emerald-500/15 text-emerald-400",
      title: "Link Building Opportunities",
      subtitle: `DA ${backlinkResult.domainAuthority}, ${backlinkResult.recommendations.length} recommendations`,
      items: backlinkResult.recommendations.map((r: any) => ({
        title: r.title, severity: r.priority, description: r.description,
      })),
    });
  }

  if (technicalResult?.resourceIssues?.length) {
    feedItems.push({
      id: "technical",
      icon: <Wrench size={16} />,
      iconBg: "bg-zinc-500/15 text-zinc-400",
      title: "Technical Issues",
      subtitle: `On-Page score: ${technicalResult.onPageScore}/100, ${technicalResult.resourceIssues.length} issues`,
      items: technicalResult.resourceIssues.map((i: any) => ({
        title: i.issue, severity: i.severity === "error" ? "critical" : "medium", description: "",
      })),
    });
  }

  if (competitorResults?.length) {
    const allInsights = competitorResults.flatMap((r: any) =>
      (r.insights || []).map((i: any) => ({
        title: `${r.competitor.name}: ${i.title}`,
        severity: i.type === "gap" ? "high" : "medium",
        description: i.description,
      }))
    );
    if (allInsights.length) {
      feedItems.push({
        id: "competitors",
        icon: <Users size={16} />,
        iconBg: "bg-amber-500/15 text-amber-400",
        title: "Competitor Insights",
        subtitle: `${competitorResults.length} competitors, ${allInsights.length} insights`,
        items: allInsights,
      });
    }
  }

  if (feedItems.length === 0) {
    feedItems.push({
      id: "welcome",
      icon: <Globe size={16} />,
      iconBg: "bg-emerald-500/15 text-emerald-400",
      title: "Welcome to CabbageSEO",
      subtitle: "Run your first audit to see recommendations",
    });
  }

  const severityStyles: Record<string, string> = {
    critical: "border-red-500/30 text-red-400 bg-red-500/5",
    high: "border-orange-500/30 text-orange-400 bg-orange-500/5",
    medium: "border-yellow-500/30 text-yellow-400 bg-yellow-500/5",
    low: "border-zinc-600 text-zinc-500 bg-zinc-800/30",
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <h3 className="text-[13px] font-semibold text-zinc-200">Actions Feed</h3>
      </div>

      <div className="space-y-2.5">
        {feedItems.map((item) => {
          const isExpanded = expandedItem === item.id;
          return (
            <div
              key={item.id}
              className="rounded-xl bg-zinc-900/60 border border-zinc-800/50 hover:border-zinc-700/50 transition-all cursor-pointer"
              onClick={() => setExpandedItem(isExpanded ? null : item.id)}
            >
              <div className="p-3.5">
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-2 ${item.iconBg} flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-[13px] font-medium text-zinc-200 leading-snug">{item.title}</h4>
                      {item.items && (
                        <ChevronDown
                          size={15}
                          className={`text-zinc-600 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                        />
                      )}
                    </div>
                    <p className="text-[12px] text-zinc-500 mt-0.5">{item.subtitle}</p>
                  </div>
                </div>
              </div>

              {isExpanded && item.items && (
                <div className="px-3.5 pb-3.5 space-y-2.5 border-t border-zinc-800/40 pt-3">
                  {item.items.map((fix, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-start gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] h-5 rounded-md font-medium flex-shrink-0 ${severityStyles[fix.severity] || severityStyles.medium}`}
                        >
                          {fix.severity}
                        </Badge>
                        <span className="text-[13px] text-zinc-300 leading-snug">{fix.title}</span>
                      </div>
                      {fix.description && (
                        <p className="text-[12px] text-zinc-500 pl-[52px] leading-relaxed">{fix.description}</p>
                      )}
                      {fix.snippet && (
                        <pre className="text-[11px] bg-zinc-800/60 rounded-lg p-2.5 ml-[52px] overflow-x-auto text-emerald-400 border border-zinc-700/30">
                          {fix.snippet}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
