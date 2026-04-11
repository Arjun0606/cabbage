"use client";

import { useState, useEffect } from "react";
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
  const [backlinkResult, setBacklinkResult] = useState<any>(null);
  const [technicalResult, setTechnicalResult] = useState<any>(null);
  const [competitorResults, setCompetitorResults] = useState<any[]>([]);
  const [contentResult, setContentResult] = useState<any>(null);

  const [isAuditing, setIsAuditing] = useState(false);
  const [isCheckingAI, setIsCheckingAI] = useState(false);
  const [isCheckingBacklinks, setIsCheckingBacklinks] = useState(false);
  const [isCheckingTechnical, setIsCheckingTechnical] = useState(false);
  const [isCheckingCompetitors, setIsCheckingCompetitors] = useState(false);

  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "CabbageSEO Terminal initialized",
  ]);

  // Load company data from onboarding (localStorage)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cabbageseo_company");
      if (saved) {
        const data = JSON.parse(saved);
        setCompany(data);
        addLog(`> Loaded company: ${data.name}`);
        addLog(`> ${data.projects?.length || 0} projects configured`);
        addLog(`> ${data.competitors?.length || 0} competitors tracked`);
        addLog("> Ready to audit your real estate digital presence");
      } else {
        addLog("> No company configured. Set up in the left panel or visit /onboarding");
      }
    } catch {
      addLog("> Ready to audit your real estate digital presence");
    }
  }, []);

  // Persist company changes
  useEffect(() => {
    if (company.name) {
      localStorage.setItem("cabbageseo_company", JSON.stringify(company));
    }
  }, [company]);

  const addLog = (msg: string) => setTerminalLogs((prev) => [...prev, msg]);

  // ---------- Agent runners ----------

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
      addLog(`> Found ${data.fixes?.length || 0} fixes to implement`);
      addLog(`> Real estate checks: ${data.realEstateChecks?.filter((c: any) => c.passed).length}/${data.realEstateChecks?.length} passed`);
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Audit failed"}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const runAIVisibility = async () => {
    if (!company.name) { addLog("> Error: Set your company name first"); return; }
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
      addLog(`> AI Visibility complete: Overall ${data.scores.overall}/100`);
      addLog(`> ChatGPT: ${data.scores.chatgpt} | Claude: ${data.scores.claude} | Perplexity: ${data.scores.perplexity} | Gemini: ${data.scores.gemini}`);
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "AI Visibility failed"}`);
    } finally {
      setIsCheckingAI(false);
    }
  };

  const runBacklinks = async (url: string) => {
    setIsCheckingBacklinks(true);
    addLog(`> Analyzing backlink profile for ${url}...`);

    try {
      const res = await fetch("/api/backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setBacklinkResult(data);
      addLog(`> Backlinks: DA ${data.domainAuthority}, ${data.referringDomains} referring domains`);
      addLog(`> ${data.recommendations?.length || 0} link-building recommendations`);
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Backlink analysis failed"}`);
    } finally {
      setIsCheckingBacklinks(false);
    }
  };

  const runTechnical = async (url: string) => {
    setIsCheckingTechnical(true);
    addLog(`> Running technical SEO analysis for ${url}...`);

    try {
      const res = await fetch("/api/technical-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTechnicalResult(data);
      addLog(`> Technical: On-Page score ${data.onPageScore}/100`);
      addLog(`> Server: ${data.server.host}, TTFB: ${data.serverTiming.ttfb}ms`);
      addLog(`> ${data.resourceIssues?.length || 0} resource issues found`);
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Technical analysis failed"}`);
    } finally {
      setIsCheckingTechnical(false);
    }
  };

  const runCompetitorAnalysis = async () => {
    if (!company.competitors.length) { addLog("> Error: Add competitors first"); return; }
    setIsCheckingCompetitors(true);
    addLog(`> Analyzing ${company.competitors.length} competitor(s)...`);

    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: company.name,
          competitors: company.competitors,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setCompetitorResults(data);
      addLog(`> Competitor analysis complete: ${data.length} analyzed`);
      for (const r of data) {
        addLog(`>   ${r.competitor.name}: ${r.insights?.length || 0} insights`);
      }
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Competitor analysis failed"}`);
    } finally {
      setIsCheckingCompetitors(false);
    }
  };

  // Run all agents at once
  const runFullScan = async () => {
    const url = company.website;
    if (!url) { addLog("> Error: Set your website URL first"); return; }

    addLog("> Starting full scan...");
    addLog("> Running SEO audit + Technical + Backlinks + AI Visibility in parallel...");

    await Promise.all([
      runAudit(url),
      runTechnical(url),
      runBacklinks(url),
      ...(company.name ? [runAIVisibility()] : []),
    ]);

    if (company.competitors.length > 0) {
      await runCompetitorAnalysis();
    }

    addLog("> Full scan complete!");
  };

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      <TerminalHeader logs={terminalLogs} onRunFullScan={runFullScan} hasWebsite={!!company.website} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-px bg-zinc-800 overflow-hidden">
        <CompanyPanel
          company={company}
          setCompany={setCompany}
        />
        <AnalyticsPanel
          auditResult={auditResult}
          aiVisResult={aiVisResult}
          backlinkResult={backlinkResult}
          technicalResult={technicalResult}
          isAuditing={isAuditing}
          isCheckingAI={isCheckingAI}
          isCheckingBacklinks={isCheckingBacklinks}
          isCheckingTechnical={isCheckingTechnical}
          onRunAudit={runAudit}
          onRunAIVisibility={runAIVisibility}
          onRunBacklinks={runBacklinks}
          onRunTechnical={runTechnical}
          websiteUrl={company.website}
        />
        <ActionsFeed
          auditResult={auditResult}
          aiVisResult={aiVisResult}
          backlinkResult={backlinkResult}
          technicalResult={technicalResult}
          competitorResults={competitorResults}
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
