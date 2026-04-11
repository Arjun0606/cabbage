"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Zap, Settings } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface Props {
  logs: string[];
  onRunFullScan?: () => void;
  hasWebsite?: boolean;
}

export function TerminalHeader({ logs, onRunFullScan, hasWebsite }: Props) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-zinc-950 border-b border-zinc-800">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-mono text-zinc-400">
            CabbageSEO Terminal &bull; Running Daily
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings">
            <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <Settings size={16} />
            </button>
          </Link>
          {onRunFullScan && hasWebsite && (
            <Button
              size="sm"
              onClick={onRunFullScan}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7 px-3"
            >
              <Zap size={12} className="mr-1" />
              Run Full Scan
            </Button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <ScrollArea className="h-28 px-4 pb-2">
          <div className="font-mono text-xs space-y-0.5">
            {logs.map((log, i) => (
              <div
                key={i}
                className={
                  log.startsWith("> Error")
                    ? "text-red-400"
                    : log.startsWith(">")
                    ? "text-emerald-400"
                    : "text-zinc-500"
                }
              >
                {log}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
