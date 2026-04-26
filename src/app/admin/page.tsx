"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, AlertCircle, AlertTriangle, CheckCircle2, ExternalLink, Search } from "lucide-react";

/**
 * Admin / founder dashboard.
 *
 * Single panel of every customer with the health metrics that signal
 * churn or upsell. Shipped over a CSM person — when there are 50
 * customers, the founder needs one screen to scan all of them.
 *
 * Hard-gated by ADMIN_EMAILS env (defaults to founder email). Anyone
 * else gets a 403 from the API and the page renders the forbidden
 * state.
 */

interface CustomerRow {
  companyId: string;
  companyName: string | null;
  website: string | null;
  city: string | null;
  ownerEmail: string | null;
  plan: string | null;
  status: string | null;
  trialEndsAt: string | null;
  projectCount: number;
  competitorCount: number;
  articlesThisMonth: number;
  lastScanAt: string | null;
  daysSinceLastScan: number | null;
  latestMentionRate: number | null;
  brandContextScore: number;
  health: "red" | "yellow" | "green";
  healthReason: string;
}

interface Response {
  customers: CustomerRow[];
  summary: {
    total: number;
    red: number;
    yellow: number;
    green: number;
    activePaying: number;
    trialing: number;
  };
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export default function AdminPage() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [filter, setFilter] = useState<"all" | "red" | "yellow" | "green">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/customers")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 403) {
          setForbidden(true);
          return;
        }
        if (!res.ok) {
          setData(null);
          return;
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (forbidden) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-2">Admin only</h1>
          <p className="text-[13px] text-zinc-500 mb-4">
            This page is restricted to Cabbge founders/CSMs. If you believe you should have access, ask the team.
          </p>
          <Link href="/" className="text-[#7CB342] hover:text-[#8BC34A] text-[13px]">
            Back to home →
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 flex items-center justify-center">
        <div className="text-[13px] text-zinc-500">Loading customer health…</div>
      </div>
    );
  }

  const filtered = data.customers.filter((c) => {
    if (filter !== "all" && c.health !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !(c.companyName || "").toLowerCase().includes(s) &&
        !(c.ownerEmail || "").toLowerCase().includes(s) &&
        !(c.website || "").toLowerCase().includes(s)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      <header className="border-b border-white/[0.06] sticky top-0 bg-[#0a0a0b]/90 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#7CB342] flex items-center justify-center">
              <Sparkles size={13} className="text-zinc-900" />
            </div>
            <span className="text-[14px] font-semibold tracking-tight">Cabbge admin</span>
          </Link>
          <span className="text-[11px] text-zinc-500">Founder / CSM only</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "Total", value: data.summary.total, accent: "text-zinc-100" },
            { label: "🔴 At risk", value: data.summary.red, accent: "text-red-400" },
            { label: "🟡 Watch", value: data.summary.yellow, accent: "text-amber-400" },
            { label: "🟢 Healthy", value: data.summary.green, accent: "text-emerald-400" },
            { label: "Paying", value: data.summary.activePaying, accent: "text-zinc-100" },
            { label: "On trial", value: data.summary.trialing, accent: "text-zinc-100" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-3">
              <div className="text-[10px] uppercase tracking-wide text-zinc-500">{s.label}</div>
              <div className={`text-2xl font-bold tabular-nums ${s.accent}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 p-0.5 bg-zinc-800/60 rounded-lg">
            {(["all", "red", "yellow", "green"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[12px] py-1.5 px-3 rounded-md transition-colors ${filter === f ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                {f === "all" ? "All" : f === "red" ? "🔴 At risk" : f === "yellow" ? "🟡 Watch" : "🟢 Healthy"}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company, email, domain…"
              className="w-full bg-zinc-800/60 border border-white/[0.06] text-[13px] h-8 pl-8 pr-3 rounded-lg outline-none focus:border-zinc-600"
            />
          </div>
          <span className="text-[11px] text-zinc-500 ml-auto">{filtered.length} of {data.customers.length}</span>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-zinc-500 border-b border-white/[0.06]">
                <th className="text-left px-4 py-2.5 font-medium">Health</th>
                <th className="text-left px-4 py-2.5 font-medium">Company</th>
                <th className="text-left px-4 py-2.5 font-medium">Owner</th>
                <th className="text-left px-4 py-2.5 font-medium">Plan</th>
                <th className="text-right px-4 py-2.5 font-medium">Projects</th>
                <th className="text-right px-4 py-2.5 font-medium">Articles / mo</th>
                <th className="text-right px-4 py-2.5 font-medium">Mention %</th>
                <th className="text-right px-4 py-2.5 font-medium">Brand ctx</th>
                <th className="text-right px-4 py-2.5 font-medium">Last scan</th>
                <th className="text-left px-4 py-2.5 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.companyId} className="border-b border-white/[0.04] hover:bg-zinc-800/30">
                  <td className="px-4 py-2.5">
                    {c.health === "red" ? (
                      <AlertCircle size={14} className="text-red-400" />
                    ) : c.health === "yellow" ? (
                      <AlertTriangle size={14} className="text-amber-400" />
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-zinc-100">{c.companyName || "—"}</div>
                    {c.website && (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1"
                      >
                        {c.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        <ExternalLink size={9} />
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">{c.ownerEmail || "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="text-zinc-300">{c.plan || "—"}</div>
                    <div className="text-[10px] text-zinc-500">{c.status || "—"}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.projectCount}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.articlesThisMonth}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {c.latestMentionRate !== null ? `${c.latestMentionRate}%` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    <span className={
                      c.brandContextScore >= 70 ? "text-emerald-400" :
                      c.brandContextScore >= 40 ? "text-amber-400" : "text-red-400"
                    }>
                      {c.brandContextScore}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-400">
                    {fmtDate(c.lastScanAt)}
                    {c.daysSinceLastScan !== null && (
                      <div className="text-[10px] text-zinc-600">{c.daysSinceLastScan}d ago</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400 max-w-[220px] truncate" title={c.healthReason}>
                    {c.healthReason}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-zinc-500">No customers match this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
