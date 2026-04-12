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

interface Props {
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
}

function ScoreCircle({ score, label, size = "md" }: { score: number; label: string; size?: "sm" | "md" }) {
  const color =
    score >= 90 ? "text-emerald-400" :
    score >= 70 ? "text-yellow-400" :
    score >= 50 ? "text-orange-400" :
    "text-red-400";

  const bgColor =
    score >= 90 ? "stroke-emerald-400" :
    score >= 70 ? "stroke-yellow-400" :
    score >= 50 ? "stroke-orange-400" :
    "stroke-red-400";

  const r = size === "sm" ? 22 : 32;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width={r * 2 + 8} height={r * 2 + 8} className="-rotate-90">
          <circle
            cx={r + 4} cy={r + 4} r={r}
            fill="none" stroke="rgb(39 39 42 / 0.6)" strokeWidth="3"
          />
          <circle
            cx={r + 4} cy={r + 4} r={r}
            fill="none" className={bgColor} strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-bold ${size === "sm" ? "text-[13px]" : "text-base"} ${color}`}>
          {score}
        </span>
      </div>
      <span className="text-[11px] text-zinc-500 text-center font-medium">{label}</span>
    </div>
  );
}

function StatusIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass") return <CheckCircle2 size={15} className="text-emerald-400" />;
  if (status === "warn") return <AlertTriangle size={15} className="text-yellow-400" />;
  return <XCircle size={15} className="text-red-400" />;
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={`bg-zinc-900/60 border-zinc-800/50 rounded-xl ${className}`}>
      {children}
    </Card>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
      <div className="w-16 h-16 rounded-2xl bg-zinc-800/30 flex items-center justify-center mb-4">
        <Icon size={28} className="opacity-40" />
      </div>
      <p className="text-[13px] font-medium text-zinc-400">{title}</p>
      <p className="text-[12px] text-zinc-600 mt-1">{subtitle}</p>
    </div>
  );
}

export function AnalyticsPanel({
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
}: Props) {
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
      className="text-zinc-600 hover:text-zinc-300 transition-colors p-1 rounded"
      title="Copy"
    >
      {copiedField === field ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
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
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
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
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {p.name || `Project ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <Tabs defaultValue="health" className="space-y-5">
        <TabsList className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-0.5 h-auto">
          <TabsTrigger value="health" className="text-[13px] rounded-md px-3.5 py-1.5">Health</TabsTrigger>
          <TabsTrigger value="aigeo" className="text-[13px] rounded-md px-3.5 py-1.5">AI/GEO</TabsTrigger>
          <TabsTrigger value="links" className="text-[13px] rounded-md px-3.5 py-1.5">Links</TabsTrigger>
          <TabsTrigger value="content" className="text-[13px] rounded-md px-3.5 py-1.5">Content</TabsTrigger>
          <TabsTrigger value="locality" className="text-[13px] rounded-md px-3.5 py-1.5">Locality</TabsTrigger>
          <TabsTrigger value="ads" className="text-[13px] rounded-md px-3.5 py-1.5">Ads & Portals</TabsTrigger>
          <TabsTrigger value="report" className="text-[13px] rounded-md px-3.5 py-1.5">Report</TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* -------- HEALTH TAB (Health + Technical + Checks) -------- */}
        {/* ================================================================ */}
        <TabsContent value="health" className="space-y-4">
          {/* GSC Connect Prompt — like Okara */}
          <SectionCard>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Search size={16} className="text-blue-400" />
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
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
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
              className="bg-zinc-900/80 border-zinc-800 text-[13px] h-10 flex-1 placeholder:text-zinc-600"
            />
            <Button
              onClick={() => onRunAudit(auditUrl)}
              disabled={isAuditing || !auditUrl}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 h-10 w-10 p-0 rounded-lg"
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
                  <CardContent className="p-4">
                    <p className="text-[13px] text-zinc-500">PageSpeed data temporarily unavailable (API quota). Real estate checks and AI analysis still ran below.</p>
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
                      <div key={i} className="flex items-center justify-between py-1.5 text-[13px]">
                        <div className="flex items-center gap-2.5">
                          <StatusIcon status={check.status} />
                          <span className="text-zinc-300">{check.check}</span>
                        </div>
                        <span className={
                          check.status === "pass" ? "text-emerald-400 text-[12px]" :
                          check.status === "warn" ? "text-yellow-400 text-[12px]" :
                          "text-red-400 text-[12px]"
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
                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-0 rounded-md h-5 px-1.5">
                      CabbageSEO Exclusive
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {auditResult.realEstateChecks.map((check: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1.5 text-[13px]">
                      <div className="flex items-center gap-2.5">
                        {check.passed ? <CheckCircle2 size={15} className="text-emerald-400" /> : <XCircle size={15} className="text-red-400" />}
                        <span className="text-zinc-300">{check.label}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-zinc-700/50 text-zinc-500 rounded-md">
                        {check.category}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </SectionCard>
            </>
          ) : (
            <EmptyState icon={Globe} title="Enter a URL above to run your first SEO audit" subtitle="Performance, SEO health, technical, and industry-specific checks" />
          )}

          {/* --- Divider: Technical section --- */}
          <div className="border-t border-zinc-800/40 pt-4 mt-4" />

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
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, value)}%` }} />
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
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (count as number) * 5)}%` }} />
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
                      <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-zinc-500 font-mono">{tag.property}:</span>
                      <span className="text-zinc-400 truncate">{tag.content}</span>
                    </div>
                  ))}
                  {technicalResult.socialMediaTags.twitter.map((tag: any, i: number) => (
                    <div key={`tw-${i}`} className="flex items-start gap-2.5 py-0.5 text-[12px]">
                      <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
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
                        {file.exists ? <CheckCircle2 size={15} className="text-emerald-400" /> : <XCircle size={15} className="text-red-400" />}
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
                    <CardTitle className="text-[13px] font-semibold text-yellow-400">Resource Issues ({technicalResult.resourceIssues.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {technicalResult.resourceIssues.map((issue: any, i: number) => (
                      <div key={i} className="flex items-center gap-2.5 py-1.5 text-[13px]">
                        <AlertTriangle size={15} className={issue.severity === "error" ? "text-red-400" : "text-yellow-400"} />
                        <span className="text-zinc-300">{issue.issue}</span>
                      </div>
                    ))}
                  </CardContent>
                </SectionCard>
              )}
            </>
          ) : (
            !auditResult && (
              <p className="text-[12px] text-zinc-600 text-center py-4">Click the wrench button to run a technical SEO audit</p>
            )
          )}

          {/* --- Divider: Checks section --- */}
          <div className="border-t border-zinc-800/40 pt-4 mt-4" />

          {auditResult ? (
            <>
              <SectionCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-semibold">
                    Passed ({auditResult.seoHealth.filter((c: any) => c.status === "pass").length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {auditResult.seoHealth
                    .filter((c: any) => c.status === "pass")
                    .map((check: any, i: number) => (
                      <div key={i} className="flex items-center gap-2.5 py-1.5 text-[13px]">
                        <CheckCircle2 size={15} className="text-emerald-400" />
                        <span className="text-zinc-300">{check.check}</span>
                        <span className="text-zinc-600 text-[12px] ml-auto">{check.value}</span>
                      </div>
                    ))}
                </CardContent>
              </SectionCard>

              {auditResult.seoHealth.some((c: any) => c.status !== "pass") && (
                <SectionCard>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[13px] font-semibold text-yellow-400">
                      Issues ({auditResult.seoHealth.filter((c: any) => c.status !== "pass").length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {auditResult.seoHealth
                      .filter((c: any) => c.status !== "pass")
                      .map((check: any, i: number) => (
                        <div key={i} className="flex items-center gap-2.5 py-1.5 text-[13px]">
                          <StatusIcon status={check.status} />
                          <span className="text-zinc-300">{check.check}</span>
                          <span className="text-red-400 text-[12px] ml-auto">{check.value}</span>
                        </div>
                      ))}
                  </CardContent>
                </SectionCard>
              )}
            </>
          ) : (
            <p className="text-[12px] text-zinc-600 text-center py-4">Run an audit to see pass/fail checks</p>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* -------- AI/GEO TAB -------- */}
        {/* ================================================================ */}
        <TabsContent value="aigeo" className="space-y-4">
          <Button
            onClick={onRunAIVisibility}
            disabled={isCheckingAI}
            className="w-full bg-violet-600 hover:bg-violet-500 h-10 text-[13px] font-medium rounded-lg"
          >
            {isCheckingAI ? (
              <><Loader2 size={15} className="animate-spin mr-2" />Querying AI models...</>
            ) : (
              <><Bot size={15} className="mr-2" />Check AI Visibility (GEO)</>
            )}
          </Button>

          {aiVisResult ? (
            <>
              <PromptVolumes aiVisResult={aiVisResult} companyName={companyName} city={city} />

              <SectionCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-semibold">AI Readiness Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <ScoreCircle score={aiVisResult.scores.readiness ?? aiVisResult.scores.overall} label="Readiness" size="md" />
                    <div className="space-y-1.5">
                      <div className="text-[13px] text-zinc-400">
                        {aiVisResult.aiReadiness.filter((c: any) => c.passed).length}/{aiVisResult.aiReadiness.length} checks passed
                      </div>
                      {aiVisResult.scores.mentions !== undefined && (
                        <div className="text-[12px] text-zinc-500">
                          Mention score: <span className={aiVisResult.scores.mentions > 0 ? "text-emerald-400" : "text-red-400"}>{aiVisResult.scores.mentions}%</span>
                          {" "}across {aiVisResult.configuredLLMs?.length || 1} AI platform{(aiVisResult.configuredLLMs?.length || 1) > 1 ? "s" : ""}
                        </div>
                      )}
                      {aiVisResult.configuredLLMs && aiVisResult.configuredLLMs.length < 4 && (
                        <div className="text-[11px] text-yellow-500/70">
                          Only testing: {aiVisResult.configuredLLMs.join(", ")}. Add more API keys in Vercel for broader coverage.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </SectionCard>

              <SectionCard>
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] font-semibold">Visibility by AI Platform</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3.5">
                    {[
                      { name: "ChatGPT", score: aiVisResult.scores.chatgpt, key: "ChatGPT" },
                      { name: "Claude", score: aiVisResult.scores.claude, key: "Claude" },
                      { name: "Perplexity", score: aiVisResult.scores.perplexity, key: "Perplexity" },
                      { name: "Gemini", score: aiVisResult.scores.gemini, key: "Gemini" },
                    ].map(({ name, score, key }) => {
                      const configured = !aiVisResult.configuredLLMs || aiVisResult.configuredLLMs.includes(key);
                      return (
                        <div key={name} className="flex items-center justify-between">
                          <span className={`text-[13px] w-20 ${configured ? "text-zinc-300" : "text-zinc-600"}`}>{name}</span>
                          <div className="flex items-center gap-3 flex-1 ml-4">
                            <div className="flex-1 h-2 bg-zinc-800/60 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${configured ? "bg-violet-500" : "bg-zinc-700"}`} style={{ width: configured ? `${score}%` : "0%" }} />
                            </div>
                            <span className="text-[13px] font-mono text-zinc-400 w-16 text-right">
                              {configured ? score : <span className="text-[11px] text-zinc-600">no key</span>}
                            </span>
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
                  {aiVisResult.aiReadiness.map((check: any, i: number) => (
                    <div key={i} className="flex items-center gap-2.5 py-1.5 text-[13px]">
                      {check.passed ? <CheckCircle2 size={15} className="text-emerald-400" /> : <XCircle size={15} className="text-red-400" />}
                      <span className="text-zinc-300">{check.check}</span>
                    </div>
                  ))}
                </CardContent>
              </SectionCard>

              {/* ---- IMPROVE YOUR SCORE ---- */}
              <div className="border-t border-zinc-800/40 pt-4 mt-4" />

              <div className="flex gap-3">
                <Button
                  onClick={onRunLlmsTxt}
                  disabled={isGeneratingLlmsTxt}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 h-10 text-[13px] font-medium rounded-lg"
                >
                  {isGeneratingLlmsTxt ? <><Loader2 size={15} className="animate-spin mr-2" />Generating...</> : "Generate llms.txt"}
                </Button>
                <Button
                  onClick={onRunGeoImprovement}
                  disabled={isGeneratingGeoImprovement}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 h-10 text-[13px] font-medium rounded-lg"
                >
                  {isGeneratingGeoImprovement ? <><Loader2 size={15} className="animate-spin mr-2" />Planning...</> : "Get Improvement Plan"}
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
                      <pre className="text-[11px] text-emerald-400 whitespace-pre-wrap font-mono">{llmsTxtResult.llmsTxt}</pre>
                    </div>
                    {llmsTxtResult.instructions?.length > 0 && (
                      <div className="space-y-1.5">
                        <h5 className="text-[12px] font-medium text-zinc-400">How to install:</h5>
                        {llmsTxtResult.instructions.map((step: string, i: number) => (
                          <div key={i} className="text-[12px] text-zinc-500 flex items-start gap-2">
                            <span className="text-emerald-400 font-bold flex-shrink-0">{i + 1}.</span> {step}
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

              {/* GEO Improvement Plan */}
              {geoImprovementResult && (
                <>
                  <SectionCard>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[15px] font-semibold text-zinc-100">GEO Improvement Plan</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-red-400 font-bold">{geoImprovementResult.currentScore}%</span>
                          <span className="text-zinc-600">→</span>
                          <span className="text-[13px] text-emerald-400 font-bold">{geoImprovementResult.targetScore}%</span>
                        </div>
                      </div>
                      <p className="text-[12px] text-zinc-500 mb-4">Timeline: {geoImprovementResult.expectedTimeline}</p>

                      {geoImprovementResult.quickWins?.length > 0 && (
                        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-3.5 mb-4">
                          <h5 className="text-[12px] font-semibold text-emerald-400 mb-2">Quick Wins (do these today)</h5>
                          {geoImprovementResult.quickWins.map((win: string, i: number) => (
                            <div key={i} className="text-[12px] text-zinc-300 flex items-start gap-2 py-0.5">
                              <span className="text-emerald-400 flex-shrink-0">&#8226;</span> {win}
                            </div>
                          ))}
                        </div>
                      )}

                      {geoImprovementResult.weeks?.map((week: any, wi: number) => (
                        <div key={wi} className="mb-4">
                          <h5 className="text-[13px] font-semibold text-zinc-200 mb-2">
                            Week {week.week}: {week.theme}
                          </h5>
                          <div className="space-y-2">
                            {week.actions?.map((action: any, ai: number) => (
                              <div key={ai} className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="text-[13px] text-zinc-200">{action.action}</div>
                                    <div className="text-[11px] text-zinc-500 mt-0.5">{action.why}</div>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <Badge variant="outline" className={`text-[9px] rounded-md h-4 ${
                                      action.priority === "must-do" ? "border-red-500/30 text-red-400" :
                                      action.priority === "should-do" ? "border-yellow-500/30 text-yellow-400" :
                                      "border-zinc-700 text-zinc-500"
                                    }`}>{action.priority}</Badge>
                                    {action.timeEstimate && <span className="text-[10px] text-zinc-600">{action.timeEstimate}</span>}
                                  </div>
                                </div>
                                {action.cabbageFeature && (
                                  <div className="mt-1.5 text-[10px] text-violet-400">Use: {action.cabbageFeature}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
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
            className="w-full bg-blue-600 hover:bg-blue-500 h-10 text-[13px] font-medium rounded-lg"
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
                      backlinkResult.dataSource === "moz_api" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"
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
                            ref.type === "dofollow" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"
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
                      <div key={i} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] rounded-md h-5 ${
                            rec.priority === "high" ? "border-orange-500/30 text-orange-400 bg-orange-500/5" :
                            rec.priority === "medium" ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/5" :
                            "border-zinc-700/50 text-zinc-500"
                          }`}>{rec.priority}</Badge>
                          <span className="text-[13px] text-zinc-300 font-medium">{rec.title}</span>
                        </div>
                        <p className="text-[12px] text-zinc-500 pl-[52px] leading-relaxed">{rec.description}</p>
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
        {/* -------- CONTENT TAB (Content + Articles + Campaigns + Partners + Landing + Progress + Schema) -------- */}
        {/* ================================================================ */}
        <TabsContent value="content" className="space-y-4">

          {/* --- Section 1: Content Topics --- */}
          <button
            onClick={() => setContentSection(contentSection === "topics" ? null : "topics")}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-900/60 border border-zinc-800/50 text-left hover:border-zinc-700 transition-all"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-zinc-200">
              <FileText size={15} className="text-emerald-400" /> Content Topics
            </span>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${contentSection === "topics" ? "rotate-180" : ""}`} />
          </button>
          {contentSection === "topics" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={onRunContent} disabled={isGeneratingContent} className="flex-1 bg-emerald-600 hover:bg-emerald-500 h-10 text-[13px] font-medium rounded-lg">
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
                              <div className="text-[13px] text-zinc-200 font-medium">{topic.title}</div>
                              <div className="text-[11px] text-emerald-400 font-medium">Keyword: {topic.targetKeyword}</div>
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
                            <div key={i} className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30 text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{post}</div>
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
                            <div key={i} className="p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30 text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{msg}</div>
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
                              <div className="text-[11px] text-emerald-400 font-medium mt-0.5">{page.targetKeyword}</div>
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
                              <div className="text-[12px] font-semibold text-emerald-400">Week {week.week}</div>
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
              <PenTool size={15} className="text-emerald-400" /> Full Articles
            </span>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${contentSection === "articles" ? "rotate-180" : ""}`} />
          </button>
          {contentSection === "articles" && (
            <div className="space-y-4">
              <SectionCard>
                <CardContent className="p-5 space-y-4">
                  <h4 className="text-[13px] font-semibold text-zinc-200 flex items-center gap-2">
                    <PenTool size={15} className="text-emerald-400" />
                    Full Article Writer
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Article topic or title..."
                      value={articleTopic}
                      onChange={(e) => setArticleTopic(e.target.value)}
                      className="bg-zinc-900/80 border-zinc-800 text-[13px] h-10 placeholder:text-zinc-600"
                    />
                    <Input
                      placeholder="Target keyword..."
                      value={articleKeyword}
                      onChange={(e) => setArticleKeyword(e.target.value)}
                      className="bg-zinc-900/80 border-zinc-800 text-[13px] h-10 placeholder:text-zinc-600"
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
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
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
                    className="w-full bg-emerald-600 hover:bg-emerald-500 h-10 text-[13px] font-medium rounded-lg"
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
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-[10px] h-5 rounded-md">{articleResult.wordCount} words</Badge>
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
              <PartyPopper size={15} className="text-orange-400" /> Festive Campaigns
            </span>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${contentSection === "campaigns" ? "rotate-180" : ""}`} />
          </button>
          {contentSection === "campaigns" && (
            <div className="space-y-4">
              <Button
                onClick={() => onRunFestiveCampaign()}
                disabled={isGeneratingCampaign}
                className="w-full bg-orange-600 hover:bg-orange-500 h-10 text-[13px] font-medium rounded-lg"
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
                    className="text-[12px] px-3 py-1.5 rounded-lg border bg-zinc-900/50 border-zinc-800/50 text-zinc-500 hover:text-orange-400 hover:border-orange-500/20 transition-all disabled:opacity-40"
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
                        <Badge className="bg-orange-500/10 text-orange-400 border-0 text-[11px] h-5 rounded-md">{festiveCampaignResult.festival}</Badge>
                      </div>
                      <h4 className="text-[15px] font-semibold text-zinc-100">{festiveCampaignResult.campaignTheme}</h4>
                      <p className="text-[13px] text-orange-400 mt-1 italic">&ldquo;{festiveCampaignResult.tagline}&rdquo;</p>
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
                                  <span className="text-emerald-400 mt-0.5">&#8226;</span> {b}
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
              <Users size={15} className="text-blue-400" /> Channel Partners
            </span>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${contentSection === "partners" ? "rotate-180" : ""}`} />
          </button>
          {contentSection === "partners" && (
            <div className="space-y-4">
              <Button
                onClick={onRunChannelPartner}
                disabled={isGeneratingPartner}
                className="w-full bg-blue-600 hover:bg-blue-500 h-10 text-[13px] font-medium rounded-lg"
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
                              <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#8226;</span> {point}
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
              <Layout size={15} className="text-violet-400" /> Landing Pages
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
                    className="border-zinc-700 text-[13px] h-10 rounded-lg hover:border-emerald-500/30 hover:text-emerald-400"
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
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-[10px] h-5 rounded-md mb-2">{landingPageResult.pageType}</Badge>
                        <h4 className="text-[15px] font-semibold text-zinc-100">{landingPageResult.title}</h4>
                        <p className="text-[12px] text-zinc-500 mt-1">{landingPageResult.metaDescription}</p>
                      </div>
                      <CopyBtn text={landingPageResult.html} field="landing-html" />
                    </div>
                    <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-4 max-h-[500px] overflow-y-auto">
                      <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap font-mono">{landingPageResult.html?.substring(0, 3000)}...</pre>
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-2">Copy the full HTML and host it on your domain or use with a landing page builder.</p>
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
              <HardHat size={15} className="text-yellow-400" /> Construction Updates
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
                    className="border-zinc-700 text-[13px] h-10 rounded-lg hover:border-emerald-500/30 hover:text-emerald-400"
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
              <Code size={15} className="text-violet-400" /> Property Schema
            </span>
            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${contentSection === "schema" ? "rotate-180" : ""}`} />
          </button>
          {contentSection === "schema" && (
            <div className="space-y-4">
              <Button
                onClick={onRunSchemaGenerator}
                disabled={isGeneratingSchema}
                className="w-full bg-violet-600 hover:bg-violet-500 h-10 text-[13px] font-medium rounded-lg"
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
                        <pre className="text-[11px] text-emerald-400 whitespace-pre-wrap font-mono">{schemaResult.htmlSnippet}</pre>
                      </div>
                    </CardContent>
                  </SectionCard>

                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(schemaResult.schemas || {}).map(([key, schema]) => (
                      <SectionCard key={key}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className="bg-violet-500/10 text-violet-400 border-0 text-[10px] h-5 rounded-md">{key}</Badge>
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
          <Button onClick={onRunLocalitySearch} disabled={!city} className="w-full bg-violet-600 hover:bg-violet-500 h-10 text-[13px] font-medium rounded-lg">
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
            className="w-full bg-emerald-600 hover:bg-emerald-500 h-10 text-[13px] font-medium rounded-lg"
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
                    <div className="text-3xl font-bold text-emerald-400">{neighborhoodResult.walkScore}</div>
                    <div className="text-[11px] text-zinc-500 mt-1 font-medium">Walk Score</div>
                  </CardContent>
                </SectionCard>
                <SectionCard>
                  <CardContent className="p-5 text-center">
                    <div className="text-3xl font-bold text-blue-400">{neighborhoodResult.connectivityScore}</div>
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
                          <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#8226;</span> {point}
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
        </TabsContent>

        {/* ================================================================ */}
        {/* -------- ADS & PORTALS TAB (Ads + Portals) -------- */}
        {/* ================================================================ */}
        <TabsContent value="ads" className="space-y-4">
          {/* --- Ads section --- */}
          <div className="flex gap-2">
            <Button onClick={() => onRunAdsGenerator("both")} disabled={isGeneratingAds} className="flex-1 bg-violet-600 hover:bg-violet-500 h-10 text-[13px] font-medium rounded-lg">
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
                              <div className="text-[13px] text-blue-400 font-medium">{typeof s === 'string' ? s : s.text || s.title}</div>
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
                          {ad.audience && <div className="text-[11px] text-zinc-600">Audience: {typeof ad.audience === 'string' ? ad.audience : JSON.stringify(ad.audience)}</div>}
                          <div className="flex items-center gap-2">
                            {ad.cta && <Badge className="bg-blue-500/10 text-blue-400 border-0 text-[10px] h-5 rounded-md">{ad.cta}</Badge>}
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
            className="w-full bg-blue-600 hover:bg-blue-500 h-10 text-[13px] font-medium rounded-lg"
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
                          <span className="text-emerald-400 font-bold mt-0.5 flex-shrink-0">{i + 1}.</span> {rec}
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
                          {kpi.trend && <div className={`text-[10px] mt-0.5 ${kpi.trend === 'up' ? 'text-emerald-400' : kpi.trend === 'down' ? 'text-red-400' : 'text-zinc-600'}`}>{kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→'} {kpi.target && `Target: ${kpi.target}`}</div>}
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
                        <div className="text-lg font-bold text-emerald-400">{reportResult.costSavings.cabbageCost}</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">CabbageSEO</div>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="text-lg font-bold text-emerald-400">{reportResult.costSavings.savings}</div>
                        <div className="text-[11px] text-emerald-400/70 mt-0.5">You Save</div>
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
      </Tabs>
    </div>
  );
}
