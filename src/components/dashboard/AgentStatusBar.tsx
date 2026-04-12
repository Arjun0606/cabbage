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
} from "lucide-react";

interface AgentStatus {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: "idle" | "running" | "done" | "error";
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
      icon: <Search size={13} />,
      status: isAuditing ? "running" : auditResult ? "done" : "idle",
      resultCount: auditResult?.fixes?.length,
    },
    {
      id: "technical",
      name: "Technical",
      icon: <Wrench size={13} />,
      status: isCheckingTechnical ? "running" : technicalResult ? "done" : "idle",
      resultCount: technicalResult?.resourceIssues?.length,
    },
    {
      id: "ai_visibility",
      name: "AI/GEO",
      icon: <Bot size={13} />,
      status: isCheckingAI ? "running" : aiVisResult ? "done" : "idle",
      resultCount: aiVisResult?.scores?.overall,
    },
    {
      id: "backlinks",
      name: "Backlinks",
      icon: <Link2 size={13} />,
      status: isCheckingBacklinks ? "running" : backlinkResult ? "done" : "idle",
      resultCount: backlinkResult?.domainAuthority,
    },
    {
      id: "competitors",
      name: "Competitors",
      icon: <Users size={13} />,
      status: isCheckingCompetitors ? "running" : competitorResults?.length > 0 ? "done" : "idle",
      resultCount: competitorResults?.length,
    },
    {
      id: "content",
      name: "Content",
      icon: <FileText size={13} />,
      status: "idle",
    },
    {
      id: "locality",
      name: "Locality",
      icon: <MapPin size={13} />,
      status: "idle",
    },
  ];

  const statusConfig = {
    running: {
      pill: "bg-blue-500/10 border-blue-500/20 text-blue-400",
      dot: "bg-blue-400 animate-pulse shadow-[0_0_6px_rgba(59,130,246,0.5)]",
    },
    done: {
      pill: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      dot: "bg-emerald-400",
    },
    error: {
      pill: "bg-red-500/10 border-red-500/20 text-red-400",
      dot: "bg-red-400",
    },
    idle: {
      pill: "bg-zinc-800/40 border-zinc-700/30 text-zinc-600",
      dot: "bg-zinc-700",
    },
  };

  return (
    <div className="px-5 py-2 border-b border-zinc-800/60 bg-[#0a0a0b]">
      <div className="flex items-center gap-2 overflow-x-auto">
        {agents.map((agent) => {
          const cfg = statusConfig[agent.status];
          return (
            <div
              key={agent.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap border transition-all ${cfg.pill}`}
            >
              <div className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${cfg.dot}`} />
              {agent.icon}
              <span>{agent.name}</span>

              {agent.status === "done" && agent.resultCount !== undefined && (
                <Badge variant="secondary" className="text-[10px] h-[18px] px-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border-0 font-semibold">
                  {agent.resultCount}
                </Badge>
              )}

              {agent.status === "running" && (
                <span className="text-[10px] text-blue-400 animate-pulse font-medium">...</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
