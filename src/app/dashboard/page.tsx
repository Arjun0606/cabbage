"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { CompanyPanel } from "@/components/dashboard/CompanyPanel";
import { AnalyticsPanel } from "@/components/dashboard/AnalyticsPanel";
import { ActionsFeed } from "@/components/dashboard/ActionsFeed";
import { TerminalHeader } from "@/components/dashboard/TerminalHeader";
import { AgentStatusBar } from "@/components/dashboard/AgentStatusBar";
import { SiteSwitcher } from "@/components/dashboard/SiteSwitcher";
import { PaywallOverlay } from "@/components/dashboard/PaywallOverlay";
import { DemoBanner } from "@/components/dashboard/DemoBanner";
import { recordScan, getAllTrends, type TrendData } from "@/lib/scanHistory";
import { recordGEOScan, getGEOProgress, getSavedQueries, getSavedQueriesFingerprint, saveQueries, trackArticleGenerated, hydrateArticleQueue, type GEOProgress } from "@/lib/geoHistory";

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
    projects: [] as { name: string; website: string; location: string; configurations?: string; priceRange?: string; reraNumber?: string; amenities?: string; status?: string; phase?: string; possessionDate?: string }[],
    competitors: [] as { name: string; website: string }[],
    documents: { productInfo: "", brandVoice: "", competitorAnalysis: "", brandAliases: "", brandExclusions: "" },
  });

  const [auditResult, setAuditResult] = useState<any>(null);
  const [aiVisResult, setAiVisResult] = useState<any>(null);
  // Golden prompts + volatility — user-locked top queries tracked every scan.
  // Backed by the golden_prompts table when signed in, by localStorage in demo mode.
  const [goldenPrompts, setGoldenPrompts] = useState<string[]>([]);
  const [volatility, setVolatility] = useState<any[]>([]);
  const [citationDrift, setCitationDrift] = useState<any[]>([]);
  const [portalCoverage, setPortalCoverage] = useState<any>(null);
  const [isCheckingPortalCoverage, setIsCheckingPortalCoverage] = useState(false);
  const [fanoutByQuery, setFanoutByQuery] = useState<Record<string, any>>({});
  const [fanoutLoading, setFanoutLoading] = useState<Set<string>>(new Set());
  const [reraVerification, setReraVerification] = useState<any>(null);
  const [isVerifyingRera, setIsVerifyingRera] = useState(false);
  const [backlinkResult, setBacklinkResult] = useState<any>(null);
  const [technicalResult, setTechnicalResult] = useState<any>(null);
  const [competitorResults, setCompetitorResults] = useState<any[]>([]);

  // New feature states
  const [articleResult, setArticleResult] = useState<any>(null);
  const [schemaResult, setSchemaResult] = useState<any>(null);
  const [isGeneratingSchema, setIsGeneratingSchema] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  // Multi-city: scoping filter. null = "all cities", a non-empty
  // string = that city only. Affects project switcher + AI scans +
  // Content queue context.
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  // Locality scoping — the layer below city. Indian buyers search by
  // locality more than by city, so this is where most real filtering
  // happens once the user is in a given metro.
  const [selectedLocality, setSelectedLocality] = useState<string | null>(null);

  // New feature states (round 2)
  const [portalResult, setPortalResult] = useState<any>(null);
  const [reportResult, setReportResult] = useState<any>(null);
  const [isGeneratingPortal, setIsGeneratingPortal] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [cmoDigestResult, setCmoDigestResult] = useState<any>(null);
  const [isGeneratingCmoDigest, setIsGeneratingCmoDigest] = useState(false);
  const [reviewMonitorResult, setReviewMonitorResult] = useState<any>(null);
  const [isRunningReviewMonitor, setIsRunningReviewMonitor] = useState(false);
  const [infraNewsResult, setInfraNewsResult] = useState<any[] | null>(null);
  const [isFetchingInfraNews, setIsFetchingInfraNews] = useState(false);
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
  const [competitorAlerts, setCompetitorAlerts] = useState<any[]>([]);
  const [snapshotCount, setSnapshotCount] = useState(0);
  const [billing, setBilling] = useState<{
    plan: string;
    status: string;
    canAccess: boolean;
    email?: string;
    limits?: { creditsPerMonth?: number } | null;
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


  // ---- Credit system ----
  // (credit counter is hidden per product philosophy — let users use
  // freely, upsell when they see value)
  const [creditsUsed, setCreditsUsed] = useState(0);

  // Load credits from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("cabbge_credits_used");
    if (saved) setCreditsUsed(parseInt(saved, 10) || 0);
  }, []);

  const CREDIT_COSTS: Record<string, number> = {
    audit: 2, technical: 1, ai_visibility: 4, backlinks: 1, competitors: 2,
    article: 5,
    schema: 2, portal: 2, neighborhood: 3,
    report: 5, llms_txt: 2, geo_improvement: 3, crawler: 1,
    brand_presence: 2, citability: 2,
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
                  phase: p.phase || "",
                  possessionDate: p.possession_date || "",
                  // Structured fields — derived by the API on save. The
                  // dashboard + scan pipeline use these for filtering
                  // and matrix-aware query generation.
                  locality: p.locality, city: p.city,
                  config_tags: p.config_tags,
                  price_min: p.price_min, price_max: p.price_max,
                  stage: p.stage,
                  possession_target_date: p.possession_target_date || null,
                })) || localData.projects,
                competitors: dbCompany.competitors?.map((c: any) => ({
                  name: c.name, website: c.website,
                })) || localData.competitors,
                documents: {
                  productInfo: dbCompany.product_info || localData.documents?.productInfo || "",
                  brandVoice: dbCompany.brand_voice || localData.documents?.brandVoice || "",
                  competitorAnalysis: dbCompany.competitor_analysis || localData.documents?.competitorAnalysis || "",
                  // Aliases + exclusions live inside the documents JSONB
                  // blob (no dedicated columns needed — they're single-
                  // line comma lists).
                  brandAliases: dbCompany.documents?.brandAliases || localData.documents?.brandAliases || "",
                  brandExclusions: dbCompany.documents?.brandExclusions || localData.documents?.brandExclusions || "",
                },
                _companyId: dbCompany.id,
              };
              setCompany(merged);
              localStorage.setItem("cabbge_company", JSON.stringify(merged));
              addLog(`> Synced from cloud: ${merged.name}`);

              // Pull the tracked-articles queue from Supabase so drafts
              // and published pieces follow the user across devices.
              // Fire-and-forget — the local cache stays authoritative
              // when the network blips.
              hydrateArticleQueue(dbCompany.id).catch(() => {});
              // Also pull portal-submission state so the coverage
              // matrix doesn't reset when you switch browsers.
              import("@/lib/portalTracker")
                .then((m) => m.hydratePortalSubmissions(dbCompany.id))
                .catch(() => {});
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
                addLog(`> Agent 3: Brand voice captured from site copy`);
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
            const { recordGSCSnapshot, detectContentDecay, getSnapshotCount, hydrateGSCSnapshots } = await import("@/lib/contentDecay");
            if (data.topPages?.length) {
              const companyId = (company as any)._companyId as string | undefined;
              // Pull any older snapshots from Supabase before running
              // decay detection so multi-device users see full history.
              if (companyId) await hydrateGSCSnapshots(companyId);
              recordGSCSnapshot(websiteUrl, data.topPages, companyId);
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

  // Fetch unread competitor alerts on load and every 5 minutes while
  // the tab is open. These show in the Actions Feed.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/competitor-alerts?unread=1", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCompetitorAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      } catch { /* not logged in / offline — ignore */ }
    };
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
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

  /**
   * Translate infra-level error shouting into language a prospect
   * won't recoil from. The Navanaami demo hit "Error: 429 You exceeded
   * your current quota, please check your plan and billing details"
   * — raw OpenAI text — which reads like the product is broken even
   * though it's our upstream billing. Same for rate-limit and Gemini
   * outages. We surface the issue as "retry in a minute" without the
   * finger-pointy backend copy.
   */
  const prettifyError = (raw: string): string => {
    const s = raw || "";
    if (/429|exceeded your current quota|rate[ _-]?limit/i.test(s)) {
      return "AI provider is rate-limited right now. Retry in ~60 seconds — no data lost.";
    }
    if (/quota|billing|insufficient_quota/i.test(s)) {
      return "AI provider quota temporarily maxed. Retry shortly — we're scaling capacity.";
    }
    if (/ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(s)) {
      return "Network blip between us and the AI provider. Retry — most scans succeed on second attempt.";
    }
    if (/503|service unavailable/i.test(s)) {
      return "AI provider is momentarily unavailable. Retry in ~60 seconds.";
    }
    return s;
  };

  const addLog = (msg: string) => {
    // Only touch lines that start with "> " and contain raw error
    // signatures. We don't want to double-process lines the handlers
    // already wrote nice copy for.
    const prettified = msg.startsWith("> ")
      ? "> " + prettifyError(msg.slice(2))
      : prettifyError(msg);
    setTerminalLogs((prev) => [...prev, prettified]);
  };

  const refreshTrends = () => setTrends(getAllTrends(company.website));

  // Site switcher — used by both the header SiteSwitcher and the Overview
  // tab's SitesTreePanel. Resets per-site in-memory scan state so the
  // newly selected site starts fresh; persistent history per site is
  // preserved in localStorage.
  const switchSite = (url: string) => {
    setActiveSiteUrl(url);
    setAuditResult(null);
    setAiVisResult(null);
    setTechnicalResult(null);
    setBacklinkResult(null);
    setCitabilityResult(null);
    setCrawlerAccessResult(null);
    setInternalLinkingResult(null);
    setGeoProgress(getGEOProgress(company.name, url));
    setTrends(getAllTrends(url));
    try {
      const savedCrawl = localStorage.getItem(`cabbge_crawl_${url}`);
      setSiteCrawlResult(savedCrawl ? JSON.parse(savedCrawl) : null);
    } catch { setSiteCrawlResult(null); }
    const label =
      url === company.website
        ? "Main site"
        : (company.sites || []).find((s) => s.url === url)?.label
          || (company.projects || []).find((p) => p.website === url)?.name
          || url;
    addLog(`> Switched to ${label} (${url})`);
  };

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

  // Load golden prompts on mount. Demo mode reads from localStorage, signed-in
  // users hit the API which also returns the latest volatility snapshot.
  useEffect(() => {
    const demo =
      billing?.plan === "demo" ||
      (typeof window !== "undefined" && localStorage.getItem("cabbge_demo_mode") === "true");
    if (demo) {
      try {
        const raw = localStorage.getItem("cabbge_golden_prompts");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setGoldenPrompts(parsed.filter((x) => typeof x === "string"));
        }
      } catch { /* malformed JSON is a no-op */ }
      return;
    }
    const companyId = (company as any)?._companyId as string | undefined;
    if (!companyId) return;
    (async () => {
      try {
        const res = await fetch(`/api/golden-prompts?companyId=${encodeURIComponent(companyId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.prompts)) {
          setGoldenPrompts(data.prompts.map((p: { query: string }) => p.query));
        }
        if (Array.isArray(data.volatility)) setVolatility(data.volatility);
      } catch { /* best-effort */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(company as any)?._companyId, billing?.plan]);

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
        body: JSON.stringify({ url, maxPages: 500, companyId: (company as any)._companyId }),
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

  // Demo mode is determined the same way as in the render body (billing.plan
  // + localStorage flag); inlined here so the pin/unpin handlers don't forward-
  // reference the later const.
  const _isDemoNow = () =>
    billing?.plan === "demo" ||
    (typeof window !== "undefined" && localStorage.getItem("cabbge_demo_mode") === "true");

  // Golden prompts pin/unpin. Demo mode keeps state in localStorage; signed-in
  // users hit /api/golden-prompts which enforces the max-20 cap server-side.
  const pinQuery = async (query: string) => {
    const q = query.trim();
    if (!q) return;
    if (goldenPrompts.includes(q)) return;
    if (goldenPrompts.length >= 20) {
      addLog("> Golden prompts full (20 max). Unpin one first.");
      return;
    }
    const next = [...goldenPrompts, q];
    setGoldenPrompts(next);
    try {
      if (_isDemoNow()) {
        localStorage.setItem("cabbge_golden_prompts", JSON.stringify(next));
      } else {
        const companyId = (company as any)?._companyId;
        if (companyId) {
          await fetch("/api/golden-prompts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId, query: q }),
          });
        }
      }
    } catch (err) {
      // Rollback optimistic update on failure
      setGoldenPrompts(goldenPrompts);
      addLog(`> Pin failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  };

  const unpinQuery = async (query: string) => {
    const q = query.trim();
    const next = goldenPrompts.filter((g) => g !== q);
    setGoldenPrompts(next);
    try {
      if (_isDemoNow()) {
        localStorage.setItem("cabbge_golden_prompts", JSON.stringify(next));
      } else {
        const companyId = (company as any)?._companyId;
        if (companyId) {
          await fetch(
            `/api/golden-prompts?companyId=${encodeURIComponent(companyId)}&query=${encodeURIComponent(q)}`,
            { method: "DELETE" }
          );
        }
      }
    } catch (err) {
      setGoldenPrompts(goldenPrompts);
      addLog(`> Unpin failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  };

  const runFanout = async (anchor: string) => {
    if (!company.name || !anchor) return;
    if (fanoutByQuery[anchor]) return; // Already have a result — UI toggles display
    if (!spendCredits("audit")) return;
    setFanoutLoading((prev) => {
      const next = new Set(prev);
      next.add(anchor);
      return next;
    });
    addLog(`> Fanout: expanding "${anchor}" into 5 semantic variants...`);
    try {
      const aliases = (company.documents as any)?.brandAliases
        ? String((company.documents as any).brandAliases).split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const res = await fetch("/api/query-fanout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchor,
          brand: company.name,
          aliases,
          city: company.city || "",
          variantCount: 5,
          companyId: (company as any)._companyId,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFanoutByQuery((prev) => ({ ...prev, [anchor]: data }));
      addLog(`> Fanout: ${data.fanoutScore}% across ${data.variants?.length || 0} variants (anchor was ${data.anchorMentioned ? "mentioned" : "absent"})`);
    } catch (err) {
      addLog(`> Fanout failed: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setFanoutLoading((prev) => {
        const next = new Set(prev);
        next.delete(anchor);
        return next;
      });
    }
  };

  const runReraVerification = async () => {
    if (!company.projects || company.projects.length === 0) {
      addLog("> Add projects before running RERA verification");
      return;
    }
    if (!spendCredits("audit")) return;
    setIsVerifyingRera(true);
    addLog(`> Cross-checking ${company.projects.length} project RERA numbers against state portals...`);
    try {
      const res = await fetch("/api/rera-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: (company as any)._companyId,
          projects: company.projects.map((p) => ({
            name: p.name,
            reraNumber: (p as any).reraNumber || (p as any).rera_number || "",
            location: p.location || "",
          })),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReraVerification(data);
      addLog(`> RERA verification: ${data.verified}/${data.total} verified${data.mismatch > 0 ? `, ${data.mismatch} mismatch` : ""}`);
    } catch (err) {
      addLog(`> RERA verification failed: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setIsVerifyingRera(false);
    }
  };

  const runPortalCoverage = async () => {
    if (!company.name) { addLog("> Set company name first"); return; }
    if (!spendCredits("audit")) return;
    setIsCheckingPortalCoverage(true);
    addLog("> Checking 99acres / MagicBricks / Housing / NoBroker / CommonFloor...");
    try {
      const res = await fetch("/api/portal-coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: company.name,
          city: company.city || "",
          companyId: (company as any)._companyId,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPortalCoverage(data);
      addLog(`> Portal coverage: ${data.listed}/${data.total} confirmed${data.unknown > 0 ? `, ${data.unknown} unverifiable` : ""}`);
    } catch (err) {
      addLog(`> Portal coverage failed: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setIsCheckingPortalCoverage(false);
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
      // Scan scope:
      //  - city filter narrows to one metro.
      //  - locality filter narrows further to a single neighbourhood,
      //    which is the dominant Indian buyer query shape ("3 BHK in
      //    Kukatpally").
      //  - project selection narrows to a single project — useful for
      //    a developer running a focused scan on a specific launch,
      //    generating mostly name + locality queries around it.
      //  - when all three are null we scan the whole portfolio.
      const { projectMatchesCity } = await import("@/lib/cities");
      const { parseLocation } = await import("@/lib/projectParse");
      const scanCity = selectedCity || company.city;
      let scopedProjects = company.projects;
      if (selectedCity) {
        scopedProjects = scopedProjects.filter((p) => projectMatchesCity(p, selectedCity, company.city || ""));
      }
      if (selectedLocality) {
        scopedProjects = scopedProjects.filter((p) => {
          const loc = (p as any).locality || parseLocation(p.location, company.city || "").locality || "";
          return loc.toLowerCase() === selectedLocality.toLowerCase();
        });
      }
      if (selectedProject !== null && company.projects[selectedProject]) {
        scopedProjects = [company.projects[selectedProject]];
      }
      const projectNote = selectedProject !== null && company.projects[selectedProject]
        ? company.projects[selectedProject].name
        : "";
      const scopeNote = [projectNote, selectedLocality, selectedCity].filter(Boolean).join(" / ");
      addLog(`> Payload: brand="${company.name}" city="${scanCity || "(EMPTY!)"}" projects=${scopedProjects.length}${scopeNote ? ` (scoped to ${scopeNote})` : ""}`);
      const res = await fetch("/api/ai-visibility", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        websiteUrl: activeSiteUrl || company.website, brand: company.name, city: scanCity, savedQueries: existingQueries,
        projects: scopedProjects.map(p => p.name),
        // Full structured project details so the query generator can
        // produce the buyer-query matrix (config + locality + price +
        // stage) instead of vague generic queries.
        projectDetails: await Promise.all(scopedProjects.map(async (p) => {
          const { inferAssetType } = await import("@/lib/projectParse");
          return {
            name: p.name,
            location: p.location,
            locality: (p as any).locality,
            configurations: p.configurations,
            configTags: (p as any).config_tags,
            priceRange: p.priceRange,
            priceMin: (p as any).price_min,
            priceMax: (p as any).price_max,
            stage: (p as any).stage,
            // Fields piped to the hallucination auditor — ground truth
            // for RERA / possession / status / locality checks.
            reraNumber: (p as any).reraNumber || (p as any).rera_number || "",
            possession: (p as any).possession || (p as any).possession_date || "",
            status: (p as any).status || "",
            assetType: inferAssetType({
              name: p.name,
              configurations: p.configurations,
              amenities: (p as any).amenities,
              configTags: (p as any).config_tags,
            }),
          };
        })),
        industry: (company as any).industry,
        brandContext: {
          usps: company.description || "",
          productInfo: company.documents?.productInfo || "",
          // Disambiguation lists — widen mention detection (aliases)
          // + suppress false positives (exclusions). Critical for
          // multi-brand names like Godrej / Prestige / Bajaj where
          // the same word maps to unrelated companies.
          aliases: (company.documents as any)?.brandAliases || "",
          exclusions: (company.documents as any)?.brandExclusions || "",
        },
      }) });
      const data = await res.json();
      if (data.error) {
        // Hint is included on validation errors (e.g. "City required") so the
        // user knows what to fix instead of seeing a generic "Failed".
        throw new Error(data.hint ? `${data.error} — ${data.hint}` : data.error);
      }
      setAiVisResult(data);
      if (Array.isArray(data.goldenPrompts)) setGoldenPrompts(data.goldenPrompts);
      if (Array.isArray(data.volatility)) setVolatility(data.volatility);
      if (Array.isArray(data.citationDrift)) setCitationDrift(data.citationDrift);
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
      productInfo: company.documents?.productInfo || "",
      // All projects summary for cross-referencing
      allProjects: (company.projects || []).map((proj: any) => ({
        name: proj.name, location: proj.location, configurations: proj.configurations,
        priceRange: proj.priceRange, status: proj.status,
      })),
      competitors: (company.competitors || []).map((c: any) => c.name),
      // Per-channel writing instructions from Settings → Personalization
      writingInstructions,
    };
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

  const runInfraNews = async () => {
    if (!spendCredits("brand_presence")) return;
    setIsFetchingInfraNews(true);
    try {
      const { parseLocation } = await import("@/lib/projectParse");
      // Dedupe (city, locality) pairs across the portfolio.
      const pairs = new Map<string, { city: string; locality: string }>();
      for (const p of company.projects) {
        const loc = (p as any).locality || parseLocation(p.location, company.city || "").locality;
        const cityName = (p as any).city || parseLocation(p.location, company.city || "").city || company.city || "";
        if (!loc || !cityName) continue;
        const key = `${cityName.toLowerCase()}::${loc.toLowerCase()}`;
        if (!pairs.has(key)) pairs.set(key, { city: cityName, locality: loc });
      }
      if (pairs.size === 0) {
        addLog(`> No localities to check — add project locations first`);
        return;
      }
      addLog(`> Scanning infrastructure news for ${pairs.size} localit${pairs.size === 1 ? "y" : "ies"}...`);
      const res = await fetch("/api/infra-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localities: Array.from(pairs.values()),
          companyId: (company as any)._companyId,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setInfraNewsResult(data.items || []);
      addLog(`> Infra news: ${(data.items || []).length} item${(data.items || []).length === 1 ? "" : "s"} surfaced`);
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Infra news fetch failed"}`);
    } finally {
      setIsFetchingInfraNews(false);
    }
  };

  const runReviewMonitor = async () => {
    if (!spendCredits("ai_visibility")) return;
    setIsRunningReviewMonitor(true);
    addLog(`> Scanning Housing / 99acres / Google / Reddit for ${company.name} mentions...`);
    try {
      const scopedProjects = selectedProject !== null
        ? [company.projects[selectedProject]]
        : company.projects;
      const res = await fetch("/api/review-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: company.name,
          // Pass city explicitly so the brand-only fallback (when no
          // projects exist yet) can scope the search instead of going
          // global and returning noise.
          city: company.city || null,
          projects: scopedProjects.map((p) => ({
            name: p.name,
            locality: (p as any).locality || null,
            city: (p as any).city || company.city || null,
            website: p.website || null,
          })),
          companyId: (company as any)._companyId,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReviewMonitorResult(data);
      const urgent = data?.counts?.byPriority?.high || 0;
      addLog(`> Review scan: ${data.totalMentions} mention${data.totalMentions === 1 ? "" : "s"}${urgent > 0 ? ` (${urgent} urgent)` : ""}`);
      setActiveTab("reviews");
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Review scan failed"}`);
    } finally {
      setIsRunningReviewMonitor(false);
    }
  };

  const runCmoDigest = async () => {
    if (!spendCredits("report")) return;
    setIsGeneratingCmoDigest(true);
    addLog(`> Writing your CEO-ready monthly digest...`);
    try {
      const res = await fetch("/api/cmo-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: (company as any)._companyId,
          companyName: company.name,
          city: company.city,
          brand: company.name,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCmoDigestResult(data);
      addLog(`> Digest ready — copy and forward to the CEO`);
      setActiveTab("report");
    } catch (err) {
      addLog(`> Error: ${err instanceof Error ? err.message : "Digest failed"}`);
    } finally {
      setIsGeneratingCmoDigest(false);
    }
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
    // Route to the appropriate article shape based on the query form.
    // Landing-page recs say "3 BHK flats in {locality}" — those need a
    // structured locality-config page, not a blog article. Construction
    // updates (for UC projects) need dated progress content. NRI intent
    // goes to the NRI guide. The article writer handles each shape.
    const qLower = query.toLowerCase();
    let articleType = "locality_guide";
    if (/\bflats?\s+in\b/.test(qLower) && /bhk|villa|plot|studio/.test(qLower)) {
      articleType = "landing_page";
    } else if (/construction update|q[1-4]\s*(20\d\d)?/.test(qLower)) {
      articleType = "construction_update";
    } else if (/\bnri\b|non[\s-]?resident|fema|nre|nro/.test(qLower)) {
      articleType = "nri_guide";
    } else if (/\balternatives?\s+to\b|\bsimilar\s+to\b/.test(qLower)) {
      // "alternatives to {competitor}" is the explicit query-fanout
      // shape AI search engines generate internally.
      articleType = "alternatives_to";
    } else if (/\b(top|best)\s+(\d+|[a-z]+)\s+\S+\s+(in|for|near)\b/.test(qLower) || /\bbest\b.*\bin\b/.test(qLower)) {
      // "Top 7 3 BHK apartments in Gachibowli" / "Best builders in Kokapet"
      // — listicle queries account for 32.5% of all LLM citations so we
      // route them to the explicit list-format type.
      articleType = "best_of_list";
    } else if (/\b(move|moving|upgrade|upgrading|from\s+\S+\s+to)\b.*\b(buying|owning|home|apartment|flat)\b/.test(qLower) || /\bshift(ing)?\s+(from|to)\b/.test(qLower)) {
      articleType = "migration_guide";
    } else if (/\bvs\b|compare|versus/.test(qLower)) {
      articleType = "comparison";
    } else if (/investment|roi|rental yield/.test(qLower)) {
      articleType = "investment";
    } else if (/buyer guide|how to buy|buying process/.test(qLower)) {
      articleType = "buyer_guide";
    } else if (/refresh content for /.test(qLower)) {
      // Decay-refresh — regenerate the existing page's content as a
      // locality guide by default.
      articleType = "locality_guide";
    }
    addLog(`> Writing ${articleType.replace(/_/g, " ")} for: "${query}"...`);
    try {
      const ctx = getProjectContext();
      const res = await fetch("/api/article-writer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ctx, topic: query, targetKeyword: query, articleType }),
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
      const companyId = (company as any)._companyId as string | undefined;
      const tracked = trackArticleGenerated(query, data.title, preScore, companyId);
      // Attach the tracked article ID + company ID to the result so the
      // PublishButton can call markArticlePublished(id, url, companyId).
      data._trackedArticleId = tracked.id;
      data._companyId = companyId;

      setArticleResult(data);
      addLog(`> Article: "${data.title}" — ${data.wordCount} words, optimized for "${query}"`);

      // Auto-deploy landing pages. The whole point of a landing-page
      // opportunity is to live at a real URL — so the moment the
      // writer returns we push it to the customer's site via the
      // loader endpoint. Blog-shape articles (locality_guide,
      // construction_update etc.) still require the user to click
      // Publish because those need editorial review.
      if (articleType === "landing_page" && company.website) {
        try {
          const slugSource = data.title || query;
          const slug = "/" + slugSource
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 80);
          const deployRes = await fetch("/api/content-deploy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              siteUrl: activeSiteUrl || company.website,
              slot: slug,
              html: data.content,
              meta: {
                title: data.title,
                metaDescription: data.metaDescription,
                targetKeyword: data.targetKeyword || query,
              },
              contentType: "locality_page",
            }),
          });
          if (deployRes.ok) {
            addLog(`> Landing page live at ${slug} via Cabbge loader`);
            data._deployedSlug = slug;
            setArticleResult({ ...data });
          } else {
            const j = await deployRes.json().catch(() => ({}));
            addLog(`> Auto-deploy skipped: ${j.error || "deploy endpoint declined"}. Click Deploy to publish manually.`);
          }
        } catch (err) {
          addLog(`> Auto-deploy skipped: ${err instanceof Error ? err.message : "unknown"}. Click Deploy to publish manually.`);
        }
      } else {
        addLog(`> Publish it to your site, then re-scan to measure impact`);
      }
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

  /**
   * Main site only — fast scan for single-URL demos or mid-week refreshes.
   * Audit + technical + backlinks + AI visibility on the main site.
   * Skips per-project microsites, portal coverage, RERA verification,
   * review monitor. Use the Full Scan for everything.
   */
  const runMainOnly = async () => {
    const url = activeSiteUrl || company.website;
    if (!url) { addLog("> Set your website URL first"); return; }
    addLog(`> Main-site scan started (${url})...`);
    await Promise.all([
      runAudit(url),
      runTechnical(url),
      runBacklinks(url),
      ...(company.name ? [runAIVisibility()] : []),
    ]);
    addLog("✓ Main-site scan complete — run Full Scan for every microsite + brand-level audits");
  };

  const runFullScan = async () => {
    const mainUrl = activeSiteUrl || company.website;
    if (!mainUrl) { addLog("> Set your website URL first"); return; }

    // Every project with its own website gets its own audit row so the
    // SitesTreePanel and project scorecards populate per-microsite.
    // Cap at 20 to keep a full scan under ~10 min and respect rate limits.
    const projectMicrosites: Array<{ name: string; url: string }> = (company.projects || [])
      .filter((p) => p.website && /^https?:\/\//.test(p.website))
      .slice(0, 20)
      .map((p) => ({ name: p.name || "", url: p.website as string }));

    addLog(`> Full scan started — main site + ${projectMicrosites.length} project microsite${projectMicrosites.length === 1 ? "" : "s"}`);

    // ---- Wave 1: parallel fast scans on the MAIN site. Audit,
    // technical, backlinks, site-crawl, AI visibility all take 15-90s
    // each and don't depend on each other.
    addLog("> Wave 1: main site — audit · technical · backlinks · site-crawl · AI visibility");
    await Promise.all([
      runAudit(mainUrl),
      runTechnical(mainUrl),
      runBacklinks(mainUrl),
      runSiteCrawl(),
      ...(company.name ? [runAIVisibility()] : []),
    ]);

    // ---- Wave 2: per-project microsite audits. Batched 5 in parallel
    // to respect PSI + OpenAI rate limits. We only fire audit + technical
    // per-project (the fast ones) — brand-level backlinks and AI visibility
    // already cover every project via compound queries.
    if (projectMicrosites.length > 0) {
      addLog(`> Wave 2: scanning ${projectMicrosites.length} project microsite${projectMicrosites.length === 1 ? "" : "s"} (audit + technical, batched 5)`);
      for (let i = 0; i < projectMicrosites.length; i += 5) {
        const batch = projectMicrosites.slice(i, i + 5);
        await Promise.all(
          batch.flatMap(({ name, url }) => {
            addLog(`> ${name} (${url.replace(/^https?:\/\//, "")})`);
            return [
              runAudit(url).catch((err) => addLog(`> ${name} audit skipped: ${err instanceof Error ? err.message : "error"}`)),
              runTechnical(url).catch((err) => addLog(`> ${name} technical skipped: ${err instanceof Error ? err.message : "error"}`)),
            ];
          })
        );
      }
    }

    // ---- Wave 3: deeper brand-level analyses.
    addLog("> Wave 3: keyword research · internal linking · competitor analysis");
    await Promise.all([
      runKeywordResearch("__portfolio__", true).catch(() => {}),
      runInternalLinking().catch(() => {}),
      ...(company.competitors.length > 0 ? [runCompetitorAnalysis().catch(() => {})] : []),
    ]);

    // ---- Wave 4: web-search-heavy brand-level audits. Expensive — fired
    // sequentially to respect OpenAI rate limits on web_search.
    addLog("> Wave 4: portal coverage · RERA verification · review monitor");
    try { await runPortalCoverage(); } catch (err) { addLog(`> Portal coverage skipped: ${err instanceof Error ? err.message : "error"}`); }
    try { await runReraVerification(); } catch (err) { addLog(`> RERA verification skipped: ${err instanceof Error ? err.message : "error"}`); }
    try { await runReviewMonitor(); } catch (err) { addLog(`> Review monitor skipped: ${err instanceof Error ? err.message : "error"}`); }

    addLog(`✓ Full scan complete — ${1 + projectMicrosites.length} site${projectMicrosites.length === 0 ? "" : "s"} scored, every brand-level surface refreshed`);

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

  // Paywall: signed-in users without an active subscription see the
  // overlay. We distinguish payment-state-ended flows (canceled /
  // past_due) from the initial no-subscription state ("inactive") so
  // the PaywallOverlay can show the right copy.
  const paywallReason: "needs_payment" | "canceled" | "past_due" | null =
    !isDemoMode && billing && !billing.canAccess
      ? billing.status === "canceled" || billing.status === "expired"
        ? "canceled"
        : billing.status === "past_due"
          ? "past_due"
          : "needs_payment"
      : null;

  return (
    <div className="h-screen bg-[#0a0a0b] text-zinc-100 flex overflow-hidden">
      {paywallReason && <PaywallOverlay email={billing?.email} reason={paywallReason} />}
      <Sidebar companyName={company.name} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Demo mode banner — visible in demo only */}
        {isDemoMode && (
          <DemoBanner prospectName={company.name} prospectUrl={company.website} />
        )}
        {/* Terminal + Agent bar */}
        <TerminalHeader
          logs={terminalLogs}
          onRunFullScan={runFullScan}
          onRunMainOnly={runMainOnly}
          onClearAndRescan={clearAndRescan}
          hasWebsite={!!company.website}
          creditsUsed={creditsUsed}
          creditsMonthly={billing?.limits?.creditsPerMonth ?? (billing?.plan === "demo" ? 20000 : undefined)}
          leftSlot={
            <SiteSwitcher
              primarySite={company.website ? { url: company.website, label: "Main site" } : undefined}
              additionalSites={company.sites || []}
              activeSiteUrl={activeSiteUrl || company.website}
              onSwitch={switchSite}
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
            {/* Company context — the one surface here. The Chat toggle
                was a generic LLM chatbox nobody used; the specialised
                tools (audit, GEO scan, article writer) are faster and
                more structured. */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <CompanyPanel company={company} setCompany={setCompany} />
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
              onSwitchSite={switchSite}
              companyName={company.name} companyId={(company as any)._companyId} city={company.city}
              trends={trends}
              // New features
              projects={company.projects}
              selectedProject={selectedProject} onSelectProject={setSelectedProject}
              selectedCity={selectedCity} onSelectCity={setSelectedCity}
              selectedLocality={selectedLocality} onSelectLocality={setSelectedLocality}
              articleResult={articleResult}
              schemaResult={schemaResult} isGeneratingSchema={isGeneratingSchema}
              onRunSchemaGenerator={runSchemaGenerator}
              // Round 2 features
              portalResult={portalResult} isGeneratingPortal={isGeneratingPortal}
              onRunPortalOptimizer={runPortalOptimizer}
              reportResult={reportResult} isGeneratingReport={isGeneratingReport}
              onRunMarketingReport={runMarketingReport}
              cmoDigestResult={cmoDigestResult} isGeneratingCmoDigest={isGeneratingCmoDigest}
              onRunCmoDigest={runCmoDigest}
              reviewMonitorResult={reviewMonitorResult}
              isRunningReviewMonitor={isRunningReviewMonitor}
              onRunReviewMonitor={runReviewMonitor}
              infraNews={infraNewsResult}
              isFetchingInfraNews={isFetchingInfraNews}
              onRunInfraNews={runInfraNews}
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
              goldenPrompts={goldenPrompts}
              volatility={volatility}
              onPinQuery={pinQuery}
              onUnpinQuery={unpinQuery}
              citationDrift={citationDrift}
              portalCoverage={portalCoverage}
              isCheckingPortalCoverage={isCheckingPortalCoverage}
              onRunPortalCoverage={runPortalCoverage}
              fanoutByQuery={fanoutByQuery}
              fanoutLoading={fanoutLoading}
              onRunFanout={runFanout}
              reraVerification={reraVerification}
              isVerifyingRera={isVerifyingRera}
              onRunReraVerification={runReraVerification}
            />
          </div>

          {/* RIGHT: Actions Feed — hide on tablet/narrow; collapse to in-flow section on mobile would be nice later */}
          <div className="hidden xl:block w-[340px] flex-shrink-0 border-l border-white/[0.06] overflow-y-auto min-h-0">
            <ActionsFeed
              auditResult={auditResult} aiVisResult={aiVisResult} backlinkResult={backlinkResult}
              technicalResult={technicalResult}
              geoProgress={geoProgress}
              siteCrawlResult={siteCrawlResult}
              keywordResearchResult={keywordResearchResult}
              internalLinkingResult={internalLinkingResult}
              contentDecayReport={contentDecayReport}
              competitorAlerts={competitorAlerts}
              gscData={gscData}
              onNavigateToTab={setActiveTab}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
