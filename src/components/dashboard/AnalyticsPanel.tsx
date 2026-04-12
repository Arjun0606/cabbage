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
}: Props) {
  const [auditUrl, setAuditUrl] = useState(websiteUrl || "");
  useEffect(() => { if (websiteUrl && !auditUrl) setAuditUrl(websiteUrl); }, [websiteUrl]);

  return (
    <div className="p-5">
      <Tabs defaultValue="health" className="space-y-5">
        <TabsList className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-0.5 h-auto">
          <TabsTrigger value="health" className="text-[13px] rounded-md px-3 py-1.5">Health</TabsTrigger>
          <TabsTrigger value="links" className="text-[13px] rounded-md px-3 py-1.5">Links</TabsTrigger>
          <TabsTrigger value="technical" className="text-[13px] rounded-md px-3 py-1.5">Technical</TabsTrigger>
          <TabsTrigger value="aigeo" className="text-[13px] rounded-md px-3 py-1.5">AI/GEO</TabsTrigger>
          <TabsTrigger value="checks" className="text-[13px] rounded-md px-3 py-1.5">Checks</TabsTrigger>
          <TabsTrigger value="content" className="text-[13px] rounded-md px-3 py-1.5">Content</TabsTrigger>
          <TabsTrigger value="locality" className="text-[13px] rounded-md px-3 py-1.5">Locality</TabsTrigger>
        </TabsList>

        {/* -------- HEALTH TAB -------- */}
        <TabsContent value="health" className="space-y-4">
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

          {/* Audit Input */}
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
          </div>

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
        </TabsContent>

        {/* -------- AI/GEO TAB -------- */}
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
                  <div className="flex items-center gap-4">
                    <ScoreCircle score={aiVisResult.scores.overall} label="Overall" size="md" />
                    <div className="text-[13px] text-zinc-500">
                      {aiVisResult.aiReadiness.filter((c: any) => c.passed).length}/{aiVisResult.aiReadiness.length} checks passed
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
                      { name: "ChatGPT", score: aiVisResult.scores.chatgpt },
                      { name: "Claude", score: aiVisResult.scores.claude },
                      { name: "Perplexity", score: aiVisResult.scores.perplexity },
                      { name: "Gemini", score: aiVisResult.scores.gemini },
                    ].map(({ name, score }) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-[13px] text-zinc-300 w-20">{name}</span>
                        <div className="flex items-center gap-3 flex-1 ml-4">
                          <div className="flex-1 h-2 bg-zinc-800/60 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${score}%` }} />
                          </div>
                          <span className="text-[13px] font-mono text-zinc-400 w-8 text-right">{score}</span>
                        </div>
                      </div>
                    ))}
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
            </>
          ) : (
            <EmptyState icon={Bot} title="Check how your brand appears in AI answers" subtitle="Set your company name first, then click the button above" />
          )}
        </TabsContent>

        {/* -------- LINKS TAB -------- */}
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

        {/* -------- TECHNICAL TAB -------- */}
        <TabsContent value="technical" className="space-y-4">
          <Button
            onClick={() => onRunTechnical(auditUrl || websiteUrl)}
            disabled={isCheckingTechnical || (!auditUrl && !websiteUrl)}
            className="w-full bg-zinc-700 hover:bg-zinc-600 h-10 text-[13px] font-medium rounded-lg"
          >
            {isCheckingTechnical ? (
              <><Loader2 size={15} className="animate-spin mr-2" />Running technical audit...</>
            ) : (
              <><Wrench size={15} className="mr-2" />Run Technical SEO Audit</>
            )}
          </Button>

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
            <EmptyState icon={Wrench} title="Run a technical SEO audit" subtitle="Server timing, render blocking, heading structure, social tags, site files" />
          )}
        </TabsContent>

        {/* -------- CHECKS TAB -------- */}
        <TabsContent value="checks" className="space-y-4">
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
            <EmptyState icon={Search} title="Run an audit first to see all checks" subtitle="SEO health checks organized by pass/fail status" />
          )}
        </TabsContent>

        {/* -------- CONTENT TAB -------- */}
        <TabsContent value="content" className="space-y-4">
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
        </TabsContent>

        {/* -------- LOCALITY TAB -------- */}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
