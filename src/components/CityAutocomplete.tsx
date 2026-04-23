"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface City {
  name: string;
  state: string;
}

interface Props {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Dynamic Indian city autocomplete. Hits /api/cities/search with a
 * 250ms debounce so typing feels instant while we don't spam the LLM.
 *
 * No hardcoded list — suggestions come live from the model on each
 * distinct prefix (cached server-side for 10 minutes per prefix).
 */
export function CityAutocomplete({
  value,
  onChange,
  placeholder = "City — start typing…",
  className = "",
  autoFocus = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [hits, setHits] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    // Don't refetch if the user has landed on exactly a suggestion name
    // (common after clicking one — prevents a flash of results).
    if (hits.some((h) => h.name === trimmed)) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cities/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.cities)) setHits(data.cities);
      } catch { /* aborted or offline — ignore */ }
      finally { setLoading(false); }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const pick = (city: City) => {
    onChange(city.name);
    setQuery(city.name);
    setOpen(false);
    setActiveIdx(-1);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            onChange(v);
            setOpen(true);
            setActiveIdx(-1);
          }}
          onKeyDown={(e) => {
            if (!open || hits.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => Math.min(i + 1, hits.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => Math.max(i - 1, -1));
            } else if (e.key === "Enter" && activeIdx >= 0) {
              e.preventDefault();
              pick(hits[activeIdx]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="w-full pl-8 pr-8 bg-zinc-900/80 border border-white/[0.06] text-[13px] h-9 rounded-md text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#7CB342]/40"
        />
        {loading && (
          <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 animate-spin" />
        )}
      </div>

      {open && hits.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-md border border-white/[0.08] bg-zinc-900 shadow-2xl overflow-hidden">
          {hits.map((c, i) => (
            <button
              key={`${c.name}-${c.state}`}
              type="button"
              onClick={() => pick(c)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[13px] transition-colors ${
                i === activeIdx ? "bg-zinc-800 text-zinc-100" : "text-zinc-300 hover:bg-zinc-800/60"
              }`}
            >
              <span>{c.name}</span>
              <span className="text-[11px] text-zinc-500">{c.state}</span>
            </button>
          ))}
        </div>
      )}
      {open && !loading && query.trim().length >= 2 && hits.length === 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-md border border-white/[0.08] bg-zinc-900 px-3 py-2 text-[12px] text-zinc-500">
          No Indian city matches. Keep typing, or leave as-is.
        </div>
      )}
    </div>
  );
}
