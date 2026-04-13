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

  // New feature states (round 2)
  const [landingPageResult, setLandingPageResult] = useState<any>(null);
  const [portalResult, setPortalResult] = useState<any>(null);
  const [neighborhoodResult, setNeighborhoodResult] = useState<any>(null);
  const [progressResult, setProgressResult] = useState<any>(null);
  const [reportResult, setReportResult] = useState<any>(null);
  const [adsResult, setAdsResult] = useState<any>(null);
  const [isGeneratingLanding, setIsGeneratingLanding] = useState(false);
  const [isGeneratingPortal, setIsGeneratingPortal] = useState(false);
  const [isGeneratingNeighborhood, setIsGeneratingNeighborhood] = useState(false);
  const [isGeneratingProgress, setIsGeneratingProgress] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isGeneratingAds, setIsGeneratingAds] = useState(false);
  const [llmsTxtResult, setLlmsTxtResult] = useState<any>(null);
  const [geoImprovementResult, setGeoImprovementResult] = useState<any>(null);
  const [isGeneratingLlmsTxt, setIsGeneratingLlmsTxt] = useState(false);
  const [isGeneratingGeoImprovement, setIsGeneratingGeoImprovement] = useState(false);
  const [crawlerAccessResult, setCrawlerAccessResult] = useState<any>(null);
  const [brandPresenceResult, setBrandPresenceResult] = useState<any>(null);
  const [citabilityResult, setCitabilityResult] = useState<any>(null);
  const [isCheckingCrawlers, setIsCheckingCrawlers] = useState(false);
  const [isCheckingBrand, setIsCheckingBrand] = useState(false);
  const [isCheckingCitability, setIsCheckingCitability] = useState(false);
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

  // Load company: try Supabase first, fall back to localStorage
  useEffect(() => {
    (async () => {
      try {
        // First load from localStorage for instant display
        const saved = localStorage.getItem("cabbageseo_company");
        let localData: any = null;
        if (saved) {
          localData = JSON.parse(saved);
          setCompany(localData);
          setTrends(getAllTrends(localData.website));
        }

        // Then try to sync from Supabase (if configured)
        if (localData?.website) {
          try {
            const res = await fetch(`/api/companies?website=${encodeURIComponent(localData.website)}`);
            const { company: dbCompany } = await res.json();
            if (dbCompany) {
              // Merge DB data with local shape
              const merged = {
                ...localData,
                name: dbCompany.name || localData.name,
                description: dbCompany.description || localData.description,
                website: dbCompany.website || localData.website,
                city: dbCompany.city || localData.city,
                projects: dbCompany.projects?.map((p: any) => ({
                  name: p.name, website: p.website, location: p.location,
                  configurations: p.configurations, priceRange: p.price_range,
                  reraNumber: p.rera_number, amenities: p.amenities, status: p.status,
                })) || localData.projects,
                competitors: dbCompany.competitors?.map((c: any) => ({
                  name: c.name, website: c.website,
                })) || localData.competitors,
                documents: {
                  productInfo: dbCompany.product_info || localData.documents?.productInfo || "",
                  brandVoice: dbCompany.brand_voice || localData.documents?.brandVoice || "",
                  brandValues: dbCompany.brand_values || localData.documents?.brandValues || "",
                  brandVision: dbCompany.brand_vision || localData.documents?.brandVision || "",
                  targetAudience: dbCompany.target_audience || localData.documents?.targetAudience || "",
                  marketingStrategy: dbCompany.marketing_strategy || localData.documents?.marketingStrategy || "",
                  competitorAnalysis: dbCompany.competitor_analysis || localData.documents?.competitorAnalysis || "",
                },
                _companyId: dbCompany.id,
              };
              setCompany(merged);
              localStorage.setItem("cabbageseo_company", JSON.stringify(merged));
              addLog(`> Synced from cloud: ${merged.name}`);
            }
          } catch {
            // Supabase not configured — that's fine, use localStorage
          }
        }

        if (localData) {
          addLog(`> Loaded: ${localData.name}`);
          addLog("> Ready — hit 'Run Full Scan' to start");
        } else {
          addLog("> No site configured. Visit the homepage to add one.");
        }
      } catch { addLog("> Ready"); }
    })();
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

  // Save company: localStorage immediately + debounced Supabase sync
  useEffect(() => {
    if (!company.name) return;
    localStorage.setItem("cabbageseo_company", JSON.stringify(company));

    // Debounce Supabase sync (2s after last change)
    const timer = setTimeout(() => {
      fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company),
      }).catch(() => { /* Supabase not configured, that's fine */ });
    }, 2000);
    return () => clearTimeout(timer);
  }, [company]);

  const addLog = (msg: string) => setTerminalLogs((prev) => [...prev, msg]);

  const refreshTrends = () => setTrends(getAllTrends(company.website));

  // ---- Agent runners ----

  // Helper: compare current score to previous and log the change
  const logScoreChange = (label: string, newScore: number, scanType: string) => {
    const prev = trends[scanType];
    if (prev && prev.current > 0 && prev.current !== newScore) {
      const diff = newScore - prev.current;
      if (diff > 0) {
        addLog(`> ${label}: ${newScore}/100 — up ${diff} points from last scan`);
      } else if (diff < 0) {
        addLog(`> ${label}: ${newScore}/100 — down ${Math.abs(diff)} points — needs attention`);
      } else {
        addLog(`> ${label}: ${newScore}/100 — no change`);
      }
    } else {
      addLog(`> ${label}: ${newScore}/100`);
    }
  };

  const runAudit = async (url: string) => {
    setIsAuditing(true);
    addLog(`> Auditing ${url}...`);
    try {
      const res = await fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAuditResult(data);
      recordScan("audit", url, data.scores.overall, `${data.fixes?.length || 0} fixes`);
      logScoreChange("SEO Audit", data.scores.overall, "audit");
      addLog(`> ${data.fixes?.length || 0} fixes found, ${data.realEstateChecks?.filter((c: any) => !c.passed).length || 0} RE checks failed`);
      refreshTrends();
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Audit failed"}`); }
    finally { setIsAuditing(false); }
  };

  const runAIVisibility = async () => {
    if (!company.name) { addLog("> Set company name first"); return; }
    setIsCheckingAI(true);
    addLog(`> Checking AI visibility across ChatGPT + Google AI...`);
    try {
      const res = await fetch("/api/ai-visibility", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ websiteUrl: company.website, brand: company.name, projects: company.projects.map(p => p.name), city: company.city }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiVisResult(data);
      recordScan("ai_visibility", company.website, data.scores.overall, `Readiness: ${data.scores.readiness}%, Mentions: ${data.scores.mentions}%`);
      logScoreChange("AI Readiness", data.scores.readiness || data.scores.overall, "ai_visibility");
      const mentioned = data.queryResults?.filter((q: any) => q.chatgpt?.mentioned || q.gemini?.mentioned).length || 0;
      const total = data.queryResults?.length || 0;
      if (mentioned === 0) {
        addLog(`> ChatGPT + Google AI: 0/${total} queries mention ${company.name} — use the Improvement Plan below`);
      } else {
        addLog(`> ChatGPT + Google AI: ${mentioned}/${total} queries mention ${company.name}`);
      }
      refreshTrends();
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
      logScoreChange("Backlinks DA", data.domainAuthority, "backlinks");
      addLog(`> ${data.referringDomains?.toLocaleString()} referring domains, ${data.totalBacklinks?.toLocaleString()} total backlinks`);
      refreshTrends();
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
      logScoreChange("Technical", data.onPageScore, "technical");
      addLog(`> TTFB: ${data.serverTiming.ttfb}ms, ${data.resourceIssues?.length || 0} issues`);
      refreshTrends();
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

  // ---- Round 2 feature runners ----

  const runLandingPage = async (pageType: string) => {
    setIsGeneratingLanding(true);
    addLog(`> Generating ${pageType} landing page...`);
    try {
      const ctx = getProjectContext();
      const res = await fetch("/api/landing-page", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...ctx, pageType }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLandingPageResult(data);
      addLog(`> Landing page ready: "${data.title}"`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsGeneratingLanding(false); }
  };

  const runPortalOptimizer = async () => {
    setIsGeneratingPortal(true);
    addLog(`> Optimizing portal listings...`);
    try {
      const ctx = getProjectContext();
      const res = await fetch("/api/portal-optimizer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ctx) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPortalResult(data);
      addLog(`> Portal listings optimized for ${Object.keys(data.portals || {}).length} portals`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsGeneratingPortal(false); }
  };

  const runNeighborhood = async () => {
    setIsGeneratingNeighborhood(true);
    const ctx = getProjectContext();
    addLog(`> Analyzing neighborhood: ${ctx.location}, ${ctx.city}...`);
    try {
      const res = await fetch("/api/neighborhood", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city: ctx.city, location: ctx.location, projectName: ctx.projectName }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setNeighborhoodResult(data);
      addLog(`> Neighborhood: Walk ${data.walkScore}/100, Connectivity ${data.connectivityScore}/100`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsGeneratingNeighborhood(false); }
  };

  const runProgressUpdate = async (phase: string, completionPct?: number) => {
    setIsGeneratingProgress(true);
    addLog(`> Generating construction update (${phase})...`);
    try {
      const ctx = getProjectContext();
      const res = await fetch("/api/progress-update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...ctx, currentPhase: phase, completionPercentage: completionPct }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProgressResult(data);
      addLog(`> Progress update content ready`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsGeneratingProgress(false); }
  };

  const runMarketingReport = async () => {
    setIsGeneratingReport(true);
    addLog(`> Generating marketing report...`);
    try {
      const res = await fetch("/api/marketing-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        companyName: company.name, projects: company.projects,
        auditScores: auditResult?.scores, aiVisibilityScore: aiVisResult?.scores?.overall,
        domainAuthority: backlinkResult?.domainAuthority, competitorCount: competitorResults?.length,
      }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReportResult(data);
      addLog(`> Marketing report ready`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsGeneratingReport(false); }
  };

  const runAdsGenerator = async (adPlatform: string) => {
    setIsGeneratingAds(true);
    addLog(`> Generating ${adPlatform} ad copy...`);
    try {
      const ctx = getProjectContext();
      const res = await fetch("/api/ads-generator", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...ctx, adPlatform }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAdsResult(data);
      addLog(`> Ad copy ready (${adPlatform})`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsGeneratingAds(false); }
  };

  // ---- GEO deep analysis runners ----

  const runCrawlerAccess = async () => {
    if (!company.website) { addLog("> Set website URL first"); return; }
    setIsCheckingCrawlers(true);
    addLog(`> Checking AI crawler access...`);
    try {
      const res = await fetch("/api/crawler-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: company.website }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCrawlerAccessResult(data);
      addLog(`> Crawler access: ${data.score}/100 — ${data.criticalIssues?.length || 0} critical issues`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsCheckingCrawlers(false); }
  };

  const runBrandPresence = async () => {
    if (!company.name) { addLog("> Set company name first"); return; }
    setIsCheckingBrand(true);
    addLog(`> Scanning brand presence...`);
    try {
      const res = await fetch("/api/brand-presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brand: company.name, website: company.website, city: company.city }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBrandPresenceResult(data);
      addLog(`> Brand presence: ${data.score}/100`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsCheckingBrand(false); }
  };

  const runCitabilityAudit = async () => {
    if (!company.website) { addLog("> Set website URL first"); return; }
    setIsCheckingCitability(true);
    addLog(`> Auditing content citability...`);
    try {
      const res = await fetch("/api/citability-audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: company.website, projectName: company.name }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCitabilityResult(data);
      addLog(`> Citability: ${data.overallScore}/100`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsCheckingCitability(false); }
  };

  // ---- GEO improvement runners ----

  const runLlmsTxt = async () => {
    setIsGeneratingLlmsTxt(true);
    addLog(`> Generating llms.txt...`);
    try {
      const res = await fetch("/api/llms-txt", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: company.name, website: company.website, city: company.city,
          description: company.description, projects: company.projects, usps: company.description,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLlmsTxtResult(data);
      addLog(`> llms.txt ready — upload to your website root`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsGeneratingLlmsTxt(false); }
  };

  const runGeoImprovement = async () => {
    setIsGeneratingGeoImprovement(true);
    addLog(`> Generating GEO improvement plan...`);
    try {
      const missingQueries = (aiVisResult?.queryResults || [])
        .filter((q: any) => !q.chatgpt?.mentioned && !q.claude?.mentioned && !q.perplexity?.mentioned && !q.gemini?.mentioned)
        .map((q: any) => q.query);
      const failedChecks = (aiVisResult?.aiReadiness || [])
        .filter((c: any) => !c.passed)
        .map((c: any) => c.check);
      const res = await fetch("/api/geo-improvement", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: company.name, website: company.website, city: company.city,
          currentScore: aiVisResult?.scores?.overall || 0,
          currentMentionRate: 0, missingQueries, failedChecks,
          projects: company.projects.map((p: any) => ({ name: p.name, location: p.location })),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeoImprovementResult(data);
      addLog(`> GEO plan: ${data.currentScore}→${data.targetScore} in ${data.expectedTimeline}`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsGeneratingGeoImprovement(false); }
  };

  const runFullScan = async () => {
    const url = company.website;
    if (!url) { addLog("> Set your website URL first"); return; }
    addLog("> Full scan started...");
    addLog("> Technical SEO scan...");
    addLog("> Analyzing backlinks...");
    addLog("> Checking AI visibility...");
    await Promise.all([
      runAudit(url), runTechnical(url), runBacklinks(url),
      ...(company.name ? [runAIVisibility()] : []),
    ]);
    if (company.competitors.length > 0) await runCompetitorAnalysis();
    addLog("✓ Full scan complete");

    // Retention hook: show what to do next
    const today = new Date();
    const dayOfMonth = today.getDate();
    if (dayOfMonth <= 30) {
      addLog(`> Today is Day ${dayOfMonth} of your improvement plan — check the AI/GEO tab for today's action`);
    }
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
              // Round 2 features
              landingPageResult={landingPageResult} isGeneratingLanding={isGeneratingLanding}
              onRunLandingPage={runLandingPage}
              portalResult={portalResult} isGeneratingPortal={isGeneratingPortal}
              onRunPortalOptimizer={runPortalOptimizer}
              neighborhoodResult={neighborhoodResult} isGeneratingNeighborhood={isGeneratingNeighborhood}
              onRunNeighborhood={runNeighborhood}
              progressResult={progressResult} isGeneratingProgress={isGeneratingProgress}
              onRunProgressUpdate={runProgressUpdate}
              reportResult={reportResult} isGeneratingReport={isGeneratingReport}
              onRunMarketingReport={runMarketingReport}
              adsResult={adsResult} isGeneratingAds={isGeneratingAds}
              onRunAdsGenerator={runAdsGenerator}
              llmsTxtResult={llmsTxtResult} isGeneratingLlmsTxt={isGeneratingLlmsTxt}
              onRunLlmsTxt={runLlmsTxt}
              geoImprovementResult={geoImprovementResult} isGeneratingGeoImprovement={isGeneratingGeoImprovement}
              onRunGeoImprovement={runGeoImprovement}
              crawlerAccessResult={crawlerAccessResult} isCheckingCrawlers={isCheckingCrawlers}
              onRunCrawlerAccess={runCrawlerAccess}
              brandPresenceResult={brandPresenceResult} isCheckingBrand={isCheckingBrand}
              onRunBrandPresence={runBrandPresence}
              citabilityResult={citabilityResult} isCheckingCitability={isCheckingCitability}
              onRunCitabilityAudit={runCitabilityAudit}
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
