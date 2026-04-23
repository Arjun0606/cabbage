"use client";

import { useEffect, useState } from "react";
import { Globe, Link2, Building2, ChevronRight, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllTrends, type TrendData } from "@/lib/scanHistory";

type ScanType = "audit" | "technical" | "ai_visibility" | "backlinks";

interface Project {
  name: string;
  website?: string;
  location?: string;
}

interface AdditionalSite {
  url: string;
  label?: string;
}

interface Props {
  mainWebsite: string;
  additionalSites: AdditionalSite[];
  projects: Project[];
  activeSiteUrl: string;
  onSwitch: (url: string) => void;
}

interface SiteRow {
  key: string;
  url: string;
  label: string;
  kind: "main" | "project_microsite" | "additional";
  linkedProject?: Project;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-[#7CB342]";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function ScorePill({ label, t }: { label: string; t: TrendData }) {
  if (t.direction === "new") {
    return (
      <div className="text-center px-1">
        <div className="text-[10px] text-zinc-600 mb-0.5">{label}</div>
        <div className="text-[13px] text-zinc-700 font-medium">—</div>
      </div>
    );
  }
  return (
    <div className="text-center px-1">
      <div className="text-[10px] text-zinc-500 mb-0.5">{label}</div>
      <div className={`text-[13px] font-bold tabular-nums ${scoreColor(t.current)}`}>{t.current}</div>
    </div>
  );
}

/**
 * SitesTreePanel — single coherent view of the customer's web footprint:
 * main corporate site, every project microsite (if it has its own URL),
 * plus any additional sites. Each scannable site gets a row with the
 * latest scores from localStorage scan history.
 *
 * Projects without their own URL render as nested children under the
 * main site (they're scanned as part of it).
 *
 * Replaces having to flip between sites via the header switcher to
 * understand status across the portfolio.
 */
export function SitesTreePanel({
  mainWebsite,
  additionalSites,
  projects,
  activeSiteUrl,
  onSwitch,
}: Props) {
  const [, setTick] = useState(0);

  // Re-read trends from localStorage when component mounts and whenever
  // the active site changes (likely a new scan just landed).
  useEffect(() => {
    setTick((t) => t + 1);
  }, [activeSiteUrl]);

  // Build the list of distinct scannable sites
  const rows: SiteRow[] = [];
  const seen = new Set<string>();

  if (mainWebsite) {
    rows.push({
      key: "main",
      url: mainWebsite,
      label: "Main site",
      kind: "main",
    });
    seen.add(mainWebsite);
  }

  for (const p of projects) {
    if (p.website && p.website.trim() && !seen.has(p.website)) {
      rows.push({
        key: `project-${p.name}`,
        url: p.website,
        label: p.name,
        kind: "project_microsite",
        linkedProject: p,
      });
      seen.add(p.website);
    }
  }

  for (const s of additionalSites) {
    if (s?.url && !seen.has(s.url)) {
      rows.push({
        key: `add-${s.url}`,
        url: s.url,
        label: s.label || s.url,
        kind: "additional",
      });
      seen.add(s.url);
    }
  }

  const projectsOnMain = projects.filter((p) => !p.website || !p.website.trim());

  if (rows.length === 0) {
    return (
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardContent className="p-8 text-center">
          <Globe size={26} className="text-zinc-600 mx-auto mb-3" />
          <h3 className="text-[14px] font-semibold mb-1">No site configured yet</h3>
          <p className="text-[12px] text-zinc-500 max-w-sm mx-auto">
            Add your company website on the Company panel to start scanning.
          </p>
        </CardContent>
      </Card>
    );
  }

  const scoreTypes: Array<{ key: ScanType; label: string }> = [
    { key: "audit", label: "Audit" },
    { key: "ai_visibility", label: "AI" },
    { key: "technical", label: "Tech" },
    { key: "backlinks", label: "Links" },
  ];

  return (
    <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={14} className="text-zinc-400" />
          <h3 className="text-[13px] font-semibold text-zinc-100">Your web footprint</h3>
          <span className="text-[11px] text-zinc-500 ml-auto">
            {rows.length} site{rows.length === 1 ? "" : "s"}
          </span>
        </div>

        {rows.map((row) => {
          const trends = getAllTrends(row.url);
          const isActive = row.url === activeSiteUrl;
          const childProjects =
            row.kind === "main" ? projectsOnMain : [];
          return (
            <div
              key={row.key}
              className={`rounded-lg border transition-all ${
                isActive
                  ? "border-[#7CB342]/30 bg-[#7CB342]/[0.04]"
                  : "border-white/[0.04] bg-zinc-900/40 hover:border-white/[0.1]"
              }`}
            >
              <button
                onClick={() => onSwitch(row.url)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left active:scale-[0.997] transition-all"
              >
                {row.kind === "main" ? (
                  <Globe size={14} className="text-zinc-400 flex-shrink-0" />
                ) : row.kind === "project_microsite" ? (
                  <Link2 size={14} className="text-zinc-400 flex-shrink-0" />
                ) : (
                  <Globe size={14} className="text-zinc-500 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-zinc-100 truncate">
                      {row.label}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] h-4 px-1 rounded border-0 flex-shrink-0 ${
                        row.kind === "main"
                          ? "bg-zinc-800 text-zinc-400"
                          : row.kind === "project_microsite"
                          ? "bg-[#7CB342]/10 text-[#7CB342]"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {row.kind === "main"
                        ? "main"
                        : row.kind === "project_microsite"
                        ? "project microsite"
                        : "additional"}
                    </Badge>
                    {isActive && (
                      <Badge className="text-[9px] h-4 px-1 rounded border-0 bg-[#7CB342] text-zinc-950 flex-shrink-0">
                        active
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate font-mono">{row.url.replace(/^https?:\/\//, "")}</div>
                </div>

                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {scoreTypes.map((s) => (
                    <ScorePill key={s.key} label={s.label} t={trends[s.key]} />
                  ))}
                </div>

                {!isActive && (
                  <ChevronRight size={13} className="text-zinc-600 flex-shrink-0 ml-1" />
                )}
              </button>

              {childProjects.length > 0 && (
                <div className="px-3 pb-2 pt-0.5 border-t border-white/[0.04] space-y-0.5">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-600 pt-1.5 pb-0.5">
                    Projects on this site
                  </div>
                  {childProjects.map((p, i) => (
                    <div
                      key={`${p.name}-${i}`}
                      className="flex items-center gap-2 py-1 text-[12px]"
                    >
                      <div className="w-1 h-1 rounded-full bg-zinc-600 flex-shrink-0" />
                      <span className="text-zinc-300 truncate">{p.name}</span>
                      {p.location && (
                        <span className="text-[11px] text-zinc-500 truncate">— {p.location}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {rows.every((r) => {
          const trends = getAllTrends(r.url);
          return scoreTypes.every((s) => trends[s.key].direction === "new");
        }) && (
          <div className="flex items-center gap-2 px-1 pt-2 text-[11px] text-zinc-500">
            <Search size={11} />
            <span>No scans yet — click a site and run Full Scan to populate scores.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
