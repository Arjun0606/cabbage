"use client";

/**
 * Per-project scorecard — the "focus mode" card pinned to the top of
 * Overview whenever the user has a specific project selected. Collapses
 * four dimensions of project-level health into one horizontal strip:
 *
 *   [ GEO visibility | SEO audit | Portal coverage | RERA status ]
 *
 * All of it derives from existing state — no new API calls — so the
 * scorecard appears the moment the user clicks a project in the
 * switcher, without waiting on anything to refresh.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Target, Wrench, Building, ShieldCheck } from "lucide-react";
import { computeCoverage } from "@/lib/portalTracker";
import { inferAssetType, assetTypeLabel } from "@/lib/projectParse";

interface QueryResult {
  query: string;
  chatgpt?: { mentioned?: boolean };
  gemini?: { mentioned?: boolean };
}

interface Props {
  project: {
    name: string;
    website?: string;
    locality?: string | null;
    city?: string | null;
    rera_number?: string | null;
    reraNumber?: string;
    config_tags?: string[] | null;
    configurations?: string | null;
    amenities?: string | null;
    stage?: string | null;
  };
  /** Company AI visibility scan result — we derive the project score from it. */
  aiVisResult: { queryResults?: QueryResult[] } | null;
  /** Company SEO audit score (if a scan has run on this project's URL). */
  auditScore?: number | null;
  /** Portal keys present in the current portalResult — for coverage. */
  portalKeys: string[];
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-[#7CB342]";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function wordMatch(text: string, needle: string): boolean {
  if (!needle) return false;
  const re = new RegExp(
    `(?:^|[^a-z0-9])${needle.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z0-9]|$)`,
    "i"
  );
  return re.test(text.toLowerCase());
}

function computeProjectGeoScore(
  projectName: string,
  locality: string | null | undefined,
  configTags: string[] | null | undefined,
  queryResults: QueryResult[]
): { score: number; total: number; mentioned: number } {
  let total = 0;
  let mentioned = 0;
  for (const q of queryResults) {
    const nameHit = wordMatch(q.query, projectName);
    const locHit = locality && wordMatch(q.query, locality) &&
      (configTags || []).some((c) => wordMatch(q.query, c));
    if (!nameHit && !locHit) continue;
    total++;
    if (q.chatgpt?.mentioned || q.gemini?.mentioned) mentioned++;
  }
  const score = total > 0 ? Math.round((mentioned / total) * 100) : 0;
  return { score, total, mentioned };
}

export function ProjectScorecard({ project, aiVisResult, auditScore, portalKeys }: Props) {
  const geo = computeProjectGeoScore(
    project.name,
    project.locality || null,
    project.config_tags || null,
    aiVisResult?.queryResults || []
  );
  const coverage = computeCoverage([project.name], portalKeys);
  const reraNumber = (project.rera_number || project.reraNumber || "").trim();
  const stageLabel = (project.stage || "active").replace(/_/g, " ");
  const assetType = inferAssetType({
    name: project.name,
    configurations: project.configurations,
    amenities: project.amenities,
    configTags: project.config_tags,
  });

  return (
    <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
            <Building2 size={14} className="text-zinc-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold text-zinc-100 truncate">{project.name}</span>
              <Badge className="text-[10px] bg-zinc-800 text-zinc-300 border-0 rounded-md h-5 px-1.5">
                {stageLabel}
              </Badge>
              <Badge className={`text-[10px] border-0 rounded-md h-5 px-1.5 ${
                assetType === "residential"
                  ? "bg-zinc-800 text-zinc-400"
                  : assetType === "commercial"
                  ? "bg-blue-500/15 text-blue-400"
                  : assetType === "retail"
                  ? "bg-purple-500/15 text-purple-400"
                  : assetType === "township"
                  ? "bg-[#7CB342]/15 text-[#7CB342]"
                  : assetType === "hospitality"
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-zinc-700 text-zinc-300"
              }`}>
                {assetTypeLabel(assetType)}
              </Badge>
              {project.locality && (
                <span className="text-[11px] text-zinc-500">{project.locality}{project.city ? `, ${project.city}` : ""}</span>
              )}
            </div>
            {project.website && (
              <a
                href={project.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-zinc-500 hover:text-zinc-300 truncate block"
              >
                {project.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat
            icon={<Target size={12} className="text-zinc-400" />}
            label="AI Visibility"
            value={geo.total > 0 ? `${geo.score}` : "—"}
            suffix={geo.total > 0 ? " /100" : ""}
            hint={geo.total > 0
              ? `${geo.mentioned} of ${geo.total} queries cited this project`
              : "Run the AI scan to measure"}
            valueClass={geo.total > 0 ? scoreColor(geo.score) : "text-zinc-400"}
          />
          <Stat
            icon={<Wrench size={12} className="text-zinc-400" />}
            label="SEO Audit"
            value={auditScore != null ? `${Math.round(auditScore)}` : "—"}
            suffix={auditScore != null ? " /100" : ""}
            hint={auditScore != null
              ? "Last audit on this project's URL"
              : project.website
                ? "Run Full Scan to audit this microsite"
                : "Add a project website to audit"}
            valueClass={auditScore != null ? scoreColor(auditScore) : "text-zinc-400"}
          />
          <Stat
            icon={<Building size={12} className="text-zinc-400" />}
            label="Portal Coverage"
            value={`${coverage.submitted}`}
            suffix={` /${portalKeys.length || 0}`}
            hint={portalKeys.length === 0
              ? "Generate portal copy first"
              : coverage.submitted === portalKeys.length && portalKeys.length > 0
                ? "All portal listings submitted"
                : `${(portalKeys.length || 0) - coverage.submitted} listings still to submit`}
            valueClass={portalKeys.length > 0 && coverage.submitted === portalKeys.length ? "text-[#7CB342]" : "text-zinc-100"}
          />
          <Stat
            icon={<ShieldCheck size={12} className="text-zinc-400" />}
            label="RERA"
            value={reraNumber ? "Verified" : "Missing"}
            suffix=""
            hint={reraNumber ? reraNumber : "Add RERA number to boost AI trust"}
            valueClass={reraNumber ? "text-[#7CB342]" : "text-amber-400"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
  suffix,
  hint,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix: string;
  hint: string;
  valueClass: string;
}) {
  return (
    <div className="p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <span className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">{label}</span>
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className={`text-[20px] font-bold tabular-nums ${valueClass}`}>{value}</span>
        {suffix && <span className="text-[11px] text-zinc-500">{suffix}</span>}
      </div>
      <div className="text-[10px] text-zinc-500 mt-0.5 truncate" title={hint}>
        {hint}
      </div>
    </div>
  );
}
