"use client";

import { Card, CardContent } from "@/components/ui/card";
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

  // Add SEO audit actions
  if (auditResult?.fixes?.length) {
    const critical = auditResult.fixes.filter((f: any) => f.severity === "critical").length;
    const high = auditResult.fixes.filter((f: any) => f.severity === "high").length;

    feedItems.push({
      id: "seo_fixes",
      icon: <Wrench size={16} />,
      iconBg: "bg-blue-500/20 text-blue-400",
      title: "SEO & Performance Fixes",
      subtitle: `${critical} critical, ${high} high priority`,
      items: auditResult.fixes,
    });
  }

  // Real estate specific issues
  if (auditResult?.realEstateChecks) {
    const failed = auditResult.realEstateChecks.filter((c: any) => !c.passed);
    if (failed.length > 0) {
      feedItems.push({
        id: "re_checks",
        icon: <AlertTriangle size={16} />,
        iconBg: "bg-orange-500/20 text-orange-400",
        title: "Real Estate SEO Issues",
        subtitle: `${failed.length} issues found`,
        items: failed.map((c: any) => ({
          title: c.label,
          severity: "high",
          description: c.details,
        })),
      });
    }
  }

  // AI Visibility recommendations
  if (aiVisResult) {
    const failedChecks = aiVisResult.aiReadiness?.filter((c: any) => !c.passed) || [];
    const missingQueries = aiVisResult.queryResults?.filter(
      (q: any) => !q.chatgpt.mentioned && !q.claude.mentioned && !q.perplexity.mentioned && !q.gemini.mentioned
    ) || [];

    if (failedChecks.length > 0 || missingQueries.length > 0) {
      feedItems.push({
        id: "ai_geo",
        icon: <Bot size={16} />,
        iconBg: "bg-violet-500/20 text-violet-400",
        title: "AI/GEO Recommendations",
        subtitle: `${failedChecks.length + missingQueries.length} issues found`,
        items: [
          ...failedChecks.map((c: any) => ({
            title: c.check,
            severity: "high",
            description: c.details,
          })),
          ...missingQueries.slice(0, 5).map((q: any) => ({
            title: `Not found for: "${q.query}"`,
            severity: "medium",
            description: `Your brand doesn't appear in any AI answer for this query. Create content targeting this keyword to improve visibility.`,
          })),
        ],
      });
    }
  }

  // Backlink recommendations
  if (backlinkResult?.recommendations?.length) {
    feedItems.push({
      id: "backlinks",
      icon: <Link2 size={16} />,
      iconBg: "bg-blue-500/20 text-blue-400",
      title: "Link Building Opportunities",
      subtitle: `DA ${backlinkResult.domainAuthority}, ${backlinkResult.recommendations.length} recommendations`,
      items: backlinkResult.recommendations.map((r: any) => ({
        title: r.title,
        severity: r.priority,
        description: r.description,
      })),
    });
  }

  // Technical issues
  if (technicalResult?.resourceIssues?.length) {
    feedItems.push({
      id: "technical",
      icon: <Wrench size={16} />,
      iconBg: "bg-zinc-500/20 text-zinc-400",
      title: "Technical Issues",
      subtitle: `On-Page score: ${technicalResult.onPageScore}/100, ${technicalResult.resourceIssues.length} issues`,
      items: technicalResult.resourceIssues.map((i: any) => ({
        title: i.issue,
        severity: i.severity === "error" ? "critical" : "medium",
        description: "",
      })),
    });
  }

  // Competitor insights
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
        iconBg: "bg-amber-500/20 text-amber-400",
        title: "Competitor Insights",
        subtitle: `${competitorResults.length} competitors analyzed, ${allInsights.length} insights`,
        items: allInsights,
      });
    }
  }

  // Placeholder items for future agents
  if (feedItems.length === 0) {
    feedItems.push({
      id: "welcome",
      icon: <Globe size={16} />,
      iconBg: "bg-emerald-500/20 text-emerald-400",
      title: "Welcome to CabbageSEO",
      subtitle: "Run your first audit to see recommendations",
    });
  }

  return (
    <div className="bg-zinc-950 border-l border-zinc-800 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          Actions Feed
        </h3>
      </div>

      <div className="space-y-2">
        {feedItems.map((item) => (
          <Card
            key={item.id}
            className="bg-zinc-900 border-zinc-800 cursor-pointer hover:bg-zinc-800/50 transition-colors"
            onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className={`rounded-md p-1.5 ${item.iconBg}`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-zinc-200">{item.title}</h4>
                    {item.items && (
                      <ChevronDown
                        size={14}
                        className={`text-zinc-500 transition-transform ${
                          expandedItem === item.id ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.subtitle}</p>
                </div>
              </div>

              {expandedItem === item.id && item.items && (
                <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3">
                  {item.items.map((fix, i) => (
                    <div key={i} className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            fix.severity === "critical"
                              ? "border-red-800 text-red-400"
                              : fix.severity === "high"
                              ? "border-orange-800 text-orange-400"
                              : "border-yellow-800 text-yellow-400"
                          }`}
                        >
                          {fix.severity}
                        </Badge>
                        <span className="text-zinc-300 text-xs">{fix.title}</span>
                      </div>
                      <p className="text-xs text-zinc-500 pl-4">{fix.description}</p>
                      {fix.snippet && (
                        <pre className="text-[10px] bg-zinc-800 rounded p-2 mt-1 ml-4 overflow-x-auto text-emerald-400">
                          {fix.snippet}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
