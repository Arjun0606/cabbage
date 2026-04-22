"use client";

import { useRouter } from "next/navigation";
import { Eye, LogOut } from "lucide-react";

interface Props {
  prospectName?: string;
  prospectUrl?: string;
}

/**
 * Sticky top banner during sales demos. Clearly marks the session as
 * non-production so the salesperson never confuses it with a real
 * customer's account. Exit button clears the demo cookie + all
 * prospect data from localStorage.
 */
export function DemoBanner({ prospectName, prospectUrl }: Props) {
  const router = useRouter();

  const handleExit = async () => {
    // Clear all demo traces from the browser
    try {
      localStorage.removeItem("cabbge_company");
      localStorage.removeItem("cabbge_demo_mode");
      localStorage.removeItem("cabbge_demo_target");
      localStorage.removeItem("cabbge_geo_history");
      localStorage.removeItem("cabbge_geo_queries");
      localStorage.removeItem("cabbge_scan_history");
      localStorage.removeItem("cabbge_has_scanned");
      localStorage.removeItem("cabbge_credits_used");
      localStorage.removeItem("cabbge_generated_articles");
      localStorage.removeItem("cabbge_geo_schema_version");
      // Clear all site-crawl cache keys
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("cabbge_crawl_")) localStorage.removeItem(k);
      });
    } catch { /* non-fatal */ }

    // Clear demo cookie server-side
    await fetch("/api/demo/exit", { method: "POST" }).catch(() => { /* ignore */ });
    router.push("/demo");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3 px-5 py-2 bg-amber-500/[0.08] border-b border-amber-500/30">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-400">
        <Eye size={12} />
        Sales Demo
      </div>
      <div className="h-3 w-px bg-amber-500/30" />
      <span className="text-[12px] text-amber-200 flex-1 truncate">
        Pitching <span className="font-semibold">{prospectName || "prospect"}</span>
        {prospectUrl && <span className="text-amber-400/70 ml-2">{prospectUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>}
      </span>
      <span className="text-[10px] text-amber-400/70 hidden md:inline">
        Data stays in this browser only · Nothing saves to your real accounts
      </span>
      <button
        onClick={handleExit}
        className="h-7 px-3 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 text-[11px] font-semibold flex items-center gap-1 flex-shrink-0"
      >
        <LogOut size={11} /> Exit Demo
      </button>
    </div>
  );
}
