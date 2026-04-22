import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { getServiceClient } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

interface BenchmarkRow {
  developer_slug: string;
  brand: string;
  city: string;
  tier: string;
  score: number;
  mentioned_count: number;
  total_queries: number;
  competitors_seen: string[] | null;
}

async function loadLatest(): Promise<{ month: string | null; rows: BenchmarkRow[] }> {
  try {
    const db = getServiceClient();
    const { data: monthRow } = await db
      .from("geo_benchmark_snapshots")
      .select("captured_month")
      .order("captured_month", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!monthRow?.captured_month) return { month: null, rows: [] };

    const { data } = await db
      .from("geo_benchmark_snapshots")
      .select("developer_slug, brand, city, tier, score, mentioned_count, total_queries, competitors_seen")
      .eq("captured_month", monthRow.captured_month)
      .order("score", { ascending: false });

    return { month: monthRow.captured_month, rows: (data || []) as BenchmarkRow[] };
  } catch {
    return { month: null, rows: [] };
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-[#7CB342]";
  if (score >= 50) return "text-yellow-400";
  if (score >= 20) return "text-orange-400";
  return "text-red-400";
}

export default async function BenchmarkPage() {
  const { month, rows } = await loadLatest();

  const byCity = new Map<string, BenchmarkRow[]>();
  for (const row of rows) {
    if (!byCity.has(row.city)) byCity.set(row.city, []);
    byCity.get(row.city)!.push(row);
  }
  const cities = Array.from(byCity.keys()).sort();

  const monthLabel = month
    ? new Date(`${month}-01T00:00:00Z`).toLocaleString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Cabbge" className="w-6 h-6 object-contain" />
            <span className="text-[15px] font-semibold tracking-tight">Cabbge</span>
          </Link>
          <Link
            href="/signup"
            className="text-[13px] text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Start 14-day trial <ArrowRight size={12} className="inline ml-1" />
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="mb-10">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#7CB342] font-semibold mb-3">
            The GEO Rankings
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4 max-w-3xl leading-tight">
            Which Indian real estate developers does AI actually recommend?
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Every month we run six buyer-intent queries against ChatGPT and Gemini for the top
            Indian residential developers in each major city. The table below is who they mention.
            Published openly — no login required.
          </p>
          {monthLabel && (
            <p className="text-xs text-zinc-600 mt-3">Latest data: {monthLabel}</p>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900 p-8 text-center">
            <Trophy size={28} className="text-zinc-600 mx-auto mb-3" />
            <h3 className="text-[14px] font-semibold mb-1">Leaderboard publishing soon</h3>
            <p className="text-[12px] text-zinc-500 max-w-md mx-auto">
              First monthly scan runs on the 1st. In the meantime{" "}
              <Link href="/" className="text-[#7CB342] hover:underline">
                grade your own brand
              </Link>{" "}
              or{" "}
              <Link href="/signup" className="text-[#7CB342] hover:underline">
                start a trial
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {cities.map((city) => {
              const cityRows = byCity.get(city) || [];
              return (
                <section key={city}>
                  <div className="flex items-baseline justify-between mb-4">
                    <h2 className="text-xl font-semibold text-zinc-100">{city}</h2>
                    <span className="text-[11px] text-zinc-500 uppercase tracking-wide">
                      {cityRows.length} developers tracked
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-zinc-900 overflow-hidden">
                    <div className="grid grid-cols-[40px,1fr,80px,120px,1fr] gap-4 px-4 py-3 text-[10px] uppercase tracking-wide text-zinc-500 border-b border-white/[0.04] bg-zinc-900/80">
                      <div>#</div>
                      <div>Developer</div>
                      <div className="text-right">Score</div>
                      <div className="text-right">Mentions</div>
                      <div className="hidden sm:block">AI also recommends</div>
                    </div>
                    {cityRows.map((row, i) => (
                      <div
                        key={row.developer_slug}
                        className="grid grid-cols-[40px,1fr,80px,120px,1fr] gap-4 px-4 py-3 text-[13px] items-center border-b border-white/[0.02] last:border-b-0 hover:bg-zinc-800/20"
                      >
                        <div className="text-zinc-600 tabular-nums">{i + 1}</div>
                        <div>
                          <div className="text-zinc-100 font-medium">{row.brand}</div>
                          <div className="text-[11px] text-zinc-500 capitalize">{row.tier}</div>
                        </div>
                        <div className={`text-right font-bold tabular-nums ${scoreColor(row.score)}`}>
                          {row.score}
                          <span className="text-[10px] text-zinc-600 font-normal">/100</span>
                        </div>
                        <div className="text-right text-zinc-400 tabular-nums text-[12px]">
                          {row.mentioned_count}/{row.total_queries}
                        </div>
                        <div className="hidden sm:block text-[11px] text-zinc-500 truncate">
                          {(row.competitors_seen || []).slice(0, 3).join(", ") || "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <div className="mt-16 rounded-xl border border-[#7CB342]/20 bg-[#7CB342]/[0.04] p-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">Not on this list? Or not where you should be?</h3>
          <p className="text-sm text-zinc-400 mb-4 max-w-xl leading-relaxed">
            Cabbge is the execution engine that moves you up. We track AI visibility daily, generate the
            content you need to win missing queries, and deploy it to any CMS.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/signup"
              className="h-10 px-5 rounded-lg bg-[#7CB342] text-zinc-950 text-[13px] font-semibold hover:bg-[#8BC34A] flex items-center gap-1.5"
            >
              Start 14-day trial <ArrowRight size={13} />
            </Link>
            <Link
              href="/"
              className="h-10 px-4 rounded-lg text-[13px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5"
            >
              Grade your brand first
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.06] mt-16 px-6 py-6">
        <div className="max-w-5xl mx-auto text-[11px] text-zinc-600 flex items-center justify-between">
          <span>© Cabbge — AI visibility for Indian real estate</span>
          <Link href="/pricing" className="hover:text-zinc-400">
            Pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
