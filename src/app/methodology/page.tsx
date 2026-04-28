import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, Target, Search, Activity, ShieldCheck, GitBranch, Database } from "lucide-react";
import { JsonLd, organizationSchema } from "@/components/seo/JsonLd";

/**
 * Public methodology page.
 *
 * Per the GEO industry consensus (ZipTie, Whatagraph, etc.), the single
 * biggest red flag for any AI search visibility tool is publishing
 * scores without a documented methodology. This page is the public
 * contract: how we generate queries, how we score responses, how we
 * verify mentions, what we measure, what we don't, and how often we
 * refresh. Customers and prospects can read the exact rules behind
 * every number Cabbge shows them.
 *
 * Everything here is true to the implementation in
 * lib/agents/aiVisibility.ts and lib/agents/localityEngine.ts. If the
 * implementation changes, this page MUST be updated in lockstep.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cabbge.com";

export const metadata: Metadata = {
  title: "Methodology — How Cabbge Measures AI Search Visibility | Cabbge",
  description:
    "The full methodology behind Cabbge's AI search visibility scores. Query generation, response analysis, position scoring, sentiment, hallucination detection, and refresh cadence — documented end to end.",
  alternates: { canonical: `${SITE_URL}/methodology` },
  openGraph: {
    title: "How Cabbge Measures AI Search Visibility",
    description:
      "Full methodology for AI search citation tracking. Query generation, scoring, verification, refresh cadence — documented.",
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
            <Link href="/about" className="text-zinc-400 hover:text-zinc-200">About</Link>
            <Link href="/pricing" className="text-zinc-400 hover:text-zinc-200">Pricing</Link>
            <Link href="/signin" className="text-zinc-400 hover:text-zinc-200">Sign in</Link>
            <Link
              href="/signup"
              className="bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 font-semibold px-3 py-1.5 rounded-md text-[12px]"
            >
              Run my scan
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-14">
        {/* Hero */}
        <section className="space-y-5">
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#7CB342]">
            <Target size={12} /> Methodology
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            How Cabbge measures AI search visibility
          </h1>
          <p className="text-[16px] text-zinc-400 leading-relaxed">
            Every score Cabbge shows you is built from a documented pipeline.
            This page is the contract — query generation, response analysis,
            scoring formulas, verification, refresh cadence. Read it, dispute it,
            cite it. If a customer asks how a number was computed, the answer is
            on this page.
          </p>
          <div className="text-[12px] text-zinc-500">
            Last updated when the implementation changes. Reflects the live
            scan pipeline.
          </div>
        </section>

        {/* TL;DR */}
        <section className="rounded-xl border border-[#7CB342]/20 bg-gradient-to-br from-[#7CB342]/5 to-zinc-900/40 p-6">
          <h2 className="text-[11px] uppercase tracking-wider text-[#7CB342] mb-3">TL;DR</h2>
          <p className="text-[15px] text-zinc-200 leading-relaxed">
            We generate ~50 buyer queries scoped to your cities, projects,
            configurations, and price bands. Each query is sent to ChatGPT
            and Gemini with web search enabled. An LLM-based analyzer
            extracts whether your brand was mentioned, in what position
            (1st, 2nd, 5th), with what sentiment, alongside which
            competitors. A verification pass strips analyzer hallucinations.
            We score by averaging position-weighted, sentiment-multiplied
            scores across all queries. Daily refresh on Growth / Scale,
            weekly on Starter.
          </p>
        </section>

        {/* Step 1: Query generation */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="w-7 h-7 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-[12px] text-zinc-400">1</span>
            Query generation
          </h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            We don&apos;t test you against generic queries like &quot;best
            real estate developer in India&quot;. We test you against the
            queries an actual buyer would ask, scoped to where you operate
            and what you build.
          </p>
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5 space-y-3 text-[13px] text-zinc-300 leading-relaxed">
            <div>
              <span className="text-zinc-500">Source dimensions:</span>{" "}
              your cities, your localities (per project), your unit
              configurations (1/2/3/4 BHK), your price bands, and intent
              level (city / locality / country).
            </div>
            <div>
              <span className="text-zinc-500">Generation:</span>{" "}
              an LLM produces query candidates from those dimensions; a
              fallback set ships if the generator fails so a scan never
              returns empty.
            </div>
            <div>
              <span className="text-zinc-500">Golden prompts:</span>{" "}
              you can lock specific queries that must run on every scan.
              They&apos;re prepended to the generated set, never substituted.
              This is how we keep volatility readable as signal vs noise.
            </div>
            <div>
              <span className="text-zinc-500">No empty-city fallback:</span>{" "}
              if you don&apos;t set a primary city, we error out instead
              of running global queries that surface Vanke, Greystar, and
              Emaar — which would make every regional brand look invisible.
            </div>
          </div>
        </section>

        {/* Step 2: Querying the AI engines */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="w-7 h-7 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-[12px] text-zinc-400">2</span>
            Asking ChatGPT and Gemini
          </h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            Each query is sent to ChatGPT and Gemini using their grounded
            web-search modes — what a real buyer would see if they asked
            the question themselves. We track per-platform health (live /
            degraded / broken). If a platform falls back to non-grounded
            mode, the result is flagged degraded so you know the score is
            unreliable for that scan.
          </p>
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5 text-[13px] text-zinc-300 leading-relaxed">
            <div className="flex items-start gap-3">
              <Search size={14} className="text-[#7CB342] shrink-0 mt-0.5" />
              <div>
                <span className="text-zinc-500">Why not Perplexity / Claude / Copilot?</span>{" "}
                Indian residential buyers overwhelmingly use ChatGPT and
                Google AI / Gemini. Adding more platforms doubles cost
                without changing the picture. We&apos;ll add platforms when
                buyer behavior shifts; right now it hasn&apos;t.
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: Response analysis */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="w-7 h-7 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-[12px] text-zinc-400">3</span>
            Response analysis
          </h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            For each AI response we run a structured analyzer (cheap LLM)
            that extracts six things from the response text.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              {
                label: "Mentioned",
                body: "True / false. Tolerant of spelling variants, acronyms, and aliases (you can configure these per company).",
              },
              {
                label: "Position",
                body: "Ordinal position relative to other brands. 1 = AI listed you first, 2 = second, etc. 0 = not mentioned.",
              },
              {
                label: "Context",
                body: "The exact sentence or phrase where your brand appears. Not a paraphrase.",
              },
              {
                label: "Sentiment",
                body: "Positive (recommended / praised / leader-framed), neutral (factually mentioned), negative (criticized / warned against), or absent.",
              },
              {
                label: "Co-citations",
                body: "Every other brand the AI named in the same response. This is how you find out exactly who is taking your mentions.",
              },
              {
                label: "Citation sources",
                body: "URLs the AI cited, classified as own_site / competitor / portal (99acres, MagicBricks, Housing) / YouTube / UGC (Reddit, Quora) / news / government (RERA portals) / unknown.",
              },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4">
                <div className="text-[13px] font-semibold text-zinc-100 mb-1.5">{f.label}</div>
                <div className="text-[12px] text-zinc-400 leading-relaxed">{f.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Step 4: Verification */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="w-7 h-7 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-[12px] text-zinc-400">4</span>
            Verification pass
          </h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            The analyzer is an LLM and LLMs hallucinate. Without verification,
            the analyzer can claim &quot;mentioned: true&quot; when the brand
            isn&apos;t actually in the response — which would silently inflate
            every downstream metric (trends, score, attribution).
          </p>
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5 text-[13px] text-zinc-300 leading-relaxed">
            <div className="flex items-start gap-3">
              <ShieldCheck size={14} className="text-[#7CB342] shrink-0 mt-0.5" />
              <div>
                For every claimed positive mention, we verify the brand,
                an alias, or a project name actually appears in the original
                response text. If verification fails, we override the result
                to mentioned: false, position: 0, sentiment: absent. Position
                and sentiment are zeroed too — otherwise the analyzer&apos;s
                claimed numbers leak through and you see &quot;ranked #2 with
                positive sentiment, but actually not mentioned at all.&quot;
              </div>
            </div>
          </div>
        </section>

        {/* Step 5: Hallucination check */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="w-7 h-7 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-[12px] text-zinc-400">5</span>
            Hallucination check (vs ground truth)
          </h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            When the AI makes a factual claim about your brand
            (project count, possession dates, configurations, RERA
            numbers, prices), we compare it against the ground truth
            scraped from your own website + the data you entered during
            onboarding. False claims get flagged so you can queue
            corrective content. We never flag something as a
            hallucination unless we have ground-truth data to compare
            against — silence is more honest than guessing.
          </p>
        </section>

        {/* Step 6: Scoring */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="w-7 h-7 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-[12px] text-zinc-400">6</span>
            Scoring
          </h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            Per-platform score is the average of position-weighted,
            sentiment-multiplied scores across every query in the scan.
            Overall score is the average of the per-platform scores.
          </p>
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5 space-y-3">
            <div className="text-[12px] uppercase tracking-wider text-zinc-500">Position weight</div>
            <div className="font-mono text-[12px] text-zinc-300 bg-zinc-950 rounded-lg p-3 leading-relaxed">
              position 1 → 100<br />
              position 2 → 85<br />
              position 3 → 72<br />
              position 4+ → 60 down to 30 floor<br />
              position 0 (unknown / parse failure) → 40
            </div>
            <div className="text-[12px] uppercase tracking-wider text-zinc-500 mt-4">Sentiment multiplier</div>
            <div className="font-mono text-[12px] text-zinc-300 bg-zinc-950 rounded-lg p-3 leading-relaxed">
              positive → ×1.15<br />
              neutral → ×0.85<br />
              negative → ×0.4<br />
              absent → ×1.0 (only applies when not mentioned)
            </div>
            <div className="text-[12px] uppercase tracking-wider text-zinc-500 mt-4">Final formula</div>
            <div className="font-mono text-[12px] text-zinc-300 bg-zinc-950 rounded-lg p-3 leading-relaxed">
              score = mean(positionWeight × sentimentMultiplier) across all queries<br />
              clamped to 0..100
            </div>
          </div>
        </section>

        {/* Step 7: Cadence */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="w-7 h-7 rounded-md bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-[12px] text-zinc-400">7</span>
            Refresh cadence
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4">
              <div className="text-[13px] font-semibold text-zinc-100">Starter</div>
              <div className="text-[12px] text-zinc-400 mt-1">Weekly full AI visibility scan</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4">
              <div className="text-[13px] font-semibold text-zinc-100">Growth</div>
              <div className="text-[12px] text-zinc-400 mt-1">Daily auto-scan via cron at 02:30 IST</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4">
              <div className="text-[13px] font-semibold text-zinc-100">Scale</div>
              <div className="text-[12px] text-zinc-400 mt-1">Daily auto-scan + on-demand re-scans</div>
            </div>
          </div>
          <p className="text-[13px] text-zinc-500 leading-relaxed">
            All scans persist to scan_history. Volatility (how much your
            score moves day to day) and citation drift (which sources
            gained or lost coverage) are computed off the historical series.
          </p>
        </section>

        {/* What we don't do */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">What we don&apos;t do</h2>
          <ul className="space-y-3 text-[15px] text-zinc-400 leading-relaxed">
            <li className="flex items-start gap-3">
              <GitBranch size={14} className="text-zinc-500 shrink-0 mt-1" />
              <div>
                <span className="text-zinc-200">No synthetic numbers.</span>{" "}
                Every score, position, and trend on Cabbge comes from a
                real scan of a real AI engine. We never seed, estimate, or
                interpolate. If we don&apos;t have data, the surface says
                &quot;not yet measured&quot;.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Activity size={14} className="text-zinc-500 shrink-0 mt-1" />
              <div>
                <span className="text-zinc-200">No guaranteed outcomes.</span>{" "}
                We don&apos;t promise &quot;you&apos;ll be cited within X days&quot;.
                AI engines decide what to surface. We promise the work
                (scans, articles, schema, fixes) and we measure the lift
                honestly — including when it doesn&apos;t move.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Database size={14} className="text-zinc-500 shrink-0 mt-1" />
              <div>
                <span className="text-zinc-200">No screen scraping of real users.</span>{" "}
                Our scans are synthetic queries we send to AI APIs. We
                don&apos;t intercept or replay actual buyer searches.
                Treating API output as &quot;real user results&quot; without
                disclosure is the industry red flag we deliberately avoid.
              </div>
            </li>
          </ul>
        </section>

        {/* Source of truth */}
        <section className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-6">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-3">Source of truth</div>
          <p className="text-[13px] text-zinc-400 leading-relaxed">
            This page reflects the live implementation in
            <code className="text-zinc-300 mx-1">lib/agents/aiVisibility.ts</code>
            and
            <code className="text-zinc-300 mx-1">lib/agents/localityEngine.ts</code>.
            If you find a discrepancy between what&apos;s documented here and
            what your dashboard shows, that&apos;s a bug — email{" "}
            <a href="mailto:hello@cabbge.com" className="text-[#8BC34A] hover:text-[#9CCC65]">
              hello@cabbge.com
            </a>{" "}
            and we&apos;ll fix it.
          </p>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-[#7CB342]/20 bg-gradient-to-br from-[#7CB342]/5 to-zinc-900/40 p-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight mb-3">
              Run a scan on your own brand.
            </h2>
            <p className="text-[15px] text-zinc-400 leading-relaxed mb-6">
              The fastest way to test the methodology is to point it at
              your own developer brand and read the per-query breakdown.
              Real numbers, your data, no obligation.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 font-semibold px-5 h-10 rounded-lg text-[13px]"
              >
                Run my scan
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
          <div>© Cabbge 2026 · AI Search Visibility for Real Estate</div>
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-zinc-300">About</Link>
            <Link href="/pricing" className="hover:text-zinc-300">Pricing</Link>
            <Link href="/methodology" className="hover:text-zinc-300">Methodology</Link>
            <Link href="/privacy" className="hover:text-zinc-300">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-300">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
