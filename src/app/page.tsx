"use client";

/**
 * Marketing home page.
 *
 * Reborn with the cabbge_RE design DNA: prominent logo, the
 * [10px] uppercase tracking-[0.25em] tagline, the #7CB342 green CTA
 * with active:scale-[0.97], dense outcome cards, lucide icons used
 * purposefully. Center-anchored hero, then the inline grader, then
 * proof, then the why/how rails.
 *
 * Design north stars (per docs/PIVOT_PLAN.md):
 *   - 5-minute first win — paste URL → real score, no signup
 *   - Shareable everything — every result is a permalink
 *   - Self-serve all the way — no demo CTAs anywhere
 *   - Polish over breadth
 *   - Founder taste
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Search,
  Sparkles,
  Zap,
  Globe,
  Wrench,
  BarChart3,
  Bot,
  Loader2,
} from "lucide-react";
import {
  JsonLd,
  organizationSchema,
  softwareApplicationSchema,
  homepageFaqSchema,
} from "@/components/seo/JsonLd";

const ENGINES = [
  { name: "ChatGPT", weight: 0.3 },
  { name: "Gemini", weight: 0.2 },
  { name: "Perplexity", weight: 0.2 },
  { name: "Claude", weight: 0.15 },
  { name: "Grok", weight: 0.15 },
];

export default function Home() {
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

    // Tick stages for the loading panel — purely cosmetic, the
    // actual scan runs in parallel and finishes when /api/grade
    // returns. Stage 5 lands at ~50s which is just under the
    // typical fresh-scan time (~55-65s).
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
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      <JsonLd
        schema={[
          organizationSchema(),
          softwareApplicationSchema(),
          homepageFaqSchema(),
        ]}
      />

      {/* top nav */}
      <header className="border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Cabbge"
              width={28}
              height={28}
              className="rounded-md"
            />
            <span className="text-[15px] font-semibold tracking-tight">
              Cabbge
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-[13px]">
            <Link
              href="/best"
              className="px-3 h-9 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 flex items-center"
            >
              Leaderboards
            </Link>
            <Link
              href="/methodology"
              className="px-3 h-9 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 flex items-center"
            >
              Methodology
            </Link>
            <Link
              href="/pricing"
              className="px-3 h-9 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 flex items-center"
            >
              Pricing
            </Link>
            <Link
              href="/signin"
              className="px-3 h-9 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 flex items-center ml-2"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="ml-2 h-9 px-4 rounded-lg bg-[#7CB342] text-zinc-950 text-[13px] font-semibold hover:bg-[#8BC34A] active:scale-[0.97] transition-all flex items-center gap-1.5"
            >
              Get started <ArrowRight size={13} />
            </Link>
          </nav>
        </div>
      </header>

      {/* hero */}
      <section className="px-6 pt-16 sm:pt-24 pb-14">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="Cabbge"
            width={56}
            height={56}
            className="mb-5 rounded-xl"
            priority
          />
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#7CB342] font-semibold mb-4">
            GEO &amp; mention tracking · 5 engines · self-serve from $49
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold leading-[1.05] tracking-tight max-w-2xl">
            Be the brand AI recommends.
          </h1>
          <p className="mt-4 text-[15px] text-zinc-400 leading-relaxed max-w-xl">
            Paste your URL. We run real buyer prompts on ChatGPT,
            Gemini, Perplexity, Claude, and Grok, surface the
            mentions humans leave on Reddit / HN / YouTube / X, and
            ship the schema, FAQ pages, and articles that lift the
            score. Live result in 60 seconds. No signup.
          </p>

          {/* inline grader */}
          <form
            onSubmit={onSubmit}
            className="mt-8 w-full max-w-xl flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                name="url"
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourcompany.com"
                disabled={loading}
                className="w-full bg-zinc-900/80 border border-white/[0.06] rounded-lg pl-9 pr-4 h-11 text-[14px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[#7CB342]/40 disabled:opacity-50 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url}
              className="h-11 px-6 rounded-lg bg-[#7CB342] hover:bg-[#8BC34A] active:scale-[0.97] text-zinc-950 text-[14px] font-semibold transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Scanning…
                </>
              ) : (
                <>
                  Grade my site
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-3 w-full max-w-xl rounded-lg border border-red-500/20 bg-red-500/[0.06] px-4 py-2.5 text-[12px] text-red-300 text-left">
              {error}
            </div>
          )}

          {loading && (
            <ScannerPanel stage={stage} />
          )}

          {!loading && !error && (
            <div className="mt-3 text-[11px] text-zinc-600">
              No signup · costs us ~$0.20 per scan · cached 7 days
            </div>
          )}
        </div>
      </section>

      {/* engines bar */}
      <section className="px-6 pb-14">
        <div className="max-w-6xl mx-auto rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-5">
          <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-semibold mb-3">
            We measure across all 5
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {ENGINES.map((e) => (
              <div
                key={e.name}
                className="rounded-lg border border-white/[0.04] bg-zinc-950/40 p-3 flex flex-col items-start gap-1"
              >
                <div className="text-[10px] uppercase tracking-widest text-[#7CB342] font-semibold">
                  {(e.weight * 100).toFixed(0)}%
                </div>
                <div className="text-[14px] text-zinc-100 font-semibold">
                  {e.name}
                </div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-zinc-500 mt-3">
            Same prompt set across all five, weighted into one overall
            score. Re-normalized over engines that responded — if your
            stack is missing a key the others cover.
          </div>
        </div>
      </section>

      {/* outcome cards */}
      <section className="px-6 pb-14">
        <div className="max-w-6xl mx-auto">
          <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-semibold mb-4">
            What you get
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <OutcomeCard
              Icon={BarChart3}
              title="5-engine score"
              body="Real prompts hit ChatGPT, Gemini, Perplexity, Claude, Grok with web grounding on each. Per-engine breakdown, position-weighted, sentiment-multiplied."
            />
            <OutcomeCard
              Icon={Globe}
              title="Mention tracking"
              body="Reddit, Hacker News, YouTube, X — every public mention of your brand, surfaced in one panel, refreshed weekly. The signal humans leave that the engines later cite."
            />
            <OutcomeCard
              Icon={Wrench}
              title="Per-engine playbook"
              body="ChatGPT cares about server-render. Gemini cares about Wikidata. Perplexity cares about Reddit. The playbook tells you the exact fix to ship for each engine, ranked by impact."
            />
            <OutcomeCard
              Icon={Sparkles}
              title="Article writer"
              body="Brief → draft → publish loop. Articles target the missing buyer prompts, with structured data and internal linking baked in. QA pass + cannibalization check."
            />
            <OutcomeCard
              Icon={Bot}
              title="Cold-outreach kit"
              body="Paste up to 100 URLs of brands you want to convert. We grade each one and draft a personalized email + LinkedIn DM referencing their actual score and top fixes."
            />
            <OutcomeCard
              Icon={Zap}
              title="Public scorecard"
              body="Every grade ships with a permalink at /visibility/[slug], an embeddable badge for your site, and an OG card that auto-renders for social shares."
            />
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="px-6 pb-14">
        <div className="max-w-3xl mx-auto">
          <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-semibold mb-4">
            How it works
          </div>
          <div className="space-y-2">
            <Step
              n={1}
              title="Grade"
              text="Paste a URL. We classify your business, find your real competitors, and run real buyer prompts across 5 AI engines. Real scan, no mocks."
            />
            <Step
              n={2}
              title="Diagnose"
              text="Score visibility per engine. Audit AI-readiness signals (server-rendered content, schema completeness, AI bot access, entity grounding). Audit off-domain coverage (Wikipedia, Wikidata, G2, Trustpilot, Reddit). Flag what's costing you citations."
            />
            <Step
              n={3}
              title="Ship the fix"
              text="One-click schema generators, FAQ pages, full GEO-scored articles. Every artifact ships ready to paste into your <head> or your CMS."
            />
            <Step
              n={4}
              title="Compound"
              text="Cron re-scans every 7 days on Starter, daily on Growth and Scale. Every fix lifts the score on multiple engines. Mentions on Reddit / HN / X / YouTube show up in the weekly digest."
            />
          </div>
        </div>
      </section>

      {/* why this matters */}
      <section className="px-6 pb-14">
        <div className="max-w-6xl mx-auto rounded-2xl border border-[#7CB342]/15 bg-gradient-to-br from-[#7CB342]/[0.04] to-zinc-900/30 p-6 sm:p-8">
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#7CB342] font-semibold mb-3">
                Why this matters
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                82% of AI citations come from earned media — not your own site.
              </h2>
            </div>
            <div className="space-y-3 text-[14px] text-zinc-400 leading-relaxed">
              <p>
                Roughly 30 domains capture two-thirds of citations in
                any given category. If you&apos;re not in that set, AI
                engines don&apos;t recommend you when your buyer asks.
              </p>
              <p>
                Cabbge measures whether you&apos;re recommended right
                now, then ships the schema, FAQs, and articles that
                lift the score. Reports without execution don&apos;t
                move the needle. Execution without measurement is
                gambling. We do both.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* built for indie */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-semibold mb-3">
            Built for indie
          </div>
          <h3 className="text-2xl font-bold tracking-tight mb-3">
            Profound starts at $99 and points at enterprise. The market underneath is wide open.
          </h3>
          <p className="text-[14px] text-zinc-400 max-w-xl mx-auto leading-relaxed mb-6">
            Cabbge is for indie SaaS founders, Shopify and independent
            ecom operators, and small marketing teams who can drop $49
            on a personal card and ship. Self-serve, top to bottom.
            No demo calls.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link
              href="/pricing"
              className="h-10 px-5 rounded-lg bg-[#7CB342] text-zinc-950 text-[13px] font-semibold hover:bg-[#8BC34A] active:scale-[0.97] transition-all flex items-center gap-1.5"
            >
              See pricing <ArrowRight size={13} />
            </Link>
            <Link
              href="/about"
              className="h-10 px-4 rounded-lg text-[13px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors flex items-center"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-white/[0.06] px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-zinc-500">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt=""
              width={20}
              height={20}
              className="rounded"
            />
            <span>© Cabbge · GEO + mention tracking for indie operators</span>
          </div>
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
            <Link href="/pricing" className="hover:text-zinc-300">
              Pricing
            </Link>
            <Link href="/methodology" className="hover:text-zinc-300">
              Methodology
            </Link>
            <Link href="/about" className="hover:text-zinc-300">
              About
            </Link>
            <Link href="/press" className="hover:text-zinc-300">
              Press
            </Link>
            <Link href="/privacy" className="hover:text-zinc-300">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-zinc-300">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function OutcomeCard({
  Icon,
  title,
  body,
}: {
  Icon: typeof Search;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5 hover:border-[#7CB342]/20 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-[#7CB342]/15 text-[#7CB342] flex items-center justify-center mb-3">
        <Icon size={16} />
      </div>
      <div className="text-[14px] font-semibold text-zinc-100 mb-1.5">
        {title}
      </div>
      <p className="text-[12px] text-zinc-400 leading-relaxed">{body}</p>
    </div>
  );
}

function Step({
  n,
  title,
  text,
}: {
  n: number;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-[#7CB342]/15 text-[#7CB342] flex items-center justify-center text-[13px] font-mono font-semibold">
        {n}
      </div>
      <div>
        <div className="text-[14px] text-zinc-100 font-semibold">
          {title}
        </div>
        <p className="text-[12.5px] text-zinc-400 leading-relaxed mt-0.5">
          {text}
        </p>
      </div>
    </div>
  );
}

const SCAN_STAGES = [
  "Crawling your homepage and detecting your category",
  "Auto-finding 3-5 real competitors",
  "Asking ChatGPT, Gemini, Perplexity, Claude, Grok",
  "Auditing AI-readiness — render, schema, bots, sameAs",
  "Off-domain coverage — Wikipedia, Wikidata, G2, Trustpilot, Reddit",
  "Building per-engine playbook — almost done",
];

function ScannerPanel({ stage }: { stage: number }) {
  return (
    <div className="mt-4 w-full max-w-xl rounded-xl border border-[#7CB342]/20 bg-zinc-900/60 p-4 text-left">
      <div className="text-[10px] uppercase tracking-[0.25em] text-[#7CB342] font-semibold mb-3">
        Scanner
      </div>
      <ul className="space-y-1.5">
        {SCAN_STAGES.map((label, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <li
              key={i}
              className={`flex items-center gap-2 text-[12px] transition-colors ${
                done
                  ? "text-zinc-500"
                  : active
                    ? "text-zinc-100"
                    : "text-zinc-600"
              }`}
            >
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                {done ? (
                  <span className="text-[#7CB342]">✓</span>
                ) : active ? (
                  <Loader2
                    size={11}
                    className="animate-spin text-[#7CB342]"
                  />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                )}
              </span>
              <span>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
