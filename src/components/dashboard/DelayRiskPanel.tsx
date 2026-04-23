"use client";

/**
 * Possession + delay risk panel.
 *
 * India's RERA Act makes the declared possession date legally binding.
 * Missing it exposes the developer to buyer complaints in NCDRC (the
 * consumer forum), RERA penalties, and often ends up as news that AI
 * models cite in negative-sentiment answers. Developers routinely
 * manage this in spreadsheets today. Cabbge surfaces it inline so the
 * CMO can't miss it.
 *
 * Three buckets:
 *   DELAYED    — past the possession_target_date, stage is still UC or
 *                pre_launch. Content team should publish a dated
 *                progress / new-timeline post before buyers file.
 *   AT RISK    — <=60 days to possession, stage is still UC or pre-
 *                launch. Flag for a final-push content cadence.
 *   ON TRACK   — everything else.
 *
 * Everything derives from the `possession_target_date` column added in
 * migration 008; falls back to parsing the free-text possession_date
 * client-side so it works before the migration too.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, PenTool } from "lucide-react";

interface ProjectLike {
  name: string;
  stage?: string | null;
  status?: string;
  phase?: string | null;
  possession_target_date?: string | null;
  possession_date?: string | null;
  possessionDate?: string;
  rera_number?: string | null;
  reraNumber?: string;
}

interface Props {
  projects: ProjectLike[];
  onWriteArticle?: (query: string) => void;
}

function parseTargetDate(p: ProjectLike): Date | null {
  const raw = p.possession_target_date || "";
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  // Fallback — parse the free-text possession_date for projects saved
  // before migration 008 ran.
  const text = (p.possession_date || p.possessionDate || "").trim();
  if (!text) return null;
  const iso = Date.parse(text);
  if (!Number.isNaN(iso)) return new Date(iso);
  const qm = text.match(/q([1-4])[\s\-\/]*([12]\d{3})/i);
  if (qm) {
    const q = Number(qm[1]);
    const y = Number(qm[2]);
    const month = [3, 6, 9, 12][q - 1];
    const day = [31, 30, 30, 31][q - 1];
    return new Date(`${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  const mm = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+([12]\d{3})/i);
  if (mm) {
    const monthIdx = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
      .indexOf(mm[1].slice(0, 3).toLowerCase());
    if (monthIdx >= 0) {
      const y = Number(mm[2]);
      const lastDay = new Date(y, monthIdx + 1, 0).getDate();
      return new Date(`${y}-${String(monthIdx + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`);
    }
  }
  return null;
}

function classify(p: ProjectLike): {
  status: "delayed" | "at_risk" | "on_track" | "delivered" | "na";
  daysLeft: number | null;
} {
  const stage = (p.stage || "").toLowerCase();
  if (stage === "ready_to_move" || stage === "sold_out") return { status: "delivered", daysLeft: null };
  const target = parseTargetDate(p);
  if (!target) return { status: "na", daysLeft: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.floor((target.getTime() - today.getTime()) / 86400000);
  if (daysLeft < 0) return { status: "delayed", daysLeft };
  if (daysLeft <= 60) return { status: "at_risk", daysLeft };
  return { status: "on_track", daysLeft };
}

export function DelayRiskPanel({ projects, onWriteArticle }: Props) {
  const classified = projects.map((p) => ({ project: p, ...classify(p) }));
  const delayed = classified.filter((c) => c.status === "delayed");
  const atRisk = classified.filter((c) => c.status === "at_risk");
  const onTrack = classified.filter((c) => c.status === "on_track").length;
  const hasAny = delayed.length + atRisk.length > 0;
  if (!hasAny && onTrack === 0) return null;

  return (
    <Card className={`rounded-xl ${
      delayed.length > 0
        ? "bg-red-500/[0.04] border-red-500/25"
        : atRisk.length > 0
        ? "bg-amber-500/[0.04] border-amber-500/25"
        : "bg-zinc-900/60 border-white/[0.06]"
    }`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          {delayed.length > 0 ? (
            <AlertTriangle size={14} className="text-red-400" />
          ) : atRisk.length > 0 ? (
            <Clock size={14} className="text-amber-400" />
          ) : (
            <Clock size={14} className="text-zinc-400" />
          )}
          <h3 className={`text-[13px] font-semibold ${
            delayed.length > 0 ? "text-red-400"
            : atRisk.length > 0 ? "text-amber-400"
            : "text-zinc-200"
          }`}>
            Possession &amp; delay risk
          </h3>
          <div className="flex items-center gap-1.5 ml-auto">
            {delayed.length > 0 && (
              <Badge className="text-[10px] bg-red-500/15 text-red-400 border-0 rounded-md h-5 px-1.5">
                {delayed.length} delayed
              </Badge>
            )}
            {atRisk.length > 0 && (
              <Badge className="text-[10px] bg-amber-500/15 text-amber-400 border-0 rounded-md h-5 px-1.5">
                {atRisk.length} at risk
              </Badge>
            )}
            {onTrack > 0 && (
              <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border-0 rounded-md h-5 px-1.5">
                {onTrack} on track
              </Badge>
            )}
          </div>
        </div>

        {delayed.length === 0 && atRisk.length === 0 && (
          <p className="text-[12px] text-zinc-500">
            All projects with a possession date are comfortably on schedule.
          </p>
        )}

        {(delayed.length > 0 || atRisk.length > 0) && (
          <>
            <p className="text-[11px] text-zinc-500 mb-3">
              RERA makes the declared possession date binding. Publish a dated
              progress post before buyers file NCDRC complaints or AI models
              start citing &ldquo;delay&rdquo; as a defining trait of the project.
            </p>
            <div className="space-y-1.5">
              {[...delayed, ...atRisk].map(({ project: p, status, daysLeft }) => (
                <div
                  key={p.name}
                  className="flex items-center gap-3 py-2 px-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60"
                >
                  <Badge className={`text-[9px] h-4 px-1.5 rounded-md border-0 flex-shrink-0 ${
                    status === "delayed"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-amber-500/15 text-amber-400"
                  }`}>
                    {status === "delayed" ? `${Math.abs(daysLeft ?? 0)}d late` : `${daysLeft}d left`}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-zinc-200 truncate">
                      {p.name}
                      {p.phase && <span className="text-zinc-500 text-[11px] ml-1.5">({p.phase})</span>}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {(p.stage || "active").replace(/_/g, " ")}
                      {(p.rera_number || p.reraNumber) && (
                        <> · RERA {p.rera_number || p.reraNumber}</>
                      )}
                    </div>
                  </div>
                  {onWriteArticle && (
                    <button
                      onClick={() =>
                        onWriteArticle(
                          status === "delayed"
                            ? `${p.name} construction update and revised possession timeline`
                            : `${p.name} final push construction update — on track for possession`
                        )
                      }
                      className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#7CB342]/15 text-[#7CB342] border border-[#7CB342]/30 hover:bg-[#7CB342]/25 flex items-center gap-1 flex-shrink-0"
                    >
                      <PenTool size={10} />
                      {status === "delayed" ? "Write status update" : "Write progress post"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
