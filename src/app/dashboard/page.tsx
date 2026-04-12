"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { CompanyPanel } from "@/components/dashboard/CompanyPanel";
import { AnalyticsPanel } from "@/components/dashboard/AnalyticsPanel";
import { ActionsFeed } from "@/components/dashboard/ActionsFeed";
import { ChatPanel } from "@/components/dashboard/ChatPanel";
import { TerminalHeader } from "@/components/dashboard/TerminalHeader";
import { AgentStatusBar } from "@/components/dashboard/AgentStatusBar";
import { recordScan, getAllTrends, type TrendData } from "@/lib/scanHistory";

export default function DashboardPage() {
  const [company, setCompany] = useState({
    name: "",
    description: "",
    website: "",
    city: "",
    sites: [] as { url: string; label: string }[],
    projects: [] as { name: string; website: string; location: string; configurations?: string; priceRange?: string; reraNumber?: string; amenities?: string; status?: string }[],
    competitors: [] as { name: string; website: string }[],
    documents: { productInfo: "", competitorAnalysis: "", brandVoice: "", marketingStrategy: "", brandValues: "", brandVision: "", targetAudience: "" },
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

  // New feature states
  const [articleResult, setArticleResult] = useState<any>(null);
  const [festiveCampaignResult, setFestiveCampaignResult] = useState<any>(null);
  const [channelPartnerResult, setChannelPartnerResult] = useState<any>(null);
  const [schemaResult, setSchemaResult] = useState<any>(null);
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [isGeneratingPartner, setIsGeneratingPartner] = useState(false);
  const [isGeneratingSchema, setIsGeneratingSchema] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [trends, setTrends] = useState<Record<string, TrendData>>({
    audit: { current: 0, previous: null, change: 0, direction: "new", history: [] },
    technical: { current: 0, previous: null, change: 0, direction: "new", history: [] },
    ai_visibility: { current: 0, previous: null, change: 0, direction: "new", history: [] },
    backlinks: { current: 0, previous: null, change: 0, direction: "new", history: [] },
  });

  const [isAuditing, setIsAuditing] = useState(false);
  const [isCheckingAI, setIsCheckingAI] = useState(false);
  const [isCheckingBacklinks, setIsCheckingBacklinks] = useState(false);
  const [isCheckingTechnical, setIsCheckingTechnical] = useState(false);
  const [isCheckingCompetitors, setIsCheckingCompetitors] = useState(false);

  const [terminalLogs, setTerminalLogs] = useState<string[]>(["CabbageSEO initialized"]);

  // Which panel is shown on the left: "company" or "chat"
  const [leftPanel, setLeftPanel] = useState<"company" | "chat">("company");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cabbageseo_company");
      if (saved) {
        const data = JSON.parse(saved);
        setCompany(data);
        addLog(`> Loaded: ${data.name}`);
        addLog("> Ready — hit 'Run Full Scan' to start");
        setTrends(getAllTrends(data.website));
      } else {
        addLog("> No site configured. Visit the homepage to add one.");
      }
    } catch { addLog("> Ready"); }
  }, []);

  // GSC callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gsc_connected") === "true") {
      addLog("> Google Search Console connected!");
      window.history.replaceState({}, "", "/dashboard");
    }
    if (params.get("gsc_error")) {
      addLog(`> GSC error: ${decodeURIComponent(params.get("gsc_error")!)}`);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  useEffect(() => {
    if (company.name) localStorage.setItem("cabbageseo_company", JSON.stringify(company));
  }, [company]);

  const addLog = (msg: string) => setTerminalLogs((prev) => [...prev, msg]);

  const refreshTrends = () => setTrends(getAllTrends(company.website));

  // ---- Agent runners ----

  const runAudit = async (url: string) => {
    setIsAuditing(true);
    addLog(`> Auditing ${url}...`);
    try {
      const res = await fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAuditResult(data);
      recordScan("audit", url, data.scores.overall, `${data.fixes?.length || 0} fixes`);
      refreshTrends();
      addLog(`> Audit: ${data.scores.overall}/100 — ${data.fixes?.length || 0} fixes`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Audit failed"}`); }
    finally { setIsAuditing(false); }
  };

  const runAIVisibility = async () => {
    if (!company.name) { addLog("> Set company name first"); return; }
    setIsCheckingAI(true);
    addLog(`> Checking AI visibility...`);
    try {
      const res = await fetch("/api/ai-visibility", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ websiteUrl: company.website, brand: company.name, projects: company.projects.map(p => p.name), city: company.city }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiVisResult(data);
      recordScan("ai_visibility", company.website, data.scores.overall, "GPT/Claude/Perplexity/Gemini");
      refreshTrends();
      addLog(`> AI Visibility: ${data.scores.overall}/100`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsCheckingAI(false); }
  };

  const runBacklinks = async (url: string) => {
    setIsCheckingBacklinks(true);
    addLog(`> Analyzing backlinks...`);
    try {
      const res = await fetch("/api/backlinks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBacklinkResult(data);
      recordScan("backlinks", url, data.domainAuthority, `${data.referringDomains} domains`);
      refreshTrends();
      addLog(`> Backlinks: DA ${data.domainAuthority}, ${data.referringDomains} domains`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsCheckingBacklinks(false); }
  };

  const runTechnical = async (url: string) => {
    setIsCheckingTechnical(true);
    addLog(`> Technical SEO scan...`);
    try {
      const res = await fetch("/api/technical-seo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTechnicalResult(data);
      recordScan("technical", url, data.onPageScore, `TTFB ${data.serverTiming.ttfb}ms`);
      refreshTrends();
      addLog(`> Technical: ${data.onPageScore}/100`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsCheckingTechnical(false); }
  };

  const runCompetitorAnalysis = async () => {
    if (!company.competitors.length) { addLog("> Add competitors first"); return; }
    setIsCheckingCompetitors(true);
    addLog(`> Analyzing ${company.competitors.length} competitors...`);
    try {
      const res = await fetch("/api/competitors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyName: company.name, competitors: company.competitors }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCompetitorResults(data);
      addLog(`> ${data.length} competitors analyzed`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsCheckingCompetitors(false); }
  };

  const runContent = async () => {
    if (!company.name) { addLog("> Set company name first"); return; }
    setIsGeneratingContent(true);
    addLog(`> Generating content...`);
    try {
      const res = await fetch("/api/local-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectName: company.name, developerName: company.name, location: company.city || "the market", city: company.city || "the market", configurations: "", priceRange: "", usps: company.description || "" }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setContentResult(data);
      addLog(`> Content: ${data.blogTopics?.length || 0} blogs, ${data.linkedinPosts?.length || 0} LinkedIn, ${data.whatsappMessages?.length || 0} WhatsApp`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsGeneratingContent(false); }
  };

  const runContentPlan = async () => {
    if (!company.name) { addLog("> Set company name first"); return; }
    setIsGeneratingContent(true);
    addLog(`> Generating 4-week plan...`);
    try {
      const res = await fetch("/api/content-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectName: company.name, developerName: company.name, location: company.city || "the market", city: company.city || "the market", configurations: "", priceRange: "", usps: company.description || "" }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setContentPlanResult(data);
      addLog(`> Plan: ${data.weeklyPlan?.length || 0} weeks, ${data.socialCalendar?.length || 0} posts`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsGeneratingContent(false); }
  };

  const runLocalitySearch = async () => {
    if (!company.city) { addLog("> Set city first"); return; }
    addLog(`> Discovering localities in ${company.city}...`);
    try {
      const res = await fetch("/api/locality/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city: company.city, locality: company.city }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLocalityResult(data);
      addLog(`> Found ${data.nearbyAreas?.length || 0} areas, ${data.suggestedKeywords?.length || 0} keywords`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
  };

  // ---- New feature runners ----

  const getProjectContext = () => {
    const p = selectedProject !== null ? company.projects[selectedProject] : null;
    return {
      projectName: p?.name || company.name,
      developerName: company.name,
      location: p?.location || company.city || "",
      city: company.city || "",
      configurations: (p as any)?.configurations || "",
      priceRange: (p as any)?.priceRange || "",
      usps: company.description || "",
      reraNumber: (p as any)?.reraNumber || "",
      website: p?.website || company.website,
    };
  };

  const runArticleWriter = async (topic: string, targetKeyword: string, articleType: string) => {
    setIsGeneratingArticle(true);
    addLog(`> Writing article: "${topic}"...`);
    try {
      const ctx = getProjectContext();
      const res = await fetch("/api/article-writer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ctx, topic, targetKeyword, articleType }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setArticleResult(data);
      addLog(`> Article: "${data.title}" — ${data.wordCount} words`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Article failed"}`); }
    finally { setIsGeneratingArticle(false); }
  };

  const runFestiveCampaign = async (targetFestival?: string) => {
    setIsGeneratingCampaign(true);
    addLog(`> Generating festive campaign${targetFestival ? ` for ${targetFestival}` : ""}...`);
    try {
      const ctx = getProjectContext();
      const res = await fetch("/api/festive-campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ctx, targetFestival }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFestiveCampaignResult(data);
      addLog(`> Campaign: ${data.festival} — "${data.tagline}"`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Campaign failed"}`); }
    finally { setIsGeneratingCampaign(false); }
  };

  const runChannelPartner = async () => {
    setIsGeneratingPartner(true);
    addLog(`> Generating channel partner pack...`);
    try {
      const ctx = getProjectContext();
      const res = await fetch("/api/channel-partner", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ctx),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChannelPartnerResult(data);
      addLog(`> Channel partner pack ready`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsGeneratingPartner(false); }
  };

  const runSchemaGenerator = async () => {
    setIsGeneratingSchema(true);
    addLog(`> Generating property schema...`);
    try {
      const ctx = getProjectContext();
      const res = await fetch("/api/schema-generator", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ctx),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSchemaResult(data);
      addLog(`> Schema generated — ${Object.keys(data.schemas || {}).length} types`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsGeneratingSchema(false); }
  };

  const runFullScan = async () => {
    const url = company.website;
    if (!url) { addLog("> Set your website URL first"); return; }
    addLog("> Full scan started...");
    await Promise.all([
      runAudit(url), runTechnical(url), runBacklinks(url),
      ...(company.name ? [runAIVisibility()] : []),
    ]);
    if (company.competitors.length > 0) await runCompetitorAnalysis();
    addLog("> Full scan complete");
  };

  return (
    <div className="h-screen bg-[#0a0a0b] text-zinc-100 flex overflow-hidden">
      <Sidebar companyName={company.name} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Terminal + Agent bar */}
        <TerminalHeader logs={terminalLogs} onRunFullScan={runFullScan} hasWebsite={!!company.website} />
        <AgentStatusBar
          isAuditing={isAuditing} isCheckingAI={isCheckingAI} isCheckingBacklinks={isCheckingBacklinks}
          isCheckingTechnical={isCheckingTechnical} isCheckingCompetitors={isCheckingCompetitors}
          auditResult={auditResult} aiVisResult={aiVisResult} backlinkResult={backlinkResult}
          technicalResult={technicalResult} competitorResults={competitorResults}
        />

        {/* Main content — 3 columns */}
        <div className="flex-1 flex min-h-0">
          {/* LEFT: Company or Chat (toggled) */}
          <div className="w-[320px] flex-shrink-0 border-r border-zinc-800/60 flex flex-col min-h-0">
            {/* Toggle tabs */}
            <div className="flex border-b border-zinc-800/60 flex-shrink-0">
              <button
                onClick={() => setLeftPanel("company")}
                className={`flex-1 py-2.5 text-[13px] font-medium transition-colors ${leftPanel === "company" ? "text-zinc-100 border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                Company
              </button>
              <button
                onClick={() => setLeftPanel("chat")}
                className={`flex-1 py-2.5 text-[13px] font-medium transition-colors ${leftPanel === "chat" ? "text-zinc-100 border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                Chat
              </button>
            </div>
            {/* Panel content — scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {leftPanel === "company" ? (
                <CompanyPanel company={company} setCompany={setCompany} />
              ) : (
                <ChatPanel company={company} auditResult={auditResult} aiVisResult={aiVisResult} />
              )}
            </div>
          </div>

          {/* CENTER: Analytics — scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <AnalyticsPanel
              auditResult={auditResult} aiVisResult={aiVisResult} backlinkResult={backlinkResult}
              technicalResult={technicalResult} isAuditing={isAuditing} isCheckingAI={isCheckingAI}
              isCheckingBacklinks={isCheckingBacklinks} isCheckingTechnical={isCheckingTechnical}
              onRunAudit={runAudit} onRunAIVisibility={runAIVisibility} onRunBacklinks={runBacklinks}
              onRunTechnical={runTechnical} websiteUrl={company.website}
              allSites={[
                ...(company.website ? [{ url: company.website, label: company.website.replace(/^https?:\/\//, "").replace(/\/$/, "") }] : []),
                ...(company.sites || []),
              ]}
              companyName={company.name} city={company.city}
              contentResult={contentResult} contentPlanResult={contentPlanResult}
              localityResult={localityResult} isGeneratingContent={isGeneratingContent}
              onRunContent={runContent} onRunContentPlan={runContentPlan}
              onRunLocalitySearch={runLocalitySearch} trends={trends}
              // New features
              projects={company.projects}
              selectedProject={selectedProject} onSelectProject={setSelectedProject}
              articleResult={articleResult} isGeneratingArticle={isGeneratingArticle}
              onRunArticleWriter={runArticleWriter}
              festiveCampaignResult={festiveCampaignResult} isGeneratingCampaign={isGeneratingCampaign}
              onRunFestiveCampaign={runFestiveCampaign}
              channelPartnerResult={channelPartnerResult} isGeneratingPartner={isGeneratingPartner}
              onRunChannelPartner={runChannelPartner}
              schemaResult={schemaResult} isGeneratingSchema={isGeneratingSchema}
              onRunSchemaGenerator={runSchemaGenerator}
            />
          </div>

          {/* RIGHT: Actions Feed — scrollable */}
          <div className="w-[340px] flex-shrink-0 border-l border-zinc-800/60 overflow-y-auto min-h-0">
            <ActionsFeed
              auditResult={auditResult} aiVisResult={aiVisResult} backlinkResult={backlinkResult}
              technicalResult={technicalResult} competitorResults={competitorResults}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
