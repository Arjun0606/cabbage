"use client";

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
      // Server-rendered list updates on next request — full reload for the
      // freshest grade + mention tally without re-implementing the join here.
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

  if (tracked.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-8 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Track your first brand
          </h2>
          <p className="text-sm text-zinc-400 mt-2">
            Paste a domain. We&apos;ll run the 5-engine grade, start the
            mention tracker, and save it to this dashboard.
          </p>
        </div>
        {err && (
          <div className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {err}
          </div>
        )}
        <form onSubmit={addBrand} className="flex gap-2">
          <input
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            placeholder="stripe.com"
            disabled={busy === "add"}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 disabled:opacity-50 font-mono"
          />
          <button
            type="submit"
            disabled={busy === "add" || !addInput.trim()}
            className="px-4 h-10 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-semibold transition disabled:opacity-50"
          >
            {busy === "add" ? "Adding…" : "Track + scan"}
          </button>
        </form>
        <p className="text-[11px] text-zinc-500">
          Or run an unsigned grade at the{" "}
          <Link href="/" className="underline hover:text-zinc-300">
            home page
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <aside className="space-y-3">
        <form
          onSubmit={addBrand}
          className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-2"
        >
          <label className="text-[11px] text-zinc-500 uppercase tracking-wide">
            Track another
          </label>
          <input
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            placeholder="stripe.com"
            disabled={busy === "add"}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 disabled:opacity-50 font-mono"
          />
          <button
            type="submit"
            disabled={busy === "add" || !addInput.trim()}
            className="w-full px-3 h-8 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold transition disabled:opacity-50"
          >
            {busy === "add" ? "Adding…" : "Add + scan"}
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
                className={`rounded-md border px-3 py-2 cursor-pointer transition ${
                  active
                    ? "border-zinc-500 bg-zinc-900"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                }`}
                onClick={() => setActiveSlug(t.brandSlug)}
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
                  <div className="text-right shrink-0">
                    <div
                      className={`text-base font-semibold tabular-nums ${
                        g ? scoreColor(g.scores.overall) : "text-zinc-600"
                      }`}
                    >
                      {g ? g.scores.overall : "—"}
                    </div>
                    {m && m.total > 0 && (
                      <div className="text-[10px] text-zinc-500">
                        {m.total} mention{m.total === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="space-y-5">
        {err && (
          <div className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {err}
          </div>
        )}

        {!grade ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-6 space-y-4">
            <div>
              <div className="text-sm text-zinc-100 font-semibold">
                {tracked.find((t) => t.brandSlug === activeSlug)
                  ?.displayName || activeSlug}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                No grade yet. Run a fresh scan to populate the playbook.
              </p>
            </div>
            <button
              onClick={rescan}
              disabled={busy === "rescan"}
              className="px-4 h-9 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-semibold transition disabled:opacity-50"
            >
              {busy === "rescan" ? "Scanning…" : "Run 5-engine scan"}
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-zinc-500">{grade.category}</div>
                  <div className="text-xl font-semibold text-zinc-100 truncate">
                    {grade.brand}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Last scanned {new Date(grade.scannedAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={`text-4xl font-semibold tabular-nums ${scoreColor(grade.scores.overall)}`}
                  >
                    {grade.scores.overall}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                    overall
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {ENGINE_LABELS.map(({ key, label }) => {
                  const v = grade.scores[key];
                  if (v === undefined) return null;
                  return (
                    <div
                      key={key}
                      className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2"
                    >
                      <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                        {label}
                      </div>
                      <div
                        className={`text-lg font-semibold tabular-nums ${scoreColor(
                          v as number,
                        )}`}
                      >
                        {v}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                    Readiness
                  </div>
                  <div
                    className={`text-base font-semibold tabular-nums ${scoreColor(
                      grade.scores.readiness,
                    )}`}
                  >
                    {grade.scores.readiness}
                  </div>
                </div>
                <div className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                    Mentions
                  </div>
                  <div
                    className={`text-base font-semibold tabular-nums ${scoreColor(
                      grade.scores.mentions,
                    )}`}
                  >
                    {grade.scores.mentions}
                  </div>
                </div>
                {grade.scores.offDomain !== undefined && (
                  <div className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                      Off-domain
                    </div>
                    <div
                      className={`text-base font-semibold tabular-nums ${scoreColor(
                        grade.scores.offDomain,
                      )}`}
                    >
                      {grade.scores.offDomain}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-900">
                <button
                  onClick={rescan}
                  disabled={busy === "rescan"}
                  className="px-3 h-8 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold transition disabled:opacity-50"
                >
                  {busy === "rescan" ? "Scanning…" : "Re-scan"}
                </button>
                <Link
                  href={`/visibility/${grade.slug}`}
                  className="text-xs px-3 h-8 inline-flex items-center rounded-md border border-zinc-800 hover:border-zinc-600 text-zinc-200"
                >
                  Public scorecard
                </Link>
                <Link
                  href={`/dashboard/mentions`}
                  className="text-xs px-3 h-8 inline-flex items-center rounded-md border border-zinc-800 hover:border-zinc-600 text-zinc-200"
                >
                  Mentions
                </Link>
                <Link
                  href={`/dashboard/outreach`}
                  className="text-xs px-3 h-8 inline-flex items-center rounded-md border border-zinc-800 hover:border-zinc-600 text-zinc-200"
                >
                  Outreach kit
                </Link>
              </div>
            </div>

            {mention && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-zinc-500">
                      Mentions · last 7 days
                    </div>
                    <div className="text-lg font-semibold text-zinc-100 mt-1">
                      {mention.total} new
                    </div>
                  </div>
                  <Link
                    href="/dashboard/mentions"
                    className="text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    View all →
                  </Link>
                </div>
                {mention.total > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(mention.bySource).map(([s, n]) => (
                      <span
                        key={s}
                        className="text-[11px] px-2 py-0.5 rounded border border-zinc-800 text-zinc-300"
                      >
                        {SOURCE_LABEL[s] || s} {n}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {playbook.length > 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-5 space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-zinc-500">
                      Action playbook
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Per-engine plays ranked by impact. Each fix
                      targets a specific engine&apos;s ranking signals.
                    </p>
                  </div>
                  <Link
                    href={`/visibility/${grade.slug}`}
                    className="text-xs text-zinc-400 hover:text-zinc-200 shrink-0"
                  >
                    Full scorecard →
                  </Link>
                </div>
                <ul className="space-y-2">
                  {playbook.map((a, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3 space-y-1.5"
                    >
                      <div className="flex items-start gap-2 flex-wrap">
                        <span
                          className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0 ${
                            a.engine === "all"
                              ? "bg-zinc-800 text-zinc-200"
                              : "bg-emerald-900/40 text-emerald-300"
                          }`}
                        >
                          {a.engine}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0 ${
                            a.priority === "high"
                              ? "bg-rose-900/40 text-rose-300"
                              : a.priority === "medium"
                                ? "bg-amber-900/40 text-amber-300"
                                : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {a.priority}
                        </span>
                        <span className="text-sm text-zinc-100 font-medium min-w-0">
                          {a.title}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {a.rationale}
                      </p>
                      {a.estimatedLift && (
                        <div className="text-[10px] text-zinc-500">
                          Estimated lift: {a.estimatedLift}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
