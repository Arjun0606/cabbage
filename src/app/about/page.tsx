import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Search,
  FileText,
  BarChart3,
  Wrench,
  Bot,
  Globe,
} from "lucide-react";
import {
  JsonLd,
  organizationSchema,
  softwareApplicationSchema,
  aboutFaqSchema,
} from "@/components/seo/JsonLd";

/**
 * About / what-is-Cabbge page.
 *
 * Static, no personalization. Tells the whole pitch in three minutes:
 * AI search is replacing Google for product research, indie SaaS and
 * Shopify operators are mostly invisible inside it, Cabbge fixes
 * that with a real execution loop (5-engine GEO scan + mention
 * tracking + per-engine playbook + content + outreach).
 */

export const metadata = {
  title: "About Cabbge — be the brand AI recommends",
  description:
    "Cabbge is the GEO + mention-tracking tool for indie SaaS, Shopify operators, and small marketing teams. Five engines scanned, four channels tracked, every fix shipped. $49/mo to start.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      <JsonLd
        schema={[
          organizationSchema(),
          softwareApplicationSchema(),
          aboutFaqSchema(),
        ]}
      />
      <header className="border-b border-white/[0.06] sticky top-0 bg-[#0a0a0b]/80 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#7CB342] flex items-center justify-center">
              <Sparkles size={14} className="text-zinc-900" />
            </div>
            <span className="font-semibold tracking-tight">Cabbge</span>
          </Link>
          <nav className="flex items-center gap-6 text-[13px]">
            <Link
              href="/pricing"
              className="text-zinc-400 hover:text-zinc-200"
            >
              Pricing
            </Link>
            <Link href="/vs" className="text-zinc-400 hover:text-zinc-200">
              Compare
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

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-16">
        <section className="space-y-5">
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#7CB342]">
            <Sparkles size={12} /> What Cabbge is
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            Be the brand AI recommends.
          </h1>
          <p className="text-[16px] text-zinc-400 leading-relaxed">
            Indie founders, bootstrapped SaaS, Shopify and independent
            ecom operators, small marketing teams — your buyer no
            longer Googles you, they ask ChatGPT. Or Gemini, or
            Perplexity, or Claude, or Grok. Cabbge is the tool that
            tells you what each of those engines actually says about
            you, why, and exactly what to ship to fix it. Plus the
            mentions on Reddit, HN, X, and YouTube humans are still
            posting on the side.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">The shift</h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            High-intent product research moved from Google to AI
            chatbots in under 18 months. ChatGPT alone passes 800M
            weekly active users; Gemini ships inside Google Search by
            default; Perplexity is the new top-of-funnel for B2B
            buyers. The blue-link SEO playbook that built every Shopify
            store and every SaaS launch from 2010-2024 mostly doesn&apos;t
            apply here — citations work differently, content structure
            matters more, and most generic SEO tools haven&apos;t caught up.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            {[
              { label: "ChatGPT WAU", value: "800M+" },
              { label: "Engines scanned", value: "5" },
              {
                label: "Mention sources",
                value: "Reddit · HN · YT · X",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4"
              >
                <div className="text-2xl font-bold text-zinc-100">
                  {s.value}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-zinc-500 mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold">What Cabbge actually does</h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            Most tools tell you you&apos;re losing. Cabbge fixes it. Every
            loop closes itself: detect the gap, write the asset, ship
            the fix, watch the next scan move the number.
          </p>

          <div className="grid gap-3">
            {[
              {
                Icon: Search,
                title: "Diagnose across 5 engines",
                body: "Same buyer-prompt set runs against ChatGPT, Gemini, Perplexity, Claude, and Grok. Per-engine mention rate, citation position, top competitors named instead of you.",
              },
              {
                Icon: Bot,
                title: "Per-engine playbook",
                body: "Each engine ranks differently. ChatGPT cares about server-rendered content + answer-block structure; Gemini cares about Wikidata grounding + sameAs; Perplexity cares about Reddit + G2; Claude cares about author bylines. The playbook tells you exactly which fix to ship for which engine.",
              },
              {
                Icon: Globe,
                title: "Mention tracking that's not just AI",
                body: "Every Reddit thread, HN comment, YouTube review, and X post mentioning your brand — surfaced in one panel, refreshed weekly. The signal humans leave that the engines later cite.",
              },
              {
                Icon: FileText,
                title: "Articles + outreach kit",
                body: "Article writer turns missing-prompt findings into the post that closes the gap. Cold-outreach kit drafts a personalized email + LinkedIn DM for every URL you paste, referencing the prospect's actual visibility score and top engine-specific findings.",
              },
              {
                Icon: Wrench,
                title: "Fix the technical gaps",
                body: "Schema, llms.txt, robots.txt for the 12 AI bots, server-render audit, entity grounding (Wikipedia / Wikidata / sameAs). The boring infra work that decides whether the engines see you at all — done by the agent, not your dev.",
              },
              {
                Icon: BarChart3,
                title: "Prove it worked",
                body: "Every scan writes a snapshot. The trend chart shows score over time per engine. Embeddable badge on your site. Public visibility scorecard at /visibility/[your-domain] you can share or stamp into a press kit.",
              },
            ].map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5 flex gap-4"
              >
                <div className="w-9 h-9 rounded-lg bg-[#7CB342]/15 text-[#7CB342] flex items-center justify-center flex-shrink-0">
                  <Icon size={16} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-zinc-100 mb-1">
                    {title}
                  </div>
                  <p className="text-[13px] text-zinc-400 leading-relaxed">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Who it&apos;s for</h2>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            Indie founders shipping their first SaaS. Bootstrapped
            product teams who never raised. Shopify and independent ecom
            operators trying to be the brand recommended in &quot;best X
            for Y&quot; searches. Small marketing teams (under 10) who
            need GEO without bringing on an agency. Even folks inside
            larger orgs who pay $49 on a personal card to use Cabbge
            unofficially — that&apos;s a deliberate part of the GTM, not
            a workaround.
          </p>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            What Cabbge is <em>not</em> for: enterprise procurement, agency
            sales motions, or anyone who wants a demo call before
            paying. The product is the demo.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Why this changes your funnel</h2>
          <ul className="space-y-3 text-[14px] text-zinc-300">
            <li className="flex gap-3">
              <span className="text-[#7CB342] flex-shrink-0">→</span>
              <span>
                <b className="text-zinc-100">A channel that compounds.</b>{" "}
                Each fix you ship for one engine often lifts you across
                the others, and the better-known you become to AI, the
                more often you get cited the next round.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#7CB342] flex-shrink-0">→</span>
              <span>
                <b className="text-zinc-100">No paid spend required.</b>{" "}
                Once subscription is paid, every additional citation /
                mention / lead is incremental at zero variable cost. The
                opposite of the paid-acquisition treadmill.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#7CB342] flex-shrink-0">→</span>
              <span>
                <b className="text-zinc-100">Five engines in one view.</b>{" "}
                Most GEO tools track one or two. Cabbge runs the same
                prompt set across all five so you don&apos;t have to
                guess which engine your buyer is using.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#7CB342] flex-shrink-0">→</span>
              <span>
                <b className="text-zinc-100">Replaces a content retainer.</b>{" "}
                Same volume of articles, same audit work, faster
                cadence, daily AI-search measurement on top, all five
                engines, plus mention tracking. One product, one bill,
                cancel anytime.
              </span>
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[#7CB342]/30 bg-gradient-to-br from-[#7CB342]/[0.06] to-zinc-900/40 p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold">See where you stand</h2>
          <p className="text-[14px] text-zinc-400">
            Free public grader at the home page — paste your domain,
            real 5-engine score in ~60 seconds, no signup.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 font-semibold px-5 py-2.5 rounded-lg text-[14px]"
            >
              Grade my brand <ArrowRight size={14} />
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
          <span>© Cabbge · GEO + mention tracking for indie operators</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-zinc-300">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-zinc-300">
              Terms
            </Link>
            <Link href="/dpa" className="hover:text-zinc-300">
              DPA
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
