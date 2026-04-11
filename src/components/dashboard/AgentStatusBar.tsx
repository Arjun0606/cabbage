"use client";

import { Badge } from "@/components/ui/badge";
import {
  Search,
  Bot,
  Link2,
  Wrench,
  Users,
  FileText,
  MapPin,
  MessageSquare,
} from "lucide-react";

interface AgentStatus {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: "idle" | "running" | "done" | "error";
  lastRun?: string;
  resultCount?: number;
}

interface Props {
  isAuditing: boolean;
  isCheckingAI: boolean;
  isCheckingBacklinks: boolean;
  isCheckingTechnical: boolean;
  isCheckingCompetitors: boolean;
  auditResult: any;
  aiVisResult: any;
  backlinkResult: any;
  technicalResult: any;
  competitorResults: any[];
}

export function AgentStatusBar({
  isAuditing,
  isCheckingAI,
  isCheckingBacklinks,
  isCheckingTechnical,
  isCheckingCompetitors,
  auditResult,
  aiVisResult,
  backlinkResult,
  technicalResult,
  competitorResults,
}: Props) {
  const agents: AgentStatus[] = [
    {
      id: "audit",
      name: "SEO Audit",
      icon: <Search size={12} />,
      status: isAuditing ? "running" : auditResult ? "done" : "idle",
      resultCount: auditResult?.fixes?.length,
    },
    {
      id: "technical",
      name: "Technical",
      icon: <Wrench size={12} />,
      status: isCheckingTechnical ? "running" : technicalResult ? "done" : "idle",
      resultCount: technicalResult?.resourceIssues?.length,
    },
    {
      id: "ai_visibility",
      name: "AI/GEO",
      icon: <Bot size={12} />,
      status: isCheckingAI ? "running" : aiVisResult ? "done" : "idle",
      resultCount: aiVisResult?.scores?.overall,
    },
    {
      id: "backlinks",
      name: "Backlinks",
      icon: <Link2 size={12} />,
      status: isCheckingBacklinks ? "running" : backlinkResult ? "done" : "idle",
      resultCount: backlinkResult?.domainAuthority,
    },
    {
      id: "competitors",
      name: "Competitors",
      icon: <Users size={12} />,
      status: isCheckingCompetitors ? "running" : competitorResults?.length > 0 ? "done" : "idle",
      resultCount: competitorResults?.length,
    },
    {
      id: "content",
      name: "Content",
      icon: <FileText size={12} />,
      status: "idle",
    },
    {
      id: "locality",
      name: "Locality",
      icon: <MapPin size={12} />,
      status: "idle",
    },
  ];

  const runningCount = agents.filter(a => a.status === "running").length;
  const doneCount = agents.filter(a => a.status === "done").length;

  return (
    <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950/80">
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] whitespace-nowrap transition-all ${
              agent.status === "running"
                ? "bg-blue-950/50 border border-blue-800/50 text-blue-400"
                : agent.status === "done"
                ? "bg-emerald-950/30 border border-emerald-800/30 text-emerald-400"
                : agent.status === "error"
                ? "bg-red-950/30 border border-red-800/30 text-red-400"
                : "bg-zinc-900/50 border border-zinc-800/50 text-zinc-600"
            }`}
          >
            {/* Status dot */}
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              agent.status === "running"
                ? "bg-blue-400 animate-pulse"
                : agent.status === "done"
                ? "bg-emerald-400"
                : agent.status === "error"
                ? "bg-red-400"
                : "bg-zinc-700"
            }`} />

            {agent.icon}
            <span>{agent.name}</span>

            {agent.status === "done" && agent.resultCount !== undefined && (
              <Badge variant="secondary" className="text-[9px] h-3.5 px-1 bg-emerald-900/50 text-emerald-400">
                {agent.resultCount}
              </Badge>
            )}

            {agent.status === "running" && (
              <span className="text-[9px] text-blue-400 animate-pulse">...</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
