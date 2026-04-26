"use client";

/**
 * Pending-projects banner.
 *
 * The weekly project-sync cron auto-detects new project URLs on the
 * customer's sitemap and inserts them as `status='Pending Review'`.
 * This banner surfaces them on the dashboard so the customer can
 * accept (auto-include in scans) or dismiss (delete from the table)
 * in one click.
 *
 * Hidden when there are no pending rows. Polls once on mount and
 * again whenever the dashboard refreshes its company state.
 */

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Check, X, ChevronDown, ChevronUp, Loader2, ExternalLink } from "lucide-react";

interface PendingProject {
  id: string;
  name: string;
  website: string | null;
  location: string | null;
  configurations: string | null;
  price_range: string | null;
  rera_number: string | null;
  created_at: string;
}

interface Props {
  companyId?: string;
  /** Called after accept so the parent can re-load company.projects. */
  onChange?: () => void;
}

export function PendingProjectsBanner({ companyId, onChange }: Props) {
  const [pending, setPending] = useState<PendingProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [actioning, setActioning] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/pending?companyId=${encodeURIComponent(companyId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setPending(data.pending || []);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const decide = async (action: "accept" | "dismiss", projectIds: string[]) => {
    if (!companyId || projectIds.length === 0) return;
    setActioning(true);
    try {
      await fetch("/api/projects/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, projectIds, action }),
      });
      // Optimistic: drop accepted/dismissed from local list.
      setPending((prev) => prev.filter((p) => !projectIds.includes(p.id)));
      onChange?.();
    } finally {
      setActioning(false);
    }
  };

  if (!companyId) return null;
  if (loading && pending.length === 0) return null;
  if (pending.length === 0) return null;

  return (
    <Card className="bg-[#7CB342]/[0.04] border-[#7CB342]/30 rounded-xl mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900/80 flex items-center justify-center flex-shrink-0">
            <Sparkles size={15} className="text-[#7CB342]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12.5px] font-semibold text-[#7CB342]">
                {pending.length} new project{pending.length === 1 ? "" : "s"} detected on your sitemap
              </span>
              <span className="text-[10px] uppercase tracking-wide text-zinc-600">Auto-sync</span>
            </div>
            <div className="text-[11.5px] text-zinc-400 leading-relaxed mt-0.5">
              We scanned your sitemap this week and found these. Accept to include them in scans + AI visibility + RERA verification — or dismiss if they aren&apos;t real projects.
            </div>
            {expanded && (
              <div className="mt-3 space-y-1.5">
                {pending.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/60 border border-white/[0.04]">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-zinc-200 font-medium truncate">{p.name}</span>
                        {p.website && (
                          <a
                            href={p.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-0.5"
                          >
                            <ExternalLink size={9} /> visit
                          </a>
                        )}
                      </div>
                      {p.website && (
                        <div className="text-[10px] text-zinc-600 truncate">{p.website.replace(/^https?:\/\//, "")}</div>
                      )}
                    </div>
                    <button
                      onClick={() => decide("accept", [p.id])}
                      disabled={actioning}
                      className="text-[10.5px] font-semibold px-2 py-1 rounded-md bg-[#7CB342]/15 text-[#7CB342] hover:bg-[#7CB342]/25 disabled:opacity-40 flex items-center gap-1"
                    >
                      <Check size={10} /> Accept
                    </button>
                    <button
                      onClick={() => decide("dismiss", [p.id])}
                      disabled={actioning}
                      className="text-[10.5px] font-medium px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-40 flex items-center gap-1"
                    >
                      <X size={10} /> Dismiss
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => decide("accept", pending.map((p) => p.id))}
              disabled={actioning}
              className="text-[11.5px] font-semibold px-3 py-1.5 rounded-md bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 flex items-center gap-1 disabled:opacity-40"
            >
              {actioning ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Accept all
            </button>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-zinc-500 hover:text-zinc-200 p-1"
              title={expanded ? "Collapse" : "Review individually"}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
