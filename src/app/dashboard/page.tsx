"use client";

import { useState } from "react";
import { CompanyPanel } from "@/components/dashboard/CompanyPanel";
import { AnalyticsPanel } from "@/components/dashboard/AnalyticsPanel";
import { ActionsFeed } from "@/components/dashboard/ActionsFeed";
import { ChatPanel } from "@/components/dashboard/ChatPanel";
import { TerminalHeader } from "@/components/dashboard/TerminalHeader";

export default function DashboardPage() {
  const [company, setCompany] = useState({
    name: "",
    description: "",
    website: "",
    city: "hyderabad",
    projects: [] as { name: string; website: string; location: string }[],
    competitors: [] as { name: string; website: string }[],
    documents: {
      productInfo: "",
      competitorAnalysis: "",
      brandVoice: "",
      marketingStrategy: "",
    },
  });

  const [auditResult, setAuditResult] = useState<any>(null);
  const [aiVisResult, setAiVisResult] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isCheckingAI, setIsCheckingAI] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "CabbageSEO Terminal initialized",
    "Ready to audit your real estate digital presence",
  ]);

  const addLog = (msg: string) => setTerminalLogs((prev) => [...prev, msg]);

  const runAudit = async (url: string) => {
    setIsAuditing(true);
    addLog(`> Starting SEO audit for ${url}...`);
    addLog("> Fetching PageSpeed data (mobile + desktop)...");

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setAuditResult(data);
      addLog(`> Audit complete: Score ${data.scores.overall}/100`);
      addLog(`> Found ${data.fixes.length} fixes to implement`);
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Audit failed"}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const runAIVisibility = async () => {
    if (!company.name) {
      addLog("> Error: Set your company name first");
      return;
    }
    setIsCheckingAI(true);
    addLog(`> Checking AI visibility for "${company.name}"...`);
    addLog("> Querying ChatGPT, Claude, Perplexity, Gemini...");

    try {
      const res = await fetch("/api/ai-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: company.website,
          brand: company.name,
          projects: company.projects.map((p) => p.name),
          city: company.city,
        }),
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setAiVisResult(data);
      addLog(`> AI Visibility complete: Overall score ${data.scores.overall}/100`);
      addLog(`> ChatGPT: ${data.scores.chatgpt} | Claude: ${data.scores.claude} | Perplexity: ${data.scores.perplexity} | Gemini: ${data.scores.gemini}`);
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "AI Visibility check failed"}`);
    } finally {
      setIsCheckingAI(false);
    }
  };

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      <TerminalHeader logs={terminalLogs} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-px bg-zinc-800 overflow-hidden">
        <CompanyPanel
          company={company}
          setCompany={setCompany}
        />
        <AnalyticsPanel
          auditResult={auditResult}
          aiVisResult={aiVisResult}
          isAuditing={isAuditing}
          isCheckingAI={isCheckingAI}
          onRunAudit={runAudit}
          onRunAIVisibility={runAIVisibility}
          websiteUrl={company.website}
        />
        <ActionsFeed
          auditResult={auditResult}
          aiVisResult={aiVisResult}
        />
        <ChatPanel
          company={company}
          auditResult={auditResult}
          aiVisResult={aiVisResult}
        />
      </div>
    </div>
  );
}
