import Link from "next/link";
import { Sparkles, ArrowRight, Search, FileText, BarChart3, Wrench, Bot, Building2 } from "lucide-react";
import { JsonLd, organizationSchema, softwareApplicationSchema, aboutFaqSchema } from "@/components/seo/JsonLd";

/**
 * About / what-is-Cabbge page.
 *
 * The story we tell when a prospect asks "what is this?". Static, no
 * personalization, optimised for explaining the wedge fast: AI search
 * is replacing Google for buyer research, real estate brands are
 * invisible in it, Cabbge fixes that with a real execution loop (not
 * another reporting tool).
 */

export const metadata = {
  title: "About Cabbge — AI search for real estate developers",
  description:
    "Cabbge is the execution engine that gets Indian real estate brands cited by ChatGPT and Gemini for high-intent buyer queries. Built for developers, not agencies.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      <JsonLd schema={[organizationSchema(), softwareApplicationSchema(), aboutFaqSchema()]} />
      <header className="border-b border-white/[0.06] sticky top-0 bg-[#0a0a0b]/80 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#7CB342] flex items-center justify-center">
              <Sparkles size={14} className="text-zinc-900" />
            </div>
            <span className="font-semibold tracking-tight">Cabbge</span>
          </Link>
          <nav className="flex items-center gap-6 text-[13px]">
            <Link href="/pricing" className="text-zinc-400 hover:text-zinc-200">Pricing</Link>
            <Link href="/compare" className="text-zinc-400 hover:text-zinc-200">Compare</Link>
            <Link href="/signin" className="text-zinc-400 hover:text-zinc-200">Sign in</Link>
            <Link
              href="/signup"
              className="bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 font-semibold px-3 py-1.5 rounded-md text-[12px]"
            >
              Start free trial
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-16">
        {/* Hero */}
        <section className="space-y-5">
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#7CB342]">
            <Sparkles size={12} /> What Cabbge is
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            The execution engine that gets your projects cited by ChatGPT and Gemini.
          </h1>
          <p className="text-[16px] text-zinc-400 leading-relaxed">
            When a buyer asks <span className="text-zinc-200">&quot;best 3 BHK in Gachibowli under 2 crore&quot;</span> on ChatGPT, the AI
            names three developers. If you&apos;re not one of them, you don&apos;t exist for that buyer. Cabbge is
            the system that puts you in the shortlist — by writing the right pages, fixing the right schema,
            and surfacing the right hallucinations to correct.
          </p>
        </section>

        {/* The shift */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">The shift you&apos;re already losing to</h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            High-intent buyer research moved from Google to ChatGPT and Gemini in under 18 months.
            They don&apos;t scroll 10 blue links — they ask a question, get three names, and call those
            three developers. SEO agencies are still optimising for blue links. We&apos;re built for the
            new surface.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            {[
              { label: "ChatGPT MAU", value: "800M+" },
              { label: "Gemini in Search", value: "Default in India" },
              { label: "Buyer queries / month / developer", value: "~2,000 unique" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4">
                <div className="text-2xl font-bold text-zinc-100">{s.value}</div>
                <div className="text-[11px] uppercase tracking-wide text-zinc-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* What it actually does */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">What Cabbge actually does</h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            Reporting tools tell you you&apos;re losing. Cabbge fixes it. Every loop closes itself: detect
            the gap, write the asset, deploy it, watch the next scan move the number.
          </p>

          <div className="grid gap-3">
            {[
              {
                Icon: Search,
                title: "Diagnose",
                body: "Daily AI visibility scans across ChatGPT and Gemini for the buyer queries that actually move deals. Per-query mention rate, per-channel, per-locality.",
              },
              {
                Icon: Bot,
                title: "Catch hallucinations",
                body: "When the AI says you have 50 projects (you have 14), or attributes a competitor's tower to you — we flag it with the truth and queue the corrective content.",
              },
              {
                Icon: FileText,
                title: "Write the right asset",
                body: "Brief → draft → publish loop. Articles target the missing buyer queries, with structured data and internal linking baked in. ~50 credits per piece.",
              },
              {
                Icon: Wrench,
                title: "Fix the technical gaps",
                body: "Schema, llms.txt, meta, internal linking, broken pages. The boring on-page work that makes you citable to AI overviews — done by the agent, not your dev.",
              },
              {
                Icon: BarChart3,
                title: "Prove it worked",
                body: "Every scan writes a snapshot. The trend chart shows mention rate over time, the article attribution panel shows which articles moved which queries. Your CMO sees lift, not vanity.",
              },
              {
                Icon: Building2,
                title: "Scale across portfolio",
                body: "Per-project and per-locality scans for multi-city developers. RERA verification, portal coverage tracking (99acres / Housing / MagicBricks), competitor watch — all the operations real estate marketing actually needs.",
              },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5 flex gap-4">
                <div className="w-9 h-9 rounded-lg bg-[#7CB342]/15 text-[#7CB342] flex items-center justify-center flex-shrink-0">
                  <Icon size={16} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-zinc-100 mb-1">{title}</div>
                  <p className="text-[13px] text-zinc-400 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Who it's for */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Who it&apos;s for</h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            Indian real estate developers — single-city builders with 5–10 projects up to national
            developers running 100+. Not for agencies, not for brokers, not for individual realtors.
            Built for the team responsible for brand + lead generation: the head of marketing, CMO,
            or founder doing both.
          </p>
        </section>

        {/* Why us */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Why we&apos;re different from your SEO agency</h2>
          <ul className="space-y-3 text-[14px] text-zinc-300">
            <li className="flex gap-3">
              <span className="text-[#7CB342] flex-shrink-0">→</span>
              <span><b className="text-zinc-100">We optimise for AI, not Google.</b> AI overviews are the new top result. Every article, every schema deploy is built to be cited by ChatGPT and Gemini specifically.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#7CB342] flex-shrink-0">→</span>
              <span><b className="text-zinc-100">Execution, not reporting.</b> Most tools tell you what&apos;s wrong. Cabbge writes the page that fixes it, in the same dashboard.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#7CB342] flex-shrink-0">→</span>
              <span><b className="text-zinc-100">Real estate native.</b> RERA, portal coverage, project schema, possession dates, locality scoping — none of which generic SEO tools understand.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#7CB342] flex-shrink-0">→</span>
              <span><b className="text-zinc-100">10× cheaper than the agency you&apos;re comparing us to.</b> ₹50K–₹6L/month replaces a ₹5L–₹15L retainer with more output and faster cadence.</span>
            </li>
          </ul>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-[#7CB342]/30 bg-gradient-to-br from-[#7CB342]/[0.06] to-zinc-900/40 p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold">See where you stand</h2>
          <p className="text-[14px] text-zinc-400">Sign up, add your projects, and run a comprehensive scan against your real portfolio.</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 font-semibold px-5 py-2.5 rounded-lg text-[14px]"
            >
              Start your scan <ArrowRight size={14} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 border border-zinc-700 hover:bg-zinc-800 text-zinc-200 font-semibold px-5 py-2.5 rounded-lg text-[14px]"
            >
              See pricing
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] mt-16">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between text-[12px] text-zinc-500">
          <span>© Cabbge · Built for Indian real estate</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-zinc-300">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-300">Terms</Link>
            <Link href="/dpa" className="hover:text-zinc-300">DPA</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
