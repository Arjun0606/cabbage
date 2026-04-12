"use client";

import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Zap, Settings } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface Props {
  logs: string[];
  onRunFullScan?: () => void;
  hasWebsite?: boolean;
}

export function TerminalHeader({ logs, onRunFullScan, hasWebsite }: Props) {
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-[#0a0a0b] border-b border-zinc-800/60">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
          <span className="text-[13px] font-mono text-zinc-400 tracking-tight">
            CabbageSEO Terminal &bull; Running Daily
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings">
            <button className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all">
              <Settings size={15} />
            </button>
          </Link>
          {onRunFullScan && hasWebsite && (
            <Button
              size="sm"
              onClick={onRunFullScan}
              className="bg-emerald-600 hover:bg-emerald-500 text-[13px] font-medium h-8 px-4 rounded-lg shadow-[0_0_12px_rgba(16,185,129,0.15)]"
            >
              <Zap size={13} className="mr-1.5" />
              Run Full Scan
            </Button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all"
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
                    ? "text-emerald-400/90"
                    : log.startsWith("✓")
                    ? "text-emerald-500"
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
