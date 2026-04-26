"use client";

/**
 * CEO-ready report — print-styled view at /report/[companyId].
 *
 * Loads the same /api/progress data the dashboard's Progress tab uses,
 * renders it on a layout optimised for paper / PDF: A4 portrait, big
 * type, generous margins, no chrome. The customer hits ⌘P (or "Save as
 * PDF") and ships the result to their CEO or board.
 *
 * The page renders fine on screen too, so it doubles as an in-app
 * "executive view". The print stylesheet hides everything except the
 * report card.
 */

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Printer, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface DailyPoint {
  date: string;
  audit?: number | null;
  technical?: number | null;
  backlinks?: number | null;
  aiVisibility?: number | null;
  mentionRate?: number | null;
  citationsCount?: number | null;
}

interface ProgressData {
  rangeDays: number;
  startDate: string;
  endDate: string;
  daily: DailyPoint[];
  summary: {
    aiMentionRate: { current: number | null; baseline: number | null; delta: number | null };
    aiCitations: { total: number; trend: "up" | "down" | "flat" };
    auditScore: { current: number | null; baseline: number | null; delta: number | null };
    articlesPublished: number;
    articlesDrafted: number;
    scansRun: number;
    daysSinceFirstScan: number | null;
  };
  milestones: Array<{ date: string; type: string; label: string }>;
  demo?: boolean;
}

interface CompanyMeta {
  name?: string;
  city?: string;
  website?: string;
}

export default function ReportPage({ params }: { params: Promise<{ companyId: string }> }) {
  const router = useRouter();
  const { companyId } = use(params);
  const [data, setData] = useState<ProgressData | null>(null);
  const [meta, setMeta] = useState<CompanyMeta>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/progress?companyId=${encodeURIComponent(companyId)}&days=90`);
        if (res.ok) setData(await res.json());
      } catch { /* ignore */ }
      // Pull a basic company meta block from localStorage — avoids needing
      // an extra round-trip when the page is opened from inside the app.
      try {
        const cached = localStorage.getItem("cabbge_company");
        if (cached) {
          const c = JSON.parse(cached);
          setMeta({ name: c?.name, city: c?.city, website: c?.website });
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [companyId]);

  const trendIcon = (delta: number | null) => {
    if (delta == null || delta === 0) return <Minus size={11} className="text-zinc-500 inline" />;
    if (delta > 0) return <TrendingUp size={11} className="text-[#5a8a26] inline" />;
    return <TrendingDown size={11} className="text-red-500 inline" />;
  };

  const today = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

  // Render an SVG mini-chart for the report.
  const Chart = ({ daily }: { daily: DailyPoint[] }) => {
    const w = 720;
    const h = 220;
    const padTop = 18;
    const padBottom = 30;
    const padLeft = 36;
    const padRight = 12;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;
    const xStep = chartW / Math.max(1, daily.length - 1);
    const xAt = (i: number) => padLeft + i * xStep;
    const yAt = (v: number) => padTop + chartH - (v / 100) * chartH;

    const pathFor = (key: keyof DailyPoint, color: string) => {
      const segs: string[] = [];
      let started = false;
      daily.forEach((d, i) => {
        const v = d[key] as number | null | undefined;
        if (v == null) { started = false; return; }
        segs.push(`${started ? "L" : "M"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`);
        started = true;
      });
      return <path d={segs.join(" ")} fill="none" stroke={color} strokeWidth="2" />;
    };

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={padLeft} y1={yAt(v)} x2={w - padRight} y2={yAt(v)} stroke="#e5e7eb" strokeWidth="1" />
            <text x={padLeft - 6} y={yAt(v) + 3} textAnchor="end" fontSize="9" fill="#6b7280">{v}</text>
          </g>
        ))}
        {pathFor("mentionRate", "#5a8a26")}
        {pathFor("audit",       "#b45309")}
        {pathFor("technical",   "#1d4ed8")}
        {pathFor("backlinks",   "#7c3aed")}
        {/* X-axis labels */}
        {[0, Math.floor(daily.length / 2), daily.length - 1].filter((i) => daily[i]).map((i) => (
          <text key={i} x={xAt(i)} y={h - 8} textAnchor="middle" fontSize="9" fill="#6b7280">
            {new Date(daily[i].date + "T00:00:00Z").toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
          </text>
        ))}
      </svg>
    );
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 16mm; }
          .no-print { display: none !important; }
          body { background: white !important; color: #111 !important; }
          .report-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      {/* Top bar — visible only on screen */}
      <div className="no-print sticky top-0 z-10 bg-zinc-950 border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft size={14} /> Back to dashboard
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-1.5 rounded-md bg-[#7CB342] text-zinc-950 hover:bg-[#8BC34A]"
          >
            <Printer size={13} /> Save as PDF
          </button>
        </div>
      </div>

      {/* Report body — same on screen + print */}
      <div className="min-h-screen bg-zinc-950 text-zinc-100 print:bg-white print:text-zinc-900">
        <div className="max-w-4xl mx-auto px-6 py-10">
          {loading ? (
            <div className="text-center text-zinc-500 py-20">Loading report...</div>
          ) : !data ? (
            <div className="text-center text-zinc-500 py-20">
              No progress data yet. Run a few scans first.
            </div>
          ) : (
            <article className="report-card bg-white print:bg-white text-zinc-900 rounded-xl shadow-2xl p-10 print:p-0 print:shadow-none">
              {/* Header */}
              <header className="border-b border-zinc-200 pb-6 mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#7CB342] flex items-center justify-center">
                      <Sparkles size={14} className="text-white" />
                    </div>
                    <span className="text-[13px] font-bold tracking-wide text-zinc-700">CABBGE</span>
                    <span className="text-[12px] text-zinc-400">·</span>
                    <span className="text-[12px] text-zinc-500">AI Marketing Performance Report</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">{today}</div>
                </div>
                <h1 className="text-3xl font-bold mt-5 mb-1 text-zinc-900">{meta.name || "Your Brand"}</h1>
                <div className="text-[13px] text-zinc-500">
                  {meta.city || ""}{meta.city && meta.website ? " · " : ""}{meta.website || ""}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Reporting period: {data.startDate} → {data.endDate} ({data.rangeDays} days)
                  {data.demo && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-semibold uppercase tracking-wide">Demo</span>}
                </div>
              </header>

              {/* Headline KPIs */}
              <section className="mb-8">
                <h2 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">Headline numbers</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200">
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">AI Mention Rate</div>
                    <div className="text-3xl font-bold text-zinc-900 tabular-nums">
                      {data.summary.aiMentionRate.current ?? "—"}<span className="text-base font-normal text-zinc-500">%</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">
                      {trendIcon(data.summary.aiMentionRate.delta)} {data.summary.aiMentionRate.delta == null ? "no baseline" : `${data.summary.aiMentionRate.delta > 0 ? "+" : ""}${data.summary.aiMentionRate.delta}pp vs day 1`}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200">
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">AI Citations Earned</div>
                    <div className="text-3xl font-bold text-zinc-900 tabular-nums">{data.summary.aiCitations.total.toLocaleString("en-IN")}</div>
                    <div className="text-[11px] text-zinc-500 mt-1">cumulative · {data.summary.aiCitations.trend}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200">
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">Audit Score</div>
                    <div className="text-3xl font-bold text-zinc-900 tabular-nums">{data.summary.auditScore.current ?? "—"}</div>
                    <div className="text-[11px] text-zinc-500 mt-1">
                      {trendIcon(data.summary.auditScore.delta)} {data.summary.auditScore.delta == null ? "no baseline" : `${data.summary.auditScore.delta > 0 ? "+" : ""}${data.summary.auditScore.delta} vs day 1`}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200">
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">Articles Published</div>
                    <div className="text-3xl font-bold text-zinc-900 tabular-nums">{data.summary.articlesPublished}</div>
                    <div className="text-[11px] text-zinc-500 mt-1">{data.summary.articlesDrafted} drafted total</div>
                  </div>
                </div>
              </section>

              {/* The compounding curve */}
              <section className="mb-8">
                <h2 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">The compounding curve</h2>
                <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4">
                  <Chart daily={data.daily} />
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px]">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#5a8a26" }} /><span className="text-zinc-700">AI Mention Rate</span></span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#b45309" }} /><span className="text-zinc-700">Audit Score</span></span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#1d4ed8" }} /><span className="text-zinc-700">Technical</span></span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#7c3aed" }} /><span className="text-zinc-700">Backlinks</span></span>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                  Each line traces one of four health dimensions. Mention rate is the headline number — it captures whether ChatGPT and Gemini surface the brand to buyers asking real questions. Foundation Inc&apos;s GEO research shows visibility compounds over 6-12 weeks of consistent execution.
                </p>
              </section>

              {/* Milestones */}
              {data.milestones.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">Milestones</h2>
                  <ul className="space-y-1.5">
                    {data.milestones.slice(0, 12).map((m, i) => (
                      <li key={i} className="flex items-baseline gap-3 text-[13px]">
                        <span className="text-zinc-500 tabular-nums w-24 flex-shrink-0">
                          {new Date(m.date + "T00:00:00Z").toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                          m.type === "drop" ? "bg-red-500" :
                          m.type === "first_scan" ? "bg-zinc-500" :
                          m.type === "score_jump" || m.type === "mention_rate_jump" ? "bg-[#5a8a26]" :
                          "bg-amber-500"
                        }`} />
                        <span className="text-zinc-800">{m.label}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Output velocity */}
              <section className="mb-2">
                <h2 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">Output velocity</h2>
                <table className="w-full text-[12.5px] border-collapse">
                  <tbody>
                    <tr className="border-b border-zinc-200">
                      <td className="py-2 text-zinc-600">Articles drafted</td>
                      <td className="py-2 text-right tabular-nums font-semibold">{data.summary.articlesDrafted}</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="py-2 text-zinc-600">Articles published</td>
                      <td className="py-2 text-right tabular-nums font-semibold text-[#5a8a26]">{data.summary.articlesPublished}</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="py-2 text-zinc-600">Scans run</td>
                      <td className="py-2 text-right tabular-nums font-semibold">{data.summary.scansRun}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-zinc-600">Days active</td>
                      <td className="py-2 text-right tabular-nums font-semibold">{data.summary.daysSinceFirstScan ?? "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              {/* Footer */}
              <footer className="mt-10 pt-4 border-t border-zinc-200 text-[10px] text-zinc-500 leading-relaxed">
                Generated by Cabbge — AI marketing platform for Indian residential real-estate developers.
                For methodology + data definitions, see <span className="font-mono">cabbge.com/legal</span>.
              </footer>
            </article>
          )}
        </div>
      </div>
    </>
  );
}
