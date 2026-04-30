"use client";

/**
 * Dashboard client — brutalist redesign.
 *
 * Same vocabulary as the home page: pure black, sharp 90° corners,
 * Geist Mono for every datum, hard horizontal rules, brand green
 * #7CB342 used only for live indicators + primary CTAs.
 *
 * Layout is a 12-col grid: 3-col tracked-brands rail on the left,
 * 9-col detail panel on the right. The detail panel is a single
 * scrollable column with section dividers — the score header, the
 * engine table, the readiness rollup, the mention tally, the
 * playbook list. No nested rounded boxes, no gradient mush.
 */

import Link from "next/link";
import { useState } from "react";
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
  { key: "chatgpt", label: "CHATGPT" },
  { key: "gemini", label: "GEMINI" },
  { key: "perplexity", label: "PERPLEXITY" },
  { key: "claude", label: "CLAUDE" },
  { key: "grok", label: "GROK" },
];

const SOURCE_LABEL: Record<string, string> = {
  reddit: "REDDIT",
  hackernews: "HN",
  youtube: "YOUTUBE",
  x: "X",
};

function scoreColor(n: number): string {
  if (n >= 70) return "text-emerald-400";
  if (n >= 40) return "text-amber-300";
  return "text-rose-400";
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
    if (!confirm(`Stop tracking ${slug}?`)) return;
    setBusy("untrack");
    try {
      await fetch(`/api/mentions?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      window.location.reload();
    } finally {
      setBusy(null);
    }
  }

  if (tracked.length === 0) {
    return (
      <div className="border border-white/15 max-w-2xl">
        <div className="border-b border-white/15 px-6 py-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.25em] text-[#7CB342]">
          <span>§ ONBOARDING / 30 SECONDS</span>
        </div>
        <div className="px-6 py-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] leading-[1.05] mb-4">
            Track your first brand.
          </h2>
          <p className="text-[14px] text-zinc-400 leading-relaxed mb-7 max-w-lg">
            Paste a domain. We&apos;ll run the 5-engine grade, start
            the mention tracker on Reddit / HN / YouTube / X, and
            pin it here so you can come back to the playbook anytime.
          </p>

          {err && (
            <div className="mb-5 border border-rose-500/40 bg-rose-500/[0.06] px-4 py-2.5 text-[12px] font-mono text-rose-300">
              ERROR / {err}
            </div>
          )}

          <form onSubmit={addBrand} className="flex flex-col sm:flex-row max-w-lg">
            <input
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              placeholder="stripe.com"
              disabled={busy === "add"}
              className="flex-1 bg-transparent border border-white/30 px-4 h-12 text-[14px] text-white placeholder:text-zinc-600 outline-none focus:border-[#7CB342] disabled:opacity-50 transition-colors font-mono"
            />
            <button
              type="submit"
              disabled={busy === "add" || !addInput.trim()}
              className="h-12 px-6 bg-[#7CB342] hover:bg-[#8BC34A] text-black font-bold text-[13px] tracking-[-0.01em] disabled:opacity-50 transition-colors border border-[#7CB342] sm:border-l-0 whitespace-nowrap"
            >
              {busy === "add" ? "SCANNING…" : "TRACK + SCAN →"}
            </button>
          </form>

          <p className="mt-5 text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-600">
            OR RUN UNSIGNED AT{" "}
            <Link
              href="/"
              className="text-[#7CB342] hover:text-[#8BC34A] underline underline-offset-2"
            >
              CABBGE.COM
            </Link>{" "}
            FIRST
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-white/15">
      <div className="grid grid-cols-12">
        {/* RAIL — tracked brands */}
        <aside className="col-span-12 lg:col-span-3 lg:border-r border-white/15 lg:border-b-0 border-b">
          <form
            onSubmit={addBrand}
            className="border-b border-white/15 p-3"
          >
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-2">
              TRACK ANOTHER
            </div>
            <div className="flex">
              <input
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                placeholder="stripe.com"
                disabled={busy === "add"}
                className="flex-1 bg-transparent border border-white/20 px-3 h-9 text-[12.5px] text-white placeholder:text-zinc-600 outline-none focus:border-[#7CB342] disabled:opacity-50 transition-colors font-mono min-w-0"
              />
              <button
                type="submit"
                disabled={busy === "add" || !addInput.trim()}
                className="h-9 px-3 bg-[#7CB342] hover:bg-[#8BC34A] text-black font-bold text-[11px] tracking-[-0.01em] disabled:opacity-50 transition-colors border border-[#7CB342] border-l-0 whitespace-nowrap"
              >
                {busy === "add" ? "…" : "ADD"}
              </button>
            </div>
          </form>

          <ul>
            {tracked.map((t) => {
              const g = grades[t.brandSlug];
              const m = mentions[t.brandSlug];
              const active = activeSlug === t.brandSlug;
              return (
                <li
                  key={t.brandSlug}
                  onClick={() => setActiveSlug(t.brandSlug)}
                  className={`group cursor-pointer border-b border-white/10 px-4 py-3 transition-colors ${
                    active
                      ? "bg-[#7CB342]/[0.08] border-l-2 border-l-[#7CB342]"
                      : "hover:bg-white/[0.02] border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[13px] font-bold tracking-tight truncate min-w-0">
                      {t.displayName || t.brandSlug}
                    </div>
                    <div
                      className={`text-[20px] font-bold tabular-nums leading-none shrink-0 ${
                        g ? scoreColor(g.scores.overall) : "text-zinc-700"
                      }`}
                    >
                      {g ? g.scores.overall : "—"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 font-mono text-[10px]">
                    <span className="text-zinc-600 truncate min-w-0">
                      {t.brandSlug}
                    </span>
                    {m && m.total > 0 && (
                      <span className="text-[#7CB342] shrink-0">
                        +{m.total} 7D
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* DETAIL */}
        <section className="col-span-12 lg:col-span-9">
          {err && (
            <div className="border-b border-rose-500/40 bg-rose-500/[0.06] px-5 py-3 text-[12px] font-mono text-rose-300">
              ERROR / {err}
            </div>
          )}

          {!grade ? (
            <div className="px-6 py-10">
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-3">
                NO GRADE YET
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-1">
                {tracked.find((t) => t.brandSlug === activeSlug)
                  ?.displayName || activeSlug}
              </h2>
              <p className="text-[13px] text-zinc-400 mb-6">
                Run a fresh scan to populate the playbook.
              </p>
              <button
                onClick={rescan}
                disabled={busy === "rescan"}
                className="h-11 px-5 bg-[#7CB342] hover:bg-[#8BC34A] text-black font-bold text-[13px] tracking-[-0.01em] disabled:opacity-50 transition-colors border border-[#7CB342]"
              >
                {busy === "rescan" ? "SCANNING…" : "RUN 5-ENGINE SCAN →"}
              </button>
            </div>
          ) : (
            <>
              {/* HEADER */}
              <div className="border-b border-white/15 px-5 sm:px-7 py-7 sm:py-9 flex items-start justify-between gap-6 flex-wrap">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#7CB342] mb-2">
                    {grade.category || "BRAND"}
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-bold tracking-[-0.03em] leading-[0.95] truncate">
                    {grade.brand}
                  </h1>
                  <div className="mt-3 text-[11px] font-mono uppercase tracking-[0.15em] text-zinc-500">
                    {grade.slug}
                    <span className="mx-2">/</span>
                    SCANNED{" "}
                    {new Date(grade.scannedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={`text-6xl sm:text-7xl font-bold tabular-nums leading-none tracking-[-0.04em] ${scoreColor(
                      grade.scores.overall,
                    )}`}
                  >
                    {grade.scores.overall}
                  </div>
                  <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-500 mt-2">
                    / 100
                  </div>
                </div>
              </div>

              {/* ENGINE TABLE */}
              <div className="border-b border-white/15">
                <div className="px-5 sm:px-7 pt-6 pb-3 text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">
                  §01 / PER-ENGINE
                </div>
                <table className="w-full font-mono text-[13px]">
                  <thead>
                    <tr className="border-y border-white/15 text-[9.5px] uppercase tracking-[0.2em] text-zinc-500">
                      <th className="text-left px-5 sm:px-7 py-2.5 font-normal">
                        ENGINE
                      </th>
                      <th className="text-right px-5 py-2.5 font-normal">
                        SCORE
                      </th>
                      <th className="text-right px-5 sm:px-7 py-2.5 font-normal w-1/3">
                        BAR
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ENGINE_LABELS.map(({ key, label }) => {
                      const v = grade.scores[key];
                      if (v === undefined) return null;
                      const n = v as number;
                      return (
                        <tr
                          key={key}
                          className="border-b border-white/10 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-5 sm:px-7 py-3 font-bold tracking-tight">
                            {label}
                          </td>
                          <td
                            className={`px-5 py-3 text-right tabular-nums font-bold ${scoreColor(n)}`}
                          >
                            {n}
                          </td>
                          <td className="px-5 sm:px-7 py-3">
                            <div className="h-2 bg-white/5 relative">
                              <div
                                className={`absolute inset-y-0 left-0 ${
                                  n >= 70
                                    ? "bg-emerald-400"
                                    : n >= 40
                                      ? "bg-amber-300"
                                      : "bg-rose-400"
                                }`}
                                style={{ width: `${Math.min(100, n)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* SECONDARY SCORES */}
              <div className="border-b border-white/15 grid grid-cols-3 divide-x divide-white/15">
                {[
                  { label: "READINESS", value: grade.scores.readiness },
                  { label: "MENTIONS", value: grade.scores.mentions },
                  { label: "OFF-DOMAIN", value: grade.scores.offDomain },
                ]
                  .filter((s) => s.value !== undefined)
                  .map((s) => (
                    <div key={s.label} className="px-5 sm:px-7 py-5">
                      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">
                        {s.label}
                      </div>
                      <div
                        className={`text-3xl sm:text-4xl font-bold tabular-nums tracking-[-0.03em] mt-1.5 ${scoreColor(
                          s.value as number,
                        )}`}
                      >
                        {s.value}
                      </div>
                    </div>
                  ))}
              </div>

              {/* ACTIONS */}
              <div className="border-b border-white/15 px-5 sm:px-7 py-4 flex flex-wrap items-center gap-0">
                <button
                  onClick={rescan}
                  disabled={busy === "rescan"}
                  className="h-10 px-4 bg-[#7CB342] hover:bg-[#8BC34A] text-black font-bold text-[12px] tracking-[-0.01em] disabled:opacity-50 transition-colors border border-[#7CB342] whitespace-nowrap"
                >
                  {busy === "rescan" ? "SCANNING…" : "↻ RE-SCAN"}
                </button>
                <Link
                  href={`/visibility/${grade.slug}`}
                  className="h-10 px-4 border border-white/30 hover:border-white text-white font-bold text-[12px] tracking-[-0.01em] -ml-px flex items-center transition-colors whitespace-nowrap"
                >
                  PUBLIC SCORECARD ↗
                </Link>
                <Link
                  href="/dashboard/mentions"
                  className="h-10 px-4 border border-white/30 hover:border-white text-white font-bold text-[12px] tracking-[-0.01em] -ml-px flex items-center transition-colors whitespace-nowrap"
                >
                  MENTIONS
                </Link>
                <Link
                  href="/dashboard/outreach"
                  className="h-10 px-4 border border-white/30 hover:border-white text-white font-bold text-[12px] tracking-[-0.01em] -ml-px flex items-center transition-colors whitespace-nowrap"
                >
                  OUTREACH
                </Link>
                <button
                  onClick={() => activeSlug && untrack(activeSlug)}
                  disabled={busy === "untrack"}
                  className="h-10 px-4 ml-auto text-zinc-500 hover:text-rose-400 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors"
                >
                  UNTRACK
                </button>
              </div>

              {/* MENTIONS */}
              {mention && (
                <div className="border-b border-white/15">
                  <div className="px-5 sm:px-7 py-5 flex items-baseline justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">
                        §02 / MENTIONS / LAST 7 DAYS
                      </div>
                      <div className="text-3xl sm:text-4xl font-bold tabular-nums tracking-[-0.03em] mt-1.5">
                        {mention.total}{" "}
                        <span className="text-[14px] text-zinc-500 font-mono uppercase tracking-[0.15em] ml-1">
                          NEW
                        </span>
                      </div>
                    </div>
                    <Link
                      href="/dashboard/mentions"
                      className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-400 hover:text-[#7CB342] transition-colors"
                    >
                      VIEW ALL →
                    </Link>
                  </div>
                  {mention.total > 0 && (
                    <div className="px-5 sm:px-7 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-0 border-t border-white/10">
                      {Object.entries(mention.bySource).map(
                        ([s, n], i, arr) => (
                          <div
                            key={s}
                            className={`py-3 px-2 ${
                              i < arr.length - 1
                                ? "border-r border-white/10"
                                : ""
                            }`}
                          >
                            <div className="text-[9.5px] font-mono uppercase tracking-[0.25em] text-zinc-500">
                              {SOURCE_LABEL[s] || s.toUpperCase()}
                            </div>
                            <div className="text-2xl font-bold tabular-nums mt-1 text-[#7CB342]">
                              {n}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PLAYBOOK */}
              {playbook.length > 0 && (
                <div>
                  <div className="px-5 sm:px-7 py-5 flex items-baseline justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#7CB342]">
                        §03 / PLAYBOOK
                      </div>
                      <h3 className="text-2xl font-bold tracking-tight mt-1">
                        Per-engine plays.
                      </h3>
                      <p className="text-[12px] text-zinc-500 mt-1 max-w-md">
                        Each fix targets a specific engine&apos;s
                        ranking signals. Ranked by impact.
                      </p>
                    </div>
                    <Link
                      href={`/visibility/${grade.slug}`}
                      className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-400 hover:text-[#7CB342] transition-colors"
                    >
                      FULL SCORECARD →
                    </Link>
                  </div>
                  <ul className="border-t border-white/15">
                    {playbook.map((a, i) => (
                      <li
                        key={i}
                        className="border-b border-white/10 px-5 sm:px-7 py-5 hover:bg-white/[0.02] transition-colors grid grid-cols-12 gap-4"
                      >
                        <div className="col-span-12 sm:col-span-2 flex flex-col gap-1">
                          <div className="text-[10px] font-mono text-zinc-600">
                            /{String(i + 1).padStart(2, "0")}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <EnginePill engine={a.engine} />
                            <PriorityPill priority={a.priority} />
                          </div>
                        </div>
                        <div className="col-span-12 sm:col-span-10">
                          <div className="text-[14px] font-bold tracking-tight mb-1.5">
                            {a.title}
                          </div>
                          <p className="text-[13px] text-zinc-400 leading-relaxed">
                            {a.rationale}
                          </p>
                          {a.estimatedLift && (
                            <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                              <span className="text-[#7CB342]">▲</span> LIFT /{" "}
                              {a.estimatedLift}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function EnginePill({ engine }: { engine: string }) {
  const all = engine === "all";
  return (
    <span
      className={`text-[9.5px] font-mono uppercase tracking-[0.2em] px-1.5 py-0.5 font-bold ${
        all
          ? "bg-white text-black"
          : "bg-[#7CB342] text-black"
      }`}
    >
      {engine.toUpperCase()}
    </span>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const cls =
    priority === "high"
      ? "border-rose-400 text-rose-300"
      : priority === "medium"
        ? "border-amber-400 text-amber-300"
        : "border-zinc-600 text-zinc-500";
  return (
    <span
      className={`text-[9.5px] font-mono uppercase tracking-[0.2em] px-1.5 py-0.5 border ${cls}`}
    >
      {priority.toUpperCase()}
    </span>
  );
}
