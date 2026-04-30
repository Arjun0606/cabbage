// NOTE: this file lives at /index-page (not /index — Next reserves
// that for app/page.tsx). Public route is /index-page; we'll alias
// it to /ai-visibility-index in next config later if we want a
// shorter URL.

import Link from "next/link";
import type { Metadata } from "next";
import { getServiceClient } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "AI Visibility Index — every brand graded across 5 engines · cabbge",
  description:
    "Public, free leaderboard of AI visibility across ChatGPT, Gemini, Perplexity, Claude, and Grok. Updated weekly. Real scores from real scans. No login.",
  alternates: { canonical: "/index-page" },
};

interface BrandRow {
  slug: string;
  brand: string;
  category: string | null;
  vertical: string | null;
  scores: { overall?: number } | null;
  scanned_at: string;
}

export default async function IndexPage() {
  const svc = getServiceClient();
  const { data: rowsRaw } = await svc
    .from("public_grades")
    .select("slug, brand, category, vertical, scores, scanned_at")
    .order("scanned_at", { ascending: false })
    .limit(5000);
  const rows = (rowsRaw as BrandRow[] | null) || [];

  const ranked = rows
    .filter((r) => typeof r.scores?.overall === "number")
    .sort((a, b) => (b.scores!.overall! - a.scores!.overall!));

  const top = ranked.slice(0, 50);
  const bottom = ranked
    .filter((r) => (r.scores!.overall ?? 0) > 0)
    .slice(-15)
    .reverse();

  const totalGraded = ranked.length;
  const avgScore =
    ranked.length > 0
      ? Math.round(
          ranked.reduce((s, r) => s + (r.scores!.overall ?? 0), 0) /
            ranked.length,
        )
      : 0;
  const above70 = ranked.filter((r) => (r.scores!.overall ?? 0) >= 70).length;
  const below40 = ranked.filter(
    (r) => (r.scores!.overall ?? 0) < 40 && (r.scores!.overall ?? 0) > 0,
  ).length;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#7CB342] selection:text-black">
      {/* Top ticker */}
      <div className="border-b border-white/15 px-5 h-8 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
        <span>AI VISIBILITY INDEX · UPDATED WEEKLY · OPEN DATA</span>
        <Link href="/" className="hover:text-white transition-colors">
          ← CABBGE
        </Link>
      </div>

      {/* Hero */}
      <section className="border-b border-white/15 px-5 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#7CB342] mb-4">
            §00 / THE INDEX
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-[-0.03em] leading-[0.95] mb-4">
            AI Visibility Index.
          </h1>
          <p className="text-[15px] sm:text-[17px] text-zinc-400 leading-relaxed max-w-2xl">
            Every brand we&apos;ve scanned, ranked by how often
            ChatGPT, Gemini, Perplexity, Claude, and Grok recommend
            them. Public data. No login. Score yours →{" "}
            <Link href="/" className="text-[#7CB342] hover:underline">
              cabbge.com
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b border-white/15 grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/15">
        <Stat label="Brands graded" value={totalGraded.toLocaleString()} />
        <Stat label="Average score" value={String(avgScore)} />
        <Stat
          label="Top tier (≥70)"
          value={`${above70}`}
          sub={`${Math.round((above70 / Math.max(1, totalGraded)) * 100)}%`}
        />
        <Stat
          label="Invisible (<40)"
          value={`${below40}`}
          sub={`${Math.round((below40 / Math.max(1, totalGraded)) * 100)}%`}
        />
      </section>

      {/* Top 50 */}
      <section className="border-b border-white/15 px-5 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#7CB342] mb-2">
            §01 / TOP 50
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] mb-6">
            Most-recommended brands across the 5 engines.
          </h2>
          {top.length === 0 ? (
            <p className="text-zinc-500 text-sm font-mono">
              NO BRANDS GRADED YET. RUN THE SEED CRON.
            </p>
          ) : (
            <table className="w-full font-mono text-[13px]">
              <thead>
                <tr className="border-b border-white/30 text-[9.5px] uppercase tracking-[0.2em] text-zinc-500">
                  <th className="text-left py-2.5 pr-4 font-normal w-12">#</th>
                  <th className="text-left py-2.5 pr-4 font-normal">BRAND</th>
                  <th className="text-left py-2.5 pr-4 font-normal hidden sm:table-cell">
                    CATEGORY
                  </th>
                  <th className="text-right py-2.5 font-normal w-20">SCORE</th>
                </tr>
              </thead>
              <tbody>
                {top.map((b, i) => (
                  <tr
                    key={b.slug}
                    className="border-b border-white/10 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 pr-4 text-zinc-600">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/visibility/${b.slug}`}
                        className="text-white font-bold hover:text-[#7CB342] tracking-tight"
                      >
                        {b.brand}
                      </Link>
                      <div className="text-[10px] text-zinc-600 mt-0.5">
                        {b.slug}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-zinc-500 hidden sm:table-cell">
                      {b.category || "—"}
                    </td>
                    <td
                      className={`py-3 text-right font-bold tabular-nums ${scoreColor(b.scores!.overall ?? 0)}`}
                    >
                      {b.scores!.overall}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Bottom 15 — the "surprising" piece */}
      {bottom.length > 0 && (
        <section className="border-b border-white/15 px-5 py-12">
          <div className="max-w-5xl mx-auto">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#7CB342] mb-2">
              §02 / MOST INVISIBLE FAMOUS BRANDS
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] mb-6">
              Names you know — that AI engines barely mention.
            </h2>
            <p className="text-[13px] text-zinc-400 leading-relaxed mb-6 max-w-2xl">
              Brands with strong web presence but weak AI visibility.
              Almost always: SPA homepages with no rendered content,
              or missing entity grounding (no Wikipedia / Wikidata).
              The fix is concrete and scoped to a few hours.
            </p>
            <table className="w-full font-mono text-[13px]">
              <tbody>
                {bottom.map((b) => (
                  <tr
                    key={b.slug}
                    className="border-b border-white/10 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/visibility/${b.slug}`}
                        className="text-white font-bold hover:text-[#7CB342] tracking-tight"
                      >
                        {b.brand}
                      </Link>
                      <div className="text-[10px] text-zinc-600 mt-0.5">
                        {b.slug} {b.category ? `· ${b.category}` : ""}
                      </div>
                    </td>
                    <td
                      className={`py-3 text-right font-bold tabular-nums ${scoreColor(b.scores!.overall ?? 0)}`}
                    >
                      {b.scores!.overall}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-b border-white/15 px-5 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#7CB342] mb-3">
            §03 / SCORE YOURS
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] mb-4 leading-[1.05]">
            Your brand on the index.
            <br />
            60 seconds. No login.
          </h2>
          <p className="text-[14px] text-zinc-400 leading-relaxed max-w-xl mx-auto mb-7">
            Paste your URL → real prompts run on all 5 engines → public
            scorecard at /visibility/[your-domain]. Embed the badge,
            share the link, fix the gaps with our agents.
          </p>
          <Link
            href="/"
            className="inline-block h-12 px-8 bg-[#7CB342] hover:bg-[#8BC34A] text-black font-bold text-[14px] tracking-[-0.01em] transition-colors border border-[#7CB342]"
          >
            GRADE MY SITE →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 py-10 text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-600 flex justify-between flex-wrap gap-3">
        <span>© CABBGE / 2026 / OPEN DATA</span>
        <div className="flex gap-4">
          <Link href="/methodology" className="hover:text-white">
            METHODOLOGY
          </Link>
          <Link href="/best" className="hover:text-white">
            CATEGORIES
          </Link>
          <Link href="/pricing" className="hover:text-white">
            PRICING
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="px-5 py-7">
      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-1">
        {label}
      </div>
      <div className="text-3xl sm:text-4xl font-bold tabular-nums tracking-[-0.03em] text-[#7CB342]">
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-zinc-500 mt-1 font-mono">{sub}</div>
      )}
    </div>
  );
}

function scoreColor(n: number): string {
  if (n >= 70) return "text-emerald-400";
  if (n >= 40) return "text-amber-300";
  return "text-rose-400";
}
