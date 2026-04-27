"use client";

/**
 * Project comparison — side-by-side view of two projects in the
 * portfolio across the dimensions Indian buyers actually compare
 * (config, price, locality, stage, RERA, AI visibility). Maps to the
 * buyer query shape "X vs Y" which is a dominant comparison pattern
 * and one the generic dashboard didn't have a dedicated answer for.
 *
 * No API calls — everything derives from existing state (projects list
 * + aiVisResult co-citation counts + portal tracker). Pick two projects
 * from the dropdowns and the card updates live.
 */

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, PenTool } from "lucide-react";
import { formatRupees } from "@/lib/projectParse";
import { computeCoverage } from "@/lib/portalTracker";

interface ProjectLike {
  name: string;
  locality?: string | null;
  city?: string | null;
  config_tags?: string[] | null;
  configurations?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  priceRange?: string;
  stage?: string | null;
  status?: string;
  rera_number?: string | null;
  reraNumber?: string;
  website?: string;
  amenities?: string;
}

interface LLMResult {
  mentioned?: boolean;
}

interface QueryResult {
  query: string;
  chatgpt?: LLMResult;
  gemini?: LLMResult;
}

interface Props {
  projects: ProjectLike[];
  aiVisResult: { queryResults?: QueryResult[] } | null;
  portalKeys: string[];
  onWriteArticle?: (query: string) => void;
}

function wordMatch(text: string, needle: string): boolean {
  if (!needle) return false;
  const re = new RegExp(
    `(?:^|[^a-z0-9])${needle.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z0-9]|$)`,
    "i"
  );
  return re.test(text.toLowerCase());
}

function visibilityScore(
  project: ProjectLike,
  queryResults: QueryResult[]
): { score: number; total: number; mentioned: number } {
  let total = 0;
  let mentioned = 0;
  for (const q of queryResults) {
    const nameHit = wordMatch(q.query, project.name);
    const locHit = project.locality && wordMatch(q.query, project.locality) &&
      (project.config_tags || []).some((c) => wordMatch(q.query, c));
    if (!nameHit && !locHit) continue;
    total++;
    if (q.chatgpt?.mentioned || q.gemini?.mentioned) mentioned++;
  }
  const score = total > 0 ? Math.round((mentioned / total) * 100) : 0;
  return { score, total, mentioned };
}

function priceString(p: ProjectLike): string {
  if (p.price_min != null && p.price_max != null) {
    return `${formatRupees(p.price_min)} – ${formatRupees(p.price_max)}`;
  }
  if (p.price_min != null) return `from ${formatRupees(p.price_min)}`;
  if (p.price_max != null) return `up to ${formatRupees(p.price_max)}`;
  return p.priceRange || "—";
}

export function ProjectCompare({ projects, aiVisResult, portalKeys, onWriteArticle }: Props) {
  const [idxA, setIdxA] = useState<number>(0);
  const [idxB, setIdxB] = useState<number>(Math.min(1, projects.length - 1));

  if (projects.length < 2) return null;

  const a = projects[idxA];
  const b = projects[idxB];
  const queryResults = aiVisResult?.queryResults || [];
  const vizA = useMemo(() => visibilityScore(a, queryResults), [a, queryResults]);
  const vizB = useMemo(() => visibilityScore(b, queryResults), [b, queryResults]);
  const covA = useMemo(() => computeCoverage([a.name], portalKeys), [a.name, portalKeys]);
  const covB = useMemo(() => computeCoverage([b.name], portalKeys), [b.name, portalKeys]);

  const rows: Array<{
    label: string;
    a: React.ReactNode;
    b: React.ReactNode;
    winner?: "a" | "b" | "tie";
  }> = [
    { label: "Locality", a: a.locality || "—", b: b.locality || "—" },
    { label: "City", a: a.city || "—", b: b.city || "—" },
    { label: "Configurations", a: (a.config_tags || []).join(", ") || a.configurations || "—", b: (b.config_tags || []).join(", ") || b.configurations || "—" },
    { label: "Price", a: priceString(a), b: priceString(b) },
    {
      label: "Stage",
      a: <Badge className="text-[10px] bg-zinc-800 text-zinc-300 border-0 rounded-md h-5 px-1.5">{(a.stage || a.status || "active").replace(/_/g, " ")}</Badge>,
      b: <Badge className="text-[10px] bg-zinc-800 text-zinc-300 border-0 rounded-md h-5 px-1.5">{(b.stage || b.status || "active").replace(/_/g, " ")}</Badge>,
    },
    {
      label: "RERA",
      a: (a.rera_number || a.reraNumber)
        ? <span className="text-[#7CB342]">✓ Verified</span>
        : <span className="text-amber-400">Missing</span>,
      b: (b.rera_number || b.reraNumber)
        ? <span className="text-[#7CB342]">✓ Verified</span>
        : <span className="text-amber-400">Missing</span>,
    },
    {
      label: "AI visibility",
      a: vizA.total > 0
        ? <span className="tabular-nums">{vizA.score}/100 <span className="text-zinc-500 text-[11px]">({vizA.mentioned}/{vizA.total})</span></span>
        : <span className="text-zinc-500">No scan data</span>,
      b: vizB.total > 0
        ? <span className="tabular-nums">{vizB.score}/100 <span className="text-zinc-500 text-[11px]">({vizB.mentioned}/{vizB.total})</span></span>
        : <span className="text-zinc-500">No scan data</span>,
      winner: vizA.score === vizB.score ? "tie" : vizA.score > vizB.score ? "a" : "b",
    },
    {
      label: "Portal coverage",
      a: <span className="tabular-nums">{covA.submitted}/{portalKeys.length}</span>,
      b: <span className="tabular-nums">{covB.submitted}/{portalKeys.length}</span>,
      winner: covA.submitted === covB.submitted ? "tie" : covA.submitted > covB.submitted ? "a" : "b",
    },
    { label: "Website", a: a.website || "—", b: b.website || "—" },
  ];

  // Both projects are name-only when neither has a locality, configs,
  // price, RERA, or website. Common state when projects came from
  // portal-coverage backfill — the dashboard has names but nothing
  // else. Comparison rows would all read "—", which looks broken.
  const isNameOnly = (p: ProjectLike): boolean => {
    const hasPrice = !!(p.price_min || p.price_max || p.priceRange);
    return (
      !p.locality &&
      !p.city &&
      !p.configurations &&
      !(p.config_tags || []).length &&
      !p.rera_number &&
      !p.reraNumber &&
      !p.website &&
      !hasPrice
    );
  };
  const bothNameOnly = isNameOnly(a) && isNameOnly(b);

  return (
    <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Scale size={14} className="text-zinc-300" />
          <h3 className="text-[13px] font-semibold text-zinc-200">Compare two projects</h3>
          <span className="text-[11px] text-zinc-500 ml-auto">
            Buyers search &ldquo;X vs Y&rdquo; constantly — give them an answer before competitors do
          </span>
        </div>

        {bothNameOnly && (
          <div className="mb-3 p-3 rounded-lg bg-amber-500/[0.04] border border-amber-500/20 text-[11.5px] text-amber-200 leading-relaxed">
            <span className="font-semibold">These projects only have names.</span>{" "}
            They came from portal listings (MagicBricks, 99acres etc.) — we don&apos;t yet have their locality, configs, price, or RERA. Open the Company panel and paste each project&apos;s URL or fill the details by hand to unlock real comparisons.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <select
            value={idxA}
            onChange={(e) => setIdxA(Number(e.target.value))}
            className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-[13px] h-9 px-3 text-zinc-200"
          >
            {projects.map((p, i) => (
              <option key={i} value={i}>{p.name}</option>
            ))}
          </select>
          <select
            value={idxB}
            onChange={(e) => setIdxB(Number(e.target.value))}
            className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-[13px] h-9 px-3 text-zinc-200"
          >
            {projects.map((p, i) => (
              <option key={i} value={i}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-zinc-800/60 overflow-hidden">
          {rows.map((r, i) => (
            <div
              key={r.label}
              className={`grid grid-cols-[140px_1fr_1fr] text-[12px] ${i > 0 ? "border-t border-zinc-800/60" : ""}`}
            >
              <div className="px-3 py-2 bg-zinc-900/60 text-zinc-500 uppercase tracking-wide text-[10px] font-semibold flex items-center">
                {r.label}
              </div>
              <div className={`px-3 py-2 ${r.winner === "a" ? "bg-[#7CB342]/[0.04] text-zinc-100" : "text-zinc-300"}`}>
                {r.a}
              </div>
              <div className={`px-3 py-2 ${r.winner === "b" ? "bg-[#7CB342]/[0.04] text-zinc-100" : "text-zinc-300"}`}>
                {r.b}
              </div>
            </div>
          ))}
        </div>

        {onWriteArticle && a.name !== b.name && (
          <div className="mt-3 flex items-center justify-end">
            <button
              onClick={() => onWriteArticle(`${a.name} vs ${b.name} — which is the better buy`)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#7CB342]/15 text-[#7CB342] border border-[#7CB342]/30 hover:bg-[#7CB342]/25 flex items-center gap-1.5"
            >
              <PenTool size={11} /> Write the &ldquo;{a.name} vs {b.name}&rdquo; article
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
