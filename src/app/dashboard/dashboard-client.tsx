"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Plus,
  RefreshCw,
  ExternalLink,
  Send,
  MessageSquare,
  X,
  Loader2,
  Search,
  ArrowRight,
} from "lucide-react";
import type { PlaybookAction } from "@/lib/agents/playbook";

interface Tracked {
  brandSlug: string;
  displayName: string | null;
  lastRefreshedAt: string | null;
  notifyWeekly: boolean;
  createdAt: string;
}

interface GradeSummary {
  slug: string;
  brand: string;
  category: string;
  scannedAt: string;
  scores: {
    overall: number;
    chatgpt: number;
    gemini: number;
    perplexity?: number;
    claude?: number;
    grok?: number;
    readiness: number;
    mentions: number;
    offDomain?: number;
  };
}

interface MentionTally {
  brandSlug: string;
  total: number;
  bySource: Record<string, number>;
  newestAt: string | null;
}

const ENGINE_LABELS: Array<{ key: keyof GradeSummary["scores"]; label: string }> = [
  { key: "chatgpt", label: "ChatGPT" },
  { key: "gemini", label: "Gemini" },
  { key: "perplexity", label: "Perplexity" },
  { key: "claude", label: "Claude" },
  { key: "grok", label: "Grok" },
];

const SOURCE_LABEL: Record<string, string> = {
  reddit: "Reddit",
  hackernews: "HN",
  youtube: "YouTube",
  x: "X",
};

function scoreColor(n: number): string {
  if (n >= 70) return "text-emerald-400";
  if (n >= 40) return "text-amber-300";
  return "text-rose-300";
}

function scoreRing(n: number): string {
  if (n >= 70) return "from-emerald-500/20 to-emerald-500/0 border-emerald-500/30";
  if (n >= 40) return "from-amber-500/20 to-amber-500/0 border-amber-500/30";
  return "from-rose-500/20 to-rose-500/0 border-rose-500/30";
}

export function DashboardClient({
  tracked,
  grades,
  mentions,
  playbooks,
}: {
  tracked: Tracked[];
  grades: Record<string, GradeSummary | null>;
  mentions: Record<string, MentionTally>;
  playbooks: Record<string, PlaybookAction[]>;
}) {
  const [activeSlug, setActiveSlug] = useState<string | null>(
    tracked[0]?.brandSlug ?? null,
  );
  const [addInput, setAddInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const grade = activeSlug ? grades[activeSlug] : null;
  const mention = activeSlug ? mentions[activeSlug] : null;
  const playbook = activeSlug ? playbooks[activeSlug] || [] : [];

  async function addBrand(e: React.FormEvent) {
    e.preventDefault();
    const raw = addInput.trim().toLowerCase();
    if (!raw) return;
    const slug = raw
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
    if (!slug) return;

    setBusy("add");
    setErr(null);
    try {
      const res = await fetch("/api/mentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || "Failed to track brand");
        return;
      }
      setAddInput("");
      window.location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function rescan() {
    if (!activeSlug || !grade) return;
    setBusy("rescan");
    setErr(null);
    try {
      const url = `https://${activeSlug}`;
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || "Re-scan failed");
        return;
      }
      window.location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Re-scan failed");
    } finally {
      setBusy(null);
    }
  }

  async function untrack(slug: string) {
    setBusy("untrack");
    try {
      await fetch(`/api/mentions?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      const remaining = tracked.filter((t) => t.brandSlug !== slug);
      if (activeSlug === slug) {
        setActiveSlug(remaining[0]?.brandSlug ?? null);
      }
      window.location.reload();
    } finally {
      setBusy(null);
    }
  }

  if (tracked.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-8 sm:p-10 max-w-2xl">
        <div className="text-[10px] uppercase tracking-[0.25em] text-[#7CB342] font-semibold mb-3">
          Onboarding · 30 seconds
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Track your first brand
        </h2>
        <p className="text-[14px] text-zinc-400 leading-relaxed mb-6">
          Paste a domain. We&apos;ll run the 5-engine grade, start the
          mention tracker on Reddit / HN / YouTube / X, and pin it
          here so you can come back to the playbook anytime.
        </p>

        {err && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-4 py-2.5 text-[12px] text-red-300">
            {err}
          </div>
        )}

        <form onSubmit={addBrand} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              placeholder="stripe.com"
              disabled={busy === "add"}
              className="w-full bg-zinc-900/80 border border-white/[0.06] rounded-lg pl-9 pr-4 h-11 text-[14px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[#7CB342]/40 disabled:opacity-50 transition-colors font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={busy === "add" || !addInput.trim()}
            className="h-11 px-5 rounded-lg bg-[#7CB342] hover:bg-[#8BC34A] active:scale-[0.97] text-zinc-950 text-[13px] font-semibold transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center gap-1.5"
          >
            {busy === "add" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Scanning…
              </>
            ) : (
              <>
                Track + scan
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </form>

        <p className="mt-4 text-[11px] text-zinc-500">
          Or run an unsigned scan at the{" "}
          <Link href="/" className="text-[#7CB342] hover:text-[#8BC34A]">
            home page
          </Link>{" "}
          first — same 5 engines, public scorecard at /visibility/[domain].
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      {/* sidebar — tracked brands list */}
      <aside className="space-y-3">
        <form
          onSubmit={addBrand}
          className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-3 space-y-2"
        >
          <label className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-semibold">
            Track another
          </label>
          <div className="relative">
            <Plus
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              placeholder="stripe.com"
              disabled={busy === "add"}
              className="w-full bg-zinc-950/60 border border-white/[0.06] rounded-md pl-7 pr-3 h-8 text-[12.5px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[#7CB342]/40 disabled:opacity-50 transition-colors font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={busy === "add" || !addInput.trim()}
            className="w-full h-8 rounded-md bg-[#7CB342] hover:bg-[#8BC34A] active:scale-[0.97] text-zinc-950 text-[11.5px] font-semibold transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-1"
          >
            {busy === "add" ? (
              <>
                <Loader2 size={11} className="animate-spin" />
                Scanning…
              </>
            ) : (
              "Add + scan"
            )}
          </button>
        </form>

        <ul className="space-y-1">
          {tracked.map((t) => {
            const g = grades[t.brandSlug];
            const m = mentions[t.brandSlug];
            const active = activeSlug === t.brandSlug;
            return (
              <li
                key={t.brandSlug}
                className={`group rounded-lg border px-3 py-2.5 cursor-pointer transition-all ${
                  active
                    ? "border-[#7CB342]/30 bg-[#7CB342]/[0.06]"
                    : "border-white/[0.06] bg-zinc-900/40 hover:border-white/10 hover:bg-zinc-900/60"
                }`}
                onClick={() => setActiveSlug(t.brandSlug)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-zinc-100 font-semibold truncate">
                      {t.displayName || t.brandSlug}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate font-mono mt-0.5">
                      {t.brandSlug}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-[18px] font-bold tabular-nums leading-none ${
                        g ? scoreColor(g.scores.overall) : "text-zinc-700"
                      }`}
                    >
                      {g ? g.scores.overall : "—"}
                    </div>
                    {m && m.total > 0 && (
                      <div className="text-[9.5px] text-zinc-500 mt-1">
                        {m.total} new
                      </div>
                    )}
                  </div>
                </div>
                {active && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      untrack(t.brandSlug);
                    }}
                    className="mt-2 text-[10px] text-zinc-600 hover:text-rose-400 flex items-center gap-1 transition-colors"
                  >
                    <X size={10} /> Untrack
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </aside>

      {/* main content */}
      <section className="space-y-5">
        {err && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[12.5px] text-red-300">
            {err}
          </div>
        )}

        {!grade ? (
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-6 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-semibold">
                No grade yet
              </div>
              <div className="text-[15px] text-zinc-100 font-semibold mt-1">
                {tracked.find((t) => t.brandSlug === activeSlug)?.displayName ||
                  activeSlug}
              </div>
              <p className="text-[12.5px] text-zinc-400 mt-1">
                Run a fresh scan to populate the playbook.
              </p>
            </div>
            <button
              onClick={rescan}
              disabled={busy === "rescan"}
              className="h-10 px-4 rounded-lg bg-[#7CB342] hover:bg-[#8BC34A] active:scale-[0.97] text-zinc-950 text-[13px] font-semibold transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
            >
              {busy === "rescan" ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Scanning…
                </>
              ) : (
                <>
                  <RefreshCw size={13} />
                  Run 5-engine scan
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            {/* score header card */}
            <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden">
              <div className="p-5 sm:p-6 flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-semibold">
                    {grade.category || "Brand"}
                  </div>
                  <div className="text-2xl font-bold text-zinc-100 truncate mt-1 tracking-tight">
                    {grade.brand}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1.5 font-mono">
                    Last scanned{" "}
                    {new Date(grade.scannedAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div
                  className={`shrink-0 rounded-2xl border bg-gradient-to-br ${scoreRing(
                    grade.scores.overall,
                  )} p-4 flex flex-col items-center min-w-[100px]`}
                >
                  <div
                    className={`text-4xl font-bold tabular-nums leading-none ${scoreColor(
                      grade.scores.overall,
                    )}`}
                  >
                    {grade.scores.overall}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 mt-2 font-semibold">
                    overall
                  </div>
                </div>
              </div>

              {/* engine grid */}
              <div className="border-t border-white/[0.04] p-4 grid grid-cols-3 sm:grid-cols-5 gap-2">
                {ENGINE_LABELS.map(({ key, label }) => {
                  const v = grade.scores[key];
                  if (v === undefined) return null;
                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-white/[0.04] bg-zinc-950/40 p-2.5"
                    >
                      <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
                        {label}
                      </div>
                      <div
                        className={`text-lg font-bold tabular-nums mt-1 ${scoreColor(
                          v as number,
                        )}`}
                      >
                        {v}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* secondary scores */}
              <div className="border-t border-white/[0.04] px-4 py-3 grid grid-cols-3 gap-2">
                {[
                  { label: "Readiness", value: grade.scores.readiness },
                  { label: "Mentions", value: grade.scores.mentions },
                  { label: "Off-domain", value: grade.scores.offDomain },
                ]
                  .filter((s) => s.value !== undefined)
                  .map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg border border-white/[0.04] bg-zinc-950/40 p-2.5"
                    >
                      <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
                        {s.label}
                      </div>
                      <div
                        className={`text-base font-bold tabular-nums mt-1 ${scoreColor(
                          s.value as number,
                        )}`}
                      >
                        {s.value}
                      </div>
                    </div>
                  ))}
              </div>

              {/* action chips */}
              <div className="border-t border-white/[0.04] p-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={rescan}
                  disabled={busy === "rescan"}
                  className="h-8 px-3 rounded-md bg-[#7CB342] hover:bg-[#8BC34A] active:scale-[0.97] text-zinc-950 text-[11.5px] font-semibold transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center gap-1.5"
                >
                  {busy === "rescan" ? (
                    <>
                      <Loader2 size={11} className="animate-spin" />
                      Scanning…
                    </>
                  ) : (
                    <>
                      <RefreshCw size={11} />
                      Re-scan
                    </>
                  )}
                </button>
                <Link
                  href={`/visibility/${grade.slug}`}
                  className="h-8 px-3 rounded-md border border-white/[0.06] hover:border-white/[0.14] text-[11.5px] text-zinc-200 hover:text-zinc-100 transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink size={11} />
                  Public scorecard
                </Link>
                <Link
                  href="/dashboard/mentions"
                  className="h-8 px-3 rounded-md border border-white/[0.06] hover:border-white/[0.14] text-[11.5px] text-zinc-200 hover:text-zinc-100 transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare size={11} />
                  Mentions
                </Link>
                <Link
                  href="/dashboard/outreach"
                  className="h-8 px-3 rounded-md border border-white/[0.06] hover:border-white/[0.14] text-[11.5px] text-zinc-200 hover:text-zinc-100 transition-colors flex items-center gap-1.5"
                >
                  <Send size={11} />
                  Outreach kit
                </Link>
              </div>
            </div>

            {/* mention rollup */}
            {mention && (
              <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-semibold">
                      Mentions · last 7 days
                    </div>
                    <div className="text-xl font-bold text-zinc-100 mt-1 tracking-tight">
                      {mention.total}{" "}
                      <span className="text-[13px] text-zinc-500 font-normal">
                        new
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/mentions"
                    className="text-[12px] text-zinc-400 hover:text-[#7CB342] transition-colors flex items-center gap-1"
                  >
                    View all <ArrowRight size={11} />
                  </Link>
                </div>
                {mention.total > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(mention.bySource).map(([s, n]) => (
                      <span
                        key={s}
                        className="text-[10.5px] px-2 py-1 rounded-md border border-white/[0.06] bg-zinc-950/40 text-zinc-300 font-mono"
                      >
                        <span className="text-zinc-500 mr-1">
                          {SOURCE_LABEL[s] || s}
                        </span>
                        {n}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* playbook */}
            {playbook.length > 0 && (
              <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden">
                <div className="p-5 flex items-baseline justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-[#7CB342] font-semibold">
                      Action playbook
                    </div>
                    <p className="text-[12px] text-zinc-500 mt-1">
                      Per-engine plays ranked by impact. Each fix
                      targets a specific engine&apos;s ranking signals.
                    </p>
                  </div>
                  <Link
                    href={`/visibility/${grade.slug}`}
                    className="text-[12px] text-zinc-400 hover:text-[#7CB342] transition-colors flex items-center gap-1"
                  >
                    Full scorecard <ArrowRight size={11} />
                  </Link>
                </div>
                <ul className="divide-y divide-white/[0.04] border-t border-white/[0.04]">
                  {playbook.map((a, i) => (
                    <li key={i} className="p-4 hover:bg-zinc-900/30 transition-colors">
                      <div className="flex items-start gap-2 flex-wrap mb-2">
                        <EnginePill engine={a.engine} />
                        <PriorityPill priority={a.priority} />
                        <span className="text-[13px] text-zinc-100 font-semibold min-w-0">
                          {a.title}
                        </span>
                      </div>
                      <p className="text-[12px] text-zinc-400 leading-relaxed">
                        {a.rationale}
                      </p>
                      {a.estimatedLift && (
                        <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
                          <span className="w-1 h-1 rounded-full bg-[#7CB342]" />
                          Lift: {a.estimatedLift}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function EnginePill({ engine }: { engine: string }) {
  const all = engine === "all";
  return (
    <span
      className={`text-[9.5px] uppercase tracking-[0.2em] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
        all
          ? "bg-zinc-800 text-zinc-200"
          : "bg-[#7CB342]/15 text-[#7CB342]"
      }`}
    >
      {engine}
    </span>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const cls =
    priority === "high"
      ? "bg-rose-500/[0.12] text-rose-300"
      : priority === "medium"
        ? "bg-amber-500/[0.12] text-amber-300"
        : "bg-zinc-800 text-zinc-400";
  return (
    <span
      className={`text-[9.5px] uppercase tracking-[0.2em] px-1.5 py-0.5 rounded font-semibold shrink-0 ${cls}`}
    >
      {priority}
    </span>
  );
}
