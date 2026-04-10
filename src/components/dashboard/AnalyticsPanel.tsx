"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { useState } from "react";

interface Props {
  auditResult: any;
  aiVisResult: any;
  isAuditing: boolean;
  isCheckingAI: boolean;
  onRunAudit: (url: string) => void;
  onRunAIVisibility: () => void;
  websiteUrl: string;
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
  isAuditing,
  isCheckingAI,
  onRunAudit,
  onRunAIVisibility,
  websiteUrl,
}: Props) {
  const [auditUrl, setAuditUrl] = useState(websiteUrl || "");

  return (
    <ScrollArea className="bg-zinc-950 border-l border-zinc-800 col-span-1 lg:col-span-2">
      <div className="p-4">
        <Tabs defaultValue="health" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="health" className="text-xs">Health</TabsTrigger>
            <TabsTrigger value="technical" className="text-xs">Technical</TabsTrigger>
            <TabsTrigger value="aigeo" className="text-xs">AI/GEO</TabsTrigger>
            <TabsTrigger value="checks" className="text-xs">Checks</TabsTrigger>
          </TabsList>

          {/* -------- HEALTH TAB -------- */}
          <TabsContent value="health" className="space-y-4">
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
                {/* Performance Scores */}
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

                {/* Core Web Vitals */}
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

                {/* SEO Health */}
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

          {/* -------- TECHNICAL TAB -------- */}
          <TabsContent value="technical" className="space-y-4">
            {auditResult ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Desktop Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-around">
                    <ScoreCircle score={auditResult.scores.performanceDesktop} label="Performance" />
                    <ScoreCircle score={auditResult.scores.accessibility} label="Accessibility" />
                    <ScoreCircle score={auditResult.scores.bestPractices} label="Best Practices" />
                    <ScoreCircle score={auditResult.scores.seo} label="SEO" />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                <p className="text-sm">Run an audit first to see technical details</p>
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
        </Tabs>
      </div>
    </ScrollArea>
  );
}
