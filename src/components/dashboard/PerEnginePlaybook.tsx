"use client";

import { useMemo } from "react";
import type { AIVisibilityResult } from "@/lib/agents/aiVisibility";
import { buildPlaybook, type PlaybookAction } from "@/lib/agents/playbook";

/**
 * Per-engine action playbook.
 *
 * Renders concrete, engine-specific actions (ChatGPT / Gemini /
 * Perplexity / Claude / Grok / All) the customer can take to lift
 * their score. Every action is grounded in 2026 research findings —
 * not generic GEO advice.
 *
 * Reads from the latest AIVisibilityResult passed in. Hidden when
 * no actionable items exist (clean site, all checks passing).
 */
export function PerEnginePlaybook({
  scan,
  brand,
}: {
  scan: AIVisibilityResult | null;
  brand: string;
}) {
  const actions = useMemo<PlaybookAction[]>(() => {
    if (!scan) return [];
    return buildPlaybook(scan, brand);
  }, [scan, brand]);

  if (!scan || actions.length === 0) return null;

  return (
    <div className="rounded-lg border border-white/[0.06] bg-zinc-900/40 p-5 space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-zinc-500">
          Action playbook
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Per-engine plays ranked by impact. Generic GEO advice loses to
          targeted plays — these are the specific lifts each engine
          rewards.
        </p>
      </div>

      <ul className="space-y-2">
        {actions.map((a, i) => (
          <li
            key={i}
            className="rounded-lg border border-white/[0.04] bg-zinc-950/40 p-4 space-y-2"
          >
            <div className="flex items-start gap-2 flex-wrap">
              <span
                className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0 ${
                  a.engine === "all"
                    ? "bg-zinc-800 text-zinc-200"
                    : "bg-emerald-950/40 border border-emerald-900 text-emerald-300"
                }`}
              >
                {a.engine === "all" ? "all engines" : a.engine}
              </span>
              <span
                className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0 ${
                  a.priority === "high"
                    ? "bg-amber-950/40 border border-amber-900 text-amber-300"
                    : a.priority === "medium"
                      ? "bg-zinc-900 border border-white/[0.08] text-zinc-300"
                      : "bg-zinc-900 border border-white/[0.04] text-zinc-500"
                }`}
              >
                {a.priority}
              </span>
              <div className="text-[13px] text-zinc-100 font-medium">
                {a.title}
              </div>
            </div>
            <div className="text-[12px] text-zinc-400 leading-relaxed">
              {a.rationale}
            </div>
            <pre className="text-[11px] text-zinc-300 bg-zinc-950/60 border border-white/[0.04] rounded p-3 whitespace-pre-wrap font-mono leading-relaxed">
              {a.fix}
            </pre>
            {a.estimatedLift && (
              <div className="text-[11px] text-emerald-300">
                → {a.estimatedLift}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
