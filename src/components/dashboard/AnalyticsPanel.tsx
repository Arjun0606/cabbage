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
  Layout,
  Building,
  Navigation,
  HardHat,
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
import { PublishButton } from "./PublishButton";
import { GSCPanel } from "./GSCPanel";
import { SiteCrawlPanel } from "./SiteCrawlPanel";
import { KeywordResearchPanel } from "./KeywordResearchPanel";
import { InternalLinkingPanel } from "./InternalLinkingPanel";
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
  companyName: string;
  city: string;
  contentResult: any;
  contentPlanResult: any;
  localityResult: any;
  isGeneratingContent: boolean;
  onRunContent: () => void;
  onRunContentPlan: () => void;
  onRunLocalitySearch: () => void;
  trends: Record<string, any>;
  // New features
  projects: { name: string; website: string; location: string }[];
  selectedProject: number | null;
  onSelectProject: (idx: number | null) => void;
  articleResult: any;
  isGeneratingArticle: boolean;
  onRunArticleWriter: (topic: string, targetKeyword: string, articleType: string) => void;
  festiveCampaignResult: any;
  isGeneratingCampaign: boolean;
  onRunFestiveCampaign: (festival?: string) => void;
  channelPartnerResult: any;
  isGeneratingPartner: boolean;
  onRunChannelPartner: () => void;
  schemaResult: any;
  isGeneratingSchema: boolean;
  onRunSchemaGenerator: () => void;
  // Round 2 features
  landingPageResult: any;
  isGeneratingLanding: boolean;
  onRunLandingPage: (pageType: string) => void;
  portalResult: any;
  isGeneratingPortal: boolean;
  onRunPortalOptimizer: () => void;
  neighborhoodResult: any;
  isGeneratingNeighborhood: boolean;
  onRunNeighborhood: () => void;
  progressResult: any;
  isGeneratingProgress: boolean;
  onRunProgressUpdate: (phase: string, pct?: number) => void;
  reportResult: any;
  isGeneratingReport: boolean;
  onRunMarketingReport: () => void;
  adsResult: any;
  isGeneratingAds: boolean;
  onRunAdsGenerator: (platform: string) => void;
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
  // Citation Booster
  onRunCitationBooster?: () => void;
  citationBoosterResult?: any;
  isBoostingCitations?: boolean;
  // Locality Domination
  onRunLocalityDomination?: () => void;
  localityDominationResult?: any;
  isGeneratingDomination?: boolean;
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
  websiteUrl, allSites, companyName, city,
  contentResult, contentPlanResult, localityResult, isGeneratingContent,
  onRunContent, onRunContentPlan, onRunLocalitySearch, trends,
  projects, selectedProject, onSelectProject,
  articleResult, isGeneratingArticle, onRunArticleWriter,
  festiveCampaignResult, isGeneratingCampaign, onRunFestiveCampaign,
  channelPartnerResult, isGeneratingPartner, onRunChannelPartner,
  schemaResult, isGeneratingSchema, onRunSchemaGenerator,
  landingPageResult, isGeneratingLanding, onRunLandingPage,
  portalResult, isGeneratingPortal, onRunPortalOptimizer,
  neighborhoodResult, isGeneratingNeighborhood, onRunNeighborhood,
  progressResult, isGeneratingProgress, onRunProgressUpdate,
  reportResult, isGeneratingReport, onRunMarketingReport,
  adsResult, isGeneratingAds, onRunAdsGenerator,
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
  onRunCitationBooster, citationBoosterResult, isBoostingCitations,
  onRunLocalityDomination, localityDominationResult, isGeneratingDomination,
  onRunGbpPosts, gbpResult, isGeneratingGbp,
  gscData,
  siteCrawlResult, isCrawling, onRunSiteCrawl,
  keywordResearchResult, isResearchingKeywords, onRunKeywordResearch,
  internalLinkingResult, isAnalyzingLinks, onRunInternalLinking,
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
        <TabsList className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-0.5 h-auto">
          <TabsTrigger value="health" className="text-[13px] rounded-md px-3.5 py-1.5">Health</TabsTrigger>
          <TabsTrigger value="links" className="text-[13px] rounded-md px-3.5 py-1.5">Links</TabsTrigger>
          <TabsTrigger value="technical" className="text-[13px] rounded-md px-3.5 py-1.5">Technical</TabsTrigger>
          <TabsTrigger value="aigeo" className="text-[13px] rounded-md px-3.5 py-1.5">AI/GEO</TabsTrigger>
          <TabsTrigger value="checks" className="text-[13px] rounded-md px-3.5 py-1.5">Checks</TabsTrigger>
          {gscData && <TabsTrigger value="search" className="text-[13px] rounded-md px-3.5 py-1.5">Search</TabsTrigger>}
        </TabsList>

        {/* ================================================================ */}
        {/* -------- HEALTH TAB (Health + Technical + Checks) -------- */}
        {/* ================================================================ */}
        <TabsContent value="health" className="space-y-4">
          {/* Full-site crawler — visits every page, per-URL audit */}
          {onRunSiteCrawl && (siteCrawlResult || isCrawling) ? (
            <SiteCrawlPanel data={siteCrawlResult} isRunning={isCrawling} onRunCrawl={onRunSiteCrawl} />
          ) : onRunSiteCrawl ? (
            <SiteCrawlPanel data={null} onRunCrawl={onRunSiteCrawl} />
          ) : null}

          {/* Keyword research — expand seed into volume-aware opportunities */}
          {onRunKeywordResearch && (
            <KeywordResearchPanel
              city={city}
              data={keywordResearchResult}
              isLoading={isResearchingKeywords}
              onSearch={onRunKeywordResearch}
              onFixKeyword={onGeoFixQuery}
            />
          )}

          {/* Internal linking graph — uses the crawl to find link opportunities */}
          {onRunInternalLinking && (
            <InternalLinkingPanel
              data={internalLinkingResult}
              isLoading={isAnalyzingLinks}
              hasCrawl={!!siteCrawlResult}
              onAnalyze={onRunInternalLinking}
            />
          )}

          {/* Execution Checklist — the thing that makes this an execution engine */}
          <ExecutionChecklist
            companyName={companyName}
            websiteUrl={websiteUrl}
            city={city}
            auditResult={auditResult}
            aiVisResult={aiVisResult}
            technicalResult={technicalResult}
            backlinkResult={backlinkResult}
            hasArticles={!!articleResult}
            hasSchema={!!schemaResult}
            hasLlmsTxt={!!llmsTxtResult}
            hasGbpPosts={!!gbpResult}
            hasCitationBooster={!!citationBoosterResult}
            hasLocalityDomination={!!localityDominationResult}
            onRunAction={(action) => {
              if (action === "tab-health") onTabChange("health");
              else if (action === "tab-content") onTabChange("content");
              else if (action === "audit") onRunAudit(websiteUrl);
              else if (action === "ai_visibility") onRunAIVisibility();
              else if (action === "schema") onRunSchemaGenerator();
              else if (action === "llms_txt") onRunLlmsTxt();
              else if (action === "citation_booster") onRunCitationBooster?.();
              else if (action === "locality_domination") onRunLocalityDomination?.();
              else if (action === "gbp_posts") onRunGbpPosts?.();
            }}
          />

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
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { label: "TTFB", value: `${technicalResult.serverTiming.ttfb}ms` },
                      { label: "DOM Complete", value: `${technicalResult.serverTiming.domComplete}ms` },
                      { label: "Download", value: `${technicalResult.serverTiming.download}ms` },
                      { label: "Connection", value: `${technicalResult.serverTiming.connection}ms` },
                      { label: "TLS", value: `${technicalResult.serverTiming.tlsHandshake}ms` },
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

          {/* Brand Presence Results */}
          {brandPresenceResult && (
            <SectionCard>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[13px] font-semibold text-zinc-200">Brand Presence</h4>
                  <ScoreCircle score={brandPresenceResult.score} label="Presence" size="sm" />
                </div>
                <div className="space-y-1.5">
                  {brandPresenceResult.platforms?.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1 text-[13px]">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-300">{p.platform}</span>
                        <Badge variant="outline" className={`text-[9px] h-4 rounded-md ${
                          p.importance === "critical" ? "border-red-500/30 text-red-400" : "border-zinc-700 text-zinc-500"
                        }`}>{p.importance}</Badge>
                      </div>
                      <Badge className={`text-[10px] h-5 rounded-md border-0 ${
                        p.status === "likely_present" ? "bg-zinc-800 text-zinc-300" :
                        p.status === "likely_absent" ? "bg-red-500/10 text-red-400" :
                        "bg-zinc-800 text-zinc-500"
                      }`}>{p.status === "likely_present" ? "Present" : p.status === "likely_absent" ? "Missing" : "Unknown"}</Badge>
                    </div>
                  ))}
                </div>
                {brandPresenceResult.recommendations?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {brandPresenceResult.recommendations.slice(0, 3).map((r: string, i: number) => (
                      <div key={i} className="text-[12px] text-zinc-500 flex items-start gap-2">
                        <span className="text-zinc-100 flex-shrink-0">&#8226;</span> {r}
                      </div>
                    ))}
                  </div>
                )}
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
                  {isGeneratingLlmsTxt ? <><Loader2 size={15} className="animate-spin mr-2" />Generating...</> : <>{cost("llms_txt") > 0 && <span className="text-zinc-500 mr-1">{cost("llms_txt")}cr</span>}Generate llms.txt</>}
                </Button>
                <Button
                  onClick={onRunGeoImprovement}
                  disabled={isGeneratingGeoImprovement}
                  className="flex-1 bg-zinc-100 text-zinc-900 hover:bg-white h-10 text-[13px] font-medium rounded-lg"
                >
                  {isGeneratingGeoImprovement ? <><Loader2 size={15} className="animate-spin mr-2" />Planning...</> : <>{cost("geo_improvement") > 0 && <span className="text-zinc-500 mr-1">{cost("geo_improvement")}cr</span>}Get Improvement Plan</>}
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
                            if (f.includes("campaign") || f.includes("festive")) return { label: "Open", onClick: () => onTabChange("content") };
                            if (f.includes("partner") || f.includes("channel")) return { label: "Generate", onClick: onRunChannelPartner };
                            if (f.includes("landing")) return { label: "Open", onClick: () => onTabChange("content") };
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

              {backlinkResult.topReferrers?.length > 0 && (
                <SectionCard>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[13px] font-semibold">Top Referring Domains</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {backlinkResult.topReferrers.map((ref: any, i: number) => (
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

          {/* ---- Citation Booster ---- */}
          <div className="border-t border-zinc-800/40 pt-4 mt-4" />
          <SectionCard>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-[14px] font-semibold text-zinc-100 flex items-center gap-2">
                    Citation Booster
                    <Badge className="text-[10px] bg-[#7CB342]/10 text-[#7CB342] border-0 rounded-md h-5 px-1.5">AI Powered</Badge>
                  </h4>
                  <p className="text-[12px] text-zinc-400 mt-1">Brands with more web mentions get 10x more AI citations. This generates everything to boost yours.</p>
                </div>
              </div>
              <Button
                onClick={onRunCitationBooster}
                disabled={isBoostingCitations}
                className="w-full bg-[#7CB342] text-zinc-900 hover:bg-[#8BC34A] active:scale-[0.99] h-10 text-[13px] font-medium rounded-lg transition-all"
              >
                {isBoostingCitations ? <><Loader2 size={15} className="animate-spin mr-2" />Generating toolkit...</> : <><>{cost("citation_booster") > 0 && <span className="opacity-70 mr-1">{cost("citation_booster")}cr</span>}</>Generate Citation Booster</>}
              </Button>
            </CardContent>
          </SectionCard>

          {citationBoosterResult && (
            <>
              {/* Directory Listings */}
              {citationBoosterResult.directoryListings && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Directory Listings (Copy & Submit)</h4>
                    <div className="space-y-3">
                      {Object.entries(citationBoosterResult.directoryListings).map(([portal, listing]: [string, any]) => (
                        <div key={portal} className="p-3.5 rounded-lg bg-zinc-800/40 border border-white/[0.04] group relative">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="text-[10px] bg-zinc-800 text-zinc-300 border-0 rounded-md h-5 px-1.5">{portal}</Badge>
                            <span className="text-[13px] font-medium text-zinc-200">{listing.title}</span>
                          </div>
                          <p className="text-[12px] text-zinc-400 leading-relaxed">{listing.description?.slice(0, 200)}...</p>
                          <CopyBtn text={`${listing.title}\n\n${listing.description}\n\nHighlights:\n${(listing.highlights || []).join("\n")}`} field={`dir-${portal}`} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {/* Press Release */}
              {citationBoosterResult.pressRelease && (
                <SectionCard>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[13px] font-semibold text-zinc-200">Press Release</h4>
                      <CopyBtn text={`${citationBoosterResult.pressRelease.headline}\n${citationBoosterResult.pressRelease.subheadline}\n\n${citationBoosterResult.pressRelease.body}\n\n${citationBoosterResult.pressRelease.boilerplate}`} field="press" />
                    </div>
                    <div className="p-3.5 rounded-lg bg-zinc-800/40 border border-white/[0.04]">
                      <div className="text-[14px] font-semibold text-zinc-100 mb-1">{citationBoosterResult.pressRelease.headline}</div>
                      <div className="text-[12px] text-zinc-400 mb-3">{citationBoosterResult.pressRelease.subheadline}</div>
                      <div className="text-[12px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{citationBoosterResult.pressRelease.body?.slice(0, 400)}...</div>
                    </div>
                    {citationBoosterResult.pressRelease.targetPublications?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <span className="text-[11px] text-zinc-500 mr-1">Send to:</span>
                        {citationBoosterResult.pressRelease.targetPublications.map((pub: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px] border-zinc-700/50 text-zinc-400 rounded-md">{pub}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </SectionCard>
              )}

              {/* Community Answers */}
              {citationBoosterResult.communityAnswers?.length > 0 && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Community Answers (Quora / Reddit)</h4>
                    <div className="space-y-3">
                      {citationBoosterResult.communityAnswers.map((ca: any, i: number) => (
                        <div key={i} className="p-3.5 rounded-lg bg-zinc-800/40 border border-white/[0.04] group relative">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge className="text-[10px] bg-zinc-800 text-zinc-300 border-0 rounded-md h-5 px-1.5">{ca.platform}</Badge>
                          </div>
                          <div className="text-[13px] text-zinc-200 font-medium mb-1">{ca.question}</div>
                          <div className="text-[12px] text-zinc-400 leading-relaxed">{ca.answer?.slice(0, 200)}...</div>
                          <CopyBtn text={ca.answer} field={`ca-${i}`} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {/* GBP Optimization */}
              {citationBoosterResult.gbpOptimization && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Google Business Profile Optimization</h4>
                    <div className="p-3.5 rounded-lg bg-zinc-800/40 border border-white/[0.04] group relative mb-3">
                      <div className="text-[11px] text-zinc-500 font-medium mb-1">Business Description (copy to GBP)</div>
                      <div className="text-[12px] text-zinc-300 leading-relaxed">{citationBoosterResult.gbpOptimization.businessDescription}</div>
                      <CopyBtn text={citationBoosterResult.gbpOptimization.businessDescription} field="gbp-desc" />
                    </div>
                    {citationBoosterResult.gbpOptimization.reviewStrategy && (
                      <div className="p-3 rounded-lg bg-[#7CB342]/[0.04] border border-[#7CB342]/10">
                        <div className="text-[11px] text-[#7CB342] font-medium mb-1">Review Strategy</div>
                        <div className="text-[12px] text-zinc-400 leading-relaxed">{citationBoosterResult.gbpOptimization.reviewStrategy}</div>
                      </div>
                    )}
                  </CardContent>
                </SectionCard>
              )}

              {/* Impact Estimate */}
              {citationBoosterResult.impactEstimate && (
                <SectionCard>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-2.5 rounded-lg bg-zinc-800/40">
                        <div className="text-lg font-bold text-zinc-100">{citationBoosterResult.impactEstimate.expectedNewMentions}</div>
                        <div className="text-[11px] text-zinc-500">Expected new mentions</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-zinc-800/40">
                        <div className="text-lg font-bold text-zinc-100">{citationBoosterResult.impactEstimate.timeToImpact}</div>
                        <div className="text-[11px] text-zinc-500">Time to AI impact</div>
                      </div>
                    </div>
                  </CardContent>
                </SectionCard>
              )}
            </>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* -------- CONTENT TAB (Content + Articles + Campaigns + Partners + Landing + Progress + Schema) -------- */}
        {/* ================================================================ */}
        <TabsContent value="content" className="space-y-4">

          {/* --- Section 1: Content Topics --- */}
          <button
            onClick={() => setContentSection(contentSection === "topics" ? null : "topics")}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-900/60 border border-zinc-800/50 text-left hover:border-zinc-700 transition-all"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-zinc-200">
              <FileText size={15} className="text-zinc-100" /> Content Topics
            </span>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${contentSection === "topics" ? "rotate-180" : ""}`} />
          </button>
          {contentSection === "topics" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={onRunContent} disabled={isGeneratingContent} className="flex-1 bg-zinc-100 text-zinc-900 hover:bg-white h-10 text-[13px] font-medium rounded-lg">
                  {isGeneratingContent ? <><Loader2 size={15} className="animate-spin mr-2" />Generating...</> : "Generate Content"}
                </Button>
                <Button onClick={onRunContentPlan} disabled={isGeneratingContent} variant="outline" className="border-zinc-700 h-10 text-[13px] rounded-lg">
                  4-Week Plan
                </Button>
              </div>

              {contentResult ? (
                <>
                  {contentResult.blogTopics?.length > 0 && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <h4 className="text-[13px] font-semibold text-zinc-200 mb-4">Blog Topics ({contentResult.blogTopics.length})</h4>
                        <div className="space-y-3">
                          {contentResult.blogTopics.map((topic: any, i: number) => (
                            <div key={i} className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30 space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="text-[13px] text-zinc-200 font-medium">{topic.title}</div>
                                  <div className="text-[11px] text-zinc-100 font-medium mt-0.5">Keyword: {topic.targetKeyword}</div>
                                </div>
                                <button
                                  onClick={() => onRunArticleWriter(topic.title, topic.targetKeyword, "blog")}
                                  disabled={isGeneratingArticle}
                                  className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#7CB342]/10 text-[#7CB342] border border-[#7CB342]/20 hover:bg-[#7CB342]/20 active:scale-[0.97] transition-all flex-shrink-0 disabled:opacity-40"
                                >
                                  {isGeneratingArticle ? "Writing..." : "Write Article"}
                                </button>
                              </div>
                              {topic.outline && (
                                <div className="text-[12px] text-zinc-500 mt-1.5 space-y-0.5">
                                  {topic.outline.map((s: string, j: number) => <div key={j}>&#8226; {s}</div>)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}

                  {contentResult.linkedinPosts?.length > 0 && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <h4 className="text-[13px] font-semibold text-zinc-200 mb-4">LinkedIn Posts ({contentResult.linkedinPosts.length})</h4>
                        <div className="space-y-2.5">
                          {contentResult.linkedinPosts.map((post: string, i: number) => (
                            <EditableBlock
                              key={i}
                              text={post}
                              onSave={(newText) => {
                                const updated = [...contentResult.linkedinPosts];
                                updated[i] = newText;
                                // No state setter needed — mutates in place for display
                              }}
                              onRegenerate={onRunContent}
                              isRegenerating={isGeneratingContent}
                              regenerateCost={cost("content")}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}

                  {contentResult.whatsappMessages?.length > 0 && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <h4 className="text-[13px] font-semibold text-zinc-200 mb-4">WhatsApp Broadcasts ({contentResult.whatsappMessages.length})</h4>
                        <div className="space-y-2.5">
                          {contentResult.whatsappMessages.map((msg: string, i: number) => (
                            <EditableBlock
                              key={i}
                              text={msg}
                              onSave={(newText) => {
                                const updated = [...contentResult.whatsappMessages];
                                updated[i] = newText;
                              }}
                              onRegenerate={onRunContent}
                              isRegenerating={isGeneratingContent}
                              regenerateCost={cost("content")}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}

                  {contentResult.localityPages?.length > 0 && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <h4 className="text-[13px] font-semibold text-zinc-200 mb-4">SEO Pages ({contentResult.localityPages.length})</h4>
                        <div className="space-y-2">
                          {contentResult.localityPages.map((page: any, i: number) => (
                            <div key={i} className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                              <div className="text-[13px] text-zinc-200">{page.title}</div>
                              <div className="text-[11px] text-zinc-100 font-medium mt-0.5">{page.targetKeyword}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}
                </>
              ) : contentPlanResult ? (
                <>
                  {contentPlanResult.weeklyPlan?.length > 0 && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <h4 className="text-[13px] font-semibold text-zinc-200 mb-4">4-Week Content Plan</h4>
                        <div className="space-y-3">
                          {contentPlanResult.weeklyPlan.map((week: any, i: number) => (
                            <div key={i} className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30 space-y-1.5">
                              <div className="text-[12px] font-semibold text-zinc-100">Week {week.week}</div>
                              <div className="text-[13px] text-zinc-300">Blog: {week.blog?.title}</div>
                              <div className="text-[12px] text-zinc-500">Keyword: {week.blog?.targetKeyword}</div>
                              <div className="text-[12px] text-zinc-500">{week.socialPosts} social posts planned</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}

                  {contentPlanResult.socialCalendar?.length > 0 && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <h4 className="text-[13px] font-semibold text-zinc-200 mb-4">Social Calendar ({contentPlanResult.socialCalendar.length} posts)</h4>
                        <div className="space-y-2">
                          {contentPlanResult.socialCalendar.slice(0, 10).map((post: any, i: number) => (
                            <div key={i} className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                              <div className="flex items-center gap-2 mb-1.5">
                                <Badge variant="outline" className="text-[10px] border-zinc-700/50 rounded-md">{post.platform}</Badge>
                                <span className="text-zinc-500 text-[12px]">{post.scheduledDay}</span>
                              </div>
                              <div className="text-[13px] text-zinc-300">{post.title}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}
                </>
              ) : (
                <EmptyState icon={FileText} title="Generate blogs, LinkedIn posts, WhatsApp broadcasts" subtitle="Set your company details first, then click Generate Content" />
              )}
            </div>
          )}

          {/* --- Section 2: Full Articles --- */}
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
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className="bg-zinc-800 text-zinc-300 border-0 text-[10px] h-5 rounded-md">{articleResult.wordCount} words</Badge>
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

          {/* --- Section 3: Festive Campaigns --- */}
          <button
            onClick={() => setContentSection(contentSection === "campaigns" ? null : "campaigns")}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-900/60 border border-zinc-800/50 text-left hover:border-zinc-700 transition-all"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-zinc-200">
              <PartyPopper size={15} className="text-zinc-400" /> Festive Campaigns
            </span>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${contentSection === "campaigns" ? "rotate-180" : ""}`} />
          </button>
          {contentSection === "campaigns" && (
            <div className="space-y-4">
              <Button
                onClick={() => onRunFestiveCampaign()}
                disabled={isGeneratingCampaign}
                className="w-full bg-zinc-100 text-zinc-900 hover:bg-white h-10 text-[13px] font-medium rounded-lg"
              >
                {isGeneratingCampaign ? (
                  <><Loader2 size={15} className="animate-spin mr-2" />Generating campaign...</>
                ) : (
                  <><PartyPopper size={15} className="mr-2" />Generate Festive Campaign</>
                )}
              </Button>

              <div className="flex gap-2 flex-wrap">
                {["Diwali", "Navratri", "Ugadi", "Akshaya Tritiya", "Independence Day", "Christmas", "New Year", "Holi"].map((f) => (
                  <button
                    key={f}
                    onClick={() => onRunFestiveCampaign(f)}
                    disabled={isGeneratingCampaign}
                    className="text-[12px] px-3 py-1.5 rounded-lg border bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:text-zinc-400 hover:border-zinc-600 transition-all disabled:opacity-40"
                  >
                    {f}
                  </button>
                ))}
              </div>

              {festiveCampaignResult ? (
                <>
                  <SectionCard>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-zinc-800 text-zinc-300 border-0 text-[11px] h-5 rounded-md">{festiveCampaignResult.festival}</Badge>
                      </div>
                      <h4 className="text-[15px] font-semibold text-zinc-100">{festiveCampaignResult.campaignTheme}</h4>
                      <p className="text-[13px] text-zinc-400 mt-1 italic">&ldquo;{festiveCampaignResult.tagline}&rdquo;</p>
                    </CardContent>
                  </SectionCard>

                  {festiveCampaignResult.whatsappMessages?.length > 0 && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">WhatsApp Broadcasts ({festiveCampaignResult.whatsappMessages.length})</h4>
                        <div className="space-y-2.5">
                          {festiveCampaignResult.whatsappMessages.map((msg: string, i: number) => (
                            <div key={i} className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30 flex justify-between gap-2">
                              <div className="text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{msg}</div>
                              <CopyBtn text={msg} field={`wa-${i}`} />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}

                  {festiveCampaignResult.linkedinPosts?.length > 0 && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">LinkedIn Posts</h4>
                        <div className="space-y-2.5">
                          {festiveCampaignResult.linkedinPosts.map((post: string, i: number) => (
                            <div key={i} className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30 flex justify-between gap-2">
                              <div className="text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{post}</div>
                              <CopyBtn text={post} field={`li-${i}`} />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}

                  {festiveCampaignResult.adCopy?.length > 0 && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Ad Copy</h4>
                        <div className="space-y-2.5">
                          {festiveCampaignResult.adCopy.map((ad: string, i: number) => (
                            <div key={i} className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30 flex justify-between gap-2">
                              <div className="text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{ad}</div>
                              <CopyBtn text={ad} field={`ad-${i}`} />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}

                  {festiveCampaignResult.emailContent && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Email Template</h4>
                        <div className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                          <div className="text-[13px] font-medium text-zinc-200 mb-2">Subject: {festiveCampaignResult.emailContent.subject}</div>
                          <div className="text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{festiveCampaignResult.emailContent.body}</div>
                          <div className="mt-2 flex justify-end">
                            <CopyBtn text={`Subject: ${festiveCampaignResult.emailContent.subject}\n\n${festiveCampaignResult.emailContent.body}`} field="email" />
                          </div>
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}

                  {festiveCampaignResult.googleAds?.length > 0 && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Google Ads Copy</h4>
                        <div className="space-y-2.5">
                          {festiveCampaignResult.googleAds.map((ad: any, i: number) => (
                            <div key={i} className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                              <div className="text-[13px] font-medium text-zinc-200">{ad.headline}</div>
                              <div className="text-[12px] text-zinc-400 mt-1">{ad.description}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}

                  {festiveCampaignResult.landingPage && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Landing Page Copy</h4>
                        <div className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                          <div className="text-[15px] font-bold text-zinc-100">{festiveCampaignResult.landingPage.headline}</div>
                          <div className="text-[13px] text-zinc-400 mt-1">{festiveCampaignResult.landingPage.subheading}</div>
                          {festiveCampaignResult.landingPage.bullets?.length > 0 && (
                            <ul className="mt-3 space-y-1.5">
                              {festiveCampaignResult.landingPage.bullets.map((b: string, i: number) => (
                                <li key={i} className="text-[13px] text-zinc-300 flex items-start gap-2">
                                  <span className="text-zinc-100 mt-0.5">&#8226;</span> {b}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}

                  {festiveCampaignResult.smsText && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[13px] font-semibold text-zinc-200">SMS Text</h4>
                          <CopyBtn text={festiveCampaignResult.smsText} field="sms" />
                        </div>
                        <div className="mt-2 p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30 text-[13px] text-zinc-300">{festiveCampaignResult.smsText}</div>
                      </CardContent>
                    </SectionCard>
                  )}
                </>
              ) : (
                <EmptyState icon={PartyPopper} title="Generate festive campaign content" subtitle="Diwali, Navratri, Ugadi, Akshaya Tritiya — multi-channel campaigns" />
              )}
            </div>
          )}

          {/* --- Section 4: Channel Partners --- */}
          <button
            onClick={() => setContentSection(contentSection === "partners" ? null : "partners")}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-900/60 border border-zinc-800/50 text-left hover:border-zinc-700 transition-all"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-zinc-200">
              <Users size={15} className="text-zinc-400" /> Channel Partners
            </span>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${contentSection === "partners" ? "rotate-180" : ""}`} />
          </button>
          {contentSection === "partners" && (
            <div className="space-y-4">
              <Button
                onClick={onRunChannelPartner}
                disabled={isGeneratingPartner}
                className="w-full bg-zinc-100 text-zinc-900 hover:bg-white h-10 text-[13px] font-medium rounded-lg"
              >
                {isGeneratingPartner ? (
                  <><Loader2 size={15} className="animate-spin mr-2" />Generating broker pack...</>
                ) : (
                  <><Users size={15} className="mr-2" />Generate Channel Partner Pack</>
                )}
              </Button>

              {channelPartnerResult ? (
                <>
                  {channelPartnerResult.whatsappForward && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[13px] font-semibold text-zinc-200">WhatsApp Forward Message</h4>
                          <CopyBtn text={channelPartnerResult.whatsappForward} field="cp-wa" />
                        </div>
                        <div className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30 text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{channelPartnerResult.whatsappForward}</div>
                      </CardContent>
                    </SectionCard>
                  )}

                  {channelPartnerResult.onePager && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[13px] font-semibold text-zinc-200">Project One-Pager</h4>
                          <CopyBtn text={channelPartnerResult.onePager} field="cp-onepager" />
                        </div>
                        <div className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30 text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{channelPartnerResult.onePager}</div>
                      </CardContent>
                    </SectionCard>
                  )}

                  {channelPartnerResult.emailTemplate && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[13px] font-semibold text-zinc-200">Broker Email Template</h4>
                          <CopyBtn text={`Subject: ${channelPartnerResult.emailTemplate.subject}\n\n${channelPartnerResult.emailTemplate.body}`} field="cp-email" />
                        </div>
                        <div className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                          <div className="text-[13px] font-medium text-zinc-200 mb-2">Subject: {channelPartnerResult.emailTemplate.subject}</div>
                          <div className="text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{channelPartnerResult.emailTemplate.body}</div>
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}

                  {channelPartnerResult.pitchScript && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[13px] font-semibold text-zinc-200">30-Second Pitch Script</h4>
                          <CopyBtn text={channelPartnerResult.pitchScript} field="cp-pitch" />
                        </div>
                        <div className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30 text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{channelPartnerResult.pitchScript}</div>
                      </CardContent>
                    </SectionCard>
                  )}

                  {channelPartnerResult.brokerFAQs?.length > 0 && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Broker FAQ (Objection Handling)</h4>
                        <div className="space-y-3">
                          {channelPartnerResult.brokerFAQs.map((faq: any, i: number) => (
                            <div key={i} className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                              <div className="text-[13px] font-medium text-zinc-200 mb-1">Q: {faq.question}</div>
                              <div className="text-[12px] text-zinc-400 leading-relaxed">A: {faq.answer}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}

                  {channelPartnerResult.comparisonPoints?.length > 0 && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Comparison Talking Points</h4>
                        <div className="space-y-1.5">
                          {channelPartnerResult.comparisonPoints.map((point: string, i: number) => (
                            <div key={i} className="text-[13px] text-zinc-300 flex items-start gap-2">
                              <span className="text-zinc-100 mt-0.5 flex-shrink-0">&#8226;</span> {point}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}
                </>
              ) : (
                <EmptyState icon={Users} title="Generate channel partner content packs" subtitle="WhatsApp forwards, one-pagers, email templates, pitch scripts for brokers" />
              )}
            </div>
          )}

          {/* --- Section 5: Landing Pages --- */}
          <button
            onClick={() => setContentSection(contentSection === "landing" ? null : "landing")}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-900/60 border border-zinc-800/50 text-left hover:border-zinc-700 transition-all"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-zinc-200">
              <Layout size={15} className="text-zinc-400" /> Landing Pages
            </span>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${contentSection === "landing" ? "rotate-180" : ""}`} />
          </button>
          {contentSection === "landing" && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: "site_visit", label: "Site Visit Page", icon: Layout },
                  { value: "price_enquiry", label: "Price Enquiry", icon: Building },
                  { value: "nri", label: "NRI Landing Page", icon: Globe },
                  { value: "festive_offer", label: "Festive Offer", icon: PartyPopper },
                  { value: "pre_launch", label: "Pre-Launch", icon: Megaphone },
                ].map(({ value, label, icon: Ic }) => (
                  <Button
                    key={value}
                    onClick={() => onRunLandingPage(value)}
                    disabled={isGeneratingLanding}
                    variant="outline"
                    className="border-zinc-700 text-[13px] h-10 rounded-lg hover:border-zinc-600 hover:text-zinc-100"
                  >
                    {isGeneratingLanding ? <Loader2 size={14} className="animate-spin mr-2" /> : <Ic size={14} className="mr-2" />}
                    {label}
                  </Button>
                ))}
              </div>

              {landingPageResult ? (
                <SectionCard>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Badge className="bg-zinc-800 text-zinc-300 border-0 text-[10px] h-5 rounded-md mb-2">{landingPageResult.pageType}</Badge>
                        <h4 className="text-[15px] font-semibold text-zinc-100">{landingPageResult.title}</h4>
                        <p className="text-[12px] text-zinc-500 mt-1">{landingPageResult.metaDescription}</p>
                      </div>
                      <CopyBtn text={landingPageResult.html} field="landing-html" />
                    </div>
                    <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-4 max-h-[500px] overflow-y-auto">
                      <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap font-mono">{landingPageResult.html?.substring(0, 3000)}...</pre>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-2">Copy the full HTML and host it on your domain or use with a landing page builder.</p>
                  </CardContent>
                </SectionCard>
              ) : (
                <EmptyState icon={Layout} title="Generate ready-to-deploy landing pages" subtitle="Site visit, price enquiry, NRI, festive offer, pre-launch pages" />
              )}
            </div>
          )}

          {/* --- Section 6: Construction Updates --- */}
          <button
            onClick={() => setContentSection(contentSection === "progress" ? null : "progress")}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-900/60 border border-zinc-800/50 text-left hover:border-zinc-700 transition-all"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-zinc-200">
              <HardHat size={15} className="text-zinc-400" /> Construction Updates
            </span>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${contentSection === "progress" ? "rotate-180" : ""}`} />
          </button>
          {contentSection === "progress" && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: "excavation", label: "Excavation" },
                  { value: "foundation", label: "Foundation" },
                  { value: "structure", label: "Structure" },
                  { value: "finishing", label: "Finishing" },
                  { value: "landscaping", label: "Landscaping" },
                  { value: "handover", label: "Handover" },
                ].map((phase) => (
                  <Button
                    key={phase.value}
                    onClick={() => onRunProgressUpdate(phase.value)}
                    disabled={isGeneratingProgress}
                    variant="outline"
                    className="border-zinc-700 text-[13px] h-10 rounded-lg hover:border-zinc-600 hover:text-zinc-100"
                  >
                    {isGeneratingProgress ? <Loader2 size={14} className="animate-spin mr-2" /> : <HardHat size={14} className="mr-2" />}
                    {phase.label}
                  </Button>
                ))}
              </div>

              {progressResult ? (
                <>
                  {[
                    { key: "linkedinPost", label: "LinkedIn Post" },
                    { key: "buyerWhatsApp", label: "WhatsApp (Existing Buyers)" },
                    { key: "prospectWhatsApp", label: "WhatsApp (Prospects)" },
                    { key: "emailSection", label: "Email Newsletter Section" },
                    { key: "blogPost", label: "Website Blog Post" },
                    { key: "socialCaption", label: "Instagram / Facebook Caption" },
                    { key: "videoScript", label: "YouTube Video Script (60s)" },
                    { key: "smsText", label: "SMS" },
                  ].map(({ key, label }) => progressResult[key] && (
                    <SectionCard key={key}>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[13px] font-semibold text-zinc-200">{label}</h4>
                          <CopyBtn text={progressResult[key]} field={`progress-${key}`} />
                        </div>
                        <div className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30 text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{progressResult[key]}</div>
                      </CardContent>
                    </SectionCard>
                  ))}
                </>
              ) : (
                <EmptyState icon={HardHat} title="Generate construction progress updates" subtitle="LinkedIn, WhatsApp (buyers + prospects), email, blog, social, video script, SMS" />
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
        {/* -------- LOCALITY TAB (Locality + Neighborhood) -------- */}
        {/* ================================================================ */}
        <TabsContent value="locality" className="space-y-4">
          <Button onClick={onRunLocalitySearch} disabled={!city} className="w-full bg-zinc-100 text-zinc-900 hover:bg-white h-10 text-[13px] font-medium rounded-lg">
            <MapPin size={15} className="mr-2" />
            Discover Localities in {city || "your city"}
          </Button>

          {localityResult ? (
            <>
              {localityResult.marketInsight && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-2">Market Insight</h4>
                    <p className="text-[13px] text-zinc-400 leading-relaxed">{localityResult.marketInsight}</p>
                  </CardContent>
                </SectionCard>
              )}

              {localityResult.nearbyAreas?.length > 0 && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Nearby Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {localityResult.nearbyAreas.map((area: string, i: number) => (
                        <Badge key={i} variant="secondary" className="bg-zinc-800/60 text-zinc-300 text-[12px] rounded-lg border border-zinc-700/30 h-7 px-2.5">{area}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {localityResult.buyerProfiles?.length > 0 && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-4">Buyer Profiles</h4>
                    <div className="space-y-2.5">
                      {localityResult.buyerProfiles.map((profile: any, i: number) => (
                        <div key={i} className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                          <div className="text-[13px] font-medium text-zinc-200">{profile.type}</div>
                          <div className="text-[12px] text-zinc-500 mt-1">{profile.preferredConfig} &#8226; {profile.budgetRange}</div>
                          <div className="text-[12px] text-zinc-500 mt-0.5">{profile.searchBehavior}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {localityResult.suggestedKeywords?.length > 0 && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Suggested Keywords ({localityResult.suggestedKeywords.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {localityResult.suggestedKeywords.map((kw: string, i: number) => (
                        <Badge key={i} variant="outline" className="border-zinc-700/50 text-zinc-400 text-[12px] rounded-lg h-7 px-2.5">{kw}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {localityResult.competingProjects?.length > 0 && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Competing Projects</h4>
                    <div className="space-y-1.5">
                      {localityResult.competingProjects.map((proj: string, i: number) => (
                        <div key={i} className="text-[13px] text-zinc-400 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 flex-shrink-0" />
                          {proj}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}
            </>
          ) : (
            <EmptyState icon={MapPin} title="Discover localities, buyer profiles, and keywords" subtitle="Set your city first, then click the button above" />
          )}

          {/* --- Divider: Neighborhood section --- */}
          <div className="border-t border-zinc-800/40 pt-4 mt-4" />

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

          {/* ---- Locality Domination Pack ---- */}
          <div className="border-t border-zinc-800/40 pt-4 mt-4" />
          <SectionCard>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-[14px] font-semibold text-zinc-100 flex items-center gap-2">
                    Locality Domination Pack
                    <Badge className="text-[10px] bg-[#7CB342]/10 text-[#7CB342] border-0 rounded-md h-5 px-1.5">Premium</Badge>
                  </h4>
                  <p className="text-[12px] text-zinc-400 mt-1">Generate a complete content ecosystem — master guide, buyer pages, comparisons, 50+ FAQs — to dominate this locality in AI search.</p>
                </div>
              </div>
              <Button
                onClick={onRunLocalityDomination}
                disabled={isGeneratingDomination || !city}
                className="w-full bg-[#7CB342] text-zinc-900 hover:bg-[#8BC34A] active:scale-[0.99] h-10 text-[13px] font-medium rounded-lg transition-all"
              >
                {isGeneratingDomination ? <><Loader2 size={15} className="animate-spin mr-2" />Generating domination pack...</> : <><>{cost("locality_domination") > 0 && <span className="opacity-70 mr-1">{cost("locality_domination")}cr</span>}</>Dominate {city || "your locality"}</>}
              </Button>
            </CardContent>
          </SectionCard>

          {localityDominationResult && (
            <>
              {/* Stats bar */}
              <SectionCard>
                <CardContent className="p-4">
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="p-2 rounded-lg bg-zinc-800/40">
                      <div className="text-lg font-bold text-zinc-100 tabular-nums">{localityDominationResult.totalPages}</div>
                      <div className="text-[10px] text-zinc-500">Pages</div>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-800/40">
                      <div className="text-lg font-bold text-zinc-100 tabular-nums">{localityDominationResult.totalFaqs}</div>
                      <div className="text-[10px] text-zinc-500">FAQs</div>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-800/40">
                      <div className="text-lg font-bold text-zinc-100 tabular-nums">{(localityDominationResult.totalWords / 1000).toFixed(0)}k</div>
                      <div className="text-[10px] text-zinc-500">Words</div>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-800/40">
                      <div className="text-lg font-bold text-[#7CB342]">{localityDominationResult.seoImpactEstimate?.estimatedAIVisibilityLift || "40-60%"}</div>
                      <div className="text-[10px] text-zinc-500">Est. lift</div>
                    </div>
                  </div>
                </CardContent>
              </SectionCard>

              {/* Master Guide */}
              {localityDominationResult.masterGuide && (
                <SectionCard>
                  <CardContent className="p-5 group relative">
                    <h4 className="text-[14px] font-semibold text-zinc-100 mb-1">{localityDominationResult.masterGuide.title}</h4>
                    <p className="text-[11px] text-zinc-500 mb-3">{localityDominationResult.masterGuide.metaDescription}</p>
                    <div className="p-3.5 rounded-lg bg-zinc-800/40 border border-white/[0.04] text-[12px] text-zinc-300 leading-relaxed">
                      {localityDominationResult.masterGuide.heroAnswer?.slice(0, 300)}...
                    </div>
                    <CopyBtn text={`# ${localityDominationResult.masterGuide.title}\n\n${localityDominationResult.masterGuide.heroAnswer}\n\n${(localityDominationResult.masterGuide.sections || []).map((s: any) => `## ${s.heading}\n\n${s.content}`).join("\n\n")}`} field="dom-master" />
                    <div className="mt-3 text-[11px] text-zinc-500">{localityDominationResult.masterGuide.sections?.length || 0} sections • ~{localityDominationResult.masterGuide.wordCount || 2000} words</div>
                  </CardContent>
                </SectionCard>
              )}

              {/* Buyer Intent Pages */}
              {localityDominationResult.buyerIntentPages?.length > 0 && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Buyer Intent Pages ({localityDominationResult.buyerIntentPages.length})</h4>
                    <div className="space-y-2">
                      {localityDominationResult.buyerIntentPages.map((page: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-zinc-800/40 border border-white/[0.04] group relative">
                          <div className="text-[13px] text-zinc-200 font-medium">{page.title}</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">Target: "{page.targetQuery}"</div>
                          <div className="text-[12px] text-zinc-400 mt-1.5 leading-relaxed">{page.heroAnswer?.slice(0, 150)}...</div>
                          <CopyBtn text={`# ${page.title}\n\n${page.heroAnswer}\n\n${(page.sections || []).map((s: any) => `## ${s.heading}\n\n${s.content}`).join("\n\n")}`} field={`dom-buyer-${i}`} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {/* Comparison Pages */}
              {localityDominationResult.comparisonPages?.length > 0 && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Comparison Pages ({localityDominationResult.comparisonPages.length})</h4>
                    <div className="space-y-2">
                      {localityDominationResult.comparisonPages.map((page: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-zinc-800/40 border border-white/[0.04] group relative">
                          <div className="text-[13px] text-zinc-200 font-medium">{page.title}</div>
                          <div className="text-[12px] text-zinc-400 mt-1.5 leading-relaxed">{page.heroAnswer?.slice(0, 150)}...</div>
                          <CopyBtn text={`# ${page.title}\n\n${page.heroAnswer}\n\n${(page.sections || []).map((s: any) => `## ${s.heading}\n\n${s.content}`).join("\n\n")}`} field={`dom-comp-${i}`} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {/* FAQ Clusters */}
              {localityDominationResult.faqClusters?.length > 0 && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">FAQ Clusters ({localityDominationResult.totalFaqs} FAQs)</h4>
                    <div className="space-y-3">
                      {localityDominationResult.faqClusters.map((cluster: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-zinc-800/40 border border-white/[0.04] group relative">
                          <div className="text-[12px] font-semibold text-zinc-300 mb-2">{cluster.theme} ({cluster.faqs?.length || 0})</div>
                          <div className="space-y-1.5">
                            {(cluster.faqs || []).slice(0, 3).map((faq: any, j: number) => (
                              <div key={j}>
                                <div className="text-[12px] text-zinc-200 font-medium">{faq.question}</div>
                                <div className="text-[11px] text-zinc-500 mt-0.5">{faq.answer?.slice(0, 100)}...</div>
                              </div>
                            ))}
                            {(cluster.faqs?.length || 0) > 3 && (
                              <div className="text-[11px] text-zinc-600">+{cluster.faqs.length - 3} more</div>
                            )}
                          </div>
                          <CopyBtn text={cluster.faqs?.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n") || ""} field={`dom-faq-${i}`} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}
            </>
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
                {isGeneratingGbp ? <><Loader2 size={15} className="animate-spin mr-2" />Generating...</> : <><>{cost("gbp_posts") > 0 && <span className="text-zinc-500 mr-1">{cost("gbp_posts")}cr</span>}</>Generate 8 GBP Posts</>}
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
        {/* -------- ADS & PORTALS TAB (Ads + Portals) -------- */}
        {/* ================================================================ */}
        <TabsContent value="ads" className="space-y-4">
          {/* --- Ads section --- */}
          <div className="flex gap-2">
            <Button onClick={() => onRunAdsGenerator("both")} disabled={isGeneratingAds} className="flex-1 bg-zinc-100 text-zinc-900 hover:bg-white h-10 text-[13px] font-medium rounded-lg">
              {isGeneratingAds ? <><Loader2 size={15} className="animate-spin mr-2" />Generating...</> : <><Megaphone size={15} className="mr-2" />Google + Meta Ads</>}
            </Button>
            <Button onClick={() => onRunAdsGenerator("google")} disabled={isGeneratingAds} variant="outline" className="border-zinc-700 h-10 text-[13px] rounded-lg">Google Only</Button>
            <Button onClick={() => onRunAdsGenerator("meta")} disabled={isGeneratingAds} variant="outline" className="border-zinc-700 h-10 text-[13px] rounded-lg">Meta Only</Button>
          </div>

          {adsResult ? (
            <>
              {adsResult.googleAds && (
                <>
                  <SectionCard>
                    <CardContent className="p-5">
                      <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Google Ads — Headlines ({adsResult.googleAds.headlines?.length})</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {adsResult.googleAds.headlines?.map((h: string, i: number) => (
                          <Badge key={i} variant="secondary" className="bg-zinc-800/60 text-zinc-300 text-[12px] rounded-md border border-zinc-700/30 h-7 px-2.5">{h}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </SectionCard>
                  <SectionCard>
                    <CardContent className="p-5">
                      <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Google Ads — Descriptions</h4>
                      <div className="space-y-2">
                        {adsResult.googleAds.descriptions?.map((d: string, i: number) => (
                          <div key={i} className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30 text-[13px] text-zinc-300 flex justify-between gap-2">
                            <span>{d}</span><CopyBtn text={d} field={`gad-d-${i}`} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </SectionCard>
                  {adsResult.googleAds.sitelinks?.length > 0 && (
                    <SectionCard>
                      <CardContent className="p-5">
                        <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Sitelink Extensions</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {adsResult.googleAds.sitelinks.map((s: any, i: number) => (
                            <div key={i} className="p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                              <div className="text-[13px] text-zinc-400 font-medium">{typeof s === 'string' ? s : s.text || s.title}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </SectionCard>
                  )}
                </>
              )}

              {adsResult.metaAds?.length > 0 && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Meta / Facebook / Instagram Ads</h4>
                    <div className="space-y-3">
                      {adsResult.metaAds.map((ad: any, i: number) => (
                        <div key={i} className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30 space-y-2">
                          <div className="text-[13px] text-zinc-200 font-medium">{ad.headline}</div>
                          <div className="text-[12px] text-zinc-400">{ad.primaryText}</div>
                          {ad.audience && <div className="text-[11px] text-zinc-500">Audience: {typeof ad.audience === 'string' ? ad.audience : JSON.stringify(ad.audience)}</div>}
                          <div className="flex items-center gap-2">
                            {ad.cta && <Badge className="bg-zinc-800 text-zinc-300 border-0 text-[10px] h-5 rounded-md">{ad.cta}</Badge>}
                            {ad.format && <Badge variant="outline" className="border-zinc-700/50 text-zinc-500 text-[10px] rounded-md">{ad.format}</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {adsResult.negativeKeywords?.length > 0 && (
                <SectionCard>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[13px] font-semibold text-zinc-200">Negative Keywords</h4>
                      <CopyBtn text={adsResult.negativeKeywords.join("\n")} field="neg-kw" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {adsResult.negativeKeywords.map((kw: string, i: number) => (
                        <Badge key={i} variant="outline" className="border-red-500/20 text-red-400/70 text-[11px] rounded-md">{kw}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </SectionCard>
              )}

              {adsResult.budgetSplit && (
                <SectionCard>
                  <CardContent className="p-5">
                    <h4 className="text-[13px] font-semibold text-zinc-200 mb-3">Budget Allocation</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30 text-center">
                        <div className="text-xl font-bold text-zinc-200">{adsResult.budgetSplit.google}%</div>
                        <div className="text-[11px] text-zinc-500 mt-1">Google Ads</div>
                      </div>
                      <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30 text-center">
                        <div className="text-xl font-bold text-zinc-200">{adsResult.budgetSplit.meta}%</div>
                        <div className="text-[11px] text-zinc-500 mt-1">Meta Ads</div>
                      </div>
                    </div>
                    {adsResult.budgetSplit.reason && <p className="text-[12px] text-zinc-500 mt-2">{adsResult.budgetSplit.reason}</p>}
                  </CardContent>
                </SectionCard>
              )}
            </>
          ) : (
            <EmptyState icon={Megaphone} title="Generate Google & Meta ad copy" subtitle="Headlines, descriptions, sitelinks, audience targeting, negative keywords" />
          )}

          {/* --- Divider: Portal Optimizer section --- */}
          <div className="border-t border-zinc-800/40 pt-4 mt-4" />

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
              {Object.entries(portalResult.portals || {}).map(([key, portal]: [string, any]) => (
                <SectionCard key={key}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[13px] font-semibold text-zinc-200 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                      <CopyBtn text={`${portal.title}\n\n${portal.description}`} field={`portal-${key}`} />
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
              ))}

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
            <EmptyState icon={Building} title="Optimize your property portal listings" subtitle="99acres, MagicBricks, Housing.com, Google Business Profile" />
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
