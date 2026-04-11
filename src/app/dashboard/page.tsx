"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { CompanyPanel } from "@/components/dashboard/CompanyPanel";
import { AnalyticsPanel } from "@/components/dashboard/AnalyticsPanel";
import { ActionsFeed } from "@/components/dashboard/ActionsFeed";
import { ChatPanel } from "@/components/dashboard/ChatPanel";
import { TerminalHeader } from "@/components/dashboard/TerminalHeader";
import { AgentStatusBar } from "@/components/dashboard/AgentStatusBar";

export default function DashboardPage() {
  const [company, setCompany] = useState({
    name: "",
    description: "",
    website: "",
    city: "",
    sites: [] as { url: string; label: string }[],
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
  const [contentPlanResult, setContentPlanResult] = useState<any>(null);
  const [localityResult, setLocalityResult] = useState<any>(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
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
        addLog(`> Loaded: ${data.name}`);
        if (data.sites?.length) addLog(`> ${data.sites.length + 1} sites configured`);
        if (data.competitors?.length) addLog(`> ${data.competitors.length} competitors tracked`);
        addLog("> Ready — hit 'Run Full Scan' to start");
      } else {
        addLog("> No site configured. Visit the homepage to add one.");
      }
    } catch {
      addLog("> Ready");
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
    addLog(`> Auditing ${url}...`);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAuditResult(data);
      addLog(`> Audit: ${data.scores.overall}/100 — ${data.fixes?.length || 0} fixes`);
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Audit failed"}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const runAIVisibility = async () => {
    if (!company.name) { addLog("> Set company name first"); return; }
    setIsCheckingAI(true);
    addLog(`> Checking AI visibility for "${company.name}"...`);
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
      addLog(`> AI Visibility: ${data.scores.overall}/100`);
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setIsCheckingAI(false);
    }
  };

  const runBacklinks = async (url: string) => {
    setIsCheckingBacklinks(true);
    addLog(`> Analyzing backlinks...`);
    try {
      const res = await fetch("/api/backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBacklinkResult(data);
      addLog(`> Backlinks: DA ${data.domainAuthority}, ${data.referringDomains} domains`);
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setIsCheckingBacklinks(false);
    }
  };

  const runTechnical = async (url: string) => {
    setIsCheckingTechnical(true);
    addLog(`> Technical SEO scan...`);
    try {
      const res = await fetch("/api/technical-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTechnicalResult(data);
      addLog(`> Technical: ${data.onPageScore}/100, TTFB ${data.serverTiming.ttfb}ms`);
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setIsCheckingTechnical(false);
    }
  };

  const runCompetitorAnalysis = async () => {
    if (!company.competitors.length) { addLog("> Add competitors first"); return; }
    setIsCheckingCompetitors(true);
    addLog(`> Analyzing ${company.competitors.length} competitors...`);
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
      addLog(`> ${data.length} competitors analyzed`);
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setIsCheckingCompetitors(false);
    }
  };

  const runContent = async () => {
    if (!company.name || !company.website) { addLog("> Set company name and website first"); return; }
    setIsGeneratingContent(true);
    addLog(`> Generating content for ${company.name}...`);
    try {
      const res = await fetch("/api/local-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: company.name,
          developerName: company.name,
          location: company.city || "the market",
          city: company.city || "the market",
          configurations: "",
          priceRange: "",
          usps: company.description || "",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setContentResult(data);
      addLog(`> Content: ${data.blogTopics?.length || 0} blogs, ${data.linkedinPosts?.length || 0} LinkedIn, ${data.whatsappMessages?.length || 0} WhatsApp`);
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Content gen failed"}`);
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const runContentPlan = async () => {
    if (!company.name || !company.city) { addLog("> Set company name and city first"); return; }
    setIsGeneratingContent(true);
    addLog(`> Generating 4-week content plan...`);
    try {
      const res = await fetch("/api/content-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: company.name,
          developerName: company.name,
          location: company.city,
          city: company.city,
          configurations: "",
          priceRange: "",
          usps: company.description || "",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setContentPlanResult(data);
      addLog(`> Plan: ${data.weeklyPlan?.length || 0} weeks, ${data.socialCalendar?.length || 0} social posts, ${data.localityPages?.length || 0} pages`);
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Plan gen failed"}`);
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const runLocalitySearch = async () => {
    if (!company.city) { addLog("> Set city first"); return; }
    addLog(`> Discovering localities in ${company.city}...`);
    try {
      const res = await fetch("/api/locality/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: company.city, locality: company.city }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLocalityResult(data);
      addLog(`> Locality: ${data.nearbyAreas?.length || 0} areas, ${data.suggestedKeywords?.length || 0} keywords, ${data.competingProjects?.length || 0} competing projects`);
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Locality search failed"}`);
    }
  };

  const runFullScan = async () => {
    const url = company.website;
    if (!url) { addLog("> Set your website URL first"); return; }
    addLog("> Full scan started...");
    await Promise.all([
      runAudit(url),
      runTechnical(url),
      runBacklinks(url),
      ...(company.name ? [runAIVisibility()] : []),
    ]);
    if (company.competitors.length > 0) {
      await runCompetitorAnalysis();
    }
    addLog("> Full scan complete");
  };

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden">
      {/* Sidebar — Okara-style navigation */}
      <Sidebar companyName={company.name} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TerminalHeader logs={terminalLogs} onRunFullScan={runFullScan} hasWebsite={!!company.website} />
        <AgentStatusBar
          isAuditing={isAuditing}
          isCheckingAI={isCheckingAI}
          isCheckingBacklinks={isCheckingBacklinks}
          isCheckingTechnical={isCheckingTechnical}
          isCheckingCompetitors={isCheckingCompetitors}
          auditResult={auditResult}
          aiVisResult={aiVisResult}
          backlinkResult={backlinkResult}
          technicalResult={technicalResult}
          competitorResults={competitorResults}
        />

        {/* 3-panel grid — Okara-style: Company+Chat left, Analytics center, Actions right */}
        <div className="flex-1 grid grid-cols-[260px_1fr_300px] gap-px bg-zinc-800 overflow-hidden">
          {/* Left column: Company + Chat stacked */}
          <div className="bg-zinc-950 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <CompanyPanel company={company} setCompany={setCompany} />
            </div>
            <div className="h-[320px] border-t border-zinc-800 flex-shrink-0">
              <ChatPanel
                company={company}
                auditResult={auditResult}
                aiVisResult={aiVisResult}
              />
            </div>
          </div>

          {/* Center: Analytics */}
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
            allSites={[
              ...(company.website ? [{ url: company.website, label: company.website.replace(/^https?:\/\//, "").replace(/\/$/, "") + " (main)" }] : []),
              ...(company.sites || []),
            ]}
            companyName={company.name}
            city={company.city}
            contentResult={contentResult}
            contentPlanResult={contentPlanResult}
            localityResult={localityResult}
            isGeneratingContent={isGeneratingContent}
            onRunContent={runContent}
            onRunContentPlan={runContentPlan}
            onRunLocalitySearch={runLocalitySearch}
          />
          {/* Right: Actions Feed */}
          <ActionsFeed
            auditResult={auditResult}
            aiVisResult={aiVisResult}
            backlinkResult={backlinkResult}
            technicalResult={technicalResult}
            competitorResults={competitorResults}
          />
        </div>
      </div>
    </div>
  );
}
