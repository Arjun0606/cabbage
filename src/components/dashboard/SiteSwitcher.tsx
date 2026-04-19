"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Globe, Check, Plus, Building2, Home, MapPin } from "lucide-react";

interface Site {
  url: string;
  label: string;
  type?: "corporate" | "project" | "nri" | "segment" | "other";
}

interface Props {
  primarySite?: { url: string; label: string };
  additionalSites: Site[];
  activeSiteUrl: string;
  onSwitch: (url: string) => void;
  onAddSite?: () => void;
}

function typeIcon(type?: string) {
  switch (type) {
    case "project": return <Home size={13} />;
    case "nri": return <MapPin size={13} />;
    case "corporate":
    default: return <Building2 size={13} />;
  }
}

/**
 * SiteSwitcher — top-of-dashboard selector for which site the user
 * is currently viewing scans/audits/GEO data for.
 *
 * Real estate companies often have many sites (corporate + project
 * microsites + NRI country-specific sites). Each needs independent
 * tracking. This switcher makes the active site explicit.
 */
export function SiteSwitcher({ primarySite, additionalSites, activeSiteUrl, onSwitch, onAddSite }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Build the combined site list
  const allSites: Site[] = [];
  if (primarySite) allSites.push({ ...primarySite, type: "corporate" });
  additionalSites.forEach((s) => allSites.push(s));

  const activeSite = allSites.find((s) => s.url === activeSiteUrl) || allSites[0];

  // Hide switcher entirely if there's only one site
  if (allSites.length <= 1) {
    return null;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-8 px-3 rounded-lg bg-zinc-900/80 border border-white/[0.08] text-[12px] text-zinc-300 hover:bg-zinc-800 hover:border-white/[0.12] transition-all"
      >
        <Globe size={13} className="text-zinc-500" />
        <span className="font-medium truncate max-w-[200px]">{activeSite?.label || "Select site"}</span>
        <span className="text-zinc-500 text-[10px] tabular-nums">{allSites.length}</span>
        <ChevronDown size={13} className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-9 left-0 z-50 min-w-[280px] rounded-lg bg-zinc-900 border border-white/[0.08] shadow-2xl overflow-hidden">
          <div className="max-h-[320px] overflow-y-auto py-1">
            {allSites.map((site) => {
              const isActive = site.url === activeSiteUrl;
              const typeLabel =
                site.type === "project" ? "Project" :
                site.type === "nri" ? "NRI" :
                site.type === "segment" ? "Segment" :
                site.type === "other" ? "Other" :
                "Corporate";
              return (
                <button
                  key={site.url}
                  onClick={() => { onSwitch(site.url); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    isActive ? "bg-[#7CB342]/10" : "hover:bg-zinc-800"
                  }`}
                >
                  <span className={isActive ? "text-[#7CB342]" : "text-zinc-500"}>
                    {typeIcon(site.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[12px] font-medium truncate ${isActive ? "text-zinc-100" : "text-zinc-300"}`}>
                      {site.label}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate">
                      {site.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </div>
                  </div>
                  <span className="text-[9px] text-zinc-600 uppercase tracking-wide flex-shrink-0">{typeLabel}</span>
                  {isActive && <Check size={12} className="text-[#7CB342] flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          {onAddSite && (
            <div className="border-t border-white/[0.06]">
              <button
                onClick={() => { onAddSite(); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <Plus size={12} />
                Add another site
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
