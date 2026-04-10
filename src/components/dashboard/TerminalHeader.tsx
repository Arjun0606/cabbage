"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";

interface Props {
  logs: string[];
}

export function TerminalHeader({ logs }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-zinc-950 border-b border-zinc-800">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-mono text-zinc-400">
            CabbageSEO Terminal &bull; Running Daily
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <ScrollArea className="h-32 px-4 pb-2">
          <div className="font-mono text-xs space-y-0.5">
            {logs.map((log, i) => (
              <div
                key={i}
                className={
                  log.startsWith(">")
                    ? "text-emerald-400"
                    : log.startsWith("Error")
                    ? "text-red-400"
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
