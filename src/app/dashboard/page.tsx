"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { CompanyPanel } from "@/components/dashboard/CompanyPanel";
import { AnalyticsPanel } from "@/components/dashboard/AnalyticsPanel";
import { ActionsFeed } from "@/components/dashboard/ActionsFeed";
import { ChatPanel } from "@/components/dashboard/ChatPanel";
import { TerminalHeader } from "@/components/dashboard/TerminalHeader";
import { AgentStatusBar } from "@/components/dashboard/AgentStatusBar";
import { GSCPanel } from "@/components/dashboard/GSCPanel";
import { SiteSwitcher } from "@/components/dashboard/SiteSwitcher";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { PaywallOverlay } from "@/components/dashboard/PaywallOverlay";
import { DemoBanner } from "@/components/dashboard/DemoBanner";
import { recordScan, getAllTrends, type TrendData } from "@/lib/scanHistory";
import { recordGEOScan, getGEOProgress, getSavedQueries, getSavedQueriesFingerprint, saveQueries, trackArticleGenerated, markArticlePublished, type GEOProgress } from "@/lib/geoHistory";

/**
 * Stable hash of company.projects — used to detect when the project list
 * changes so we can auto-regenerate queries (task C).
 */
function projectsFingerprint(projects: Array<{ name: string; location?: string; configurations?: string; priceRange?: string }>): string {
  const key = projects
    .map((p) => `${p.name}|${p.location || ""}|${p.configurations || ""}|${p.priceRange || ""}`)
    .sort()
    .join(";;");
  // Simple djb2 hash — good enough for change detection, not crypto.
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash + key.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

export default function DashboardPage() {
  const [company, setCompany] = useState({
    name: "",
    description: "",
    website: "",
    city: "",
    sites: [] as { url: string; label: string }[],
    projects: [] as { name: string; website: string; location: string; configurations?: string; priceRange?: string; reraNumber?: string; amenities?: string; status?: string }[],
    competitors: [] as { name: string; website: string }[],
    yearEstablished: "",
    projectsCompleted: "",
    awards: "",
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
  const [portalResult, setPortalResult] = useState<any>(null);
  const [neighborhoodResult, setNeighborhoodResult] = useState<any>(null);
  const [progressResult, setProgressResult] = useState<any>(null);
  const [reportResult, setReportResult] = useState<any>(null);
  const [adsResult, setAdsResult] = useState<any>(null);
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
  const [gscData, setGscData] = useState<any>(null);
  const [siteCrawlResult, setSiteCrawlResult] = useState<any>(null);
  const [isCrawling, setIsCrawling] = useState(false);
  const [keywordResearchResult, setKeywordResearchResult] = useState<any>(null);
  const [isResearchingKeywords, setIsResearchingKeywords] = useState(false);
  const [internalLinkingResult, setInternalLinkingResult] = useState<any>(null);
  const [isAnalyzingLinks, setIsAnalyzingLinks] = useState(false);
  const [contentDecayReport, setContentDecayReport] = useState<any>(null);
  const [snapshotCount, setSnapshotCount] = useState(0);
  const [billing, setBilling] = useState<{
    plan: string;
    status: string;
    daysLeftInTrial: number;
    canAccess: boolean;
    email?: string;
  } | null>(null);

  // Fetch billing status on mount
  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) setBilling(d);
      })
      .catch(() => { /* if Supabase not configured, dashboard still works */ });
  }, []);
  const [trends, setTrends] = useState<Record<string, TrendData>>({
    audit: { current: 0, previous: null, change: 0, direction: "new", history: [] },
    technical: { current: 0, previous: null, change: 0, direction: "new", history: [] },
    ai_visibility: { current: 0, previous: null, change: 0, direction: "new", history: [] },
    backlinks: { current: 0, previous: null, change: 0, direction: "new", history: [] },
  });

  const [geoProgress, setGeoProgress] = useState<GEOProgress>({
    currentScan: null, previousScan: null, allScans: [],
    mentionRate: 0, previousMentionRate: 0, mentionRateChange: 0,
    newlyFound: [], newlyLost: [], neverFound: [], alwaysFound: [],
    daysSinceLastScan: 0, isStale: false, isVeryStale: false,
    weeklyScan: null, weeklyMentionRateChange: 0,
    weeklyNewlyFound: [], weeklyNewlyLost: [], perCityBreakdown: [], perConfigBreakdown: [], perPriceTierBreakdown: [], perFunnelBreakdown: [], competitorAlerts: [],
    trajectory: "new",
  });

  const [activeTab, setActiveTab] = useState("health");

  // Multi-site support: which site is the dashboard currently focused on?
  // Each site (corporate + project microsites + NRI sites) has its own
  // scan history, audit results, and GEO progress tracked independently.
  // Defaults to the primary company website.
  const [activeSiteUrl, setActiveSiteUrl] = useState<string>("");
  // Keep activeSiteUrl in sync with company.website when company first loads,
  // unless user has manually switched to a microsite.
  useEffect(() => {
    if (!activeSiteUrl && company.website) setActiveSiteUrl(company.website);
  }, [company.website, activeSiteUrl]);

  const [isAuditing, setIsAuditing] = useState(false);
  const [isCheckingAI, setIsCheckingAI] = useState(false);
  const [isCheckingBacklinks, setIsCheckingBacklinks] = useState(false);
  const [isCheckingTechnical, setIsCheckingTechnical] = useState(false);
  const [isCheckingCompetitors, setIsCheckingCompetitors] = useState(false);

  const [terminalLogs, setTerminalLogs] = useState<string[]>(["Cabbge initialized"]);

  // Which panel is shown on the left: "company" or "chat"
  const [leftPanel, setLeftPanel] = useState<"company" | "chat">("company");

  // ---- Credit system ----
  const CREDITS_TOTAL = 1000;
  const [creditsUsed, setCreditsUsed] = useState(0);

  // Load credits from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("cabbge_credits_used");
    if (saved) setCreditsUsed(parseInt(saved, 10) || 0);
  }, []);

  const CREDIT_COSTS: Record<string, number> = {
    audit: 2, technical: 1, ai_visibility: 4, backlinks: 1, competitors: 2,
    content: 3, content_plan: 3, article: 5, campaign: 3, partner: 3,
    schema: 2, portal: 2, neighborhood: 3, progress: 2,
    report: 5, ads: 3, llms_txt: 2, geo_improvement: 3, crawler: 1,
    brand_presence: 2, citability: 2, chat: 1, locality: 1,
    gbp_posts: 3, prompt_volumes: 3,
  };

  // Track credit usage locally (never blocks — upsell model).
  // Server-side also tracks via enforceCredits() for billing.
  const spendCredits = (_action: string): boolean => {
    const cost = CREDIT_COSTS[_action] || 1;
    const next = creditsUsed + cost;
    setCreditsUsed(next);
    localStorage.setItem("cabbge_credits_used", String(next));
    return true; // always allow — upsell when they hit their plan limit
  };

  // Load company: try Supabase first, fall back to localStorage
  useEffect(() => {
    (async () => {
      try {
        // First load from localStorage for instant display
        const saved = localStorage.getItem("cabbge_company");
        let localData: any = null;
        if (saved) {
          localData = JSON.parse(saved);
          setCompany(localData);
          setTrends(getAllTrends(localData.website));
          setGeoProgress(getGEOProgress(localData.name, localData.website));
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
              localStorage.setItem("cabbge_company", JSON.stringify(merged));
              addLog(`> Synced from cloud: ${merged.name}`);
            }
          } catch {
            // Supabase not configured — that's fine, use localStorage
          }
        }

        if (localData?.name) {
          addLog(`> Cabbge activated for ${localData.name}`);

          // AUTO-DISCOVER: If documents are empty, scrape website and fill them
          const hasDocuments = localData.documents?.brandVoice || localData.documents?.productInfo;
          if (localData.website && !hasDocuments) {
            addLog("> Deploying 6 agents...");
            await new Promise(r => setTimeout(r, 400));
            addLog(`> Fetching ${localData.website}...`);
            try {
              const discoverRes = await fetch("/api/auto-discover", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: localData.website, companyName: localData.name, industry: localData.industry }),
              });
              const discovered = await discoverRes.json();
              if (!discovered.error && discovered.documents) {
                const enriched = {
                  ...localData,
                  city: localData.city || discovered.city || "",
                  description: localData.description || discovered.companyDescription || "",
                  documents: {
                    ...localData.documents,
                    productInfo: localData.documents?.productInfo || discovered.documents.productInfo || "",
                    brandVoice: localData.documents?.brandVoice || discovered.documents.brandVoice || "",
                    brandValues: localData.documents?.brandValues || discovered.documents.brandValues || "",
                    targetAudience: localData.documents?.targetAudience || discovered.documents.targetAudience || "",
                    marketingStrategy: localData.documents?.marketingStrategy || discovered.documents.marketingStrategy || "",
                    competitorAnalysis: localData.documents?.competitorAnalysis || discovered.documents.competitorAnalysis || "",
                  },
                };
                // Filter out placeholder/invalid project names that the AI may hallucinate
                const placeholderPatterns = /^(unknown|featured|project\s*\d*|placeholder|n\/?a|not\s+specified|tbd|inferred|example|sample|generic|no\s+name)$/i;
                const validInferredProjects = (discovered.inferredProjects || []).filter((p: any) => {
                  if (!p?.name || typeof p.name !== "string") return false;
                  const name = p.name.trim();
                  if (name.length < 3) return false;
                  if (placeholderPatterns.test(name)) return false;
                  if (name.toLowerCase().includes("featured project")) return false;
                  if (name.toLowerCase().includes("unknown")) return false;
                  return true;
                });
                if ((!localData.projects || localData.projects.length === 0) && validInferredProjects.length > 0) {
                  enriched.projects = validInferredProjects;
                }

                const validInferredCompetitors = (discovered.inferredCompetitors || []).filter((c: string) => {
                  if (!c || typeof c !== "string") return false;
                  const name = c.trim();
                  if (name.length < 3) return false;
                  if (placeholderPatterns.test(name)) return false;
                  return true;
                });
                if ((!localData.competitors || localData.competitors.length === 0) && validInferredCompetitors.length > 0) {
                  enriched.competitors = validInferredCompetitors.map((c: string) => ({ name: c, website: "" }));
                }
                setCompany(enriched);
                localStorage.setItem("cabbge_company", JSON.stringify(enriched));
                addLog(`> Agent 1: Brand voice captured`);
                await new Promise(r => setTimeout(r, 200));
                addLog(`> Agent 2: Product intelligence — ${enriched.projects?.length || 0} real projects detected`);
                await new Promise(r => setTimeout(r, 200));
                addLog(`> Agent 3: Target audience identified — ${discovered.documents.targetAudience?.split(".")[0]?.slice(0, 50) || "home buyers"}`);
                await new Promise(r => setTimeout(r, 200));
                addLog(`> Agent 4: Competitor landscape mapped — ${enriched.competitors?.length || 0} competitors tracked`);
                await new Promise(r => setTimeout(r, 200));
                addLog(`> Agent 5: Market context: ${discovered.city || localData.city || "locality"}`);
                if (discovered.seoObservations?.quickWins?.length) {
                  addLog(`> Agent 6: ${discovered.seoObservations.quickWins.length} quick SEO wins surfaced`);
                }
              }
            } catch { /* Auto-discover not critical */ }
          }

          // AUTO-SCAN: If no audit results exist, run full scan automatically
          const hasResults = localStorage.getItem("cabbge_has_scanned");
          if (localData.website && !hasResults) {
            addLog("> Running first scan automatically...");
            localStorage.setItem("cabbge_has_scanned", "true");
            setTimeout(() => {
              const scanBtn = document.querySelector("[data-auto-scan]") as HTMLButtonElement;
              if (scanBtn) scanBtn.click();
            }, 1500);
          } else {
            // FRESHNESS CHECK: prompt re-scan if data is stale
            const progress = getGEOProgress(localData.name, localData.website);
            if (progress.currentScan) {
              const daysSince = Math.floor((Date.now() - new Date(progress.currentScan.timestamp).getTime()) / (1000 * 60 * 60 * 24));
              if (daysSince >= 14) {
                addLog(`> Last scan was ${daysSince} days ago — AI answers drift 40-60%/month`);
                addLog(`> Re-scan to see if competitors overtook you`);
              } else if (daysSince >= 7) {
                addLog(`> Last scan was ${daysSince} days ago — time to check progress`);
              } else if (daysSince >= 3) {
                addLog(`> Last scan ${daysSince}d ago — check if published content is being picked up`);
              } else {
                addLog(`> Ready (last scan: ${daysSince === 0 ? "today" : `${daysSince}d ago`})`);
              }
            } else {
              addLog("> Ready");
            }
          }
        } else {
          addLog("> No site configured. Visit the homepage to add one.");
        }
      } catch { addLog("> Ready"); }
    })();
  }, []);

  // GSC callback + auto-fetch data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gsc_connected") === "1" || params.get("gsc_connected") === "true") {
      addLog("> Google Search Console connected!");
      window.history.replaceState({}, "", "/dashboard");
    }
    if (params.get("gsc_error")) {
      addLog(`> GSC error: ${decodeURIComponent(params.get("gsc_error")!)}`);
      window.history.replaceState({}, "", "/dashboard");
    }

    // Try to fetch GSC data on load (if connected via httpOnly cookie)
    (async () => {
      try {
        const websiteUrl = localStorage.getItem("cabbge_company")
          ? JSON.parse(localStorage.getItem("cabbge_company")!).website
          : null;
        if (!websiteUrl) return;

        const res = await fetch("/api/integrations/gsc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteUrl: websiteUrl }),
        });
        const data = await res.json();
        if (data.error === "not_connected") return; // Not connected yet — that's fine
        if (data.error) return;
        if (data.topQueries) {
          setGscData(data);
          addLog(`> GSC: ${data.totalClicks?.toLocaleString()} clicks, ${data.totalImpressions?.toLocaleString()} impressions (last 30d)`);
          // Record snapshot for content decay detection and run analysis
          try {
            const { recordGSCSnapshot, detectContentDecay, getSnapshotCount } = await import("@/lib/contentDecay");
            if (data.topPages?.length) {
              recordGSCSnapshot(websiteUrl, data.topPages);
              const report = detectContentDecay(websiteUrl);
              setContentDecayReport(report);
              setSnapshotCount(getSnapshotCount(websiteUrl));
              if (report.decayingPages.length > 0) {
                addLog(`> Content decay: ${report.decayingPages.length} page${report.decayingPages.length === 1 ? "" : "s"} dropped in rankings`);
              }
            }
          } catch { /* non-fatal */ }
        }
      } catch { /* GSC not connected — silent */ }
    })();
  }, []);

  // Save company: localStorage immediately + debounced Supabase sync
  useEffect(() => {
    if (!company.name) return;
    localStorage.setItem("cabbge_company", JSON.stringify(company));

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

  /**
   * Internal linking analysis — needs a crawl to already exist.
   * Finds orphan pages, hub pages, and suggests specific link insertions
   * between topically-related pages. Uses Jaccard similarity on titles
   * — no paid APIs needed.
   */
  const runInternalLinking = async () => {
    if (!siteCrawlResult) {
      addLog("> Run Site Crawl first — internal linking needs crawl data");
      return;
    }
    setIsAnalyzingLinks(true);
    addLog("> Analyzing internal linking graph...");
    try {
      const res = await fetch("/api/internal-linking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crawl: siteCrawlResult }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setInternalLinkingResult(data);
      addLog(`> ${data.suggestions.length} link suggestions, ${data.orphanPages.length} orphan pages, ${data.topicalClusters.length} topic clusters`);
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Linking analysis failed"}`);
    } finally {
      setIsAnalyzingLinks(false);
    }
  };

  /**
   * Keyword research: expand a seed keyword into 20 related queries
   * with real search volume, difficulty, CPC, and current ranking.
   * Uses GSC data + ChatGPT web_search to pull real metrics.
   */
  /**
   * Single-seed mode (user typed a seed) OR portfolio mode (auto, silent).
   * Portfolio covers every city × project × config the brand cares about
   * so the returned keyword bank is comprehensive, not single-angle.
   */
  const runKeywordResearch = async (seed: string, silent: boolean = false) => {
    if (!company.city) {
      if (!silent) addLog("> Set your city first");
      return;
    }
    if (!spendCredits("prompt_volumes")) return;
    setIsResearchingKeywords(true);
    const portfolio = seed === "__portfolio__";
    if (!silent) {
      addLog(portfolio
        ? `> Running multi-dimensional keyword research across all cities, projects, and configs...`
        : `> Researching keywords around "${seed}" in ${company.city}...`);
    }
    try {
      const body = portfolio
        ? { mode: "portfolio", city: company.city, projects: company.projects, gscData, companyId: (company as any)._companyId }
        : { seed, city: company.city, gscData, companyId: (company as any)._companyId };
      const res = await fetch("/api/keyword-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setKeywordResearchResult(data);
      const highOpp = data.keywords?.filter((k: any) => k.opportunity === "high").length || 0;
      if (!silent) {
        const dims = data.seedsUsed?.length ? ` across ${data.seedsUsed.length} dimensions` : "";
        addLog(`> Found ${data.totalKeywords} keywords${dims} — ${highOpp} high-opportunity ${highOpp === 1 ? "target" : "targets"}`);
      }
    } catch (err) {
      if (!silent) addLog(`> Error: ${err instanceof Error ? err.message : "Keyword research failed"}`);
    } finally {
      setIsResearchingKeywords(false);
    }
  };

  // Auto-fire multi-dimensional keyword research once per session.
  // Covers every city × project × config the brand cares about — not one angle.
  // Silent — no terminal logs — since the user didn't explicitly click anything.
  useEffect(() => {
    if (!company.city || !company.name) return;
    if (keywordResearchResult || isResearchingKeywords) return;
    runKeywordResearch("__portfolio__", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.city, company.name, company.projects]);

  /**
   * Full-site crawler: visits every page, runs per-URL audit.
   * Much deeper than runAudit (single-page). Produces URL inventory
   * with issues, orphan detection, duplicate titles, thin content, etc.
   */
  const runSiteCrawl = async () => {
    const url = activeSiteUrl || company.website;
    if (!url) { addLog("> Set your website URL first"); return; }
    if (!spendCredits("audit")) return;
    setIsCrawling(true);
    addLog(`> Crawling ${url} — this takes 30-90 seconds...`);
    try {
      const res = await fetch("/api/site-crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, maxPages: 50 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSiteCrawlResult(data);
      addLog(`> Crawled ${data.totalPages} pages in ${(data.durationMs / 1000).toFixed(1)}s`);
      const issueCount = (data.pages || []).filter((p: any) => p.issues?.length > 0).length;
      if (issueCount > 0) {
        addLog(`> ${issueCount}/${data.totalPages} pages have issues. Check the Site Audit tab.`);
      } else {
        addLog(`> Clean crawl — no issues detected on ${data.totalPages} pages`);
      }
      // Persist per-site in localStorage so switching sites loads the right crawl
      try {
        localStorage.setItem(`cabbge_crawl_${url}`, JSON.stringify(data));
      } catch { /* quota — skip */ }
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Crawl failed"}`);
    } finally {
      setIsCrawling(false);
    }
  };

  const runAudit = async (url: string) => {
    if (!spendCredits("audit")) return;
    setIsAuditing(true);
    addLog(`> SEO agent: crawling ${url}...`);
    addLog(`> Running 15 real estate checks...`);
    try {
      const res = await fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAuditResult(data);
      recordScan("audit", url, data.scores.overall, `${data.fixes?.length || 0} fixes`);
      addLog(`> Page speed analyzed`);
      addLog(`> Schema markup checked`);
      addLog(`> RERA compliance verified`);
      logScoreChange("SEO Audit", data.scores.overall, "audit");
      const critical = data.fixes?.filter((f: any) => f.severity === "critical").length || 0;
      const failed = data.realEstateChecks?.filter((c: any) => !c.passed).length || 0;
      addLog(`> ${data.fixes?.length || 0} fixes surfaced (${critical} critical) + ${failed} RE issues`);
      refreshTrends();
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Audit failed"}`); }
    finally { setIsAuditing(false); }
  };

  const runAIVisibility = async () => {
    if (!company.name) { addLog("> Set company name first"); return; }
    if (!spendCredits("ai_visibility")) return;
    setIsCheckingAI(true);
    addLog(`> GEO agent: generating buyer queries for ${company.city || "your market"}...`);
    addLog(`> Querying ChatGPT with real buyer searches...`);
    addLog(`> Querying Google AI (Gemini) in parallel...`);
    try {
      // Task C: auto-refresh queries when projects change. If the user added
      // new projects/localities/configs since the last query generation, the
      // saved query set no longer covers the full brand footprint.
      let existingQueries = getSavedQueries(company.name);
      if (existingQueries && company.projects.length > 0) {
        const currentFP = projectsFingerprint(company.projects);
        const savedFP = getSavedQueriesFingerprint(company.name);
        if (savedFP && savedFP !== currentFP) {
          addLog(`> Projects changed since last query generation — regenerating queries to cover new localities/configs`);
          // Import resetSavedQueries lazily to avoid circular issues
          const { resetSavedQueries } = await import("@/lib/geoHistory");
          resetSavedQueries(company.name);
          existingQueries = null; // force regeneration
        }
      }
      if (existingQueries) addLog(`> Reusing ${existingQueries.length} tracked queries for progress comparison`);

      // One-line payload echo so the user can see exactly what we're sending.
      // Previous bug: city silently became "the market" between input and request,
      // producing global-brand recommendations instead of city-specific results.
      addLog(`> Payload: brand="${company.name}" city="${company.city || "(EMPTY!)"}" projects=${company.projects.length}`);
      const res = await fetch("/api/ai-visibility", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        websiteUrl: activeSiteUrl || company.website, brand: company.name, city: company.city, savedQueries: existingQueries,
        projects: company.projects.map(p => p.name),
        projectDetails: company.projects.map(p => ({ name: p.name, location: p.location, configurations: p.configurations, priceRange: p.priceRange })),
        industry: (company as any).industry,
        brandContext: {
          targetAudience: company.documents?.targetAudience || "",
          usps: company.description || "",
          projectsCompleted: (company as any).projectsCompleted || "",
        },
      }) });
      const data = await res.json();
      if (data.error) {
        // Hint is included on validation errors (e.g. "City required") so the
        // user knows what to fix instead of seeing a generic "Failed".
        throw new Error(data.hint ? `${data.error} — ${data.hint}` : data.error);
      }
      setAiVisResult(data);
      recordScan("ai_visibility", company.website, data.scores.overall, `Readiness: ${data.scores.readiness}%, Mentions: ${data.scores.mentions}%`);
      logScoreChange("AI Readiness", data.scores.readiness || data.scores.overall, "ai_visibility");

      // If query generation hit the fallback, the scores below come from
      // generic "best X in city" queries instead of the rich brand-aware set.
      // Tell the user — otherwise an unexplained drop in score after Clear &
      // re-scan looks like a regression when it's actually a different test.
      if (data.queryGenerationFallback?.used) {
        addLog(`> Query generator failed — using ${data.queriesUsed?.length || 0} generic queries this run. ${data.queryGenerationFallback.reason || ""}`);
        addLog(`> Re-scan once more to retry richer query generation, or proceed with these results.`);
      }

      // Surface platform health BEFORE mention counts — if web search isn't working,
      // the 0/X count is meaningless and the user needs to know that's the cause.
      const health = data.platformHealth;
      if (health) {
        const fmt = (name: string, h: any) => {
          if (!h) return null;
          if (h.status === "broken") {
            return `> ${name}: scan UNAVAILABLE — ${h.lastError || "all queries failed"} (scores below are not real)`;
          }
          if (h.status === "degraded") {
            return `> ${name}: web search disabled, used generic fallback (${h.fallbackQueries}/${h.fallbackQueries + h.liveQueries + h.failedQueries}). Scores will read low.${h.lastError ? ` Reason: ${h.lastError}` : ""}`;
          }
          return null; // live — no need to log
        };
        const cMsg = fmt("ChatGPT", health.chatgpt);
        const gMsg = fmt("Google AI", health.gemini);
        if (cMsg) addLog(cMsg);
        if (gMsg) addLog(gMsg);
      }

      const mentioned = data.queryResults?.filter((q: any) => q.chatgpt?.mentioned || q.gemini?.mentioned).length || 0;
      const total = data.queryResults?.length || 0;
      if (mentioned === 0) {
        addLog(`> ChatGPT + Google AI: 0/${total} queries mention ${company.name}`);
        addLog(`> Your brand is invisible in AI search — use the Improvement Plan below`);
      } else {
        addLog(`> ChatGPT + Google AI: ${mentioned}/${total} queries mention ${company.name}`);
        // Show which queries found the brand
        const foundQueries = data.queryResults?.filter((q: any) => q.chatgpt?.mentioned || q.gemini?.mentioned).slice(0, 3);
        if (foundQueries?.length) {
          addLog(`> Found in: "${foundQueries.map((q: any) => q.query).join('", "')}"`);
        }
      }
      // Show sample of what was tested
      const sampleQueries = data.queryResults?.slice(0, 3).map((q: any) => q.query);
      if (sampleQueries?.length) {
        addLog(`> Queries tested: "${sampleQueries.join('", "')}" + ${total - 3} more`);
      }
      refreshTrends();
      // Save queries for consistent tracking (first scan locks the query set).
      // Also stores a fingerprint of company.projects so we can detect when
      // the project list changes and auto-regenerate (task C).
      if (data.queriesUsed?.length && !getSavedQueries(company.name)) {
        const fp = projectsFingerprint(company.projects);
        saveQueries(company.name, data.queriesUsed, fp);
        addLog(`> Locked ${data.queriesUsed.length} queries for ongoing tracking`);
      }
      // Record GEO scan for progress tracking
      if (data.queryResults?.length) {
        recordGEOScan(company.name, company.city, data.scores, data.queryResults, activeSiteUrl || company.website);
        const updatedProgress = getGEOProgress(company.name, activeSiteUrl || company.website);
        setGeoProgress(updatedProgress);
        if (updatedProgress.newlyFound.length > 0) {
          addLog(`> GEO Progress: +${updatedProgress.newlyFound.length} new queries found since last scan`);
        }
      }
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsCheckingAI(false); }
  };

  const runBacklinks = async (url: string) => {
    if (!spendCredits("backlinks")) return;
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
    if (!spendCredits("technical")) return;
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
    if (!spendCredits("competitors")) return;
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
    if (!spendCredits("content")) return;
    setIsGeneratingContent(true);
    addLog(`> Generating content...`);
    try {
      const ctx = getProjectContext();
      const res = await fetch("/api/local-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ctx) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setContentResult(data);
      addLog(`> Content: ${data.blogTopics?.length || 0} blogs, ${data.linkedinPosts?.length || 0} LinkedIn, ${data.whatsappMessages?.length || 0} WhatsApp`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsGeneratingContent(false); }
  };

  const runContentPlan = async () => {
    if (!company.name) { addLog("> Set company name first"); return; }
    if (!spendCredits("content_plan")) return;
    setIsGeneratingContent(true);
    addLog(`> Generating 4-week plan...`);
    try {
      const ctx = getProjectContext();
      const res = await fetch("/api/content-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ctx) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setContentPlanResult(data);
      addLog(`> Plan: ${data.weeklyPlan?.length || 0} weeks, ${data.socialCalendar?.length || 0} posts`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsGeneratingContent(false); }
  };

  const runLocalitySearch = async () => {
    if (!company.city) { addLog("> Set city first"); return; }
    if (!spendCredits("locality")) return;
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

  // Rich context builder — feeds ALL brand knowledge into every content generator
  const getProjectContext = () => {
    const p = selectedProject !== null ? company.projects[selectedProject] : null;
    // Load per-channel writing instructions saved in Settings.
    // These get injected into every generator so voice stays consistent
    // across articles / LinkedIn / WhatsApp / etc.
    let writingInstructions: Record<string, string> = {};
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("cabbge_writing_instructions") : null;
      if (raw) writingInstructions = JSON.parse(raw);
    } catch { /* non-fatal */ }

    return {
      projectName: p?.name || company.name,
      developerName: company.name,
      location: p?.location || company.city || "",
      city: company.city || "",
      configurations: (p as any)?.configurations || "",
      priceRange: (p as any)?.priceRange || "",
      usps: company.description || "",
      reraNumber: (p as any)?.reraNumber || "",
      amenities: (p as any)?.amenities || "",
      website: p?.website || company.website,
      status: (p as any)?.status || "",
      // Brand context — this is what makes content genuinely relevant
      brandVoice: company.documents?.brandVoice || "",
      brandValues: company.documents?.brandValues || "",
      brandVision: company.documents?.brandVision || "",
      targetAudience: company.documents?.targetAudience || "",
      productInfo: company.documents?.productInfo || "",
      marketingStrategy: company.documents?.marketingStrategy || "",
      // All projects summary for cross-referencing
      allProjects: (company.projects || []).map((proj: any) => ({
        name: proj.name, location: proj.location, configurations: proj.configurations,
        priceRange: proj.priceRange, status: proj.status,
      })),
      competitors: (company.competitors || []).map((c: any) => c.name),
      yearEstablished: company.yearEstablished || "",
      projectsCompleted: company.projectsCompleted || "",
      awards: company.awards || "",
      // Per-channel writing instructions from Settings → Personalization
      writingInstructions,
    };
  };

  const runArticleWriter = async (topic: string, targetKeyword: string, articleType: string) => {
    if (!spendCredits("article")) return;
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
    if (!spendCredits("campaign")) return;
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
    if (!spendCredits("partner")) return;
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
    if (!spendCredits("schema")) return;
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

  const runPortalOptimizer = async () => {
    if (!spendCredits("portal")) return;
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
    if (!spendCredits("neighborhood")) return;
    setIsGeneratingNeighborhood(true);
    const ctx = getProjectContext();
    addLog(`> Analyzing neighborhood: ${ctx.location}, ${ctx.city}...`);
    try {
      const res = await fetch("/api/neighborhood", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city: ctx.city, location: ctx.location, projectName: ctx.projectName, developerName: ctx.developerName, configurations: ctx.configurations, priceRange: ctx.priceRange, amenities: ctx.amenities }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setNeighborhoodResult(data);
      addLog(`> Neighborhood: Walk ${data.walkScore}/100, Connectivity ${data.connectivityScore}/100`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsGeneratingNeighborhood(false); }
  };

  const runProgressUpdate = async (phase: string, completionPct?: number) => {
    if (!spendCredits("progress")) return;
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
    if (!spendCredits("report")) return;
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
    if (!spendCredits("ads")) return;
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
    if (!spendCredits("crawler")) return;
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
    if (!spendCredits("brand_presence")) return;
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
    if (!spendCredits("citability")) return;
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
    if (!spendCredits("llms_txt")) return;
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
    if (!spendCredits("geo_improvement")) return;
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

  // ---- GEO fix actions (high-token, high-value) ----

  const [isFixingGeo, setIsFixingGeo] = useState(false);
  const [gbpResult, setGbpResult] = useState<any>(null);
  const [isGeneratingGbp, setIsGeneratingGbp] = useState(false);

  const runGeoFixForQuery = async (query: string) => {
    if (!spendCredits("article")) return;
    setIsFixingGeo(true);
    addLog(`> Writing GEO-optimized article for: "${query}"...`);
    try {
      const ctx = getProjectContext();
      const res = await fetch("/api/article-writer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ctx, topic: query, targetKeyword: query, articleType: "locality_guide" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // Track the article for the publish→rescan loop (task F).
      // Capture whether the brand was already mentioned for this query before
      // the fix, so we can show before/after after the rescan.
      const currentQueryResult = geoProgress.currentScan?.queries.find(
        (q) => q.query.toLowerCase() === query.toLowerCase()
      );
      const preScore = currentQueryResult ? {
        chatgptMentioned: currentQueryResult.chatgpt.mentioned,
        geminiMentioned: currentQueryResult.gemini.mentioned,
      } : undefined;
      const tracked = trackArticleGenerated(query, data.title, preScore);
      // Attach the tracked article ID to the result so the PublishButton can
      // call markArticlePublished with the right ID.
      data._trackedArticleId = tracked.id;

      setArticleResult(data);
      addLog(`> Article: "${data.title}" — ${data.wordCount} words, optimized for "${query}"`);
      addLog(`> Publish it to your site, then re-scan to measure impact`);
      setActiveTab("content");
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsFixingGeo(false); }
  };

  const runFixAllBlindSpots = async () => {
    const blindSpots = geoProgress.neverFound.length > 0 ? geoProgress.neverFound :
      geoProgress.currentScan?.queries.filter(q => !q.chatgpt.mentioned && !q.gemini.mentioned).map(q => q.query) || [];
    if (!blindSpots.length) { addLog("> No blind spots to fix"); return; }
    // Write one high-quality article for the TOP blind spot. Better than
    // blasting 10 thin AI-generated pages at once — each real article has
    // a far higher chance of actually getting cited.
    addLog(`> Top blind spot: "${blindSpots[0]}"`);
    addLog(`> Writing a full GEO-optimized article for it...`);
    await runGeoFixForQuery(blindSpots[0]);
    if (blindSpots.length > 1) {
      addLog(`> Done. Run again for next blind spot: "${blindSpots[1]}"`);
    }
  };

  const runGbpPosts = async () => {
    if (!spendCredits("content")) return;
    setIsGeneratingGbp(true);
    addLog(`> Generating Google Business Profile posts...`);
    try {
      const ctx = getProjectContext();
      const res = await fetch("/api/gbp-posts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ctx),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGbpResult(data);
      addLog(`> ${data.posts?.length || 0} GBP posts ready — copy to Google Business Profile`);
    } catch (err) { addLog(`> Error: ${err instanceof Error ? err.message : "Failed"}`); }
    finally { setIsGeneratingGbp(false); }
  };

  const runFullScan = async () => {
    // Multi-site: scan whichever site is currently active in the switcher,
    // not just the primary corporate site. Falls back to primary if unset.
    const url = activeSiteUrl || company.website;
    if (!url) { addLog("> Set your website URL first"); return; }
    const siteLabel = url === company.website
      ? "Main site"
      : (company.sites || []).find((s) => s.url === url)?.label || url;
    addLog(`> Full scan started on ${siteLabel} (${url})...`);
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

  /**
   * Hard reset of all scan state — wipes the localStorage caches that the
   * automatic cleanup misses (e.g. when scores legitimately reach 0 via the
   * old broken code path), nukes in-memory results so the dashboard cards
   * collapse back to their pre-scan state, then triggers a fresh scan.
   *
   * Used by the "Clear & re-scan" button. Does NOT touch saved company info.
   */
  const clearAndRescan = async () => {
    if (!company.website) { addLog("> Set your website URL first"); return; }
    addLog("> Clearing saved scan history...");

    // Wipe every localStorage key that holds scan state. Anything keeping the
    // dashboard pinned to stale 0/100 scores lives in one of these.
    [
      "cabbge_geo_history",
      "cabbge_geo_queries",
      "cabbge_geo_schema_version",
      "cabbge_scan_history",
      "cabbge_has_scanned",
    ].forEach((key) => localStorage.removeItem(key));

    // Drop in-memory results too — otherwise the card stays rendered with the
    // old 0/100 numbers until the new scan completes.
    setAuditResult(null);
    setAiVisResult(null);
    setBacklinkResult(null);
    setTechnicalResult(null);
    setCompetitorResults([]);
    setTrends({
      audit: { current: 0, previous: null, change: 0, direction: "new", history: [] },
      technical: { current: 0, previous: null, change: 0, direction: "new", history: [] },
      ai_visibility: { current: 0, previous: null, change: 0, direction: "new", history: [] },
      backlinks: { current: 0, previous: null, change: 0, direction: "new", history: [] },
    });
    setGeoProgress({
      currentScan: null, previousScan: null, allScans: [],
      mentionRate: 0, previousMentionRate: 0, mentionRateChange: 0,
      newlyFound: [], newlyLost: [], neverFound: [], alwaysFound: [],
      daysSinceLastScan: 0, isStale: false, isVeryStale: false,
      weeklyScan: null, weeklyMentionRateChange: 0,
      weeklyNewlyFound: [], weeklyNewlyLost: [], perCityBreakdown: [], perConfigBreakdown: [], perPriceTierBreakdown: [], perFunnelBreakdown: [], competitorAlerts: [],
      trajectory: "new",
    });

    addLog("> Cache cleared. Running fresh scan...");
    await runFullScan();
  };

  // Demo mode: never paywall, always show demo banner at the top.
  const isDemoMode = billing?.plan === "demo" || (typeof window !== "undefined" && localStorage.getItem("cabbge_demo_mode") === "true");

  // Paywall: show overlay when trial expired OR subscription canceled/past-due
  // (but never in demo mode)
  const paywallReason: "trial_expired" | "canceled" | "past_due" | null =
    !isDemoMode && billing && !billing.canAccess
      ? billing.status === "canceled" || billing.status === "expired"
        ? "canceled"
        : billing.status === "past_due"
          ? "past_due"
          : "trial_expired"
      : null;

  return (
    <div className="h-screen bg-[#0a0a0b] text-zinc-100 flex overflow-hidden">
      {paywallReason && <PaywallOverlay email={billing?.email} reason={paywallReason} />}
      <Sidebar companyName={company.name} creditsUsed={creditsUsed} creditsTotal={CREDITS_TOTAL} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Demo mode banner — sits above trial banner, always visible in demo */}
        {isDemoMode && (
          <DemoBanner prospectName={company.name} prospectUrl={company.website} />
        )}
        {/* Trial reminder banner (during trial only, hidden in demo) */}
        {!isDemoMode && billing && (
          <TrialBanner
            plan={billing.plan}
            status={billing.status}
            daysLeftInTrial={billing.daysLeftInTrial}
            canAccess={billing.canAccess}
          />
        )}
        {/* Terminal + Agent bar */}
        <TerminalHeader
          logs={terminalLogs}
          onRunFullScan={runFullScan}
          onClearAndRescan={clearAndRescan}
          hasWebsite={!!company.website}
          leftSlot={
            <SiteSwitcher
              primarySite={company.website ? { url: company.website, label: "Main site" } : undefined}
              additionalSites={company.sites || []}
              activeSiteUrl={activeSiteUrl || company.website}
              onSwitch={(url) => {
                setActiveSiteUrl(url);
                // Clear in-memory scan state so the new site starts fresh.
                // Persistent history per site is preserved in localStorage.
                setAuditResult(null);
                setAiVisResult(null);
                setTechnicalResult(null);
                setBacklinkResult(null);
                // These are tied to a specific site URL — clear so users don't
                // see stale results from the previous site after switching.
                setCitabilityResult(null);
                setCrawlerAccessResult(null);
                setInternalLinkingResult(null);
                setGeoProgress(getGEOProgress(company.name, url));
                setTrends(getAllTrends(url));
                // Load this site's site-crawl from localStorage if we have one
                try {
                  const savedCrawl = localStorage.getItem(`cabbge_crawl_${url}`);
                  setSiteCrawlResult(savedCrawl ? JSON.parse(savedCrawl) : null);
                } catch { setSiteCrawlResult(null); }
                const label = url === company.website ? "Main site" : (company.sites || []).find((s) => s.url === url)?.label || url;
                addLog(`> Switched to ${label} (${url})`);
              }}
            />
          }
        />
        <AgentStatusBar
          isAuditing={isAuditing} isCheckingAI={isCheckingAI} isCheckingBacklinks={isCheckingBacklinks}
          isCheckingTechnical={isCheckingTechnical} isCheckingCompetitors={isCheckingCompetitors}
          auditResult={auditResult} aiVisResult={aiVisResult} backlinkResult={backlinkResult}
          technicalResult={technicalResult} competitorResults={competitorResults}
          isCrawling={isCrawling} siteCrawlResult={siteCrawlResult}
          isResearchingKeywords={isResearchingKeywords} keywordResearchResult={keywordResearchResult}
          isAnalyzingLinks={isAnalyzingLinks} internalLinkingResult={internalLinkingResult}
          contentDecayReport={contentDecayReport}
          schemaResult={schemaResult}
          onNavigateToTab={setActiveTab}
        />

        {/* Main content — 3 columns */}
        <div className="flex-1 flex min-h-0">
          {/* LEFT: Company or Chat (toggled) — hide on narrow screens so center has room */}
          <div className="hidden lg:flex w-[320px] flex-shrink-0 border-r border-white/[0.06] flex-col min-h-0">
            {/* Toggle tabs */}
            <div className="flex border-b border-white/[0.06] flex-shrink-0">
              <button
                onClick={() => setLeftPanel("company")}
                className={`flex-1 py-2.5 text-[13px] font-medium transition-colors duration-150 ${leftPanel === "company" ? "text-zinc-100 border-b-2 border-[#7CB342]" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                Company
              </button>
              <button
                onClick={() => setLeftPanel("chat")}
                className={`flex-1 py-2.5 text-[13px] font-medium transition-colors duration-150 ${leftPanel === "chat" ? "text-zinc-100 border-b-2 border-[#7CB342]" : "text-zinc-500 hover:text-zinc-300"}`}
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
              activeTab={activeTab} onTabChange={setActiveTab}
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
              contentResult={contentResult} onUpdateContent={setContentResult} contentPlanResult={contentPlanResult}
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
              creditCosts={CREDIT_COSTS}
              geoProgress={geoProgress}
              onGeoFixQuery={runGeoFixForQuery}
              onGeoFixAll={runFixAllBlindSpots}
              isFixingGeo={isFixingGeo}
              onRunGbpPosts={runGbpPosts}
              gbpResult={gbpResult}
              isGeneratingGbp={isGeneratingGbp}
              gscData={gscData}
              siteCrawlResult={siteCrawlResult}
              isCrawling={isCrawling}
              onRunSiteCrawl={runSiteCrawl}
              keywordResearchResult={keywordResearchResult}
              isResearchingKeywords={isResearchingKeywords}
              onRunKeywordResearch={runKeywordResearch}
              internalLinkingResult={internalLinkingResult}
              isAnalyzingLinks={isAnalyzingLinks}
              onRunInternalLinking={runInternalLinking}
              contentDecayReport={contentDecayReport}
              snapshotCount={snapshotCount}
            />
          </div>

          {/* RIGHT: Actions Feed — hide on tablet/narrow; collapse to in-flow section on mobile would be nice later */}
          <div className="hidden xl:block w-[340px] flex-shrink-0 border-l border-white/[0.06] overflow-y-auto min-h-0">
            <ActionsFeed
              auditResult={auditResult} aiVisResult={aiVisResult} backlinkResult={backlinkResult}
              technicalResult={technicalResult} competitorResults={competitorResults}
              geoProgress={geoProgress}
              siteCrawlResult={siteCrawlResult}
              keywordResearchResult={keywordResearchResult}
              internalLinkingResult={internalLinkingResult}
              contentDecayReport={contentDecayReport}
              gscData={gscData}
              onNavigateToTab={setActiveTab}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
