import Link from "next/link";
import type { Metadata } from "next";
import {
  Sparkles,
  Target,
  Search,
  Activity,
  ShieldCheck,
  GitBranch,
  Database,
} from "lucide-react";
import { JsonLd, organizationSchema } from "@/components/seo/JsonLd";

/**
 * Public methodology page.
 *
 * Per the GEO industry consensus, the single biggest red flag for an
 * AI visibility tool is publishing scores without a documented
 * methodology. This page is the public contract: 5 engines, what we
 * ask each one, how we score, what we verify, what we explicitly
 * don't do. If a customer asks "how was this number computed?" the
 * answer is on this page.
 *
 * Must stay in lockstep with lib/agents/aiVisibility.ts.
 */

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://cabbge.com";

export const metadata: Metadata = {
  title: "Methodology — How Cabbge measures AI visibility",
  description:
    "Five engines (ChatGPT, Gemini, Perplexity, Claude, Grok), one prompt set, position-weighted + sentiment-multiplied scoring, off-domain coverage audit, three readiness checks. Documented end to end.",
  alternates: { canonical: `${SITE_URL}/methodology` },
  openGraph: {
    title: "How Cabbge measures AI visibility",
    description:
      "Five engines, position scoring, sentiment, off-domain coverage, readiness audits. Documented.",
    url: `${SITE_URL}/methodology`,
    type: "article",
  },
};

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      <JsonLd schema={organizationSchema()} />

      <header className="border-b border-white/[0.06] sticky top-0 bg-[#0a0a0b]/80 backdrop-blur-sm z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#7CB342] flex items-center justify-center">
              <Sparkles size={14} className="text-zinc-900" />
            </div>
            <span className="font-semibold tracking-tight">Cabbge</span>
          </Link>
          <nav className="flex items-center gap-6 text-[13px]">
            <Link href="/about" className="text-zinc-400 hover:text-zinc-200">
              About
            </Link>
            <Link
              href="/pricing"
              className="text-zinc-400 hover:text-zinc-200"
            >
              Pricing
            </Link>
            <Link
              href="/signin"
              className="text-zinc-400 hover:text-zinc-200"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 font-semibold px-3 py-1.5 rounded-md text-[12px]"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-14">
        <section className="space-y-5">
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#7CB342]">
            <Target size={12} /> Methodology
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            How Cabbge measures AI visibility
          </h1>
          <p className="text-[16px] text-zinc-400 leading-relaxed">
            Every score on Cabbge is built from a documented pipeline.
            This page is the contract — engines we hit, prompt
            generation, scoring formulas, verification, refresh cadence.
            Read it, dispute it, cite it.
          </p>
        </section>

        <section className="rounded-xl border border-[#7CB342]/20 bg-gradient-to-br from-[#7CB342]/5 to-zinc-900/40 p-6">
          <h2 className="text-[11px] uppercase tracking-wider text-[#7CB342] mb-3">
            TL;DR
          </h2>
          <p className="text-[15px] text-zinc-200 leading-relaxed">
            Generate ~20 buyer-style prompts from your vertical (SaaS /
            ecom / app / local service / media / marketplace). Send the
            same set to ChatGPT, Gemini, Perplexity, Claude, and Grok
            with web grounding enabled on each. Extract per-prompt
            mention + position + sentiment + co-citations + sources.
            Score each engine separately, blend into an overall score
            using a fixed weighting. Audit off-domain coverage
            (Wikipedia, Wikidata, Trustpilot, G2, Reddit) and three
            readiness signals (server-rendered content, AI crawler
            access, entity grounding). Refresh weekly on Starter, daily
            on Growth + Scale.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="w-7 h-7 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-[12px] text-zinc-400">
              1
            </span>
            Prompt generation
          </h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            We don&apos;t test you against generic queries like
            &quot;best CRM&quot;. We classify your URL into a vertical
            (SaaS, ecom, app, local service, media, marketplace) and
            build a prompt pack tailored to how a real buyer in that
            vertical would phrase the question.
          </p>
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5 space-y-3 text-[13px] text-zinc-300 leading-relaxed">
            <div>
              <span className="text-zinc-500">SaaS pack:</span> 7 buyer
              personas × 4 use-cases × your category — &quot;best
              [category] for solo founders&quot;, &quot;[category]
              alternative to [competitor]&quot;, brand probes,
              competitor head-to-heads.
            </div>
            <div>
              <span className="text-zinc-500">Ecom pack:</span> 6
              use-cases × 4 price bands × competitor compares + trust
              queries (&quot;is [brand] legit&quot;, &quot;[brand]
              reviews&quot;).
            </div>
            <div>
              <span className="text-zinc-500">Brand + competitor probes:</span>{" "}
              every pack includes a direct &quot;tell me about
              [brand]&quot; and &quot;[brand] vs [top-3 competitors]&quot;
              prompt so we measure both unprompted and prompted
              recall.
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="w-7 h-7 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-[12px] text-zinc-400">
              2
            </span>
            Asking five engines
          </h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            The same prompt set goes to every engine, with web
            grounding enabled on each. We track per-engine health
            (live / degraded / broken). If an engine falls back to
            non-grounded mode, results for that engine are flagged
            degraded so you know the score is unreliable for that
            scan.
          </p>
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5 text-[13px] text-zinc-300 leading-relaxed space-y-2">
            <div>
              <b className="text-zinc-100">ChatGPT</b> — Responses API
              with the <code>web_search</code> tool. Falls back to
              chat.completions if web_search is rate-limited.
            </div>
            <div>
              <b className="text-zinc-100">Gemini</b> — generateContent
              with the <code>google_search</code> grounding tool.
            </div>
            <div>
              <b className="text-zinc-100">Perplexity</b> — sonar model
              (search grounded by default). 30s timeout.
            </div>
            <div>
              <b className="text-zinc-100">Claude</b> — Messages API
              with the <code>web_search_20250305</code> server tool.
            </div>
            <div>
              <b className="text-zinc-100">Grok</b> — X.AI&apos;s
              OpenAI-compatible endpoint with{" "}
              <code>search_parameters: {"{"} mode: &quot;auto&quot; {"}"}</code>
              .
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="w-7 h-7 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-[12px] text-zinc-400">
              3
            </span>
            Per-response analysis
          </h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            For every response a structured analyzer (cheap LLM)
            extracts six things from the response text.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              {
                label: "Mentioned",
                body: "True / false. Tolerant of spelling variants, acronyms, and aliases (set per-brand by the classifier).",
              },
              {
                label: "Position",
                body: "Ordinal position relative to other brands. 1 = listed first, 2 = second. 0 = not mentioned or position unparseable.",
              },
              {
                label: "Context",
                body: "The exact sentence or phrase where your brand appears. Not a paraphrase.",
              },
              {
                label: "Sentiment",
                body: "Positive (recommended / leader-framed), neutral (factually mentioned), negative (criticized), absent.",
              },
              {
                label: "Co-citations",
                body: "Every other brand named in the same response. Reveals exactly who is taking your slot.",
              },
              {
                label: "Citation sources",
                body: "URLs the engine cited, classified as own_site / competitor / Reddit / G2 / news / docs / Wikipedia / unknown.",
              },
            ].map((f) => (
              <div
                key={f.label}
                className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4"
              >
                <div className="text-[13px] font-semibold text-zinc-100 mb-1.5">
                  {f.label}
                </div>
                <div className="text-[12px] text-zinc-400 leading-relaxed">
                  {f.body}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="w-7 h-7 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-[12px] text-zinc-400">
              4
            </span>
            Verification pass
          </h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            The analyzer is an LLM and LLMs hallucinate. Without
            verification, the analyzer can claim &quot;mentioned: true&quot;
            when the brand isn&apos;t actually in the response — which
            would silently inflate every downstream metric.
          </p>
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5 text-[13px] text-zinc-300 leading-relaxed">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={14}
                className="text-[#7CB342] shrink-0 mt-0.5"
              />
              <div>
                For every claimed positive mention, we verify the
                brand or one of its aliases appears literally in the
                response text. If it doesn&apos;t, we override to
                mentioned: false, position: 0, sentiment: absent.
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="w-7 h-7 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-[12px] text-zinc-400">
              5
            </span>
            Off-domain coverage
          </h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            Five live checks on the trust-anchor surfaces every engine
            considers when ranking citations: Wikipedia article, Wikidata
            entity, Trustpilot listing, G2 listing, Reddit recency.
            Weighted (Wikipedia 0.30, Wikidata / G2 / Reddit 0.20,
            Trustpilot 0.10) into a single coverage score 0-100. This is
            the fastest indicator of whether AI engines have anything to
            ground a citation in.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="w-7 h-7 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-[12px] text-zinc-400">
              6
            </span>
            Three readiness audits
          </h2>
          <ul className="space-y-3 text-[14px] text-zinc-300 leading-relaxed">
            <li>
              <b className="text-zinc-100">Server-rendered content.</b>{" "}
              We fetch your home page and check the raw HTML — if the
              first paint is blank and content arrives via JS, AI
              crawlers won&apos;t see it. The single most-common reason
              SaaS landing pages disappear from ChatGPT.
            </li>
            <li>
              <b className="text-zinc-100">AI crawler access.</b> Parse
              robots.txt against the 12 must-handle bots (6 retrieval:
              OAI-SearchBot, ChatGPT-User, Claude-SearchBot,
              Claude-User, PerplexityBot, Perplexity-User; 6 training:
              GPTBot, ClaudeBot, anthropic-ai, Google-Extended, GoogleOther, Applebot-Extended,
              Meta-ExternalAgent, CCBot). Surface every disallow that
              would block a citation.
            </li>
            <li>
              <b className="text-zinc-100">Entity grounding.</b> Look
              for sameAs schema linking to Wikipedia / Wikidata /
              LinkedIn / Crunchbase. Engines treat sameAs as the trust
              anchor between an entity and the citations.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="w-7 h-7 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-[12px] text-zinc-400">
              7
            </span>
            Scoring
          </h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            Per-engine score is the average of position-weighted,
            sentiment-multiplied scores across every prompt. Overall is
            a weighted blend across configured engines; weights
            re-normalize over engines that responded successfully so a
            missing API key for one engine doesn&apos;t penalize the
            blend.
          </p>
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5 space-y-3">
            <div className="text-[12px] uppercase tracking-wider text-zinc-500">
              Position weight
            </div>
            <div className="font-mono text-[12px] text-zinc-300 bg-zinc-950 rounded-lg p-3 leading-relaxed">
              position 1 → 100<br />
              position 2 → 85<br />
              position 3 → 72<br />
              position 4+ → 60 down to 30 floor<br />
              position 0 (unknown / parse failure) → 40
            </div>
            <div className="text-[12px] uppercase tracking-wider text-zinc-500 mt-4">
              Sentiment multiplier
            </div>
            <div className="font-mono text-[12px] text-zinc-300 bg-zinc-950 rounded-lg p-3 leading-relaxed">
              positive → ×1.15<br />
              neutral → ×0.85<br />
              negative → ×0.4<br />
              absent → ×1.0
            </div>
            <div className="text-[12px] uppercase tracking-wider text-zinc-500 mt-4">
              Engine blend (re-normalized over present engines)
            </div>
            <div className="font-mono text-[12px] text-zinc-300 bg-zinc-950 rounded-lg p-3 leading-relaxed">
              ChatGPT 0.30<br />
              Gemini 0.20<br />
              Perplexity 0.20<br />
              Claude 0.15<br />
              Grok 0.15
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="w-7 h-7 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-[12px] text-zinc-400">
              8
            </span>
            Refresh cadence
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4">
              <div className="text-[13px] font-semibold text-zinc-100">
                Starter
              </div>
              <div className="text-[12px] text-zinc-400 mt-1">
                Weekly full visibility scan
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4">
              <div className="text-[13px] font-semibold text-zinc-100">
                Growth
              </div>
              <div className="text-[12px] text-zinc-400 mt-1">
                Daily auto-scan, plus mention digest weekly
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4">
              <div className="text-[13px] font-semibold text-zinc-100">
                Scale
              </div>
              <div className="text-[12px] text-zinc-400 mt-1">
                Daily auto-scan + on-demand re-scans
              </div>
            </div>
          </div>
          <p className="text-[13px] text-zinc-500 leading-relaxed">
            All scans persist with a 7-day cache TTL on the public
            grader; volatility (score movement day-to-day) and citation
            drift are computed off the historical series for tracked
            brands.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">
            What we don&apos;t do
          </h2>
          <ul className="space-y-3 text-[15px] text-zinc-400 leading-relaxed">
            <li className="flex items-start gap-3">
              <GitBranch
                size={14}
                className="text-zinc-500 shrink-0 mt-1"
              />
              <div>
                <span className="text-zinc-200">
                  No synthetic numbers.
                </span>{" "}
                Every score, position, and trend comes from a real scan
                of a real engine. We never seed, estimate, or
                interpolate. If we don&apos;t have data, the surface
                says &quot;not yet measured&quot;.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Activity
                size={14}
                className="text-zinc-500 shrink-0 mt-1"
              />
              <div>
                <span className="text-zinc-200">
                  No guaranteed outcomes.
                </span>{" "}
                We don&apos;t promise &quot;you&apos;ll be cited within
                X days&quot;. Engines decide. We promise the work and
                measure the lift honestly.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Database
                size={14}
                className="text-zinc-500 shrink-0 mt-1"
              />
              <div>
                <span className="text-zinc-200">
                  No screen scraping of real users.
                </span>{" "}
                Our scans are synthetic API queries. We don&apos;t
                intercept or replay actual buyer searches. Treating API
                output as &quot;real user results&quot; without
                disclosure is the industry red flag we deliberately
                avoid.
              </div>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-6">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-3">
            Source of truth
          </div>
          <p className="text-[13px] text-zinc-400 leading-relaxed">
            This page reflects the live implementation in
            <code className="text-zinc-300 mx-1">
              lib/agents/aiVisibility.ts
            </code>
            ,
            <code className="text-zinc-300 mx-1">
              lib/agents/offDomain.ts
            </code>
            , and
            <code className="text-zinc-300 mx-1">
              lib/agents/playbook.ts
            </code>
            . If you find a discrepancy between what&apos;s documented
            here and what your dashboard shows, that&apos;s a bug —
            email{" "}
            <a
              href="mailto:hi@cabbge.com"
              className="text-[#8BC34A] hover:text-[#9CCC65]"
            >
              hi@cabbge.com
            </a>{" "}
            and we&apos;ll fix it.
          </p>
        </section>

        <section className="rounded-2xl border border-[#7CB342]/20 bg-gradient-to-br from-[#7CB342]/5 to-zinc-900/40 p-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight mb-3">
              Run the methodology on your brand.
            </h2>
            <p className="text-[15px] text-zinc-400 leading-relaxed mb-6">
              The fastest way to test it is to point it at your own
              domain at the home page — real 5-engine scan, real
              numbers, no signup, in about 60 seconds.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 font-semibold px-5 h-10 rounded-lg text-[13px]"
              >
                Grade my brand
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-zinc-300 hover:text-zinc-100 px-4 h-10 rounded-lg text-[13px]"
              >
                What Cabbge is
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-[12px] text-zinc-500">
          <div>© Cabbge · GEO + mention tracking for indie operators</div>
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-zinc-300">
              About
            </Link>
            <Link href="/pricing" className="hover:text-zinc-300">
              Pricing
            </Link>
            <Link href="/methodology" className="hover:text-zinc-300">
              Methodology
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
