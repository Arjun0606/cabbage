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
import { useState } from "react";
import { PromptVolumes } from "./PromptVolumes";

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

  const r = size === "sm" ? 20 : 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg width={r * 2 + 8} height={r * 2 + 8} className="-rotate-90">
          <circle
            cx={r + 4} cy={r + 4} r={r}
            fill="none" stroke="rgb(39 39 42)" strokeWidth="3"
          />
          <circle
            cx={r + 4} cy={r + 4} r={r}
            fill="none" className={bgColor} strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-bold ${size === "sm" ? "text-xs" : "text-sm"} ${color}`}>
          {score}
        </span>
      </div>
      <span className="text-[10px] text-zinc-500 text-center">{label}</span>
    </div>
  );
}

function StatusIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass") return <CheckCircle2 size={14} className="text-emerald-400" />;
  if (status === "warn") return <AlertTriangle size={14} className="text-yellow-400" />;
  return <XCircle size={14} className="text-red-400" />;
}

export function AnalyticsPanel({
  auditResult,
  aiVisResult,
  backlinkResult,
  technicalResult,
  isAuditing,
  isCheckingAI,
  isCheckingBacklinks,
  isCheckingTechnical,
  onRunAudit,
  onRunAIVisibility,
  onRunBacklinks,
  onRunTechnical,
  websiteUrl,
  allSites,
  companyName,
  city,
  contentResult,
  contentPlanResult,
  localityResult,
  isGeneratingContent,
  onRunContent,
  onRunContentPlan,
  onRunLocalitySearch,
}: Props) {
  const [auditUrl, setAuditUrl] = useState(websiteUrl || "");

  return (
    <div className="bg-zinc-950 overflow-y-auto">
      <div className="p-4">
        <Tabs defaultValue="health" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="health" className="text-xs">Health</TabsTrigger>
            <TabsTrigger value="links" className="text-xs">Links</TabsTrigger>
            <TabsTrigger value="technical" className="text-xs">Technical</TabsTrigger>
            <TabsTrigger value="aigeo" className="text-xs">AI/GEO</TabsTrigger>
            <TabsTrigger value="checks" className="text-xs">Checks</TabsTrigger>
            <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
            <TabsTrigger value="locality" className="text-xs">Locality</TabsTrigger>
          </TabsList>

          {/* -------- HEALTH TAB -------- */}
          <TabsContent value="health" className="space-y-4">
            {/* Site selector — quick pick from added sites */}
            {allSites.length > 1 && (
              <div className="flex gap-1.5 flex-wrap">
                {allSites.map((site, i) => (
                  <button
                    key={i}
                    onClick={() => setAuditUrl(site.url)}
                    className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                      auditUrl === site.url
                        ? "bg-emerald-900/50 border-emerald-700 text-emerald-400"
                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
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
                className="bg-zinc-800 border-zinc-700 text-sm flex-1"
              />
              <Button
                onClick={() => onRunAudit(auditUrl)}
                disabled={isAuditing || !auditUrl}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isAuditing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Search size={14} />
                )}
              </Button>
            </div>

            {auditResult ? (
              <>
                {/* Performance Scores — only show if PageSpeed data available */}
                {auditResult.scores.pageSpeedAvailable !== false && auditResult.scores.performanceMobile > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Mobile Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-around">
                        <ScoreCircle score={auditResult.scores.performanceMobile} label="Performance" />
                        <ScoreCircle score={auditResult.scores.accessibility} label="Accessibility" />
                        <ScoreCircle score={auditResult.scores.bestPractices} label="Best Practices" />
                        <ScoreCircle score={auditResult.scores.seo} label="SEO" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {auditResult.scores.pageSpeedAvailable === false && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <p className="text-xs text-zinc-500">PageSpeed data temporarily unavailable (API quota). Real estate checks and AI analysis still ran below.</p>
                    </CardContent>
                  </Card>
                )}

                {/* Core Web Vitals — only if we have real data */}
                {auditResult.coreWebVitals.lcp > 0 && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Core Web Vitals</CardTitle>
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
                          <div className="text-xs text-zinc-500 mb-1">{label}</div>
                          <div className="text-lg font-bold text-zinc-100">{value}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                )}

                {/* SEO Health — only if PageSpeed ran */}
                {auditResult.seoHealth?.length > 0 && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">SEO Health</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {auditResult.seoHealth.map((check: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1 text-sm">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={check.status} />
                          <span className="text-zinc-300">{check.check}</span>
                        </div>
                        <span className={
                          check.status === "pass" ? "text-emerald-400 text-xs" :
                          check.status === "warn" ? "text-yellow-400 text-xs" :
                          "text-red-400 text-xs"
                        }>
                          {check.value}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                )}

                {/* Real Estate Checks */}
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span>Real Estate Checks</span>
                      <Badge variant="secondary" className="text-[10px] bg-emerald-900/50 text-emerald-400">
                        CabbageSEO Exclusive
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {auditResult.realEstateChecks.map((check: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1 text-sm">
                        <div className="flex items-center gap-2">
                          {check.passed ? (
                            <CheckCircle2 size={14} className="text-emerald-400" />
                          ) : (
                            <XCircle size={14} className="text-red-400" />
                          )}
                          <span className="text-zinc-300">{check.label}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500">
                          {check.category}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                <Globe size={48} className="mb-4 opacity-30" />
                <p className="text-sm">Enter a URL above to run your first SEO audit</p>
                <p className="text-xs text-zinc-600 mt-1">We'll check performance, SEO health, and real-estate-specific factors</p>
              </div>
            )}
          </TabsContent>

          {/* -------- AI/GEO TAB -------- */}
          <TabsContent value="aigeo" className="space-y-4">
            <Button
              onClick={onRunAIVisibility}
              disabled={isCheckingAI}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {isCheckingAI ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Querying AI models...
                </>
              ) : (
                <>
                  <Bot size={14} className="mr-2" />
                  Check AI Visibility (GEO)
                </>
              )}
            </Button>

            {aiVisResult ? (
              <>
                {/* Prompt Volumes — Profound-inspired demand framing */}
                <PromptVolumes aiVisResult={aiVisResult} companyName={companyName} city={city} />

                {/* AI Readiness Score */}
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">AI Readiness Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <ScoreCircle score={aiVisResult.scores.overall} label="Overall" size="md" />
                      <div className="text-xs text-zinc-500">
                        {aiVisResult.aiReadiness.filter((c: any) => c.passed).length}/{aiVisResult.aiReadiness.length} checks passed
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Per-LLM Scores */}
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Visibility by AI Platform</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { name: "ChatGPT", score: aiVisResult.scores.chatgpt },
                        { name: "Claude", score: aiVisResult.scores.claude },
                        { name: "Perplexity", score: aiVisResult.scores.perplexity },
                        { name: "Gemini", score: aiVisResult.scores.gemini },
                      ].map(({ name, score }) => (
                        <div key={name} className="flex items-center justify-between">
                          <span className="text-sm text-zinc-300">{name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-violet-500 rounded-full transition-all"
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <span className="text-sm font-mono text-zinc-400 w-8 text-right">{score}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* AI/GEO Checklist */}
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">AI/GEO Checklist</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {aiVisResult.aiReadiness.map((check: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1 text-sm">
                        <div className="flex items-center gap-2">
                          {check.passed ? (
                            <CheckCircle2 size={14} className="text-emerald-400" />
                          ) : (
                            <XCircle size={14} className="text-red-400" />
                          )}
                          <span className="text-zinc-300">{check.check}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                <Bot size={48} className="mb-4 opacity-30" />
                <p className="text-sm">Check how your brand appears in AI answers</p>
                <p className="text-xs text-zinc-600 mt-1">Set your company name first, then click the button above</p>
              </div>
            )}
          </TabsContent>

          {/* -------- LINKS TAB -------- */}
          <TabsContent value="links" className="space-y-4">
            <Button
              onClick={() => onRunBacklinks(auditUrl || websiteUrl)}
              disabled={isCheckingBacklinks || (!auditUrl && !websiteUrl)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isCheckingBacklinks ? (
                <><Loader2 size={14} className="animate-spin mr-2" />Analyzing backlinks...</>
              ) : (
                <><Link2 size={14} className="mr-2" />Analyze Backlink Profile</>
              )}
            </Button>

            {backlinkResult ? (
              <>
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Backlink Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-zinc-100">{backlinkResult.domainAuthority}</div>
                        <div className="text-[10px] text-zinc-500">Domain Authority</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-zinc-100">{backlinkResult.referringDomains?.toLocaleString()}</div>
                        <div className="text-[10px] text-zinc-500">Referring Domains</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-zinc-100">{backlinkResult.totalBacklinks?.toLocaleString()}</div>
                        <div className="text-[10px] text-zinc-500">Total Backlinks</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {backlinkResult.topReferrers?.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Top Referring Domains</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {backlinkResult.topReferrers.map((ref: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-1 text-sm">
                          <span className="text-zinc-300">{ref.domain}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] border-zinc-700">
                              DA {ref.authority}
                            </Badge>
                            <Badge variant="secondary" className={`text-[10px] ${ref.type === 'dofollow' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                              {ref.type}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {backlinkResult.recommendations?.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Link Building Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {backlinkResult.recommendations.map((rec: any, i: number) => (
                        <div key={i} className="text-sm space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] ${
                              rec.priority === 'high' ? 'border-orange-800 text-orange-400' :
                              rec.priority === 'medium' ? 'border-yellow-800 text-yellow-400' :
                              'border-zinc-700 text-zinc-500'
                            }`}>{rec.priority}</Badge>
                            <span className="text-zinc-300 text-xs font-medium">{rec.title}</span>
                          </div>
                          <p className="text-xs text-zinc-500 pl-4">{rec.description}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                <Link2 size={48} className="mb-4 opacity-30" />
                <p className="text-sm">Analyze your backlink profile</p>
                <p className="text-xs text-zinc-600 mt-1">Domain authority, referring domains, and link building opportunities</p>
              </div>
            )}
          </TabsContent>

          {/* -------- TECHNICAL TAB -------- */}
          <TabsContent value="technical" className="space-y-4">
            <Button
              onClick={() => onRunTechnical(auditUrl || websiteUrl)}
              disabled={isCheckingTechnical || (!auditUrl && !websiteUrl)}
              className="w-full bg-zinc-700 hover:bg-zinc-600"
            >
              {isCheckingTechnical ? (
                <><Loader2 size={14} className="animate-spin mr-2" />Running technical audit...</>
              ) : (
                <><Wrench size={14} className="mr-2" />Run Technical SEO Audit</>
              )}
            </Button>

            {technicalResult ? (
              <>
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">On-Page Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <ScoreCircle score={technicalResult.onPageScore} label="On-Page" />
                      <div className="text-xs text-zinc-500 space-y-1">
                        <p>Server: {technicalResult.server.host}</p>
                        <p>Encoding: {technicalResult.server.encoding}</p>
                        <p>Page Size: {technicalResult.server.pageSize}</p>
                        <p>Status: {technicalResult.server.status}</p>
                        <p>Cacheable: {technicalResult.server.cacheable ? "Yes" : "No"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Server Timing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {[
                        { label: "TTFB", value: `${technicalResult.serverTiming.ttfb}ms` },
                        { label: "DOM Complete", value: `${technicalResult.serverTiming.domComplete}ms` },
                        { label: "Download", value: `${technicalResult.serverTiming.download}ms` },
                        { label: "Connection", value: `${technicalResult.serverTiming.connection}ms` },
                        { label: "TLS", value: `${technicalResult.serverTiming.tlsHandshake}ms` },
                        { label: "Total", value: `${technicalResult.serverTiming.timeToInteractive}ms` },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div className="text-xs text-zinc-500">{label}</div>
                          <div className="text-sm font-bold text-zinc-200">{value}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Render Blocking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-zinc-200">{technicalResult.renderBlocking.scripts}</div>
                        <div className="text-[10px] text-zinc-500">Scripts</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-zinc-200">{technicalResult.renderBlocking.stylesheets}</div>
                        <div className="text-[10px] text-zinc-500">Stylesheets</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Content Relevance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { label: "Title Relevance", value: technicalResult.contentRelevance.titleRelevance },
                      { label: "Description Relevance", value: technicalResult.contentRelevance.descriptionRelevance },
                      { label: "Keyword Relevance", value: technicalResult.contentRelevance.keywordRelevance },
                      { label: "Content Rate", value: technicalResult.contentRelevance.contentRate },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">{label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, value)}%` }} />
                          </div>
                          <span className="text-xs text-zinc-400 w-10 text-right">{value}%</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Heading Structure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {Object.entries(technicalResult.headingStructure).map(([tag, count]) => (
                        <div key={tag} className="flex items-center gap-2 text-sm">
                          <span className="text-zinc-500 font-mono w-6">{tag.toUpperCase()}</span>
                          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (count as number) * 5)}%` }} />
                          </div>
                          <span className="text-xs text-zinc-400 w-6 text-right">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Social Media Tags ({technicalResult.socialMediaTags.totalTags} tags)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {technicalResult.socialMediaTags.openGraph.map((tag: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 py-0.5 text-xs">
                        <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="text-zinc-500 font-mono">{tag.property}:</span>
                        <span className="text-zinc-400 truncate">{tag.content}</span>
                      </div>
                    ))}
                    {technicalResult.socialMediaTags.twitter.map((tag: any, i: number) => (
                      <div key={`tw-${i}`} className="flex items-start gap-2 py-0.5 text-xs">
                        <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="text-zinc-500 font-mono">{tag.property}:</span>
                        <span className="text-zinc-400 truncate">{tag.content}</span>
                      </div>
                    ))}
                    {technicalResult.socialMediaTags.totalTags === 0 && (
                      <p className="text-xs text-red-400">No Open Graph or Twitter Card tags found</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Site Files</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {Object.entries(technicalResult.siteFiles).map(([name, file]: [string, any]) => (
                      <div key={name} className="flex items-center justify-between py-1 text-sm">
                        <div className="flex items-center gap-2">
                          {file.exists ? <CheckCircle2 size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-red-400" />}
                          <span className="text-zinc-300 font-mono">{name.replace(/([A-Z])/g, '.$1').toLowerCase()}</span>
                        </div>
                        <span className="text-xs text-zinc-500">{file.exists ? `${file.status} ${(file.size / 1024).toFixed(0)}KB` : "Not found"}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {technicalResult.resourceIssues?.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-yellow-400">Resource Issues ({technicalResult.resourceIssues.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {technicalResult.resourceIssues.map((issue: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 py-1 text-sm">
                          <AlertTriangle size={14} className={issue.severity === 'error' ? 'text-red-400' : 'text-yellow-400'} />
                          <span className="text-zinc-300 text-xs">{issue.issue}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                <Wrench size={48} className="mb-4 opacity-30" />
                <p className="text-sm">Run a technical SEO audit</p>
                <p className="text-xs text-zinc-600 mt-1">Server timing, render blocking, heading structure, social tags, site files</p>
              </div>
            )}
          </TabsContent>

          {/* -------- CHECKS TAB -------- */}
          <TabsContent value="checks" className="space-y-4">
            {auditResult ? (
              <>
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Passed ({auditResult.seoHealth.filter((c: any) => c.status === "pass").length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {auditResult.seoHealth
                      .filter((c: any) => c.status === "pass")
                      .map((check: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 py-1 text-sm">
                          <CheckCircle2 size={14} className="text-emerald-400" />
                          <span className="text-zinc-300">{check.check}</span>
                          <span className="text-zinc-600 text-xs ml-auto">{check.value}</span>
                        </div>
                      ))}
                  </CardContent>
                </Card>

                {auditResult.seoHealth.some((c: any) => c.status !== "pass") && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-yellow-400">
                        Issues ({auditResult.seoHealth.filter((c: any) => c.status !== "pass").length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {auditResult.seoHealth
                        .filter((c: any) => c.status !== "pass")
                        .map((check: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 py-1 text-sm">
                            <StatusIcon status={check.status} />
                            <span className="text-zinc-300">{check.check}</span>
                            <span className="text-red-400 text-xs ml-auto">{check.value}</span>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                <p className="text-sm">Run an audit first to see all checks</p>
              </div>
            )}
          </TabsContent>

          {/* -------- CONTENT TAB -------- */}
          <TabsContent value="content" className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={onRunContent} disabled={isGeneratingContent} className="flex-1 bg-emerald-600 hover:bg-emerald-700" size="sm">
                {isGeneratingContent ? <><Loader2 size={14} className="animate-spin mr-2" />Generating...</> : "Generate Content"}
              </Button>
              <Button onClick={onRunContentPlan} disabled={isGeneratingContent} variant="outline" className="border-zinc-700" size="sm">
                4-Week Plan
              </Button>
            </div>

            {contentResult ? (
              <>
                {/* Blog Topics */}
                {contentResult.blogTopics?.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium text-zinc-200 mb-3">Blog Topics ({contentResult.blogTopics.length})</h4>
                      <div className="space-y-3">
                        {contentResult.blogTopics.map((topic: any, i: number) => (
                          <div key={i} className="p-2 rounded bg-zinc-800/50 space-y-1">
                            <div className="text-sm text-zinc-200 font-medium">{topic.title}</div>
                            <div className="text-[10px] text-emerald-400">Keyword: {topic.targetKeyword}</div>
                            {topic.outline && (
                              <div className="text-[10px] text-zinc-500 mt-1">
                                {topic.outline.map((s: string, j: number) => <div key={j}>• {s}</div>)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* LinkedIn Posts */}
                {contentResult.linkedinPosts?.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium text-zinc-200 mb-3">LinkedIn Posts ({contentResult.linkedinPosts.length})</h4>
                      <div className="space-y-2">
                        {contentResult.linkedinPosts.map((post: string, i: number) => (
                          <div key={i} className="p-3 rounded bg-zinc-800/50 text-xs text-zinc-300 whitespace-pre-wrap">{post}</div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* WhatsApp Messages */}
                {contentResult.whatsappMessages?.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium text-zinc-200 mb-3">WhatsApp Broadcasts ({contentResult.whatsappMessages.length})</h4>
                      <div className="space-y-2">
                        {contentResult.whatsappMessages.map((msg: string, i: number) => (
                          <div key={i} className="p-3 rounded bg-zinc-800/50 text-xs text-zinc-300 whitespace-pre-wrap">{msg}</div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Locality Pages */}
                {contentResult.localityPages?.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium text-zinc-200 mb-3">SEO Pages ({contentResult.localityPages.length})</h4>
                      <div className="space-y-2">
                        {contentResult.localityPages.map((page: any, i: number) => (
                          <div key={i} className="p-2 rounded bg-zinc-800/50">
                            <div className="text-xs text-zinc-200">{page.title}</div>
                            <div className="text-[10px] text-emerald-400">{page.targetKeyword}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : contentPlanResult ? (
              <>
                {/* Weekly Plan */}
                {contentPlanResult.weeklyPlan?.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium text-zinc-200 mb-3">4-Week Content Plan</h4>
                      <div className="space-y-3">
                        {contentPlanResult.weeklyPlan.map((week: any, i: number) => (
                          <div key={i} className="p-3 rounded bg-zinc-800/50 space-y-1">
                            <div className="text-xs font-medium text-emerald-400">Week {week.week}</div>
                            <div className="text-xs text-zinc-300">Blog: {week.blog?.title}</div>
                            <div className="text-[10px] text-zinc-500">Keyword: {week.blog?.targetKeyword}</div>
                            <div className="text-[10px] text-zinc-500">{week.socialPosts} social posts planned</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Social Calendar */}
                {contentPlanResult.socialCalendar?.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium text-zinc-200 mb-3">Social Calendar ({contentPlanResult.socialCalendar.length} posts)</h4>
                      <div className="space-y-2">
                        {contentPlanResult.socialCalendar.slice(0, 10).map((post: any, i: number) => (
                          <div key={i} className="p-2 rounded bg-zinc-800/50 text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[9px] border-zinc-700">{post.platform}</Badge>
                              <span className="text-zinc-500">{post.scheduledDay}</span>
                            </div>
                            <div className="text-zinc-300">{post.title}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                <FileText size={48} className="mb-4 opacity-30" />
                <p className="text-sm">Generate blogs, LinkedIn posts, WhatsApp broadcasts</p>
                <p className="text-xs text-zinc-600 mt-1">Set your company details first, then click Generate Content</p>
              </div>
            )}
          </TabsContent>

          {/* -------- LOCALITY TAB -------- */}
          <TabsContent value="locality" className="space-y-4">
            <Button onClick={onRunLocalitySearch} disabled={!city} className="w-full bg-violet-600 hover:bg-violet-700" size="sm">
              <MapPin size={14} className="mr-2" />
              Discover Localities in {city || "your city"}
            </Button>

            {localityResult ? (
              <>
                {localityResult.marketInsight && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium text-zinc-200 mb-2">Market Insight</h4>
                      <p className="text-xs text-zinc-400">{localityResult.marketInsight}</p>
                    </CardContent>
                  </Card>
                )}

                {localityResult.nearbyAreas?.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium text-zinc-200 mb-2">Nearby Areas</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {localityResult.nearbyAreas.map((area: string, i: number) => (
                          <Badge key={i} variant="secondary" className="bg-zinc-800 text-zinc-300 text-[10px]">{area}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {localityResult.buyerProfiles?.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium text-zinc-200 mb-3">Buyer Profiles</h4>
                      <div className="space-y-2">
                        {localityResult.buyerProfiles.map((profile: any, i: number) => (
                          <div key={i} className="p-2 rounded bg-zinc-800/50">
                            <div className="text-xs font-medium text-zinc-200">{profile.type}</div>
                            <div className="text-[10px] text-zinc-500">{profile.preferredConfig} • {profile.budgetRange}</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">{profile.searchBehavior}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {localityResult.suggestedKeywords?.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium text-zinc-200 mb-2">Suggested Keywords ({localityResult.suggestedKeywords.length})</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {localityResult.suggestedKeywords.map((kw: string, i: number) => (
                          <Badge key={i} variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">{kw}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {localityResult.competingProjects?.length > 0 && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-medium text-zinc-200 mb-2">Competing Projects</h4>
                      <div className="space-y-1">
                        {localityResult.competingProjects.map((proj: string, i: number) => (
                          <div key={i} className="text-xs text-zinc-400 flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-zinc-600" />
                            {proj}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                <MapPin size={48} className="mb-4 opacity-30" />
                <p className="text-sm">Discover localities, buyer profiles, and keywords</p>
                <p className="text-xs text-zinc-600 mt-1">Set your city first, then click the button above</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
