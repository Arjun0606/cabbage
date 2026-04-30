"use client";

/**
 * Marketing home — brutalist client.
 *
 * Design vocabulary:
 *   - Pure black background, no zinc gradient mush.
 *   - Numbered sections (§00, §01, …) with hard horizontal rules.
 *   - 12-col grid with visible vertical dividers; full-bleed sections.
 *   - Sharp 90° corners. No rounded-xl. No box-shadow blur.
 *   - Geist Sans for display at extreme sizes; Geist Mono for every
 *     number, every datum, every section label.
 *   - Brand #7CB342 used sparingly as the live-data tell + CTA fill.
 *   - The hero's right rail IS the demo: the most recent public_grades
 *     stream in as a live feed, server-rendered.
 *
 * No marketing card grid. No icon tiles. Tables and lists.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface RecentGrade {
  slug: string;
  brand: string;
  overall: number;
  scannedAt: string;
}

const SCAN_STAGES = [
  "CRAWL HOMEPAGE / DETECT CATEGORY",
  "CLASSIFY VERTICAL / FIND COMPETITORS",
  "FAN OUT TO 5 ENGINES",
  "ANALYZE PER-PROMPT MENTIONS + POSITIONS",
  "AUDIT READINESS / OFF-DOMAIN COVERAGE",
  "BUILD PER-ENGINE PLAYBOOK",
];

function timeAgo(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function scoreColor(n: number): string {
  if (n >= 70) return "text-emerald-400";
  if (n >= 40) return "text-amber-300";
  return "text-rose-400";
}

const ENGINES: Array<{
  n: string;
  name: string;
  provider: string;
  ground: string;
  weight: string;
}> = [
  { n: "01", name: "CHATGPT", provider: "OpenAI", ground: "web_search tool", weight: "30%" },
  { n: "02", name: "GEMINI", provider: "Google", ground: "google_search grounding", weight: "20%" },
  { n: "03", name: "PERPLEXITY", provider: "Perplexity", ground: "sonar (default)", weight: "20%" },
  { n: "04", name: "CLAUDE", provider: "Anthropic", ground: "web_search_20250305", weight: "15%" },
  { n: "05", name: "GROK", provider: "xAI", ground: "search_parameters mode:auto", weight: "15%" },
];

const SHIPS: Array<{ n: string; title: string; body: string }> = [
  {
    n: "01",
    title: "PER-ENGINE PLAYBOOK",
    body: "ChatGPT cares about server-render. Gemini cares about Wikidata. Perplexity cares about Reddit. The playbook tells you which fix to ship for which engine, ranked by impact, with the exact monospace block to paste into your <head>.",
  },
  {
    n: "02",
    title: "MENTION TRACKER",
    body: "Reddit, Hacker News, YouTube, X — every public mention of your brand, deduped by source-id, refreshed weekly. Resend digest mails the deltas to your inbox.",
  },
  {
    n: "03",
    title: "ARTICLE WRITER",
    body: "Brief → draft → publish. Articles target the prompts you're invisible on, with structured data + internal linking + a cannibalization check baked in.",
  },
  {
    n: "04",
    title: "COLD-OUTREACH KIT",
    body: "Paste 100 URLs of brands you want to convert. Each one returns a personalized email + LinkedIn DM referencing their actual score and top fixes. CSV export. Drop into Lemlist or Instantly.",
  },
  {
    n: "05",
    title: "PUBLIC SCORECARD",
    body: "Every grade ships with a permalink at /visibility/[slug], an embeddable SVG badge for your site, and an OG card that auto-renders for social shares.",
  },
  {
    n: "06",
    title: "PROGRAMMATIC SEO",
    body: "/best/[category] leaderboards, /vs/[competitor] comparison pages, /brands directory. Cron-seeded, indexed, citable.",
  },
];

export function HomeClient({ recent }: { recent: RecentGrade[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setStage(0);

    const ticks = [4000, 11000, 19000, 32000, 50000];
    const timers = ticks.map((ms, i) =>
      setTimeout(() => setStage(i + 1), ms),
    );

    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Grader failed");
        return;
      }
      router.push(`/visibility/${data.grade.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      timers.forEach(clearTimeout);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#7CB342] selection:text-black">
      {/* TICKER */}
      <div className="border-b border-white/15 px-5 h-8 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
        <div className="flex items-center gap-5 min-w-0 overflow-hidden">
          <span className="text-[#7CB342] flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 bg-[#7CB342] animate-pulse" />
            LIVE
          </span>
          <span className="hidden md:inline truncate">
            CHATGPT · GEMINI · PERPLEXITY · CLAUDE · GROK · REDDIT · HN · YOUTUBE · X
          </span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="hidden sm:inline">v1.0</span>
          <Link
            href="/methodology"
            className="hover:text-white transition-colors"
          >
            METHODOLOGY
          </Link>
        </div>
      </div>

      {/* MASTHEAD */}
      <header className="border-b border-white/15">
        <div className="px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Cabbge"
              width={26}
              height={26}
              className=""
              priority
            />
            <span className="text-[15px] font-bold tracking-[-0.02em]">
              CABBGE
            </span>
          </Link>
          <nav className="flex items-center gap-0 text-[11px] font-mono uppercase tracking-[0.15em]">
            <Link
              href="/best"
              className="px-3.5 h-9 hover:bg-white hover:text-black flex items-center transition-colors"
            >
              LEADERBOARDS
            </Link>
            <Link
              href="/methodology"
              className="px-3.5 h-9 hover:bg-white hover:text-black flex items-center transition-colors"
            >
              METHODOLOGY
            </Link>
            <Link
              href="/pricing"
              className="px-3.5 h-9 hover:bg-white hover:text-black flex items-center transition-colors"
            >
              PRICING
            </Link>
            <Link
              href="/signin"
              className="px-3.5 h-9 hover:bg-white hover:text-black flex items-center transition-colors"
            >
              SIGN IN
            </Link>
            <Link
              href="/signup"
              className="ml-2 px-4 h-9 bg-[#7CB342] hover:bg-[#8BC34A] text-black flex items-center font-bold transition-colors"
            >
              GET STARTED →
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="border-b border-white/15">
        <div className="grid grid-cols-12">
          {/* LEFT — headline + form */}
          <div className="col-span-12 lg:col-span-8 lg:border-r border-white/15 px-5 py-12 sm:py-20">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#7CB342] mb-10">
              §00 / GEO + MENTION TRACKING / 5 ENGINES
            </div>

            <h1 className="text-[44px] sm:text-[68px] lg:text-[92px] font-bold tracking-[-0.035em] leading-[0.92] mb-8">
              Be the brand
              <br />
              AI recommends.
            </h1>

            <p className="text-[15px] sm:text-[17px] text-zinc-400 leading-[1.55] max-w-2xl mb-10">
              Paste a URL. We run real buyer prompts on ChatGPT,
              Gemini, Perplexity, Claude, and Grok. Surface the
              mentions humans leave on Reddit, HN, YouTube, X. Ship
              the schema, FAQ pages, and articles that lift the
              score. Live result in 60 seconds. No signup.
            </p>

            <form onSubmit={onSubmit} className="max-w-2xl">
              <div className="flex flex-col sm:flex-row">
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourcompany.com"
                  disabled={loading}
                  className="flex-1 bg-transparent border border-white/30 px-4 h-14 text-[15px] text-white placeholder:text-zinc-600 outline-none focus:border-[#7CB342] disabled:opacity-50 transition-colors font-mono"
                />
                <button
                  type="submit"
                  disabled={loading || !url}
                  className="h-14 px-7 bg-[#7CB342] hover:bg-[#8BC34A] text-black font-bold tracking-[-0.01em] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[14px] whitespace-nowrap border border-[#7CB342] sm:border-l-0"
                >
                  {loading ? "SCANNING…" : "GRADE MY SITE →"}
                </button>
              </div>
              <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600">
                NO SIGNUP · 60 SECONDS · CACHED 7 DAYS · COSTS US ~$0.20 / SCAN
              </div>
            </form>

            {error && (
              <div className="mt-6 max-w-2xl border border-rose-500/40 bg-rose-500/[0.06] px-4 py-3 text-[12px] font-mono text-rose-300">
                ERROR / {error}
              </div>
            )}

            {loading && <ScannerPanel stage={stage} />}
          </div>

          {/* RIGHT — live feed */}
          <aside className="col-span-12 lg:col-span-4 px-5 py-8 lg:py-12">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#7CB342] animate-pulse" />
              LIVE FEED / {recent.length} RECENT
            </div>

            {recent.length === 0 ? (
              <div className="text-[12px] font-mono text-zinc-600 leading-relaxed">
                NO RECENT GRADES.
                <br />
                YOURS WILL BE THE FIRST.
              </div>
            ) : (
              <ul className="divide-y divide-white/10 border-y border-white/15">
                {recent.map((g) => (
                  <li key={g.slug}>
                    <Link
                      href={`/visibility/${g.slug}`}
                      className="block py-3 group hover:bg-white/[0.03] -mx-5 px-5 transition-colors"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[14px] font-bold truncate group-hover:text-[#7CB342] transition-colors">
                          {g.brand}
                        </span>
                        <span
                          className={`text-[22px] font-bold tabular-nums shrink-0 leading-none ${scoreColor(g.overall)}`}
                        >
                          {g.overall}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-600 truncate mt-1.5">
                        {g.slug}
                        <span className="mx-2">/</span>
                        {timeAgo(g.scannedAt)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <Link
              href="/best"
              className="mt-6 inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-400 hover:text-[#7CB342] transition-colors"
            >
              VIEW LEADERBOARDS →
            </Link>
          </aside>
        </div>
      </section>

      {/* §01 — ENGINES */}
      <section className="border-b border-white/15">
        <div className="grid grid-cols-12">
          <div className="col-span-12 lg:col-span-3 lg:border-r border-white/15 px-5 py-12">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#7CB342] mb-4">
              §01 / ENGINES
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-[-0.02em] leading-[1.05]">
              Five engines.
              <br />
              One prompt set.
            </h2>
            <p className="mt-5 text-[13px] text-zinc-500 leading-relaxed">
              Same prompts hit every engine with web grounding on.
              Per-engine score is position-weighted, sentiment-multiplied.
              Overall is re-normalized over engines that responded — if
              your stack is missing a key the others cover.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-9 px-5 py-12">
            <table className="w-full font-mono text-[13px]">
              <thead>
                <tr className="border-b border-white/30 text-[9.5px] uppercase tracking-[0.2em] text-zinc-500">
                  <th className="text-left py-2.5 pr-4 font-normal">#</th>
                  <th className="text-left py-2.5 pr-4 font-normal">ENGINE</th>
                  <th className="text-left py-2.5 pr-4 font-normal hidden sm:table-cell">
                    PROVIDER
                  </th>
                  <th className="text-left py-2.5 pr-4 font-normal hidden md:table-cell">
                    GROUNDING
                  </th>
                  <th className="text-right py-2.5 font-normal">WEIGHT</th>
                </tr>
              </thead>
              <tbody>
                {ENGINES.map((e) => (
                  <tr
                    key={e.n}
                    className="border-b border-white/10 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3.5 pr-4 text-zinc-600">{e.n}</td>
                    <td className="py-3.5 pr-4 font-bold tracking-tight">
                      {e.name}
                    </td>
                    <td className="py-3.5 pr-4 text-zinc-500 hidden sm:table-cell">
                      {e.provider}
                    </td>
                    <td className="py-3.5 pr-4 text-zinc-500 hidden md:table-cell">
                      {e.ground}
                    </td>
                    <td className="py-3.5 text-right text-[#7CB342] font-bold">
                      {e.weight}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* §02 — WHY */}
      <section className="border-b border-white/15">
        <div className="grid grid-cols-12">
          <div className="col-span-12 lg:col-span-3 lg:border-r border-white/15 px-5 py-12">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#7CB342] mb-4">
              §02 / WHY
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-[-0.02em] leading-[1.05]">
              The shift already
              <br />
              happened.
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-9 px-5 py-12 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/15">
            <Stat
              big="82%"
              label="of AI citations"
              body="come from earned media — Wikipedia, Reddit, G2, Trustpilot — not your own site."
            />
            <Stat
              big="~30"
              label="domains"
              body="capture two-thirds of citations in any given category. If you're not in that set, you're invisible."
            />
            <Stat
              big="800M+"
              label="ChatGPT WAU"
              body="High-intent buyer research moved from Google to AI chat in under 18 months."
            />
          </div>
        </div>
      </section>

      {/* §03 — WHAT YOU SHIP */}
      <section className="border-b border-white/15">
        <div className="grid grid-cols-12">
          <div className="col-span-12 lg:col-span-3 lg:border-r border-white/15 px-5 py-12">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#7CB342] mb-4">
              §03 / WHAT YOU SHIP
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-[-0.02em] leading-[1.05]">
              Reports without
              <br />
              execution don&apos;t move
              <br />
              the needle.
            </h2>
            <p className="mt-5 text-[13px] text-zinc-500 leading-relaxed">
              Every Cabbge feature ends in a concrete artifact —
              schema you paste, copy you publish, an outreach email
              you send. Nothing stops at &quot;here&apos;s a chart.&quot;
            </p>
          </div>
          <div className="col-span-12 lg:col-span-9">
            <ul className="divide-y divide-white/15">
              {SHIPS.map((s) => (
                <li
                  key={s.n}
                  className="px-5 py-7 grid grid-cols-12 gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="col-span-2 sm:col-span-1 text-[11px] font-mono text-zinc-600">
                    /{s.n}
                  </div>
                  <div className="col-span-10 sm:col-span-4 text-[14px] font-bold tracking-tight">
                    {s.title}
                  </div>
                  <div className="col-span-12 sm:col-span-7 text-[13px] text-zinc-400 leading-relaxed">
                    {s.body}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* §04 — BUILT FOR INDIE */}
      <section className="border-b border-white/15">
        <div className="grid grid-cols-12">
          <div className="col-span-12 lg:col-span-3 lg:border-r border-white/15 px-5 py-12">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#7CB342] mb-4">
              §04 / WHO
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-[-0.02em] leading-[1.05]">
              Profound starts at $99
              <br />
              and points up.
              <br />
              We point down.
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-9 px-5 py-12">
            <p className="text-[15px] text-zinc-300 leading-relaxed max-w-2xl mb-6">
              Cabbge is for indie SaaS founders, Shopify operators,
              independent ecom store owners, and small marketing
              teams who can drop $49 on a personal card and ship.
              Self-serve, top to bottom. No demo calls. No
              procurement gates. Even folks inside larger orgs pay
              personally and use it unofficially — that&apos;s a
              deliberate part of the GTM.
            </p>
            <div className="flex items-center gap-0 flex-wrap">
              <Link
                href="/pricing"
                className="h-12 px-6 bg-[#7CB342] hover:bg-[#8BC34A] text-black flex items-center font-bold text-[13px] tracking-[-0.01em] transition-colors border border-[#7CB342]"
              >
                SEE PRICING →
              </Link>
              <Link
                href="/about"
                className="h-12 px-6 border border-white/30 hover:border-white text-white flex items-center font-bold text-[13px] tracking-[-0.01em] transition-colors -ml-px"
              >
                ABOUT
              </Link>
              <Link
                href="/methodology"
                className="h-12 px-6 border border-white/30 hover:border-white text-white flex items-center font-bold text-[13px] tracking-[-0.01em] transition-colors -ml-px"
              >
                METHODOLOGY
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-5 py-10">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 sm:col-span-4">
            <div className="flex items-center gap-2.5 mb-3">
              <Image
                src="/logo.png"
                alt=""
                width={22}
                height={22}
              />
              <span className="text-[14px] font-bold tracking-[-0.02em]">
                CABBGE
              </span>
            </div>
            <p className="text-[12px] text-zinc-500 leading-relaxed font-mono">
              GEO + mention tracking
              <br />
              for indie operators.
              <br />
              Self-serve from $49/mo.
            </p>
          </div>
          <FooterCol
            label="PRODUCT"
            items={[
              { href: "/", label: "Free grader" },
              { href: "/best", label: "Leaderboards" },
              { href: "/vs", label: "Comparisons" },
              { href: "/brands", label: "Brand directory" },
            ]}
          />
          <FooterCol
            label="COMPANY"
            items={[
              { href: "/about", label: "About" },
              { href: "/pricing", label: "Pricing" },
              { href: "/methodology", label: "Methodology" },
              { href: "/press", label: "Press" },
            ]}
          />
          <FooterCol
            label="ACCOUNT"
            items={[
              { href: "/signin", label: "Sign in" },
              { href: "/signup", label: "Sign up" },
              { href: "/dashboard", label: "Dashboard" },
            ]}
          />
          <FooterCol
            label="LEGAL"
            items={[
              { href: "/terms", label: "Terms" },
              { href: "/privacy", label: "Privacy" },
              { href: "/dpa", label: "DPA" },
              { href: "/legal", label: "Security" },
            ]}
          />
        </div>
        <div className="mt-10 pt-5 border-t border-white/15 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600">
          <span>© CABBGE / 2026</span>
          <span>BUILT IN PUBLIC</span>
        </div>
      </footer>
    </div>
  );
}

function Stat({
  big,
  label,
  body,
}: {
  big: string;
  label: string;
  body: string;
}) {
  return (
    <div className="px-5 py-6 sm:px-6 first:pl-0 last:pr-0">
      <div className="text-5xl sm:text-6xl font-bold tracking-[-0.04em] leading-none text-[#7CB342]">
        {big}
      </div>
      <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">
        {label}
      </div>
      <p className="mt-3 text-[13px] text-zinc-300 leading-relaxed">
        {body}
      </p>
    </div>
  );
}

function FooterCol({
  label,
  items,
}: {
  label: string;
  items: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="col-span-6 sm:col-span-2">
      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-3">
        {label}
      </div>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className="text-[12.5px] text-zinc-300 hover:text-[#7CB342] transition-colors"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScannerPanel({ stage }: { stage: number }) {
  return (
    <div className="mt-6 max-w-2xl border border-[#7CB342]/40 bg-[#7CB342]/[0.04] p-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#7CB342] mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-[#7CB342] animate-pulse" />
        SCANNER / RUNNING
      </div>
      <ul className="space-y-1.5 font-mono text-[12px]">
        {SCAN_STAGES.map((label, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <li
              key={i}
              className={`flex items-center gap-3 ${
                done
                  ? "text-zinc-500"
                  : active
                    ? "text-white"
                    : "text-zinc-700"
              }`}
            >
              <span className="w-3 inline-block">
                {done ? (
                  <span className="text-[#7CB342]">✓</span>
                ) : active ? (
                  <span className="text-[#7CB342] animate-pulse">▶</span>
                ) : (
                  <span className="text-zinc-700">·</span>
                )}
              </span>
              <span className="uppercase tracking-[0.1em]">{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
