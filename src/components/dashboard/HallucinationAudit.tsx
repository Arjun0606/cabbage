"use client";

/**
 * Hallucination audit panel — shows every factual error the AI made about
 * the brand in the current scan, classified by type + severity.
 *
 * Why this is a first-class panel and not a footnote:
 * Indian residential RE is legally regulated. Every public claim about
 * RERA number, price, BHK config, possession date has compliance weight.
 * When ChatGPT tells a buyer "Aparna Moonstone's RERA is P0240009999"
 * and the real number is different, the brand inherits the correction
 * burden. The CMO needs to SEE these errors to publish canonical facts
 * pages that re-ground the AI's next answer.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertOctagon, AlertTriangle, Info, ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";
import type { Hallucination, HallucinationType, HallucinationSeverity } from "@/lib/agents/hallucinationCheck";

interface Props {
  aiVisResult: any;
  /** When set, each hallucination row gets a "Generate fix article"
   *  button that hands a pre-constructed corrective-content brief
   *  (claim + truth + project) back to the dashboard's article writer.
   *  Closes the loop from "AI is wrong about you" → "draft article in
   *  the queue" in one click. */
  onFixHallucination?: (issue: Issue) => void;
  /** Brand context piped through to the outreach drafts endpoint so the
   *  generated emails can reference the brand correctly. Used by the
   *  Scale+ "Draft correction outreach" action below. */
  brand?: string;
  brandUrl?: string;
}

interface OutreachDrafts {
  brand: string;
  provider: string;
  providerSupportUrl?: string | null;
  drafts: {
    providerEmail?: { to?: string; subject?: string; body?: string } | null;
    sgeFeedback?: string | null;
    siteRebuttal?: string | null;
  };
}

interface Issue extends Hallucination {
  query: string;
  llm: "ChatGPT" | "Google AI";
}

const TYPE_LABEL: Record<HallucinationType, string> = {
  rera: "RERA mismatch",
  attribution: "Misattributed project",
  invented: "Invented project",
  price: "Wrong price",
  config: "Wrong BHK",
  location: "Wrong location",
  possession: "Wrong possession",
};

const TYPE_ORDER: HallucinationType[] = [
  "rera",
  "attribution",
  "invented",
  "price",
  "config",
  "location",
  "possession",
];

const SEV_STYLES: Record<HallucinationSeverity, { bg: string; text: string; icon: typeof AlertOctagon }> = {
  critical: { bg: "bg-red-500/10", text: "text-red-400", icon: AlertOctagon },
  high: { bg: "bg-amber-500/10", text: "text-amber-400", icon: AlertTriangle },
  medium: { bg: "bg-zinc-700/40", text: "text-zinc-300", icon: Info },
};

function sevRank(s: HallucinationSeverity): number {
  return s === "critical" ? 0 : s === "high" ? 1 : 2;
}

export function HallucinationAudit({ aiVisResult, onFixHallucination, brand, brandUrl }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [outreachLoading, setOutreachLoading] = useState<number | null>(null);
  const [outreachByIdx, setOutreachByIdx] = useState<Record<number, OutreachDrafts>>({});

  const generateOutreach = async (idx: number, issue: Issue) => {
    setOutreachLoading(idx);
    try {
      const res = await fetch("/api/hallucination-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim: issue.aiClaim,
          truth: issue.truth,
          source: issue.llm === "ChatGPT" ? "chatgpt" : "gemini",
          query: issue.query,
          brand: brand || "",
          brandUrl: brandUrl || "",
        }),
      });
      const data = await res.json();
      if (data?.drafts) {
        setOutreachByIdx((prev) => ({ ...prev, [idx]: data as OutreachDrafts }));
      }
    } finally {
      setOutreachLoading(null);
    }
  };

  const { issues, auditedQueries, totalMentioned } = useMemo(() => {
    const flat: Issue[] = [];
    let audited = 0;
    let mentioned = 0;
    for (const q of aiVisResult?.queryResults || []) {
      const llms: Array<[string, "ChatGPT" | "Google AI"]> = [
        ["chatgpt", "ChatGPT"],
        ["gemini", "Google AI"],
      ];
      for (const [key, label] of llms) {
        const r = q?.[key];
        if (!r) continue;
        if (r.mentioned) mentioned++;
        if (Array.isArray(r.hallucinations)) {
          audited++;
          for (const h of r.hallucinations) flat.push({ ...h, query: q.query, llm: label });
        }
      }
    }
    // Sort: critical first, then high, then medium; within tier, group by type
    flat.sort((a, b) => {
      const d = sevRank(a.severity) - sevRank(b.severity);
      if (d !== 0) return d;
      return TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
    });
    return { issues: flat, auditedQueries: audited, totalMentioned: mentioned };
  }, [aiVisResult]);

  // Don't render at all if nothing was audited (no ground-truth projects
  // were supplied OR the brand was never mentioned so there was nothing
  // to fact-check). Quiet is better than a misleading "0 issues" badge.
  if (auditedQueries === 0) return null;

  const counts = {
    critical: issues.filter((i) => i.severity === "critical").length,
    high: issues.filter((i) => i.severity === "high").length,
    medium: issues.filter((i) => i.severity === "medium").length,
  };
  const total = issues.length;

  const toggle = (idx: number) => {
    const next = new Set(expanded);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setExpanded(next);
  };

  // Group by type so the user sees "5 RERA mismatches, 3 misattributions"
  // as scannable stat rows before diving into specific claims.
  const byType = TYPE_ORDER.map((t) => ({
    type: t,
    count: issues.filter((i) => i.type === t).length,
  })).filter((r) => r.count > 0);

  return (
    <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
          {total === 0 ? (
            <ShieldCheck size={15} className="text-[#7CB342]" />
          ) : (
            <AlertOctagon size={15} className="text-red-400" />
          )}
          AI Accuracy Audit
          {total === 0 ? (
            <Badge className="text-[10px] ml-auto bg-[#7CB342]/10 text-[#7CB342] border-0 rounded-md h-5 px-1.5">
              Clean
            </Badge>
          ) : (
            <Badge className="text-[10px] ml-auto bg-red-500/10 text-red-400 border-0 rounded-md h-5 px-1.5">
              {total} {total === 1 ? "issue" : "issues"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          We compared every fact ChatGPT and Google AI stated about your brand against your scraped project data (RERA, configs, price, location). RERA mismatches and misattributions are legally exposed — fix them by publishing canonical fact pages the AI can re-ground to.
        </p>

        {/* Headline stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`text-center p-3 rounded-lg border ${counts.critical > 0 ? "bg-red-500/[0.06] border-red-500/20" : "bg-zinc-800/40 border-white/[0.04]"}`}>
            <div className={`text-xl font-bold tabular-nums ${counts.critical > 0 ? "text-red-400" : "text-zinc-500"}`}>
              {counts.critical}
            </div>
            <div className="text-[10px] text-zinc-500 font-medium mt-0.5">Critical</div>
            <div className="text-[9px] text-zinc-600">RERA · attribution</div>
          </div>
          <div className={`text-center p-3 rounded-lg border ${counts.high > 0 ? "bg-amber-500/[0.06] border-amber-500/20" : "bg-zinc-800/40 border-white/[0.04]"}`}>
            <div className={`text-xl font-bold tabular-nums ${counts.high > 0 ? "text-amber-400" : "text-zinc-500"}`}>
              {counts.high}
            </div>
            <div className="text-[10px] text-zinc-500 font-medium mt-0.5">High</div>
            <div className="text-[9px] text-zinc-600">price · invented</div>
          </div>
          <div className="text-center p-3 rounded-lg border bg-zinc-800/40 border-white/[0.04]">
            <div className={`text-xl font-bold tabular-nums ${counts.medium > 0 ? "text-zinc-300" : "text-zinc-500"}`}>
              {counts.medium}
            </div>
            <div className="text-[10px] text-zinc-500 font-medium mt-0.5">Medium</div>
            <div className="text-[9px] text-zinc-600">config · location</div>
          </div>
        </div>

        {/* Clean state */}
        {total === 0 && (
          <div className="p-4 rounded-lg bg-[#7CB342]/[0.04] border border-[#7CB342]/20 flex items-start gap-2.5">
            <ShieldCheck size={14} className="text-[#7CB342] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[12px] font-semibold text-[#7CB342]">No factual errors detected</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Audited {auditedQueries} {auditedQueries === 1 ? "response" : "responses"} across {totalMentioned} brand mentions. Every RERA, price, config, and attribution the AI stated lines up with your scraped data. Re-run after any site change to recheck.
              </div>
            </div>
          </div>
        )}

        {/* By-type breakdown */}
        {byType.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {byType.map((row) => (
              <Badge key={row.type} className="text-[10px] bg-zinc-800/80 text-zinc-300 border-0 rounded-md h-5 px-1.5">
                {row.count}× {TYPE_LABEL[row.type]}
              </Badge>
            ))}
          </div>
        )}

        {/* Expandable issue list */}
        {issues.length > 0 && (
          <div className="rounded-xl bg-zinc-800/30 border border-white/[0.04] overflow-hidden">
            <div className="divide-y divide-white/[0.04] max-h-[480px] overflow-y-auto">
              {issues.map((issue, i) => {
                const sev = SEV_STYLES[issue.severity];
                const Icon = sev.icon;
                const isOpen = expanded.has(i);
                return (
                  <div key={i}>
                    <button
                      onClick={() => toggle(i)}
                      className="w-full flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-white/[0.02] transition-colors text-left"
                    >
                      <Icon size={13} className={`${sev.text} flex-shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[11px] font-semibold ${sev.text}`}>
                            {TYPE_LABEL[issue.type]}
                          </span>
                          {issue.project && (
                            <span className="text-[11px] text-zinc-300">· {issue.project}</span>
                          )}
                          <Badge className="text-[9px] bg-zinc-800 text-zinc-500 border-0 rounded-md h-4 px-1 ml-auto">
                            {issue.llm}
                          </Badge>
                          {isOpen ? <ChevronDown size={11} className="text-zinc-500" /> : <ChevronRight size={11} className="text-zinc-500" />}
                        </div>
                        <div className="text-[12px] text-zinc-400 mt-1 line-clamp-2" title={issue.aiClaim}>
                          &ldquo;{issue.aiClaim}&rdquo;
                        </div>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3 pl-10 space-y-1.5 bg-zinc-900/40">
                        {issue.truth && (
                          <div className="text-[11px]">
                            <span className="text-zinc-500">Ground truth:</span>{" "}
                            <span className="text-[#7CB342]">{issue.truth}</span>
                          </div>
                        )}
                        <div className="text-[11px]">
                          <span className="text-zinc-500">Triggered by query:</span>{" "}
                          <span className="text-zinc-300">&ldquo;{issue.query}&rdquo;</span>
                        </div>
                        {issue.fix && (
                          <div className="text-[11px] mt-2 p-2 rounded-md bg-[#7CB342]/[0.04] border border-[#7CB342]/20">
                            <span className="text-[#7CB342] font-semibold">Fix: </span>
                            <span className="text-zinc-300">{issue.fix}</span>
                          </div>
                        )}
                        {onFixHallucination && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onFixHallucination(issue);
                              }}
                              className="text-[11px] font-medium px-2.5 py-1.5 rounded-md bg-[#7CB342] text-zinc-950 hover:bg-[#8BC34A] transition-colors"
                            >
                              Generate fix article →
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                generateOutreach(i, issue);
                              }}
                              disabled={outreachLoading === i}
                              className="text-[11px] font-medium px-2.5 py-1.5 rounded-md bg-amber-500/15 text-amber-200 border border-amber-500/25 hover:bg-amber-500/25 transition-colors disabled:opacity-60"
                            >
                              {outreachLoading === i ? "Drafting outreach..." : outreachByIdx[i] ? "Regenerate outreach" : "Draft correction outreach"}
                            </button>
                            <span className="text-[10px] text-zinc-500">
                              Drafts a fact-correction page targeting this query. Costs ~50 credits, lands in your draft queue.
                            </span>
                          </div>
                        )}
                        {outreachByIdx[i] && (
                          <div className="mt-3 p-3 rounded-lg bg-zinc-900/60 border border-amber-500/20 space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge className="text-[9px] h-4 px-1.5 rounded bg-amber-500/15 text-amber-300 border-0 uppercase tracking-wide font-semibold">
                                Outreach drafts
                              </Badge>
                              <span className="text-[10px] text-zinc-500">
                                Copy + send manually. Cabbge does not send these.
                              </span>
                            </div>
                            {outreachByIdx[i].drafts.providerEmail && (
                              <details className="group">
                                <summary className="cursor-pointer text-[11px] text-zinc-300 font-medium">
                                  Email to {outreachByIdx[i].provider} support
                                </summary>
                                <div className="mt-2 space-y-1">
                                  <div className="text-[10px] text-zinc-500">
                                    To: {outreachByIdx[i].drafts.providerEmail!.to}
                                  </div>
                                  <div className="text-[10px] text-zinc-500">
                                    Subject: {outreachByIdx[i].drafts.providerEmail!.subject}
                                  </div>
                                  <pre className="text-[11px] text-zinc-300 whitespace-pre-wrap font-sans bg-zinc-950/50 rounded p-2">
                                    {outreachByIdx[i].drafts.providerEmail!.body}
                                  </pre>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(outreachByIdx[i].drafts.providerEmail!.body || "");
                                    }}
                                    className="text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                                  >
                                    Copy email body
                                  </button>
                                  {outreachByIdx[i].providerSupportUrl && (
                                    <a
                                      href={outreachByIdx[i].providerSupportUrl!}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] px-2 py-1 ml-2 rounded bg-amber-500/15 text-amber-200 inline-block hover:bg-amber-500/25"
                                    >
                                      Open {outreachByIdx[i].provider} support →
                                    </a>
                                  )}
                                </div>
                              </details>
                            )}
                            {outreachByIdx[i].drafts.sgeFeedback && (
                              <details className="group">
                                <summary className="cursor-pointer text-[11px] text-zinc-300 font-medium">
                                  Search Generative Experience feedback text
                                </summary>
                                <pre className="mt-2 text-[11px] text-zinc-300 whitespace-pre-wrap font-sans bg-zinc-950/50 rounded p-2">
                                  {outreachByIdx[i].drafts.sgeFeedback}
                                </pre>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(outreachByIdx[i].drafts.sgeFeedback || "");
                                  }}
                                  className="text-[10px] mt-1 px-2 py-1 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                                >
                                  Copy
                                </button>
                              </details>
                            )}
                            {outreachByIdx[i].drafts.siteRebuttal && (
                              <details className="group">
                                <summary className="cursor-pointer text-[11px] text-zinc-300 font-medium">
                                  Brand-site rebuttal page (markdown, ready to publish)
                                </summary>
                                <pre className="mt-2 text-[11px] text-zinc-300 whitespace-pre-wrap font-sans bg-zinc-950/50 rounded p-2 max-h-[280px] overflow-y-auto">
                                  {outreachByIdx[i].drafts.siteRebuttal}
                                </pre>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(outreachByIdx[i].drafts.siteRebuttal || "");
                                  }}
                                  className="text-[10px] mt-1 px-2 py-1 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                                >
                                  Copy markdown
                                </button>
                              </details>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
