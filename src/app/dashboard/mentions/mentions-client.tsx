"use client";

import { useState } from "react";

type Source = "reddit" | "hackernews" | "youtube" | "x";

interface Mention {
  source: Source;
  sourceId: string;
  url: string;
  title?: string;
  excerpt?: string;
  author?: string;
  score?: number;
  comments?: number;
  postedAt?: string;
}

interface TrackedBrand {
  brandSlug: string;
  displayName: string | null;
  lastRefreshedAt: string | null;
  notifyWeekly: boolean;
}

interface ScanResponse {
  ok: boolean;
  scanned: boolean;
  total?: number;
  newSinceLastScan?: number;
  bySource?: Record<Source, number>;
  errors?: Array<{ source: Source; error: string }>;
  mentions?: Mention[];
  error?: string;
}

interface ListResponse {
  tracked: { brand_slug: string; display_name: string | null } | null;
  mentions: Mention[];
}

const SOURCE_LABEL: Record<Source, string> = {
  reddit: "Reddit",
  hackernews: "HN",
  youtube: "YouTube",
  x: "X",
};

export function MentionsClient({
  initialTracked,
}: {
  initialTracked: TrackedBrand[];
}) {
  const [tracked, setTracked] = useState<TrackedBrand[]>(initialTracked);
  const [activeSlug, setActiveSlug] = useState<string | null>(
    initialTracked[0]?.brandSlug ?? null,
  );
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [filter, setFilter] = useState<Source | "all">("all");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [addInput, setAddInput] = useState("");

  async function loadMentions(slug: string) {
    setLoading(true);
    setErr(null);
    setMentions([]);
    try {
      const res = await fetch(
        `/api/mentions?slug=${encodeURIComponent(slug)}`,
      );
      const data = (await res.json()) as ListResponse;
      setMentions(data.mentions || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }

  async function selectBrand(slug: string) {
    setActiveSlug(slug);
    await loadMentions(slug);
  }

  async function refresh(slug: string) {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/mentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, refresh: true }),
      });
      const data = (await res.json()) as ScanResponse;
      if (!res.ok) {
        setErr(data.error || "Refresh failed");
        return;
      }
      setMentions(data.mentions || []);
      setTracked((prev) =>
        prev.map((t) =>
          t.brandSlug === slug
            ? { ...t, lastRefreshedAt: new Date().toISOString() }
            : t,
        ),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setLoading(false);
    }
  }

  async function addBrand(e: React.FormEvent) {
    e.preventDefault();
    const raw = addInput.trim().toLowerCase();
    if (!raw) return;
    const slug = raw
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
    if (!slug) return;

    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/mentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = (await res.json()) as ScanResponse;
      if (!res.ok) {
        setErr(data.error || "Failed to track brand");
        return;
      }
      const brandLabel = slug.split(".")[0];
      setTracked((prev) => [
        {
          brandSlug: slug,
          displayName: brandLabel,
          lastRefreshedAt: new Date().toISOString(),
          notifyWeekly: true,
        },
        ...prev.filter((t) => t.brandSlug !== slug),
      ]);
      setActiveSlug(slug);
      setMentions(data.mentions || []);
      setAddInput("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to track brand");
    } finally {
      setLoading(false);
    }
  }

  async function untrack(slug: string) {
    setLoading(true);
    try {
      await fetch(`/api/mentions?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      const remaining = tracked.filter((t) => t.brandSlug !== slug);
      setTracked(remaining);
      if (activeSlug === slug) {
        const next = remaining[0]?.brandSlug ?? null;
        setActiveSlug(next);
        setMentions([]);
        if (next) await loadMentions(next);
      }
    } finally {
      setLoading(false);
    }
  }

  const visible = filter === "all" ? mentions : mentions.filter((m) => m.source === filter);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <aside className="space-y-3">
        <form
          onSubmit={addBrand}
          className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-2"
        >
          <label className="text-[11px] text-zinc-500 uppercase tracking-wide">
            Track a brand
          </label>
          <input
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            placeholder="stripe.com"
            disabled={loading}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 disabled:opacity-50 font-mono"
          />
          <button
            type="submit"
            disabled={loading || !addInput.trim()}
            className="w-full px-3 h-8 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold transition disabled:opacity-50"
          >
            Add + scan
          </button>
        </form>

        <ul className="space-y-1">
          {tracked.map((t) => (
            <li
              key={t.brandSlug}
              className={`rounded-md border px-3 py-2 cursor-pointer transition ${
                activeSlug === t.brandSlug
                  ? "border-zinc-500 bg-zinc-900"
                  : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
              }`}
              onClick={() => selectBrand(t.brandSlug)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm text-zinc-100 font-medium truncate">
                    {t.displayName || t.brandSlug}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">
                    {t.brandSlug}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    untrack(t.brandSlug);
                  }}
                  className="text-[10px] text-zinc-600 hover:text-zinc-300"
                  title="Untrack"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
          {tracked.length === 0 && (
            <li className="text-xs text-zinc-500 px-1">
              No brands yet. Add one above.
            </li>
          )}
        </ul>
      </aside>

      <section className="space-y-4">
        {err && (
          <div className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {err}
          </div>
        )}

        {activeSlug ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1 flex-wrap">
                {(["all", "reddit", "hackernews", "youtube", "x"] as const).map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => setFilter(s)}
                      className={`text-[11px] px-2 h-7 rounded border transition ${
                        filter === s
                          ? "border-zinc-500 bg-zinc-900 text-zinc-100"
                          : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      {s === "all"
                        ? `All${mentions.length ? ` (${mentions.length})` : ""}`
                        : SOURCE_LABEL[s as Source]}
                    </button>
                  ),
                )}
              </div>
              <button
                onClick={() => refresh(activeSlug)}
                disabled={loading}
                className="text-xs px-3 h-8 rounded border border-zinc-800 hover:border-zinc-600 text-zinc-200 disabled:opacity-50"
              >
                {loading ? "Scanning…" : "Refresh now · 1 cr"}
              </button>
            </div>

            {visible.length === 0 ? (
              <div className="rounded-md border border-zinc-800 bg-zinc-950/60 px-4 py-10 text-center text-sm text-zinc-500">
                {loading
                  ? "Loading…"
                  : "No mentions yet. Click refresh to fetch."}
              </div>
            ) : (
              <ul className="space-y-2">
                {visible.map((m) => (
                  <li
                    key={`${m.source}-${m.sourceId}`}
                    className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500">
                          <span>{SOURCE_LABEL[m.source]}</span>
                          {m.author && (
                            <span className="text-zinc-600 normal-case tracking-normal">
                              · {m.author}
                            </span>
                          )}
                          {m.postedAt && (
                            <span className="text-zinc-600 normal-case tracking-normal">
                              · {new Date(m.postedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-sm text-zinc-100 hover:text-white mt-1 font-medium"
                        >
                          {m.title || m.url}
                        </a>
                        {m.excerpt && (
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-3">
                            {m.excerpt}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 text-[10px] text-zinc-500">
                        {(m.score ?? 0) > 0 && (
                          <div>{m.score} pts</div>
                        )}
                        {(m.comments ?? 0) > 0 && (
                          <div>{m.comments} cmts</div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="rounded-md border border-zinc-800 bg-zinc-950/60 px-4 py-10 text-center text-sm text-zinc-500">
            Track your first brand to see mentions.
          </div>
        )}
      </section>
    </div>
  );
}
