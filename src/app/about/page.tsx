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
            A measurable lead channel for real estate developers.
          </h1>
          <p className="text-[16px] text-zinc-400 leading-relaxed">
            Premium developers in India and the Middle East spend ₹2–5 lakh per booked buyer.
            Most of that is paid media. Cabbge adds a parallel lead channel — organic search and
            AI search visibility — that costs ₹0 incremental once subscription is paid. Every lead
            is attributed, every rupee saved on blended CAC shows up in the dashboard.
          </p>
        </section>

        {/* The shift */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">The shift in how buyers find you</h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            High-intent buyer research moved from Google to ChatGPT and Gemini in under 18 months.
            NRI buyers in Dubai, US, UK research developers extensively before flying in. Premium
            buyers under-3-cr-budget tech-corridor families read three articles before booking a
            site visit. Most developers&apos; SEO agencies are still optimising for blue links —
            Cabbge is built for the new surface, with attribution into the funnel.
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
            Premium real estate developers in India and the Middle East. Indian developers like Sobha,
            Brigade, Prestige, DLF, Lodha, Godrej — anyone with NRI buyer flow or a premium / luxury
            book. Middle East developers like Emaar, Damac, Aldar, Sobha Realty, Danube — where buyers
            are remote, English-default, and research-driven. Not for agencies, not for brokers,
            not for tier-3 single-project local builders. Built for the team responsible for lead
            acquisition: the CMO, head of digital, or founder running both.
          </p>
        </section>

        {/* Why us */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Why this changes your CAC</h2>
          <ul className="space-y-3 text-[14px] text-zinc-300">
            <li className="flex gap-3">
              <span className="text-[#7CB342] flex-shrink-0">→</span>
              <span><b className="text-zinc-100">Lead channel that doesn&apos;t scale with media spend.</b> Once subscription is paid, every additional organic + AI-search lead is incremental at zero variable cost. Add 50-200 leads a month without raising your media budget.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#7CB342] flex-shrink-0">→</span>
              <span><b className="text-zinc-100">Attribution your CFO can defend.</b> GSC impressions → landing page clicks → form submissions → CRM-ready leads. Every step measurable, every lead source-tagged. CAC delta vs paid baseline rendered weekly.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#7CB342] flex-shrink-0">→</span>
              <span><b className="text-zinc-100">Real estate native.</b> RERA, portal coverage (99acres / Housing / MagicBricks), project schema, possession dates, NRI-segment query targeting, locality scoping — none of which generic horizontal SEO tools understand.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#7CB342] flex-shrink-0">→</span>
              <span><b className="text-zinc-100">Replaces the ₹5-15 lakh agency retainer.</b> Same volume of articles, same audit work, faster cadence, daily AI-search measurement on top. One platform, one bill, one dashboard.</span>
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
          <span>© Cabbge · Built for premium real estate · India + Middle East</span>
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
