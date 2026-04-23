"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  Bot,
  Link2,
  Wrench,
  FileText,
  MapPin,
  PenTool,
  PartyPopper,
  Users,
  Code,
  Copy,
  Check,
  Building,
  Navigation,
  BarChart3,
  Megaphone,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { PromptVolumes } from "./PromptVolumes";
import { TrendsPanel } from "./TrendsPanel";
import { EditableBlock } from "./EditableBlock";
import { GEOProgressPanel } from "./GEOProgressPanel";
import { ExecutionChecklist } from "./ExecutionChecklist";
import { SitesTreePanel } from "./SitesTreePanel";
import { PublishButton } from "./PublishButton";
import { DeployViaLoader } from "./DeployViaLoader";
import { GSCPanel } from "./GSCPanel";
import { SiteCrawlPanel } from "./SiteCrawlPanel";
import { KeywordResearchPanel } from "./KeywordResearchPanel";
import { InternalLinkingPanel } from "./InternalLinkingPanel";
import { ContentDecayPanel } from "./ContentDecayPanel";
import { SchemaDeployPanel } from "./SchemaDeployPanel";
import { markArticlePublished } from "@/lib/geoHistory";

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  auditResult: any;
  aiVisResult: any;
  backlinkResult: any;
  technicalResult: any;
  isAuditing: boolean;
  isCheckingAI: boolean;
  isCheckingBacklinks: boolean;
  isCheckingTechnical: boolean;
  onRunAudit: (url: string) => void;
  onRunAIVisibility: () => void;
  onRunBacklinks: (url: string) => void;
  onRunTechnical: (url: string) => void;
  websiteUrl: string;
  allSites: { url: string; label: string }[];
  onSwitchSite?: (url: string) => void;
  companyName: string;
  city: string;
  trends: Record<string, any>;
  // New features
  projects: { name: string; website: string; location: string }[];
  selectedProject: number | null;
  onSelectProject: (idx: number | null) => void;
  articleResult: any;
  isGeneratingArticle: boolean;
  onRunArticleWriter: (topic: string, targetKeyword: string, articleType: string) => void;
  schemaResult: any;
  isGeneratingSchema: boolean;
  onRunSchemaGenerator: () => void;
  // Round 2 features
  portalResult: any;
  isGeneratingPortal: boolean;
  onRunPortalOptimizer: () => void;
  neighborhoodResult: any;
  isGeneratingNeighborhood: boolean;
  onRunNeighborhood: () => void;
  reportResult: any;
  isGeneratingReport: boolean;
  onRunMarketingReport: () => void;
  // GEO improvement
  llmsTxtResult: any;
  isGeneratingLlmsTxt: boolean;
  onRunLlmsTxt: () => void;
  geoImprovementResult: any;
  isGeneratingGeoImprovement: boolean;
  onRunGeoImprovement: () => void;
  // GEO deep analysis
  crawlerAccessResult: any;
  isCheckingCrawlers: boolean;
  onRunCrawlerAccess: () => void;
  brandPresenceResult: any;
  isCheckingBrand: boolean;
  onRunBrandPresence: () => void;
  citabilityResult: any;
  isCheckingCitability: boolean;
  onRunCitabilityAudit: () => void;
  creditCosts?: Record<string, number>;
  geoProgress?: any;
  onGeoFixQuery?: (query: string) => void;
  onGeoFixAll?: () => void;
  isFixingGeo?: boolean;
  // GBP Posts
  onRunGbpPosts?: () => void;
  gbpResult?: any;
  isGeneratingGbp?: boolean;
  // Google Search Console
  gscData?: any;
  // Full-site crawler
  siteCrawlResult?: any;
  isCrawling?: boolean;
  onRunSiteCrawl?: () => void;
  // Keyword research
  keywordResearchResult?: any;
  isResearchingKeywords?: boolean;
  onRunKeywordResearch?: (seed: string) => void;
  // Internal linking
  internalLinkingResult?: any;
  isAnalyzingLinks?: boolean;
  onRunInternalLinking?: () => void;
  // Content decay (from GSC history)
  contentDecayReport?: any;
  snapshotCount?: number;
}

function ScoreCircle({ score, label, size = "md" }: { score: number; label: string; size?: "sm" | "md" }) {
  const strokeColor =
    score >= 90 ? "#7CB342" :
    score >= 70 ? "#7CB342" :
    score >= 50 ? "#F59E0B" :
    "#EF4444";

  const textColor =
    score >= 90 ? "text-[#7CB342]" :
    score >= 70 ? "text-[#7CB342]" :
    score >= 50 ? "text-amber-400" :
    "text-red-400";

  const r = size === "sm" ? 22 : 32;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width={r * 2 + 8} height={r * 2 + 8} className="-rotate-90">
          <circle
            cx={r + 4} cy={r + 4} r={r}
            fill="none" stroke="rgb(39 39 42 / 0.4)" strokeWidth="3"
          />
          <circle
            cx={r + 4} cy={r + 4} r={r}
            fill="none" stroke={strokeColor} strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-bold tabular-nums ${size === "sm" ? "text-[13px]" : "text-base"} ${textColor}`}>
          {score}
        </span>
      </div>
      <span className="text-[11px] text-zinc-500 text-center font-medium">{label}</span>
    </div>
  );
}

function StatusIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass") return <CheckCircle2 size={15} className="text-[#7CB342]" />;
  if (status === "warn") return <AlertTriangle size={15} className="text-amber-400" />;
  return <XCircle size={15} className="text-red-400" />;
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={`bg-zinc-900/60 border-white/[0.06] rounded-xl hover:border-white/[0.1] transition-colors duration-150 ${className}`}>
      {children}
    </Card>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
      <div className="w-16 h-16 rounded-2xl bg-zinc-800/30 border border-white/[0.04] flex items-center justify-center mb-4">
        <Icon size={28} className="opacity-40" />
      </div>
      <p className="text-[13px] font-medium text-zinc-400">{title}</p>
      <p className="text-[12px] text-zinc-500 mt-1">{subtitle}</p>
    </div>
  );
}

export function AnalyticsPanel({
  activeTab, onTabChange,
  auditResult, aiVisResult, backlinkResult, technicalResult,
  isAuditing, isCheckingAI, isCheckingBacklinks, isCheckingTechnical,
  onRunAudit, onRunAIVisibility, onRunBacklinks, onRunTechnical,
  websiteUrl, allSites, onSwitchSite, companyName, city,
  trends,
  projects, selectedProject, onSelectProject,
  articleResult, isGeneratingArticle, onRunArticleWriter,
  schemaResult, isGeneratingSchema, onRunSchemaGenerator,
  portalResult, isGeneratingPortal, onRunPortalOptimizer,
  neighborhoodResult, isGeneratingNeighborhood, onRunNeighborhood,
  reportResult, isGeneratingReport, onRunMarketingReport,
  llmsTxtResult, isGeneratingLlmsTxt, onRunLlmsTxt,
  geoImprovementResult, isGeneratingGeoImprovement, onRunGeoImprovement,
  crawlerAccessResult, isCheckingCrawlers, onRunCrawlerAccess,
  brandPresenceResult, isCheckingBrand, onRunBrandPresence,
  citabilityResult, isCheckingCitability, onRunCitabilityAudit,
  creditCosts = {},
  geoProgress,
  onGeoFixQuery,
  onGeoFixAll,
  isFixingGeo,
  onRunGbpPosts, gbpResult, isGeneratingGbp,
  gscData,
  siteCrawlResult, isCrawling, onRunSiteCrawl,
  keywordResearchResult, isResearchingKeywords, onRunKeywordResearch,
  internalLinkingResult, isAnalyzingLinks, onRunInternalLinking,
  contentDecayReport, snapshotCount = 0,
}: Props) {
  const cost = (action: string) => creditCosts[action] || 0;
  const [auditUrl, setAuditUrl] = useState(websiteUrl || "");
  useEffect(() => { if (websiteUrl && !auditUrl) setAuditUrl(websiteUrl); }, [websiteUrl]);

  // Article writer form state
  const [articleTopic, setArticleTopic] = useState("");
  const [articleKeyword, setArticleKeyword] = useState("");
  const [articleType, setArticleType] = useState("locality_guide");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Content tab collapsible sections
  const [contentSection, setContentSection] = useState<string | null>("topics");

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyBtn = ({ text, field }: { text: string; field: string }) => (
    <button
      onClick={(e) => { e.stopPropagation(); copyToClipboard(text, field); }}
      className="absolute top-3 right-3 text-[11px] font-medium px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700 hover:text-zinc-200 active:scale-[0.97] transition-all opacity-0 group-hover:opacity-100"
      title="Copy"
    >
      {copiedField === field ? <><Check size={11} className="inline mr-1 text-[#7CB342]" />Copied</> : <><Copy size={11} className="inline mr-1" />Copy</>}
    </button>
  );

  return (
    <div className="p-5">
      {/* Project selector — pick which project context to use */}
      {projects.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="text-[12px] text-zinc-500 font-medium">Project:</span>
          <button
            onClick={() => onSelectProject(null)}
            className={`text-[12px] px-2.5 py-1 rounded-lg border transition-all ${
              selectedProject === null
                ? "bg-zinc-800/40 border-zinc-700 text-zinc-100"
                : "bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            All / Company
          </button>
          {projects.map((p, i) => (
            <button
              key={i}
              onClick={() => onSelectProject(i)}
              className={`text-[12px] px-2.5 py-1 rounded-lg border transition-all ${
                selectedProject === i
                  ? "bg-zinc-800/40 border-zinc-700 text-zinc-100"
                  : "bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {p.name || `Project ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-5">
        {/* Primary nav — execution-first, ordered by daily usage. The
            "Deep analysis" group after the divider is for tools a CMO
            dives into weekly rather than daily. */}
        <TabsList className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-0.5 h-auto flex-wrap gap-0.5">
          <TabsTrigger value="health" className="text-[13px] rounded-md px-3.5 py-1.5">Overview</TabsTrigger>
          <TabsTrigger value="aigeo" className="text-[13px] rounded-md px-3.5 py-1.5">AI Search</TabsTrigger>
          <TabsTrigger value="content" className="text-[13px] rounded-md px-3.5 py-1.5">Content</TabsTrigger>
          <TabsTrigger value="ads" className="text-[13px] rounded-md px-3.5 py-1.5">Portals</TabsTrigger>
          <TabsTrigger value="report" className="text-[13px] rounded-md px-3.5 py-1.5">Report</TabsTrigger>
          <div className="w-px h-5 bg-zinc-800/60 mx-1 self-center" aria-hidden />
          <TabsTrigger value="links" className="text-[13px] rounded-md px-3.5 py-1.5 text-zinc-400 data-[state=active]:text-zinc-100">Links</TabsTrigger>
          <TabsTrigger value="technical" className="text-[13px] rounded-md px-3.5 py-1.5 text-zinc-400 data-[state=active]:text-zinc-100">Technical</TabsTrigger>
          <TabsTrigger value="checks" className="text-[13px] rounded-md px-3.5 py-1.5 text-zinc-400 data-[state=active]:text-zinc-100">Checks</TabsTrigger>
          <TabsTrigger value="locality" className="text-[13px] rounded-md px-3.5 py-1.5 text-zinc-400 data-[state=active]:text-zinc-100">Locality</TabsTrigger>
          {gscData && <TabsTrigger value="search" className="text-[13px] rounded-md px-3.5 py-1.5 text-zinc-400 data-[state=active]:text-zinc-100">Search</TabsTrigger>}
        </TabsList>

        {/* ================================================================ */}
        {/* -------- HEALTH TAB (Health + Technical + Checks) -------- */}
        {/* ================================================================ */}
        <TabsContent value="health" className="space-y-4">
          {/* Sites tree — single coherent view of the customer's web
              footprint (main site + project microsites + additional
              sites) with the latest scores per site. Replaces having to
              flip via the header switcher to understand status across
              the whole portfolio. */}
          {onSwitchSite && (
            <SitesTreePanel
              mainWebsite={websiteUrl}
              additionalSites={allSites.filter((s) => s.url !== websiteUrl)}
              projects={projects}
              activeSiteUrl={websiteUrl}
              onSwitch={onSwitchSite}
            />
          )}

          {/* First-run banner — shown ONLY when user has nothing scanned
              yet. After any scan completes, the ExecutionChecklist takes
              over as the "what should I do next" surface. */}
          {!auditResult && !aiVisResult && !technicalResult && !backlinkResult && !siteCrawlResult && !isAuditing && !isCheckingAI && !isCheckingBacklinks && !isCheckingTechnical && !isCrawling && (
            <div className="rounded-xl border border-[#7CB342]/25 bg-[#7CB342]/[0.04] p-5">
              <h3 className="text-[14px] font-semibold text-zinc-100 mb-1">
                Let&apos;s run your first scan.
              </h3>
              <p className="text-[12px] text-zinc-400 mb-3 leading-relaxed">
                Click <span className="text-[#7CB342] font-medium">Run Full Scan</span> in the terminal above. In ~90 seconds Cabbge will:
              </p>
              <ul className="text-[12px] text-zinc-400 space-y-1 ml-0.5">
                <li>&bull; Audit your site for SEO + technical issues</li>
                <li>&bull; Check if ChatGPT &amp; Gemini recommend your brand</li>
                <li>&bull; Analyse your backlink profile</li>
                <li>&bull; Identify your top content opportunities</li>
              </ul>
            </div>
          )}

          {/* Full-site crawler — visits every page, per-URL audit */}
          {onRunSiteCrawl && (siteCrawlResult || isCrawling) ? (
            <SiteCrawlPanel data={siteCrawlResult} isRunning={isCrawling} onRunCrawl={onRunSiteCrawl} />
          ) : onRunSiteCrawl ? (
            <SiteCrawlPanel data={null} onRunCrawl={onRunSiteCrawl} />
          ) : null}

          {/* Internal linking graph — uses the crawl to find link opportunities */}
          {onRunInternalLinking && (
            <InternalLinkingPanel
              data={internalLinkingResult}
              isLoading={isAnalyzingLinks}
              hasCrawl={!!siteCrawlResult}
              onAnalyze={onRunInternalLinking}
              onRunCrawl={onRunSiteCrawl}
              isCrawling={isCrawling}
            />
          )}

          {/* Content decay — tracks ranking drops from GSC history */}
          <ContentDecayPanel
            report={contentDecayReport || null}
            snapshotCount={snapshotCount}
            onRefreshPage={onGeoFixQuery ? (url) => onGeoFixQuery(`refresh content for ${url}`) : undefined}
          />

          {/* Execution Checklist — appears only after the user has at
              least one scan. Before that the first-run banner guides the
              first action. */}
          {(auditResult || aiVisResult) && (
          <ExecutionChecklist
            websiteUrl={websiteUrl}
            auditResult={auditResult}
            aiVisResult={aiVisResult}
            hasArticles={!!articleResult}
            hasSchema={!!schemaResult}
            hasLlmsTxt={!!llmsTxtResult}
            hasGbpPosts={!!gbpResult}
            onRunAction={(action) => {
              if (action === "tab-health" || action === "tab-overview") onTabChange("health");
              else if (action === "tab-content") onTabChange("content");
              else if (action === "tab-portals" || action === "tab-ads") onTabChange("ads");
              else if (action === "tab-aigeo" || action === "tab-ai-search") onTabChange("aigeo");
              else if (action === "tab-report") onTabChange("report");
              else if (action === "tab-locality") onTabChange("locality");
              else if (action === "audit") onRunAudit(websiteUrl);
              else if (action === "ai_visibility") onRunAIVisibility();
              else if (action === "schema") onRunSchemaGenerator();
              else if (action === "llms_txt") onRunLlmsTxt();
              else if (action === "gbp_posts") onRunGbpPosts?.();
            }}
          />
          )}

          {/* What Changed — SEO scores */}
          {trends.audit?.history?.length >= 2 && (
            <SectionCard className={trends.audit.direction === "declining" ? "border-red-500/20" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    trends.audit.direction === "improving" ? "bg-[#7CB342]/10" :
                    trends.audit.direction === "declining" ? "bg-red-500/10" : "bg-zinc-800"
                  }`}>
                    <span className={`text-[15px] font-bold ${
                      trends.audit.direction === "improving" ? "text-[#7CB342]" :
                      trends.audit.direction === "declining" ? "text-red-400" : "text-zinc-400"
                    }`}>
                      {trends.audit.change > 0 ? "+" : ""}{trends.audit.change}
                    </span>
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-zinc-200">
                      {trends.audit.direction === "improving" ? "SEO score improving — keep it up" :
                       trends.audit.direction === "declining" ? "SEO score dropped — run a new audit" :
                       "SEO score stable"}
                    </div>
                    <div className="text-[12px] text-zinc-500">
                      {trends.audit.previous} → {trends.audit.current} since last scan.
                      {trends.audit.direction === "declining" && " Something changed on your site or Google updated its algorithm."}
                    </div>
                  </div>
                </div>
              </CardContent>
            </SectionCard>
          )}

          {/* GSC Connect Prompt — like Okara */}
          <SectionCard>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <Search size={16} className="text-zinc-400" />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-zinc-200">Connect Google Services</div>
                    <div className="text-[12px] text-zinc-500">Search Console — Impressions &amp; rankings</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-700 text-[12px] h-8 rounded-lg"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/integrations/gsc");
                      const data = await res.json();
                      if (data.authUrl) window.location.href = data.authUrl;
                      else alert("Set GOOGLE_CLIENT_ID in environment variables to enable GSC.");
                    } catch { alert("GSC requires Google OAuth credentials."); }
                  }}
                >
                  Connect
                </Button>
              </div>
            </CardContent>
          </SectionCard>

          <TrendsPanel trends={trends} url={websiteUrl} />

          {allSites.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              {allSites.map((site, i) => (
                <button
                  key={i}
                  onClick={() => setAuditUrl(site.url)}
                  className={`text-[12px] px-3 py-1.5 rounded-lg border transition-all ${
                    auditUrl === site.url
                      ? "bg-zinc-800/40 border-zinc-700 text-zinc-100"
                      : "bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  {site.label}
                </button>
              ))}
            </div>
          )}

          {/* Audit + Technical buttons */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter website URL to audit..."
              value={auditUrl}
              onChange={(e) => setAuditUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onRunAudit(auditUrl)}
              className="bg-zinc-900/80 border-zinc-800 text-[13px] h-10 flex-1 placeholder:text-zinc-500/80"
            />
            <Button
              onClick={() => onRunAudit(auditUrl)}
              disabled={isAuditing || !auditUrl}
              size="sm"
              className="bg-zinc-100 text-zinc-900 hover:bg-white h-10 w-10 p-0 rounded-lg"
            >
              {isAuditing ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            </Button>
            <Button
              onClick={() => onRunTechnical(auditUrl || websiteUrl)}
              disabled={isCheckingTechnical || (!auditUrl && !websiteUrl)}
              size="sm"
              className="bg-zinc-700 hover:bg-zinc-600 h-10 px-3 rounded-lg"
            >
              {isCheckingTechnical ? <Loader2 size={15} className="animate-spin" /> : <Wrench size={15} />}
            </Button>
          </div>

          {/* --- Health: audit results --- */}
          {auditResult ? (
            <>
              {auditResult.scores.pageSpeedAvailable !== false && auditResult.scores.performanceMobile > 0 && (
                <SectionCard>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[13px] font-semibold">Mobile Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-around">
                      <ScoreCircle score={auditResult.scores.performanceMobile} label="Performance" />
                      <ScoreCircle score={auditResult.scores.accessibility} label="Accessibility" />
                      <ScoreCircle score={auditResult.scores.bestPractices} label="Best Practices" />
                      <ScoreCircle score={auditResult.scores.seo} label="SEO" />
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {auditResult.scores.pageSpeedAvailable === false && (
                <SectionCard>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                    <div>
                      <p className="text-[13px] font-medium text-amber-400">Scores are partial — PageSpeed API unavailable</p>
                      <p className="text-[11px] text-zinc-500 mt-1">Performance, Core Web Vitals, and SEO health data could not be fetched (API quota or connectivity). The overall score reflects HTML-based checks only. Real estate compliance and AI analysis ran normally. Re-scan later for full metrics.</p>
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {auditResult.coreWebVitals.lcp > 0 && (
                <SectionCard>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[13px] font-semibold">Core Web Vitals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { label: "LCP", value: `${(auditResult.coreWebVitals.lcp / 1000).toFixed(1)}s` },
                        { label: "FCP", value: `${(auditResult.coreWebVitals.fcp / 1000).toFixed(1)}s` },
                        { label: "TBT", value: `${Math.round(auditResult.coreWebVitals.tbt)}ms` },
                        { label: "CLS", value: auditResult.coreWebVitals.cls.toFixed(3) },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center">
                          <div className="text-[11px] text-zinc-500 mb-1 font-medium">{label}</div>
                          <div className="text-xl font-bold text-zinc-100">{value}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {auditResult.seoHealth?.length > 0 && (
                <SectionCard>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[13px] font-semibold">SEO Health</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {auditResult.seoHealth.map((check: any, i: number) => (
                      <div key={i} className={`flex items-center justify-between py-2 text-[13px] ${check.status === "fail" ? "bg-red-500/[0.03] -mx-4 px-4 rounded-lg" : ""}`}>
                        <div className="flex items-center gap-2.5">
                          <StatusIcon status={check.status} />
                          <span className={check.status === "fail" ? "text-zinc-200" : "text-zinc-300"}>{check.check}</span>
                        </div>
                        <span className={
                          check.status === "pass" ? "text-[#7CB342] text-[12px] font-medium" :
                          check.status === "warn" ? "text-amber-400 text-[12px]" :
                          "text-red-400 text-[12px] font-medium"
                        }>
                          {check.value}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </SectionCard>
              )}

              <SectionCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
                    Real Estate Checks
                    <Badge variant="secondary" className="text-[10px] bg-zinc-800 text-zinc-300 border-0 rounded-md h-5 px-1.5">
                      Cabbge Exclusive
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {auditResult.realEstateChecks.map((check: any, i: number) => {
                    // Map failed checks to fix actions
                    const getFixAction = (): { label: string; onClick: () => void } | null => {
                      if (check.passed) return null;
                      const l = (check.label || "").toLowerCase();
                      if (l.includes("schema")) return { label: "Generate Schema", onClick: onRunSchemaGenerator };
                      if (l.includes("llms.txt") || l.includes("llms")) return { label: "Generate llms.txt", onClick: onRunLlmsTxt };
                      if (l.includes("neighborhood") || l.includes("locality") || l.includes("location map")) return { label: "Generate Guide", onClick: onRunNeighborhood };
                      if (l.includes("floor plan") || l.includes("gallery") || l.includes("virtual tour") || l.includes("amenities") || l.includes("walkthrough")) return { label: "Generate Content", onClick: () => onTabChange("content") };
                      if (l.includes("whatsapp") || l.includes("enquiry") || l.includes("cta")) return { label: "Get Code", onClick: () => onTabChange("content") };
                      if (l.includes("portal")) return { label: "Optimize Listing", onClick: onRunPortalOptimizer };
                      return { label: "How to Fix", onClick: () => onTabChange("content") };
                    };
                    const fix = getFixAction();

                    return (
                      <div key={i} className={`flex items-center justify-between py-2 text-[13px] ${!check.passed ? "bg-red-500/[0.03] -mx-4 px-4 rounded-lg" : ""}`}>
                        <div className="flex items-center gap-2.5">
                          {check.passed ? <CheckCircle2 size={15} className="text-[#7CB342]" /> : <XCircle size={15} className="text-red-400" />}
                          <span className={check.passed ? "text-zinc-300" : "text-zinc-200"}>{check.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {fix && (
                            <button
                              onClick={fix.onClick}
                              className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#7CB342]/10 text-[#7CB342] border border-[#7CB342]/20 hover:bg-[#7CB342]/20 active:scale-[0.97] transition-all"
                            >
                              {fix.label}
                            </button>
                          )}
                          <Badge variant="outline" className="text-[10px] border-zinc-700/50 text-zinc-500 rounded-md">
                            {check.category}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </SectionCard>
            </>
          ) : (
            <EmptyState icon={Globe} title="Enter a URL above to run your first SEO audit" subtitle="Performance, SEO health, technical, and industry-specific checks" />
          )}

        </TabsContent>

        {/* ================================================================ */}
        {/* -------- TECHNICAL TAB -------- */}
        {/* ================================================================ */}
        <TabsContent value="technical" className="space-y-4">

          {technicalResult ? (
            <>
              <SectionCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-semibold">On-Page Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <ScoreCircle score={technicalResult.onPageScore} label="On-Page" />
                    <div className="text-[13px] text-zinc-500 space-y-1.5">
                      <p>Server: <span className="text-zinc-400">{technicalResult.server.host}</span></p>
                      <p>Encoding: <span className="text-zinc-400">{technicalResult.server.encoding}</span></p>
                      <p>Page Size: <span className="text-zinc-400">{technicalResult.server.pageSize}</span></p>
                      <p>Status: <span className="text-zinc-400">{technicalResult.server.status}</span></p>
                      <p>Cacheable: <span className="text-zinc-400">{technicalResult.server.cacheable ? "Yes" : "No"}</span></p>
                    </div>
                  </div>
                </CardContent>
              </SectionCard>

              <SectionCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-semibold">Server Timing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    {[
                      { label: "TTFB", value: `${technicalResult.serverTiming.ttfb}ms` },
                      { label: "Download", value: `${technicalResult.serverTiming.download}ms` },
                      { label: "DOM Complete", value: `${technicalResult.serverTiming.domComplete}ms` },
                      { label: "Total", value: `${technicalResult.serverTiming.timeToInteractive}ms` },
                    ].map(({ label, value }) => (
                      <div key={label} className="py-1">
                        <div className="text-[11px] text-zinc-500 mb-1 font-medium">{label}</div>
                        <div className="text-[15px] font-bold text-zinc-200">{value}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </SectionCard>

              <SectionCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-semibold">Render Blocking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6 text-center">
                    <div>
                      <div className="text-2xl font-bold text-zinc-200">{technicalResult.renderBlocking.scripts}</div>
                      <div className="text-[11px] text-zinc-500 mt-1 font-medium">Scripts</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-zinc-200">{technicalResult.renderBlocking.stylesheets}</div>
                      <div className="text-[11px] text-zinc-500 mt-1 font-medium">Stylesheets</div>
                    </div>
                  </div>
                </CardContent>
              </SectionCard>

              <SectionCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-semibold">Content Relevance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Title Relevance", value: technicalResult.contentRelevance.titleRelevance },
                    { label: "Description Relevance", value: technicalResult.contentRelevance.descriptionRelevance },
                    { label: "Keyword Relevance", value: technicalResult.contentRelevance.keywordRelevance },
                    { label: "Content Rate", value: technicalResult.contentRelevance.contentRate },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between text-[13px]">
                      <span className="text-zinc-400">{label}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-28 h-2 bg-zinc-800/60 rounded-full overflow-hidden">
                          <div className="h-full bg-zinc-100 rounded-full" style={{ width: `${Math.min(100, value)}%` }} />
                        </div>
                        <span className="text-[12px] text-zinc-400 w-10 text-right">{value}%</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </SectionCard>

              <SectionCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-semibold">Heading Structure</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(technicalResult.headingStructure).map(([tag, count]) => (
                      <div key={tag} className="flex items-center gap-3 text-[13px]">
                        <span className="text-zinc-500 font-mono w-7 text-right">{tag.toUpperCase()}</span>
                        <div className="flex-1 h-2 bg-zinc-800/60 rounded-full overflow-hidden">
                          <div className="h-full bg-zinc-100 rounded-full" style={{ width: `${Math.min(100, (count as number) * 5)}%` }} />
                        </div>
                        <span className="text-[12px] text-zinc-400 w-6 text-right">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </SectionCard>

              <SectionCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-semibold">Social Media Tags ({technicalResult.socialMediaTags.totalTags} tags)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {technicalResult.socialMediaTags.openGraph.map((tag: any, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 py-0.5 text-[12px]">
                      <CheckCircle2 size={13} className="text-zinc-100 mt-0.5 flex-shrink-0" />
                      <span className="text-zinc-500 font-mono">{tag.property}:</span>
                      <span className="text-zinc-400 truncate">{tag.content}</span>
                    </div>
                  ))}
                  {technicalResult.socialMediaTags.twitter.map((tag: any, i: number) => (
                    <div key={`tw-${i}`} className="flex items-start gap-2.5 py-0.5 text-[12px]">
                      <CheckCircle2 size={13} className="text-zinc-100 mt-0.5 flex-shrink-0" />
                      <span className="text-zinc-500 font-mono">{tag.property}:</span>
                      <span className="text-zinc-400 truncate">{tag.content}</span>
                    </div>
                  ))}
                  {technicalResult.socialMediaTags.totalTags === 0 && (
                    <p className="text-[13px] text-red-400">No Open Graph or Twitter Card tags found</p>
                  )}
                </CardContent>
              </SectionCard>

              <SectionCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-semibold">Site Files</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {Object.entries(technicalResult.siteFiles).map(([name, file]: [string, any]) => (
                    <div key={name} className="flex items-center justify-between py-1.5 text-[13px]">
                      <div className="flex items-center gap-2.5">
                        {file.exists ? <CheckCircle2 size={15} className="text-zinc-100" /> : <XCircle size={15} className="text-red-400" />}
                        <span className="text-zinc-300 font-mono">{name.replace(/([A-Z])/g, '.$1').toLowerCase()}</span>
                      </div>
                      <span className="text-[12px] text-zinc-500">{file.exists ? `${file.status} ${(file.size / 1024).toFixed(0)}KB` : "Not found"}</span>
                    </div>
                  ))}
                </CardContent>
              </SectionCard>

              {technicalResult.resourceIssues?.length > 0 && (
                <SectionCard>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[13px] font-semibold text-zinc-300">Resource Issues ({technicalResult.resourceIssues.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {technicalResult.resourceIssues.map((issue: any, i: number) => (
                      <div key={i} className={`flex items-center justify-between py-2 text-[13px] ${issue.severity === "error" ? "bg-red-500/[0.03] -mx-4 px-4 rounded-lg" : ""}`}>
                        <div className="flex items-center gap-2.5">
                          <AlertTriangle size={15} className={issue.severity === "error" ? "text-red-400" : "text-amber-400"} />
                          <span className="text-zinc-200">{issue.issue}</span>
                        </div>
                        <Badge variant="outline" className={`text-[10px] rounded-md h-5 flex-shrink-0 ${issue.severity === "error" ? "border-red-500/30 text-red-400" : "border-amber-500/30 text-amber-400"}`}>
                          {issue.severity}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </SectionCard>
              )}
            </>
          ) : (
            !auditResult && (
              <p className="text-[12px] text-zinc-500 text-center py-4">Click the wrench button to run a technical SEO audit</p>
            )
          )}

        </TabsContent>

        {/* ================================================================ */}
        {/* -------- CHECKS TAB (SEO Health + Real Estate Checks) -------- */}
        {/* ================================================================ */}
        <TabsContent value="checks" className="space-y-4">

          {auditResult ? (
            <>
              <SectionCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
                    <span className="text-[#7CB342]">Passed</span>
                    <span className="text-zinc-500 font-normal">({auditResult.seoHealth.filter((c: any) => c.status === "pass").length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {auditResult.seoHealth
                    .filter((c: any) => c.status === "pass")
                    .map((check: any, i: number) => (
                      <div key={i} className="flex items-center gap-2.5 py-1.5 text-[13px]">
                        <CheckCircle2 size={15} className="text-[#7CB342]" />
                        <span className="text-zinc-300">{check.check}</span>
                        <span className="text-[#7CB342] text-[12px] ml-auto font-medium">{check.value}</span>
                      </div>
                    ))}
                </CardContent>
              </SectionCard>

              {auditResult.seoHealth.some((c: any) => c.status !== "pass") && (
                <SectionCard className="border-red-500/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
                      <span className="text-red-400">Issues</span>
                      <span className="text-zinc-500 font-normal">({auditResult.seoHealth.filter((c: any) => c.status !== "pass").length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {auditResult.seoHealth
                      .filter((c: any) => c.status !== "pass")
                      .map((check: any, i: number) => (
                        <div key={i} className="flex items-center gap-2.5 py-2 text-[13px] bg-red-500/[0.03] -mx-4 px-4 rounded-lg">
                          <StatusIcon status={check.status} />
                          <span className="text-zinc-200">{check.check}</span>
                          <span className={`text-[12px] ml-auto font-medium ${check.status === "warn" ? "text-amber-400" : "text-red-400"}`}>{check.value}</span>
                        </div>
                      ))}
                  </CardContent>
                </SectionCard>
              )}
            </>
          ) : (
            <p className="text-[12px] text-zinc-500 text-center py-4">Run an audit to see pass/fail checks</p>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* -------- AI/GEO TAB -------- */}
        {/* ================================================================ */}
        <TabsContent value="aigeo" className="space-y-4">

          {/* GEO Progress Tracker — the core $600/month value prop */}
          {geoProgress?.currentScan && (
            <GEOProgressPanel
              progress={geoProgress}
              onWriteArticleForQuery={onGeoFixQuery}
              onFixAllBlindSpots={onGeoFixAll}
              isGenerating={isFixingGeo}
              articleCost={cost("article")}
              bulkFixCost={cost("report")}
            />
          )}

          {/* What Changed — shows score deltas to drive urgency */}
          {trends.ai_visibility?.history?.length >= 2 && (
            <SectionCard className={trends.ai_visibility.direction === "declining" ? "border-red-500/20" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    trends.ai_visibility.direction === "improving" ? "bg-[#7CB342]/10" :
                    trends.ai_visibility.direction === "declining" ? "bg-red-500/10" : "bg-zinc-800"
                  }`}>
                    <span className={`text-[15px] font-bold ${
                      trends.ai_visibility.direction === "improving" ? "text-[#7CB342]" :
                      trends.ai_visibility.direction === "declining" ? "text-red-400" : "text-zinc-400"
                    }`}>
                      {trends.ai_visibility.change > 0 ? "+" : ""}{trends.ai_visibility.change}
                    </span>
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-zinc-200">
                      {trends.ai_visibility.direction === "improving" ? "Your AI visibility is improving" :
                       trends.ai_visibility.direction === "declining" ? "Your AI visibility dropped — action needed" :
                       "Your AI visibility is stable"}
                    </div>
                    <div className="text-[12px] text-zinc-500">
                      Score went from {trends.ai_visibility.previous} → {trends.ai_visibility.current} since last scan.
                      {trends.ai_visibility.direction === "declining" && " Re-scan and check what changed."}
                      {trends.ai_visibility.direction === "improving" && " Keep going — consistency compounds."}
                      {trends.ai_visibility.direction === "stable" && " Publish more content to push higher."}
                    </div>
                  </div>
                </div>
              </CardContent>
            </SectionCard>
          )}

          <Button
            onClick={onRunAIVisibility}
            disabled={isCheckingAI}
            className="w-full bg-zinc-100 text-zinc-900 hover:bg-white h-10 text-[13px] font-medium rounded-lg"
          >
            {isCheckingAI ? (
              <><Loader2 size={15} className="animate-spin mr-2" />Querying AI models...</>
            ) : (
              <><Bot size={15} className="mr-2" />Check AI Visibility (GEO)</>
            )}
          </Button>

          {/* Deep GEO Analysis — runs independently of AI visibility check */}
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={onRunCrawlerAccess} disabled={isCheckingCrawlers} variant="outline" className="border-zinc-700 text-[12px] h-9 rounded-lg">
              {isCheckingCrawlers ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Search size={13} className="mr-1.5" />}
              Crawler Access
            </Button>
            <Button onClick={onRunBrandPresence} disabled={isCheckingBrand} variant="outline" className="border-zinc-700 text-[12px] h-9 rounded-lg">
              {isCheckingBrand ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Globe size={13} className="mr-1.5" />}
              Brand Presence
            </Button>
            <Button onClick={onRunCitabilityAudit} disabled={isCheckingCitability} variant="outline" className="border-zinc-700 text-[12px] h-9 rounded-lg">
              {isCheckingCitability ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <FileText size={13} className="mr-1.5" />}
              Citability Audit
            </Button>
          </div>

          {/* Crawler Access Results */}
          {crawlerAccessResult && (
            <SectionCard>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[13px] font-semibold text-zinc-200">AI Crawler Access</h4>
                  <ScoreCircle score={crawlerAccessResult.score} label="Access" size="sm" />
                </div>
                <div className="space-y-1.5">
                  {crawlerAccessResult.crawlerAccess?.filter((c: any) => c.tier === 1).map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1 text-[13px]">
                      <span className="text-zinc-300">{c.crawler}</span>
                      <Badge className={`text-[10px] h-5 rounded-md border-0 ${
                        c.status === "allowed" ? "bg-zinc-800 text-zinc-300" :
                        c.status === "blocked" ? "bg-red-500/10 text-red-400" :
                        "bg-zinc-800 text-zinc-500"
                      }`}>{c.status}</Badge>
                    </div>
                  ))}
                </div>
                {crawlerAccessResult.criticalIssues?.length > 0 && (
                  <div className="mt-3 rounded-lg bg-red-950/20 border border-red-900/25 p-3">
                    {crawlerAccessResult.criticalIssues.map((issue: string, i: number) => (
                      <div key={i} className="text-[12px] text-red-400 flex items-start gap-2 py-0.5">
                        <XCircle size={13} className="mt-0.5 flex-shrink-0" /> {issue}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {Object.entries(crawlerAccessResult.aiFiles || {}).map(([key, val]: [string, any]) => (
                    <div key={key} className="text-center p-2 rounded-lg bg-zinc-800/40 border border-zinc-700/20">
                      <div className={`text-[11px] font-medium ${val?.exists ? "text-zinc-100" : "text-red-400"}`}>
                        {val?.exists ? "Found" : "Missing"}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{key}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </SectionCard>
          )}

          {/* Brand Presence Results — deterministic entity signal checks */}
          {brandPresenceResult && (
            <SectionCard>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-[13px] font-semibold text-zinc-200">Brand Entity Signals</h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Verified checks on your homepage — no guessing.</p>
                  </div>
                  <ScoreCircle score={brandPresenceResult.score} label="Signals" size="sm" />
                </div>
                <div className="space-y-1.5">
                  {brandPresenceResult.entityChecks?.map((c: any, i: number) => (
                    <div key={i} className="flex items-start justify-between gap-3 py-1.5 text-[12px] border-b border-white/[0.03] last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-zinc-300">{c.signal}</div>
                        {!c.present && c.fix && (
                          <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">→ {c.fix}</div>
                        )}
                      </div>
                      <Badge className={`text-[10px] h-5 rounded-md border-0 flex-shrink-0 ${
                        c.present ? "bg-[#7CB342]/10 text-[#7CB342]" : "bg-red-500/10 text-red-400"
                      }`}>{c.present ? "Pass" : "Fix"}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </SectionCard>
          )}

          {/* Citability Audit Results */}
          {citabilityResult && (
            <SectionCard>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[13px] font-semibold text-zinc-200">Content Citability</h4>
                  <ScoreCircle score={citabilityResult.overallScore} label="Citability" size="sm" />
                </div>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {Object.entries(citabilityResult.dimensions || {}).map(([key, dim]: [string, any]) => (
                    <div key={key} className="text-center p-2 rounded-lg bg-zinc-800/40 border border-zinc-700/20">
                      <div className={`text-[14px] font-bold ${dim.score >= 60 ? "text-zinc-100" : dim.score >= 40 ? "text-zinc-400" : "text-red-400"}`}>
                        {dim.score}
                      </div>
                      <div className="text-[9px] text-zinc-500 mt-0.5 leading-tight">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                    </div>
                  ))}
                </div>
                {citabilityResult.quickWins?.length > 0 && (
                  <div className="rounded-lg bg-zinc-800/40 border border-zinc-700 p-3">
                    <h5 className="text-[11px] font-semibold text-zinc-100 mb-1.5">Quick Wins</h5>
                    {citabilityResult.quickWins.map((w: string, i: number) => (
                      <div key={i} className="text-[12px] text-zinc-300 flex items-start gap-2 py-0.5">
                        <span className="text-zinc-100 flex-shrink-0">&#8226;</span> {w}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </SectionCard>
          )}

          {aiVisResult ? (
            <>
              <PromptVolumes
                aiVisResult={aiVisResult}
                companyName={companyName}
                city={city}
                onFixQuery={onGeoFixQuery}
                onFixAll={onGeoFixAll}
                isFixing={isFixingGeo}
                articleCost={cost("article")}
                bulkFixCost={cost("report")}
                lastScanDate={geoProgress?.currentScan?.timestamp}
              />

              <SectionCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-semibold">Technical AI Readiness</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-6">
                    <ScoreCircle score={aiVisResult.scores.readiness ?? aiVisResult.scores.overall} label="Readiness" size="md" />
                    <div className="space-y-1.5 flex-1">
                      <div className="text-[13px] text-zinc-400">
                        {aiVisResult.aiReadiness.filter((c: any) => c.passed).length}/{aiVisResult.aiReadiness.length} technical checks passed
                      </div>
                      <div className="text-[11px] text-zinc-500 leading-relaxed">
                        Your website&apos;s technical setup (schema, sitemap, meta, content structure). <span className="text-zinc-400">Separate from whether AI actually mentions you</span> — that&apos;s &quot;Mention Rate&quot; above.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </SectionCard>

              <SectionCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-semibold">Visibility by Platform</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3.5">
                    {[
                      { name: "ChatGPT", score: aiVisResult.scores.chatgpt, desc: "Used by home buyers researching properties", health: aiVisResult.platformHealth?.chatgpt },
                      { name: "Google AI", score: aiVisResult.scores.gemini, desc: "Appears in Google Search AI Overviews", health: aiVisResult.platformHealth?.gemini },
                    ].map(({ name, score, desc, health }) => {
                      // When the underlying scan is broken/degraded, the 0/100 is meaningless.
                      // Tell the user that explicitly instead of letting them think they're invisible.
                      const status: "live" | "degraded" | "broken" | "unknown" = health?.status ?? "unknown";
                      const isBroken = status === "broken";
                      const isDegraded = status === "degraded";
                      const badge = isBroken ? "scan unavailable" : isDegraded ? "web search disabled" : null;
                      const badgeColor = isBroken
                        ? "bg-red-500/15 text-red-300 border-red-500/30"
                        : "bg-amber-500/15 text-amber-300 border-amber-500/30";
                      return (
                        <div key={name}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[13px] text-zinc-300 font-medium flex items-center gap-2">
                              {name}
                              {badge && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${badgeColor} font-mono uppercase tracking-wide`}>
                                  {badge}
                                </span>
                              )}
                            </span>
                            <span className="text-[13px] font-mono text-zinc-400">
                              {isBroken ? "—" : `${score}/100`}
                            </span>
                          </div>
                          <div className="h-2.5 bg-zinc-800/60 rounded-full overflow-hidden mb-1">
                            <div
                              className={`h-full rounded-full transition-all ${isBroken ? "bg-red-500/40" : isDegraded ? "bg-amber-400/60" : "bg-zinc-100"}`}
                              style={{ width: isBroken ? "100%" : `${score}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {isBroken
                              ? `Couldn't reach ${name}${health?.lastError ? ` — ${health.lastError}` : ""}. Scores below ignore this platform.`
                              : isDegraded
                                ? `${name} answered without live web search, so the score reflects training data, not current AI Overviews.`
                                : desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </SectionCard>

              <SectionCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-semibold">AI/GEO Checklist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {aiVisResult.aiReadiness.map((check: any, i: number) => {
                    const getGeoFix = (): { label: string; onClick: () => void } | null => {
                      if (check.passed) return null;
                      const c = (check.check || "").toLowerCase();
                      if (c.includes("llms") || c.includes("txt")) return { label: "Generate", onClick: onRunLlmsTxt };
                      if (c.includes("schema") || c.includes("markup")) return { label: "Generate", onClick: onRunSchemaGenerator };
                      if (c.includes("crawler") || c.includes("robots")) return { label: "Check", onClick: onRunCrawlerAccess };
                      if (c.includes("brand") || c.includes("mention")) return { label: "Scan", onClick: onRunBrandPresence };
                      if (c.includes("citation") || c.includes("citab")) return { label: "Audit", onClick: onRunCitabilityAudit };
                      return { label: "Fix", onClick: onRunGeoImprovement };
                    };
                    const fix = getGeoFix();
                    return (
                      <div key={i} className={`flex items-center justify-between py-2 text-[13px] ${!check.passed ? "bg-red-500/[0.03] -mx-4 px-4 rounded-lg" : ""}`}>
                        <div className="flex items-center gap-2.5">
                          {check.passed ? <CheckCircle2 size={15} className="text-[#7CB342]" /> : <XCircle size={15} className="text-red-400" />}
                          <span className={check.passed ? "text-zinc-300" : "text-zinc-200"}>{check.check}</span>
                        </div>
                        {fix && (
                          <button
                            onClick={fix.onClick}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#7CB342]/10 text-[#7CB342] border border-[#7CB342]/20 hover:bg-[#7CB342]/20 active:scale-[0.97] transition-all flex-shrink-0"
                          >
                            {fix.label}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </SectionCard>

              {/* ---- IMPROVE YOUR SCORE ---- */}
              <div className="border-t border-zinc-800/40 pt-4 mt-4" />

              <div className="flex gap-3">
                <Button
                  onClick={onRunLlmsTxt}
                  disabled={isGeneratingLlmsTxt}
                  className="flex-1 bg-zinc-100 text-zinc-900 hover:bg-white h-10 text-[13px] font-medium rounded-lg"
                >
                  {isGeneratingLlmsTxt ? <><Loader2 size={15} className="animate-spin mr-2" />Generating...</> : <>Generate llms.txt</>}
                </Button>
                <Button
                  onClick={onRunGeoImprovement}
                  disabled={isGeneratingGeoImprovement}
                  className="flex-1 bg-zinc-100 text-zinc-900 hover:bg-white h-10 text-[13px] font-medium rounded-lg"
                >
                  {isGeneratingGeoImprovement ? <><Loader2 size={15} className="animate-spin mr-2" />Planning...</> : <>Get Improvement Plan</>}
                </Button>
              </div>

              {/* llms.txt result */}
              {llmsTxtResult && (
                <SectionCard>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[13px] font-semibold text-zinc-200">llms.txt — Upload to your website root</h4>
                      <CopyBtn text={llmsTxtResult.llmsTxt} field="llms-txt" />
                    </div>
                    <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-4 max-h-[300px] overflow-y-auto mb-3">
                      <pre className="text-[11px] text-zinc-100 whitespace-pre-wrap font-mono">{llmsTxtResult.llmsTxt}</pre>
                    </div>
                    {llmsTxtResult.instructions?.length > 0 && (
                      <div className="space-y-1.5">
                        <h5 className="text-[12px] font-medium text-zinc-400">How to install:</h5>
                        {llmsTxtResult.instructions.map((step: string, i: number) => (
                          <div key={i} className="text-[12px] text-zinc-500 flex items-start gap-2">
                            <span className="text-zinc-100 font-bold flex-shrink-0">{i + 1}.</span> {step}
                          </div>
                        ))}
                      </div>
                    )}
                    {llmsTxtResult.llmsFullTxt && (
                      <div className="mt-4 pt-3 border-t border-zinc-800/40">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-[12px] font-medium text-zinc-400">llms-full.txt (detailed version)</h5>
                          <CopyBtn text={llmsTxtResult.llmsFullTxt} field="llms-full" />
                        </div>
                        <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-4 max-h-[200px] overflow-y-auto">
                          <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap font-mono">{llmsTxtResult.llmsFullTxt}</pre>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </SectionCard>
              )}

              {/* 30-Day Daily GEO Improvement Plan */}
              {geoImprovementResult && (
                <>
                  <SectionCard>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[15px] font-semibold text-zinc-100">30-Day Daily Action Plan</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-red-400 font-bold">{geoImprovementResult.currentScore}%</span>
                          <span className="text-zinc-500">→</span>
                          <span className="text-[13px] text-zinc-100 font-bold">{geoImprovementResult.targetScore}%</span>
                        </div>
                      </div>
                      <p className="text-[12px] text-zinc-500 mb-4">{geoImprovementResult.expectedTimeline}</p>

                      {/* Week progress bar */}
                      {geoImprovementResult.weekSummaries?.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          {geoImprovementResult.weekSummaries.map((w: any) => (
                            <div key={w.week} className="p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/20 text-center">
                              <div className="text-[10px] text-zinc-500 font-medium">Week {w.week}</div>
                              <div className="text-[14px] font-bold text-zinc-200 mt-0.5">{w.expectedScore}%</div>
                              <div className="text-[9px] text-zinc-500 mt-0.5 leading-tight">{w.theme.split("—")[0]?.trim()}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {geoImprovementResult.quickWins?.length > 0 && (
                        <div className="rounded-lg bg-zinc-800/40 border border-zinc-700 p-3.5 mb-4">
                          <h5 className="text-[12px] font-semibold text-zinc-100 mb-2">Do these RIGHT NOW (5-15 min each)</h5>
                          {geoImprovementResult.quickWins.map((win: string, i: number) => (
                            <div key={i} className="text-[12px] text-zinc-300 flex items-start gap-2 py-0.5">
                              <span className="text-zinc-100 flex-shrink-0">&#8226;</span> {win}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Daily actions — execution engine */}
                      <div className="space-y-1.5">
                        {(geoImprovementResult.days || []).map((day: any) => {
                          const weekNum = Math.ceil(day.day / 7);
                          const isNewWeek = day.day % 7 === 1;

                          // Map cabbageFeature to an action
                          const getAction = (): { label: string; onClick: () => void } | null => {
                            const f = (day.cabbageFeature || "").toLowerCase();
                            if (f.includes("llms.txt")) return { label: "Generate", onClick: onRunLlmsTxt };
                            if (f.includes("schema")) return { label: "Generate", onClick: onRunSchemaGenerator };
                            if (f.includes("crawler")) return { label: "Check", onClick: onRunCrawlerAccess };
                            if (f.includes("citability")) return { label: "Audit", onClick: onRunCitabilityAudit };
                            if (f.includes("brand presence")) return { label: "Scan", onClick: onRunBrandPresence };
                            if (f.includes("visibility") || f.includes("ai/geo tab")) return { label: "Scan", onClick: onRunAIVisibility };
                            if (f.includes("audit") || f.includes("health")) return { label: "Scan", onClick: () => onRunAudit(websiteUrl) };
                            if (f.includes("article") || f.includes("content tab")) return { label: "Open", onClick: () => onTabChange("content") };
                            if (f.includes("portal") || f.includes("ads")) return { label: "Open", onClick: () => onRunPortalOptimizer() };
                            if (f.includes("neighborhood") || f.includes("locality")) return { label: "Open", onClick: () => onTabChange("locality") };
                            if (f.includes("report")) return { label: "Generate", onClick: onRunMarketingReport };
                            if (f.includes("progress")) return { label: "Open", onClick: () => onTabChange("content") };
                            return null;
                          };

                          const action = getAction();

                          return (
                            <div key={day.day}>
                              {isNewWeek && day.day > 1 && (
                                <div className="border-t border-zinc-800/40 pt-3 mt-3 mb-2">
                                  <span className="text-[11px] font-semibold text-zinc-500">Week {weekNum}</span>
                                </div>
                              )}
                              <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-zinc-800/20 transition-colors group">
                                <div className="w-7 h-7 rounded-lg bg-zinc-800/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-[11px] font-bold text-zinc-400">{day.day}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[13px] text-zinc-200 leading-snug">{day.action}</div>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[10px] text-zinc-500">{day.timeEstimate}</span>
                                    <Badge variant="outline" className={`text-[9px] rounded-md h-4 ${
                                      day.priority === "must-do" ? "border-red-500/30 text-red-400" :
                                      day.priority === "should-do" ? "border-zinc-700 text-zinc-400" :
                                      "border-zinc-700 text-zinc-500"
                                    }`}>{day.priority}</Badge>
                                    {action && (
                                      <button
                                        onClick={action.onClick}
                                        className="text-[11px] font-medium text-[#7CB342] hover:text-[#8BC34A] transition-colors opacity-0 group-hover:opacity-100"
                                      >
                                        {action.label} →
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* After Day 30 — generate next month */}
                      <div className="border-t border-zinc-800/40 pt-4 mt-4">
                        <SectionCard>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="text-[13px] font-semibold text-zinc-200">Plan complete?</h5>
                                <p className="text-[12px] text-zinc-500 mt-0.5">Re-scan to see your improvements, then generate next month&apos;s plan based on what changed.</p>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button onClick={onRunAIVisibility} disabled={isCheckingAI} variant="outline" className="border-zinc-700 text-[12px] h-8 rounded-lg">
                                  {isCheckingAI ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
                                  Re-scan
                                </Button>
                                <Button onClick={onRunGeoImprovement} disabled={isGeneratingGeoImprovement} className="bg-[#7CB342] text-zinc-950 hover:bg-[#8BC34A] text-[12px] h-8 rounded-lg">
                                  {isGeneratingGeoImprovement ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
                                  Next Month →
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </SectionCard>
                      </div>
                    </CardContent>
                  </SectionCard>
                </>
              )}
            </>
          ) : (
            <EmptyState icon={Bot} title="Check how your brand appears in AI answers" subtitle="Set your company name first, then click the button above" />
          )}

        </TabsContent>

        {/* ================================================================ */}
        {/* -------- LINKS TAB -------- */}
        {/* ================================================================ */}
        <TabsContent value="links" className="space-y-4">
          <Button
            onClick={() => onRunBacklinks(auditUrl || websiteUrl)}
            disabled={isCheckingBacklinks || (!auditUrl && !websiteUrl)}
            className="w-full bg-zinc-100 text-zinc-900 hover:bg-white h-10 text-[13px] font-medium rounded-lg"
          >
            {isCheckingBacklinks ? (
              <><Loader2 size={15} className="animate-spin mr-2" />Analyzing backlinks...</>
            ) : (
              <><Link2 size={15} className="mr-2" />Analyze Backlink Profile</>
            )}
          </Button>

          {backlinkResult ? (
            <>
              <SectionCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
                    Backlink Overview
                    <Badge variant="secondary" className={`text-[10px] rounded-md h-5 px-1.5 border-0 ${
                      backlinkResult.dataSource === "moz_api" ? "bg-zinc-800 text-zinc-300" : "bg-zinc-800 text-zinc-500"
                    }`}>
                      {backlinkResult.dataSource === "moz_api" ? "Moz verified" : "AI estimated"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold text-zinc-100">{backlinkResult.domainAuthority}</div>
                      <div className="text-[11px] text-zinc-500 mt-1 font-medium">Domain Authority</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-zinc-100">{backlinkResult.referringDomains?.toLocaleString()}</div>
                      <div className="text-[11px] text-zinc-500 mt-1 font-medium">Referring Domains</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-zinc-100">{backlinkResult.totalBacklinks?.toLocaleString()}</div>
                      <div className="text-[11px] text-zinc-500 mt-1 font-medium">Total Backlinks</div>
                    </div>
                  </div>
                </CardContent>
              </SectionCard>

              {/* Top referrers: honest display with data-source clarity */}
              <SectionCard>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-[13px] font-semibold">Verified Referring Domains</CardTitle>
                    <Badge className={`text-[10px] h-5 px-1.5 rounded-md border-0 ml-auto ${
                      backlinkResult.dataSource === "moz_api" ? "bg-[#7CB342]/10 text-[#7CB342]" :
                      "bg-blue-500/10 text-blue-400"
                    }`}>
                      {backlinkResult.dataSource === "moz_api" ? "Moz API · live data" : "Verified via web search"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  {backlinkResult.topReferrers?.length > 0 ? (
                    <>
                      <p className="text-[11px] text-zinc-500 mb-2">
                        {backlinkResult.dataSource === "moz_api"
                          ? "Live data from Moz — your actual referring domains, sorted by authority."
                          : "Every domain below was confirmed in real time via web search — each one has a verified page linking to you."}
                      </p>
                      {backlinkResult.topReferrers.slice(0, 15).map((ref: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-1.5 text-[13px]">
                          <span className="text-zinc-300">{ref.domain}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] border-zinc-700/50 rounded-md">
                              DA {ref.authority}
                            </Badge>
                            <Badge variant="secondary" className={`text-[10px] rounded-md h-5 px-1.5 border-0 ${
                              ref.type === "dofollow" ? "bg-zinc-800 text-zinc-300" : "bg-zinc-800 text-zinc-500"
                            }`}>
                              {ref.type}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="py-3">
                      <p className="text-[12px] text-zinc-400 mb-2">
                        No verified inbound links found from high-value Indian real estate domains.
                      </p>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Without a Moz / Ahrefs API key, Cabbge can&apos;t see your full backlink profile.
                        We check the domains below via web search — none of them are currently linking to you.
                        Add <code className="text-zinc-400">MOZ_API_TOKEN</code> to Vercel env vars for full data.
                      </p>
                    </div>
                  )}
                </CardContent>
              </SectionCard>

              {/* Outreach targets — high-value domains NOT linking to you yet */}
              {backlinkResult.unlinkedHighValueDomains?.length > 0 && (
                <SectionCard>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[13px] font-semibold">Priority Outreach Targets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[11px] text-zinc-500 mb-3">
                      These high-authority Indian real estate domains DON&apos;T currently link to you. Each inbound link from these would move DA significantly.
                    </p>
                    <div className="space-y-1">
                      {backlinkResult.unlinkedHighValueDomains.map((d: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-1 text-[12px]">
                          <span className="text-zinc-300">{d.domain}</span>
                          <div className="flex items-center gap-2">
                            <Badge className="text-[9px] h-4 px-1.5 rounded bg-zinc-800 text-zinc-500 border-0">
                              {d.type}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] border-zinc-700/50 rounded-md">
                              DA {d.authority}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {backlinkResult.recommendations?.length > 0 && (
                <SectionCard>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[13px] font-semibold">Link Building Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {backlinkResult.recommendations.map((rec: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-zinc-800/20 border border-white/[0.04] space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] rounded-md h-5 ${
                              rec.priority === "high" ? "border-red-500/30 text-red-400 bg-red-500/8" :
                              rec.priority === "medium" ? "border-amber-500/30 text-amber-400 bg-amber-500/8" :
                              "border-zinc-700/50 text-zinc-500"
                            }`}>{rec.priority}</Badge>
                            <span className="text-[13px] text-zinc-200 font-medium">{rec.title}</span>
                          </div>
                          <button
                            onClick={() => navigator.clipboard.writeText(`${rec.title}: ${rec.description}`)}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/50 hover:bg-zinc-700 active:scale-[0.97] transition-all flex-shrink-0"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="text-[12px] text-zinc-400 leading-relaxed">{rec.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </SectionCard>
              )}
            </>
          ) : (
            <EmptyState icon={Link2} title="Analyze your backlink profile" subtitle="Domain authority, referring domains, and link building opportunities" />
          )}

        </TabsContent>

        {/* ================================================================ */}
        {/* -------- CONTENT TAB (Keywords \u2192 Articles \u2192 Schema) -------- */}
        {/* ================================================================ */}
        <TabsContent value="content" className="space-y-4">

          {/* Keyword research sits at the top of Content — this is the
              first step of the content workflow: find what buyers search,
              then click "Write Article" on any opportunity to generate
              an article for that keyword. */}
          {onRunKeywordResearch && (
            <KeywordResearchPanel
              city={city}
              data={keywordResearchResult}
              isLoading={isResearchingKeywords}
              onSearch={onRunKeywordResearch}
              onFixKeyword={onGeoFixQuery}
            />
          )}

          {/* --- Full Articles --- */}
          <button
            onClick={() => setContentSection(contentSection === "articles" ? null : "articles")}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-900/60 border border-zinc-800/50 text-left hover:border-zinc-700 transition-all"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-zinc-200">
              <PenTool size={15} className="text-zinc-100" /> Full Articles
            </span>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${contentSection === "articles" ? "rotate-180" : ""}`} />
          </button>
          {contentSection === "articles" && (
            <div className="space-y-4">
              <SectionCard>
                <CardContent className="p-5 space-y-4">
                  <h4 className="text-[13px] font-semibold text-zinc-200 flex items-center gap-2">
                    <PenTool size={15} className="text-zinc-100" />
                    Full Article Writer
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Article topic or title..."
                      value={articleTopic}
                      onChange={(e) => setArticleTopic(e.target.value)}
                      className="bg-zinc-900/80 border-zinc-800 text-[13px] h-10 placeholder:text-zinc-500/80"
                    />
                    <Input
                      placeholder="Target keyword..."
                      value={articleKeyword}
                      onChange={(e) => setArticleKeyword(e.target.value)}
                      className="bg-zinc-900/80 border-zinc-800 text-[13px] h-10 placeholder:text-zinc-500/80"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: "locality_guide", label: "Locality Guide" },
                      { value: "project_showcase", label: "Project Showcase" },
                      { value: "market_analysis", label: "Market Analysis" },
                      { value: "buyer_guide", label: "Buyer Guide" },
                      { value: "comparison", label: "Comparison" },
                      { value: "investment", label: "Investment" },
                      { value: "nri_guide", label: "NRI Guide" },
                    ].map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setArticleType(t.value)}
                        className={`text-[12px] px-3 py-1.5 rounded-lg border transition-all ${
                          articleType === t.value
                            ? "bg-zinc-800/40 border-zinc-700 text-zinc-100"
                            : "bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <Button
                    onClick={() => onRunArticleWriter(articleTopic, articleKeyword, articleType)}
                    disabled={isGeneratingArticle || !articleTopic || !articleKeyword}
                    className="w-full bg-zinc-100 text-zinc-900 hover:bg-white h-10 text-[13px] font-medium rounded-lg"
                  >
                    {isGeneratingArticle ? (
                      <><Loader2 size={15} className="animate-spin mr-2" />Writing article...</>
                    ) : (
                      <><PenTool size={15} className="mr-2" />Generate Full Article</>
                    )}
                  </Button>
                </CardContent>
              </SectionCard>

              {articleResult && (
                <>
                  <SectionCard>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-[15px] font-semibold text-zinc-100">{articleResult.title}</h4>
                          <p className="text-[12px] text-zinc-500 mt-1">{articleResult.metaDescription}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                          <Badge className="bg-zinc-800 text-zinc-300 border-0 text-[10px] h-5 rounded-md">{articleResult.wordCount} words</Badge>
                          <DeployViaLoader
                            html={articleResult.content}
                            title={articleResult.title}
                            metaDescription={articleResult.metaDescription}
                            defaultSiteUrl={websiteUrl}
                            contentType="article"
                          />
                          <PublishButton
                            title={articleResult.title}
                            content={articleResult.content}
                            excerpt={articleResult.metaDescription}
                            targetKeyword={articleResult.targetKeyword}
                            onPublished={(url) => {
                              if (articleResult._trackedArticleId) {
                                markArticlePublished(articleResult._trackedArticleId, url);
                              }
                            }}
                          />
                          <CopyBtn text={articleResult.content} field="article" />
                        </div>
                      </div>
                      <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-5 max-h-[500px] overflow-y-auto">
                        <div className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{articleResult.content}</div>
                      </div>
                    </CardContent>
                  </SectionCard>

                  {articleResult.faqs?.length > 0 && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">FAQs (AI/GEO Optimized)</h4>
                        <div className="space-y-3">
                          {articleResult.faqs.map((faq: any, i: number) => (
                            <div key={i} className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                              <div className="text-[13px] font-medium text-zinc-200 mb-1">{faq.question}</div>
                              <div className="text-[12px] text-zinc-400 leading-relaxed">{faq.answer}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}

                  {articleResult.suggestedInternalLinks?.length > 0 && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Suggested Internal Links</h4>
                        <div className="flex flex-wrap gap-2">
                          {articleResult.suggestedInternalLinks.map((link: string, i: number) => (
                            <Badge key={i} variant="outline" className="border-zinc-700/50 text-zinc-400 text-[12px] rounded-lg h-7 px-2.5">{link}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}
                </>
              )}

              {!articleResult && !isGeneratingArticle && (
                <EmptyState icon={PenTool} title="Generate full SEO articles" subtitle="Locality guides, market analysis, NRI guides, project showcases, and more" />
              )}
            </div>
          )}


          {/* --- Section 7: Property Schema --- */}
          <button
            onClick={() => setContentSection(contentSection === "schema" ? null : "schema")}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-900/60 border border-zinc-800/50 text-left hover:border-zinc-700 transition-all"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-zinc-200">
              <Code size={15} className="text-zinc-400" /> Property Schema
            </span>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${contentSection === "schema" ? "rotate-180" : ""}`} />
          </button>
          {contentSection === "schema" && (
            <div className="space-y-4">
              <Button
                onClick={onRunSchemaGenerator}
                disabled={isGeneratingSchema}
                className="w-full bg-zinc-100 text-zinc-900 hover:bg-white h-10 text-[13px] font-medium rounded-lg"
              >
                {isGeneratingSchema ? (
                  <><Loader2 size={15} className="animate-spin mr-2" />Generating schemas...</>
                ) : (
                  <><Code size={15} className="mr-2" />Generate Property Schema (JSON-LD)</>
                )}
              </Button>

              {schemaResult ? (
                <>
                  {/* Auto-deploy — saves schema to Cabbge, serves via public endpoint */}
                  <SchemaDeployPanel
                    defaultPageUrl={websiteUrl}
                    schemaJson={(schemaResult.schemas && (schemaResult.schemas.realEstate || schemaResult.schemas.organization || Object.values(schemaResult.schemas)[0])) as Record<string, unknown> || null}
                    schemaType={Object.keys(schemaResult.schemas || {})[0] || "Schema"}
                  />

                  <SectionCard>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[13px] font-semibold text-zinc-200">Ready-to-Paste HTML Snippet</h4>
                        <CopyBtn text={schemaResult.htmlSnippet} field="schema-html" />
                      </div>
                      <p className="text-[12px] text-zinc-500 mb-3">Copy this into your website&apos;s &lt;head&gt; tag for rich search results and AI visibility.</p>
                      <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-4 max-h-[400px] overflow-y-auto">
                        <pre className="text-[11px] text-zinc-100 whitespace-pre-wrap font-mono">{schemaResult.htmlSnippet}</pre>
                      </div>
                    </CardContent>
                  </SectionCard>

                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(schemaResult.schemas || {}).map(([key, schema]) => (
                      <SectionCard key={key}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className="bg-zinc-800 text-zinc-300 border-0 text-[10px] h-5 rounded-md">{key}</Badge>
                            <CopyBtn text={JSON.stringify(schema, null, 2)} field={`schema-${key}`} />
                          </div>
                          <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-3 max-h-[200px] overflow-y-auto">
                            <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap font-mono">{JSON.stringify(schema, null, 2).substring(0, 500)}...</pre>
                          </div>
                        </CardContent>
                      </SectionCard>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState icon={Code} title="Generate structured data for your property" subtitle="RealEstateListing, Organization, FAQ, BreadcrumbList, LocalBusiness schemas" />
              )}
            </div>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* -------- LOCALITY TAB (Neighborhood intelligence) -------- */}
        {/* ================================================================ */}
        <TabsContent value="locality" className="space-y-4">
          <Button
            onClick={onRunNeighborhood}
            disabled={isGeneratingNeighborhood}
            className="w-full bg-zinc-100 text-zinc-900 hover:bg-white h-10 text-[13px] font-medium rounded-lg"
          >
            {isGeneratingNeighborhood ? (
              <><Loader2 size={15} className="animate-spin mr-2" />Analyzing neighborhood...</>
            ) : (
              <><Navigation size={15} className="mr-2" />Analyze Neighborhood</>
            )}
          </Button>

          {neighborhoodResult ? (
            <>
              {/* Data source badge — is this Places-verified or AI-estimated? */}
              <div className="flex items-center gap-2">
                <Badge className={`text-[10px] h-5 px-1.5 rounded-md border-0 ${
                  neighborhoodResult.dataSource === "places_api"
                    ? "bg-[#7CB342]/10 text-[#7CB342]"
                    : "bg-amber-500/10 text-amber-400"
                }`}>
                  {neighborhoodResult.dataSource === "places_api"
                    ? "Verified via Google Places"
                    : "AI-estimated — verify before publishing"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SectionCard>
                  <CardContent className="p-5 text-center">
                    <div className="text-3xl font-bold text-zinc-100">{neighborhoodResult.walkScore}</div>
                    <div className="text-[11px] text-zinc-500 mt-1 font-medium">Walk Score</div>
                  </CardContent>
                </SectionCard>
                <SectionCard>
                  <CardContent className="p-5 text-center">
                    <div className="text-3xl font-bold text-zinc-400">{neighborhoodResult.connectivityScore}</div>
                    <div className="text-[11px] text-zinc-500 mt-1 font-medium">Connectivity Score</div>
                  </CardContent>
                </SectionCard>
              </div>

              {neighborhoodResult.connectivity && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Connectivity</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(neighborhoodResult.connectivity).map(([key, val]: [string, any]) => val && (
                        <div key={key} className="p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                          <div className="text-[11px] text-zinc-500 capitalize">{key}</div>
                          <div className="text-[13px] text-zinc-300">{val}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {[
                { key: "education", label: "Education", data: neighborhoodResult.education },
                { key: "healthcare", label: "Healthcare", data: neighborhoodResult.healthcare },
                { key: "shopping", label: "Shopping & Entertainment", data: neighborhoodResult.shopping },
                { key: "itHubs", label: "IT / Business Hubs", data: neighborhoodResult.itHubs },
              ].map(({ key, label, data }) => data?.length > 0 && (
                <SectionCard key={key}>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">{label}</h4>
                    <div className="space-y-1.5">
                      {data.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-1 text-[13px]">
                          <span className="text-zinc-300">{item.name}</span>
                          <span className="text-[12px] text-zinc-500">{item.distance || item.type}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              ))}

              {neighborhoodResult.upcomingInfra?.length > 0 && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Upcoming Infrastructure</h4>
                    <div className="space-y-2.5">
                      {neighborhoodResult.upcomingInfra.map((infra: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                          <div className="text-[13px] text-zinc-200 font-medium">{infra.project}</div>
                          <div className="text-[12px] text-zinc-500 mt-0.5">{infra.timeline} — {infra.impact}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {neighborhoodResult.whyLiveHere?.length > 0 && (
                <SectionCard>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[13px] font-semibold text-zinc-200">Why Live Here (Marketing Copy)</h4>
                      <CopyBtn text={neighborhoodResult.whyLiveHere.join("\n")} field="why-live" />
                    </div>
                    <div className="space-y-1.5">
                      {neighborhoodResult.whyLiveHere.map((point: string, i: number) => (
                        <div key={i} className="text-[13px] text-zinc-300 flex items-start gap-2">
                          <span className="text-zinc-100 mt-0.5 flex-shrink-0">&#8226;</span> {point}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {neighborhoodResult.seoContent?.length > 0 && (
                <SectionCard>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[13px] font-semibold text-zinc-200">SEO Content (Ready to Use)</h4>
                      <CopyBtn text={neighborhoodResult.seoContent.join("\n\n")} field="seo-content" />
                    </div>
                    <div className="space-y-3">
                      {neighborhoodResult.seoContent.map((para: string, i: number) => (
                        <p key={i} className="text-[13px] text-zinc-400 leading-relaxed">{para}</p>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}
            </>
          ) : (
            <EmptyState icon={Navigation} title="Analyze the neighborhood around your project" subtitle="Walk score, connectivity, schools, hospitals, IT hubs, infrastructure" />
          )}


          {/* ---- GBP Posts ---- */}
          <div className="border-t border-zinc-800/40 pt-4 mt-4" />
          <SectionCard>
            <CardContent className="p-5">
              <h4 className="text-[14px] font-semibold text-zinc-100 mb-1">Google Business Profile Posts</h4>
              <p className="text-[12px] text-zinc-400 mb-3">4 weeks of GBP posts with CTAs — copy directly to your Google Business Profile.</p>
              <Button
                onClick={onRunGbpPosts}
                disabled={isGeneratingGbp}
                className="w-full bg-zinc-100 text-zinc-900 hover:bg-white active:scale-[0.99] h-10 text-[13px] font-medium rounded-lg transition-all"
              >
                {isGeneratingGbp ? <><Loader2 size={15} className="animate-spin mr-2" />Generating...</> : <>Generate 8 GBP Posts</>}
              </Button>
            </CardContent>
          </SectionCard>

          {gbpResult?.posts?.length > 0 && (
            <SectionCard>
              <CardContent className="p-5">
                <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">GBP Posts ({gbpResult.posts.length})</h4>
                <div className="space-y-3">
                  {gbpResult.posts.map((post: any, i: number) => (
                    <div key={i} className="p-3.5 rounded-lg bg-zinc-800/40 border border-white/[0.04] group relative">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge className="text-[10px] bg-zinc-800 text-zinc-300 border-0 rounded-md h-5 px-1.5">Week {post.week}</Badge>
                        <Badge variant="outline" className="text-[10px] border-zinc-700/50 text-zinc-500 rounded-md">{post.type}</Badge>
                      </div>
                      <div className="text-[13px] text-zinc-200 font-medium mb-1">{post.title}</div>
                      <div className="text-[12px] text-zinc-400 leading-relaxed">{post.body?.slice(0, 200)}...</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="text-[10px] bg-[#7CB342]/10 text-[#7CB342] border-0 rounded-md h-5 px-1.5">{post.cta}</Badge>
                        {post.targetKeyword && <span className="text-[10px] text-zinc-600">Keyword: {post.targetKeyword}</span>}
                      </div>
                      <CopyBtn text={`${post.title}\n\n${post.body}\n\nCTA: ${post.cta}`} field={`gbp-${i}`} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </SectionCard>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* -------- PORTALS TAB (Portal listing optimizer) -------- */}
        {/* ================================================================ */}
        <TabsContent value="ads" className="space-y-4">
          <Button
            onClick={onRunPortalOptimizer}
            disabled={isGeneratingPortal}
            className="w-full bg-zinc-100 text-zinc-900 hover:bg-white h-10 text-[13px] font-medium rounded-lg"
          >
            {isGeneratingPortal ? (
              <><Loader2 size={15} className="animate-spin mr-2" />Optimizing listings...</>
            ) : (
              <><Building size={15} className="mr-2" />Optimize Portal Listings</>
            )}
          </Button>

          {portalResult ? (
            <>
              {Object.entries(portalResult.portals || {}).map(([key, portal]: [string, any]) => {
                const meta = (portalResult.meta?.portals || []).find((p: any) => p.key === key);
                const displayName = meta?.name || key.replace(/([A-Z])/g, ' $1').trim();
                return (
                <SectionCard key={key}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[13px] font-semibold text-zinc-200">{displayName}</h4>
                        {meta?.domain && (
                          <span className="text-[10px] text-zinc-500 font-mono">{meta.domain}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {meta?.submitUrl && (
                          <a
                            href={meta.submitUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700/50"
                          >
                            Open portal \u2197
                          </a>
                        )}
                        <CopyBtn text={`${portal.title}\n\n${portal.description}`} field={`portal-${key}`} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                        <div className="text-[11px] text-zinc-500 mb-1">Title</div>
                        <div className="text-[13px] text-zinc-200 font-medium">{portal.title}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                        <div className="text-[11px] text-zinc-500 mb-1">Description</div>
                        <div className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{portal.description}</div>
                      </div>
                      {portal.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {portal.tags.map((tag: string, i: number) => (
                            <Badge key={i} variant="outline" className="border-zinc-700/50 text-zinc-400 text-[11px] rounded-md">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </SectionCard>
                );
              })}

              {portalResult.googleBusinessProfile && (
                <SectionCard>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[13px] font-semibold text-zinc-200">Google Business Profile</h4>
                      <CopyBtn text={portalResult.googleBusinessProfile.description} field="gbp" />
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30 text-[13px] text-zinc-300 leading-relaxed">{portalResult.googleBusinessProfile.description}</div>
                  </CardContent>
                </SectionCard>
              )}
            </>
          ) : (
            <EmptyState icon={Building} title="Optimize your property portal listings" subtitle="Portal-specific copy for every major Indian property portal, plus your Google Business Profile." />
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* -------- REPORT TAB -------- */}
        {/* ================================================================ */}
        <TabsContent value="report" className="space-y-4">
          <Button
            onClick={onRunMarketingReport}
            disabled={isGeneratingReport}
            className="w-full bg-zinc-700 hover:bg-zinc-600 h-10 text-[13px] font-medium rounded-lg"
          >
            {isGeneratingReport ? (
              <><Loader2 size={15} className="animate-spin mr-2" />Generating report...</>
            ) : (
              <><BarChart3 size={15} className="mr-2" />Generate Monthly Marketing Report</>
            )}
          </Button>

          {reportResult ? (
            <>
              <SectionCard>
                <CardContent className="p-5">
                  <h4 className="text-[13px] font-semibold text-zinc-200 mb-2">Executive Summary</h4>
                  <p className="text-[13px] text-zinc-300 leading-relaxed">{reportResult.executiveSummary}</p>
                </CardContent>
              </SectionCard>

              {[
                { key: "seoSection", label: "SEO Performance" },
                { key: "aiGeoSection", label: "AI / GEO Visibility" },
                { key: "contentSection", label: "Content Performance" },
                { key: "competitiveSection", label: "Competitive Intelligence" },
              ].map(({ key, label }) => reportResult[key] && (
                <SectionCard key={key}>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-2">{label}</h4>
                    <p className="text-[13px] text-zinc-400 leading-relaxed whitespace-pre-wrap">{reportResult[key]}</p>
                  </CardContent>
                </SectionCard>
              ))}

              {reportResult.recommendations?.length > 0 && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Recommendations for Next Month</h4>
                    <div className="space-y-1.5">
                      {reportResult.recommendations.map((rec: string, i: number) => (
                        <div key={i} className="text-[13px] text-zinc-300 flex items-start gap-2">
                          <span className="text-zinc-100 font-bold mt-0.5 flex-shrink-0">{i + 1}.</span> {rec}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {reportResult.kpis?.length > 0 && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">KPI Dashboard</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {reportResult.kpis.map((kpi: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30 text-center">
                          <div className="text-lg font-bold text-zinc-100">{kpi.value}</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">{kpi.metric}</div>
                          {kpi.trend && <div className={`text-[10px] mt-0.5 ${kpi.trend === 'up' ? 'text-zinc-100' : kpi.trend === 'down' ? 'text-red-400' : 'text-zinc-500'}`}>{kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→'} {kpi.target && `Target: ${kpi.target}`}</div>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {reportResult.costSavings && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Cost Savings vs Agency</h4>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                        <div className="text-lg font-bold text-red-400">{reportResult.costSavings.agencyCost}</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">Agency Cost</div>
                      </div>
                      <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                        <div className="text-lg font-bold text-zinc-100">{reportResult.costSavings.cabbageCost}</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">Cabbge</div>
                      </div>
                      <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                        <div className="text-lg font-bold text-zinc-100">{reportResult.costSavings.savings}</div>
                        <div className="text-[11px] text-zinc-100/70 mt-0.5">You Save</div>
                      </div>
                    </div>
                  </CardContent>
                </SectionCard>
              )}
            </>
          ) : (
            <EmptyState icon={BarChart3} title="Generate a board-ready monthly marketing report" subtitle="Run scans first for data-driven reporting" />
          )}
        </TabsContent>
        {/* -------- SEARCH TAB (Google Search Console) -------- */}
        {gscData && (
          <TabsContent value="search" className="space-y-4">
            <GSCPanel
              data={gscData}
              geoQueries={aiVisResult?.queryResults?.map((q: any) => q.query) || []}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
