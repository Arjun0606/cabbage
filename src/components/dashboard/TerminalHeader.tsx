"use client";

import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Zap, Settings, RotateCcw } from "lucide-react";
import { useState, useRef, useEffect, type ReactNode } from "react";
import Link from "next/link";

interface Props {
  logs: string[];
  onRunFullScan?: () => void;
  onRunMainOnly?: () => void;
  onClearAndRescan?: () => void;
  hasWebsite?: boolean;
  /** Optional left-side slot — used for the SiteSwitcher so it shares the header row */
  leftSlot?: ReactNode;
  creditsUsed?: number;
  creditsMonthly?: number;
}

export function TerminalHeader({ logs, onRunFullScan, onRunMainOnly, onClearAndRescan, hasWebsite, leftSlot, creditsUsed, creditsMonthly }: Props) {
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-[#0c0c0d] border-b border-white/[0.06]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#7CB342] animate-pulse shadow-[0_0_8px_rgba(124,179,66,0.5)]" />
            <span
              className="text-[13px] font-mono text-zinc-300 tracking-tight"
              title="Your site is auto-scanned every night at 02:30 IST. Run Full Scan to trigger one now."
            >
              Cabbge Terminal &bull; Auto-scan nightly
            </span>
          </div>
          {leftSlot}
        </div>
        <div className="flex items-center gap-2">
          {typeof creditsMonthly === "number" && creditsMonthly > 0 && (
            <Link
              href="/pricing"
              title={`${creditsUsed || 0} credits used this month out of ${creditsMonthly} included. Click to view plans.`}
              className="hidden md:flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium bg-zinc-800/60 border border-white/[0.06] hover:border-white/[0.15] hover:bg-zinc-700/60 transition-all"
            >
              <span className={(creditsUsed || 0) >= creditsMonthly ? "text-amber-400" : "text-zinc-300"}>
                {(creditsUsed || 0).toLocaleString()}
              </span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-500 tabular-nums">{creditsMonthly.toLocaleString()}</span>
              <span className="text-zinc-500 font-normal">credits</span>
            </Link>
          )}
          <Link href="/settings">
            <button className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 active:scale-[0.97] transition-all duration-150">
              <Settings size={15} />
            </button>
          </Link>
          {onClearAndRescan && hasWebsite && (
            <button
              onClick={onClearAndRescan}
              title="Wipe saved scan history and run a fresh scan. Use this if scores look stuck at 0."
              className="h-8 px-3 rounded-lg text-[12px] font-medium text-zinc-300 bg-zinc-800/60 border border-white/[0.06] hover:bg-zinc-700/60 hover:text-zinc-100 active:scale-[0.97] transition-all duration-150 flex items-center gap-1.5"
            >
              <RotateCcw size={12} />
              Clear &amp; re-scan
            </button>
          )}
          {onRunMainOnly && hasWebsite && (
            <button
              onClick={onRunMainOnly}
              title="Fast scan: main site only. Audit + technical + backlinks + AI visibility — skips per-project microsites, portal coverage, and RERA verification. Use this for a quick check."
              className="h-8 px-3 rounded-lg text-[12px] font-medium text-zinc-300 bg-zinc-800/60 border border-white/[0.06] hover:bg-zinc-700/60 hover:text-zinc-100 active:scale-[0.97] transition-all duration-150 flex items-center gap-1.5"
            >
              <Zap size={12} />
              Main site only
            </button>
          )}
          {onRunFullScan && hasWebsite && (
            <Button
              size="sm"
              onClick={onRunFullScan}
              data-auto-scan="true"
              title="Everything: main site + every project microsite + brand-level portal coverage, RERA verification, review monitor. 3-10 minutes."
              className="bg-[#7CB342] text-zinc-950 hover:bg-[#8BC34A] active:scale-[0.97] text-[13px] font-medium h-8 px-4 rounded-lg shadow-[0_0_12px_rgba(124,179,66,0.15)] transition-all duration-150"
            >
              <Zap size={13} className="mr-1.5" />
              Run Full Scan
            </Button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 active:scale-[0.97] transition-all duration-150"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Terminal output */}
      {expanded && (
        <div
          ref={scrollRef}
          className="h-[120px] overflow-y-auto px-5 pb-3 scrollbar-thin"
        >
          <div className="font-mono text-[13px] leading-relaxed space-y-0.5">
            {logs.map((log, i) => (
              <div
                key={i}
                className={
                  log.startsWith("> Error")
                    ? "text-red-400"
                    : log.startsWith(">")
                    ? "text-zinc-300"
                    : log.startsWith("✓")
                    ? "text-[#7CB342] font-medium"
                    : "text-zinc-500"
                }
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
