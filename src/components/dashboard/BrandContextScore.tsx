"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";

/**
 * Brand Context Score.
 *
 * Surfaces the customer's brand-context completion percentage and the
 * exact required fields still missing. Article generation is gated at
 * 70% server-side, so this card is the path to unlock — and a real
 * upsell pressure point ("articles are blocked because vision is
 * empty"). Hides when complete.
 */

interface MissingField {
  key: string;
  label: string;
  why: string;
  charsHave: number;
  charsNeed: number;
}

interface ScoreResponse {
  score: number;
  ready: boolean;
  missing: MissingField[];
  optionalMissing: Array<{ key: string; label: string; why: string }>;
  filledRequired: number;
  totalRequired: number;
}

interface Props {
  companyId?: string;
  refetchKey?: unknown;
  onOpenBrandContext?: () => void;
}

function colorForScore(s: number): string {
  if (s >= 70) return "text-emerald-400";
  if (s >= 40) return "text-amber-400";
  return "text-red-400";
}

export function BrandContextScore({ companyId, refetchKey, onOpenBrandContext }: Props) {
  const [data, setData] = useState<ScoreResponse | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    fetch(`/api/brand-context-score?companyId=${encodeURIComponent(companyId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        setData(json && typeof json === "object" && "score" in json ? (json as ScoreResponse) : null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, refetchKey]);

  if (!companyId || !data) return null;

  // Quiet when the customer has filled what they need to. We surface
  // optional-field nudges separately if at all.
  if (data.ready && data.optionalMissing.length === 0) return null;

  return (
    <Card
      className={`bg-zinc-900/60 rounded-xl ${
        data.ready ? "border-zinc-800/50" : "border-amber-500/30"
      }`}
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {data.ready ? (
                <CheckCircle2 size={15} className="text-emerald-400" />
              ) : (
                <Lock size={15} className="text-amber-400" />
              )}
              <h4 className="text-[13px] font-semibold text-zinc-100">
                {data.ready ? "Brand context ready" : "Article generation locked"}
              </h4>
              <Badge
                className={`bg-zinc-800 border-0 rounded-md text-[10px] h-5 px-1.5 ${colorForScore(data.score)}`}
              >
                {data.score}% complete
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-500">
              {data.ready
                ? "Optional fields below would polish your articles further."
                : "We hard-gate article generation until brand context is filled. Articles written from empty context read like every developer's blog — your CMO won't publish them, you won't see ROI, and the plan stops paying for itself."}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className={`text-2xl font-bold tabular-nums ${colorForScore(data.score)}`}>
              {data.filledRequired}<span className="text-zinc-600 text-lg">/{data.totalRequired}</span>
            </div>
            <div className="text-[10px] text-zinc-500">required fields</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              data.score >= 70 ? "bg-emerald-400" : data.score >= 40 ? "bg-amber-400" : "bg-red-400"
            }`}
            style={{ width: `${data.score}%` }}
          />
        </div>

        {data.missing.length > 0 && (
          <div className="space-y-2">
            {data.missing.slice(0, 4).map((m) => (
              <div key={m.key} className="rounded-lg border border-zinc-800/50 bg-zinc-950/40 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle size={11} className="text-amber-400 flex-shrink-0" />
                  <span className="text-[12px] font-medium text-zinc-200">{m.label}</span>
                  {m.charsHave > 0 && (
                    <span className="text-[10px] text-zinc-500 ml-auto">
                      {m.charsHave}/{m.charsNeed} chars
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">{m.why}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-[11px] text-zinc-600">
            {data.ready
              ? `${data.optionalMissing.length} optional field${data.optionalMissing.length === 1 ? "" : "s"} would help further`
              : `Need ${70 - data.score}% more to unlock articles`}
          </span>
          <Button
            onClick={() => {
              if (onOpenBrandContext) {
                onOpenBrandContext();
              } else if (typeof window !== "undefined") {
                window.location.href = "/onboarding?step=3";
              }
            }}
            size="sm"
            className={`h-8 text-[12px] font-semibold flex-shrink-0 ${
              data.ready
                ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
                : "bg-amber-500 hover:bg-amber-400 text-zinc-950"
            }`}
          >
            {data.ready ? "Polish brand context" : "Fill brand context"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
