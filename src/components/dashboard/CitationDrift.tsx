"use client";

/**
 * Citation drift — which domains and which competitor brands started or
 * stopped getting cited for each query between the last two scans.
 *
 * Volatility tells you WHETHER the score is moving; drift tells you WHY.
 * A 5pp score drop with no change in who-got-cited is AI noise. A 5pp
 * score drop because Moneycontrol swapped to a competitor is a specific,
 * fixable incident — the kind a CMO can act on the same week.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, ShieldCheck, Activity, UserCheck, UserMinus } from "lucide-react";
import type { QueryCitationDrift } from "@/lib/agents/volatility";

interface Props {
  citationDrift?: QueryCitationDrift[];
}

export function CitationDrift({ citationDrift = [] }: Props) {
  const { totals, flippedOut, flippedIn, hasAny } = useMemo(() => {
    const flippedOut = citationDrift.filter((d) => d.flippedToAbsent);
    const flippedIn = citationDrift.filter((d) => d.flippedToMentioned);
    const totals = {
      gainedDomains: new Set<string>(),
      lostDomains: new Set<string>(),
      gainedCompetitors: new Set<string>(),
      lostCompetitors: new Set<string>(),
    };
    for (const d of citationDrift) {
      d.gainedDomains.forEach((x) => totals.gainedDomains.add(x));
      d.lostDomains.forEach((x) => totals.lostDomains.add(x));
      d.gainedCompetitors.forEach((x) => totals.gainedCompetitors.add(x));
      d.lostCompetitors.forEach((x) => totals.lostCompetitors.add(x));
    }
    return {
      totals,
      flippedOut,
      flippedIn,
      hasAny: citationDrift.length > 0,
    };
  }, [citationDrift]);

  // Hide entirely until there are at least 2 scans to compare. Showing
  // an empty "Citation drift" card on the first scan is noise.
  if (!citationDrift || citationDrift.length === 0) {
    return null;
  }

  return (
    <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
          <Activity size={15} className="text-zinc-400" />
          Citation drift
          <span className="text-[10px] text-zinc-500 font-normal">vs previous scan</span>
          {!hasAny ? (
            <Badge className="text-[10px] ml-auto bg-[#7CB342]/10 text-[#7CB342] border-0 rounded-md h-5 px-1.5">
              No change
            </Badge>
          ) : (
            <Badge className="text-[10px] ml-auto bg-zinc-800 text-zinc-400 border-0 rounded-md h-5 px-1.5">
              {citationDrift.length} {citationDrift.length === 1 ? "query shifted" : "queries shifted"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Who AI cited for your target queries vs last scan. Lost a citation from a high-authority domain? That&apos;s where the score drop comes from. A competitor showing up in your co-citations means AI now considers them a peer.
        </p>

        {/* Flipped brand-mention state — the most important signal */}
        {(flippedOut.length > 0 || flippedIn.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {flippedOut.length > 0 && (
              <div className="p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20">
                <div className="flex items-center gap-2 mb-1.5">
                  <UserMinus size={12} className="text-red-400" />
                  <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wide">
                    Dropped off · {flippedOut.length}
                  </span>
                </div>
                <div className="text-[12px] text-zinc-300 space-y-0.5">
                  {flippedOut.slice(0, 5).map((d, i) => (
                    <div key={i} className="truncate" title={d.query}>
                      &ldquo;{d.query}&rdquo;
                    </div>
                  ))}
                </div>
              </div>
            )}
            {flippedIn.length > 0 && (
              <div className="p-3 rounded-lg bg-[#7CB342]/[0.06] border border-[#7CB342]/20">
                <div className="flex items-center gap-2 mb-1.5">
                  <UserCheck size={12} className="text-[#7CB342]" />
                  <span className="text-[11px] font-semibold text-[#7CB342] uppercase tracking-wide">
                    Newly cited · {flippedIn.length}
                  </span>
                </div>
                <div className="text-[12px] text-zinc-300 space-y-0.5">
                  {flippedIn.slice(0, 5).map((d, i) => (
                    <div key={i} className="truncate" title={d.query}>
                      &ldquo;{d.query}&rdquo;
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Domain-level gains & losses, aggregated */}
        {(totals.gainedDomains.size > 0 || totals.lostDomains.size > 0) && (
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              Sources
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[...totals.gainedDomains].slice(0, 12).map((d) => (
                <Badge key={`g-${d}`} className="text-[10px] bg-[#7CB342]/10 text-[#7CB342] border-0 rounded-md h-5 px-1.5 gap-1">
                  <ArrowUpRight size={10} /> {d}
                </Badge>
              ))}
              {[...totals.lostDomains].slice(0, 12).map((d) => (
                <Badge key={`l-${d}`} className="text-[10px] bg-red-500/10 text-red-400 border-0 rounded-md h-5 px-1.5 gap-1">
                  <ArrowDownRight size={10} /> {d}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Competitor co-citation shifts */}
        {(totals.gainedCompetitors.size > 0 || totals.lostCompetitors.size > 0) && (
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              Competitors AI now recommends
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[...totals.gainedCompetitors].slice(0, 12).map((c) => (
                <Badge key={`gc-${c}`} className="text-[10px] bg-red-500/10 text-red-400 border-0 rounded-md h-5 px-1.5 gap-1" title="Newly appearing — they're encroaching on your queries">
                  <ArrowUpRight size={10} /> {c}
                </Badge>
              ))}
              {[...totals.lostCompetitors].slice(0, 12).map((c) => (
                <Badge key={`lc-${c}`} className="text-[10px] bg-[#7CB342]/10 text-[#7CB342] border-0 rounded-md h-5 px-1.5 gap-1" title="No longer cited — you're winning back these queries">
                  <ArrowDownRight size={10} /> {c}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {!hasAny && (
          <div className="p-3 rounded-lg bg-[#7CB342]/[0.04] border border-[#7CB342]/20 flex items-start gap-2.5">
            <ShieldCheck size={14} className="text-[#7CB342] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[12px] font-semibold text-[#7CB342]">Citations held steady</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Same domains, same competitor set as last scan. Any score change this run is AI noise, not a real regression.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
