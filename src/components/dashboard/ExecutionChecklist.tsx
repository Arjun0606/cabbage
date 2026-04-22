"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ExternalLink, ChevronDown } from "lucide-react";

interface DiscoveredPortal {
  name: string;
  domain: string;
  submitUrl?: string;
}

interface ChecklistItem {
  id: string;
  category: "on-site" | "off-site" | "technical" | "geo";
  title: string;
  description: string;
  actionLabel?: string;   // "Publish Article", "Submit to 99acres", etc.
  actionType: "auto" | "manual" | "link";  // auto = we do it, manual = they do it, link = opens URL
  actionUrl?: string;     // For link type
  onAction?: () => void;  // For auto type
  creditCost?: number;
}

interface Props {
  websiteUrl: string;
  auditResult: any;
  aiVisResult: any;
  hasArticles: boolean;
  hasSchema: boolean;
  hasLlmsTxt: boolean;
  hasGbpPosts: boolean;
  onRunAction: (action: string) => void;
}

const STORAGE_KEY = "cabbge_checklist_done";

function getCompletedItems(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveCompletedItems(items: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(items)));
}

export function ExecutionChecklist({
  websiteUrl,
  auditResult, aiVisResult,
  hasArticles, hasSchema, hasLlmsTxt, hasGbpPosts,
  onRunAction,
}: Props) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);
  const [portals, setPortals] = useState<DiscoveredPortal[]>([]);

  useEffect(() => { setCompleted(getCompletedItems()); }, []);

  // Live-discover the top Indian property portals — avoids hardcoding
  // 99acres/MagicBricks/Housing.com into the checklist. Graceful fallback:
  // if discovery fails we show a single generic "Optimise portal listings"
  // item pointing at the Portal Optimizer tool.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/market-knowledge/portals");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.portals)) setPortals(data.portals);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleItem = (id: string) => {
    const next = new Set(completed);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCompleted(next);
    saveCompletedItems(next);
  };

  // Build dynamic checklist based on current state
  const items: ChecklistItem[] = [];

  // --- ON-SITE SEO ---
  if (!auditResult) {
    items.push({ id: "run-audit", category: "on-site", title: "Run your first SEO audit", description: "Scan your website for SEO issues, performance, and real estate-specific checks.", actionLabel: "Run Audit", actionType: "auto", onAction: () => onRunAction("audit") });
  } else {
    const failedChecks = auditResult.realEstateChecks?.filter((c: any) => !c.passed)?.length || 0;
    if (failedChecks > 0) {
      items.push({ id: "fix-re-checks", category: "on-site", title: `Fix ${failedChecks} failed real estate checks`, description: "RERA, pricing, CTAs, floor plans, schema — each failed check hurts your ranking.", actionLabel: "View Fixes", actionType: "auto", onAction: () => onRunAction("tab-health") });
    }
  }

  if (!hasSchema) {
    items.push({ id: "gen-schema", category: "technical", title: "Generate & add JSON-LD schema markup", description: "RealEstateListing + LocalBusiness + FAQPage schema helps Google understand your projects.", actionLabel: "Generate Schema", actionType: "auto", onAction: () => onRunAction("schema"), creditCost: 2 });
  } else {
    items.push({ id: "add-schema", category: "technical", title: "Add schema markup to your website HTML", description: "Copy the generated JSON-LD and paste it into your website's <head> section.", actionType: "manual" });
  }

  if (!hasLlmsTxt) {
    items.push({ id: "gen-llms", category: "geo", title: "Generate llms.txt for AI crawlers", description: "This file tells ChatGPT and other AI models what your company does.", actionLabel: "Generate", actionType: "auto", onAction: () => onRunAction("llms_txt"), creditCost: 2 });
  } else {
    items.push({ id: "upload-llms", category: "geo", title: "Upload llms.txt to your website root", description: `Upload to ${websiteUrl}/llms.txt — AI crawlers will discover your brand.`, actionType: "manual" });
  }

  // --- CONTENT ---
  if (!hasArticles) {
    items.push({ id: "gen-articles", category: "on-site", title: "Generate your first SEO article", description: "Locality guides and buyer articles are the #1 way to rank for buyer queries.", actionLabel: "Write Article", actionType: "auto", onAction: () => onRunAction("tab-content"), creditCost: 5 });
  } else {
    items.push({ id: "publish-articles", category: "on-site", title: "Publish articles to your website", description: "Generated articles only help SEO when they're live on your website. Use the Publish button or copy to your CMS.", actionType: "manual" });
  }

  // --- OFF-SITE / CITATIONS ---
  // Portal submission items are generated from the live-discovered list
  // (marketKnowledge.ts \u2192 ChatGPT web search). If discovery is still
  // loading or failed, fall back to a single generic item that points
  // users at the Portal Optimizer where they can generate copy.
  if (portals.length > 0) {
    for (const p of portals.slice(0, 5)) {
      items.push({
        id: `submit-${p.domain.replace(/\./g, "-")}`,
        category: "off-site",
        title: `Optimise your ${p.name} listing`,
        description: `Paste the optimised listing copy into your ${p.name} dashboard.`,
        actionLabel: p.submitUrl ? `Open ${p.name}` : undefined,
        actionType: p.submitUrl ? "link" : "manual",
        actionUrl: p.submitUrl,
      });
    }
  } else {
    items.push({
      id: "submit-portals-generic",
      category: "off-site",
      title: "Optimise your Indian property portal listings",
      description: "Generate portal-specific copy in the Portals & Ads tab, then paste into each portal.",
      actionLabel: "Open Portal Optimizer",
      actionType: "auto",
      onAction: () => onRunAction("tab-portals"),
    });
  }
  items.push({ id: "claim-gbp", category: "off-site", title: "Claim & optimize Google Business Profile", description: "Most critical listing — shows in Google Maps, AI answers, and local search.", actionLabel: "Open GBP", actionType: "link", actionUrl: "https://business.google.com/" });

  // --- GEO ---
  if (!aiVisResult) {
    items.push({ id: "run-geo", category: "geo", title: "Run your first AI Visibility scan", description: "See how ChatGPT and Gemini answer buyer queries about your area.", actionLabel: "Run Scan", actionType: "auto", onAction: () => onRunAction("ai_visibility"), creditCost: 2 });
  }

  if (!hasGbpPosts) {
    items.push({ id: "gen-gbp", category: "geo", title: "Generate Google Business Profile posts", description: "4 weeks of GBP posts with CTAs — keeps your listing active and visible.", actionLabel: "Generate", actionType: "auto", onAction: () => onRunAction("gbp_posts"), creditCost: 3 });
  } else {
    items.push({ id: "post-gbp", category: "geo", title: "Post weekly to Google Business Profile", description: "Copy each GBP post to your Google Business Profile. Active profiles rank higher.", actionType: "manual" });
  }

  // Count progress
  const totalItems = items.length;
  const completedCount = items.filter(item => completed.has(item.id)).length;
  const pct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  const categoryLabels: Record<string, string> = {
    "on-site": "On-Site SEO",
    "off-site": "Off-Site / Citations",
    "technical": "Technical",
    "geo": "GEO / AI Visibility",
  };

  const categoryColors: Record<string, string> = {
    "on-site": "text-zinc-300",
    "off-site": "text-amber-400",
    "technical": "text-zinc-400",
    "geo": "text-[#7CB342]",
  };

  return (
    <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
      <CardContent className="p-5">
        <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <h4 className="text-[14px] font-semibold text-zinc-100">SEO & GEO Execution Checklist</h4>
            <Badge className="text-[10px] bg-zinc-800 text-zinc-300 border-0 rounded-md h-5 px-1.5">{completedCount}/{totalItems}</Badge>
          </div>
          <ChevronDown size={15} className={`text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-zinc-800 mt-2 mb-1 overflow-hidden">
          <div className="h-full rounded-full bg-[#7CB342] transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-zinc-500 mb-3">{pct}% complete — {totalItems - completedCount} actions remaining</p>

        {expanded && (
          <div className="space-y-1.5">
            {items.map((item) => {
              const isDone = completed.has(item.id);
              return (
                <div key={item.id} className={`flex items-start gap-2.5 py-2 -mx-2 px-2 rounded-lg transition-colors ${isDone ? "opacity-50" : "hover:bg-zinc-800/30"}`}>
                  <button onClick={() => toggleItem(item.id)} className="mt-0.5 flex-shrink-0">
                    {isDone ? <CheckCircle2 size={16} className="text-[#7CB342]" /> : <Circle size={16} className="text-zinc-600 hover:text-zinc-400" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] font-medium ${isDone ? "line-through text-zinc-500" : "text-zinc-200"}`}>{item.title}</span>
                      <Badge variant="outline" className={`text-[9px] rounded h-4 px-1 border-zinc-700/50 ${categoryColors[item.category]}`}>{categoryLabels[item.category]}</Badge>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{item.description}</p>
                    {!isDone && item.actionLabel && (
                      <div className="mt-1.5">
                        {item.actionType === "link" ? (
                          <a href={item.actionUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/50 hover:bg-zinc-700 active:scale-[0.97] transition-all">
                            {item.actionLabel} <ExternalLink size={10} />
                          </a>
                        ) : item.actionType === "auto" && item.onAction ? (
                          <button onClick={item.onAction}
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#7CB342]/10 text-[#7CB342] border border-[#7CB342]/20 hover:bg-[#7CB342]/20 active:scale-[0.97] transition-all">
                            {item.actionLabel}
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
