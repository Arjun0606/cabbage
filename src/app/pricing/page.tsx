"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { JsonLd, organizationSchema, pricingFaqSchema } from "@/components/seo/JsonLd";
import { TIERS, tierPrice, type PlanTier } from "@/lib/tiers";

/**
 * Three-tier USD pricing for indie founders, bootstrapped SaaS,
 * Shopify and independent ecom operators, and small marketing teams.
 *
 * Self-serve only. No demo call. No enterprise tier. Even people
 * inside larger orgs can drop $49 on a personal card and use Cabbge
 * unofficially — that pattern (Linear / Tally / Vercel) is the GTM.
 *
 * Annual prepay: 20% off (10 months cost, 12 months product).
 */

const TIER_DEFS: Array<{
  key: PlanTier;
  subtitle: string;
  anchor: string;
  highlight?: boolean;
  features: string[];
}> = [
  {
    key: "starter",
    subtitle: "Indie founder · single brand · personal card",
    anchor: "Cheaper than a single agency hour. The $49 'is AI even seeing me' tier.",
    features: [
      "5-engine AI visibility scan (ChatGPT, Gemini, Perplexity, Claude, Grok)",
      "Up to 3 tracked brands",
      "Mention tracking on Reddit, HN, YouTube, X — refreshed weekly",
      "Per-engine playbook: exact fix to ship for each AI engine",
      "15 articles generated per month",
      "Cold-outreach kit (up to 100 URLs per batch)",
      "Public visibility scorecard + embeddable badge",
      "Email support",
    ],
  },
  {
    key: "pro",
    subtitle: "Small SaaS / ecom team · 5-10 brand SKUs · the sweet spot",
    highlight: true,
    anchor: "Replaces a $2-5K/mo content-marketing retainer at a fifth the price.",
    features: [
      "Everything in Starter, plus:",
      "Up to 10 tracked brands",
      "80 articles generated per month",
      "Daily AI visibility scans (vs weekly on Starter)",
      "Mention tracker refreshed daily on demand",
      "20 competitors tracked across all engines",
      "Priority outreach + email support",
    ],
  },
  {
    key: "scale",
    subtitle: "Agencies, multi-brand operators, power users",
    anchor: "Volume tier for content shops, freelance consultants serving SMBs.",
    features: [
      "Everything in Growth, plus:",
      "Up to 50 tracked brands",
      "300 articles generated per month",
      "100 competitors tracked",
      "Bulk CSV exports + API access (when shipped)",
      "Dedicated support channel",
    ],
  },
];

const VS_AGENCY = [
  { dim: "Articles per month", agency: "4-8", cabbge: "15-300" },
  { dim: "AI visibility tracked", agency: "Not measured", cabbge: "5 engines, daily" },
  { dim: "Reddit / HN / X / YouTube mentions", agency: "Manual / spreadsheet", cabbge: "Automated, weekly digest" },
  { dim: "Cold outreach drafts", agency: "Templates", cabbge: "Personalized off live grade" },
  { dim: "Onboarding time", agency: "2-4 weeks", cabbge: "5 minutes" },
  { dim: "Monthly cost (small team)", agency: "$2,000-$5,000", cabbge: "$199 (Growth)" },
];

const FAQS = [
  {
    q: "Is there a free trial?",
    a: "There's a free public grader at the home page — paste any URL and get a real 5-engine score. No signup. The paid tiers add scheduled re-scans, mention tracking, the playbook, articles, and the outreach kit.",
  },
  {
    q: "What happens if I exceed credits?",
    a: "Credits are a soft ceiling. We surface a 'you're over' notice in the dashboard and queue overages instead of hard-blocking. If you're routinely over, that's the upsell signal — bumping a tier costs less than the friction of re-running everything.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — Settings → Billing → Cancel. We don't lock annual prepays into multi-year terms; if you cancel inside the annual period the unused months are refunded pro-rated.",
  },
  {
    q: "Do you have an enterprise plan?",
    a: "No. Cabbge is self-serve, top to bottom. The deliberate choice: tools that ship enterprise sales motions slow down for the indie founder we're built for. If your usage outgrows Scale, ping support and we'll size something — but no SDR will call you.",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [subscribing, setSubscribing] = useState<PlanTier | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [inDemoMode, setInDemoMode] = useState(false);
  const [billed, setBilled] = useState<"monthly" | "annual">("annual");

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d) => {
        setAuthed(!!d.authenticated);
        setInDemoMode(!!d.demoMode);
      })
      .catch(() => setAuthed(false));
  }, []);

  const handleSubscribe = async (tierKey: PlanTier) => {
    if (!authed && !inDemoMode) {
      router.push(`/signup?next=/pricing&plan=${tierKey}`);
      return;
    }
    setSubscribing(tierKey);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: tierKey, billed }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.demoMode) {
        alert(`Demo mode — Dodo Payments Checkout would open for ${tierKey}.`);
        router.push("/dashboard?upgraded=demo");
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      throw new Error("Checkout endpoint didn't return a URL");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Checkout failed");
      setSubscribing(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      <JsonLd schema={[organizationSchema(), pricingFaqSchema()]} />

      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#7CB342] flex items-center justify-center">
              <Sparkles size={14} className="text-zinc-900" />
            </div>
            <span className="text-[15px] font-semibold">Cabbge</span>
          </Link>
          <Link
            href={authed ? "/dashboard" : "/signin"}
            className="text-[13px] text-zinc-400 hover:text-zinc-200"
          >
            {authed ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      </div>

      {inDemoMode && (
        <div className="bg-amber-500/[0.08] border-b border-amber-500/30 px-5 py-2 text-center text-[12px] text-amber-200">
          <span className="font-semibold text-amber-400">Demo · </span>
          Checkout buttons won&apos;t charge — they simulate the flow.
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="text-[11px] uppercase tracking-[0.25em] text-[#7CB342] font-semibold mb-3">
            Pricing
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            Be the brand AI recommends.
          </h1>
          <p className="text-zinc-400 text-[15px] max-w-2xl mx-auto leading-relaxed">
            One product, three sizes. Every tier ships the full
            5-engine GEO scan, mention tracking across Reddit / HN /
            YouTube / X, the per-engine playbook, articles, and the
            cold-outreach kit. Tiers differ on volume, not features.
            Start at $49, cancel anytime.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-zinc-900 border border-white/[0.06]">
            <button
              onClick={() => setBilled("monthly")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                billed === "monthly"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilled("annual")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors flex items-center gap-1.5 ${
                billed === "annual"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Annual
              <span className="text-[10px] text-[#7CB342]">save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {TIER_DEFS.map((def) => {
            const tier = TIERS[def.key];
            const price = tierPrice(tier, billed);
            return (
              <div
                key={def.key}
                className={`rounded-2xl p-5 flex flex-col ${
                  def.highlight
                    ? "bg-[#7CB342]/[0.06] border border-[#7CB342]/30 shadow-[0_0_48px_rgba(124,179,66,0.08)]"
                    : "bg-zinc-900/60 border border-white/[0.06]"
                }`}
              >
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] uppercase tracking-wide text-[#7CB342] font-semibold">
                      {tier.label}
                    </span>
                    {def.highlight && (
                      <span className="text-[9px] uppercase tracking-wide bg-[#7CB342]/15 text-[#7CB342] px-1.5 py-0.5 rounded">
                        Most popular
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-3xl font-bold tabular-nums">
                      ${price}
                    </span>
                    <span className="text-[12px] text-zinc-400">/ mo</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    {billed === "annual"
                      ? `billed annually · $${price * 12}/yr`
                      : "billed monthly"}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-3 leading-relaxed">
                    {def.subtitle}
                  </p>
                  <p className="text-[10px] text-[#7CB342]/80 mt-2 leading-relaxed">
                    {def.anchor}
                  </p>
                </div>

                <button
                  onClick={() => handleSubscribe(def.key)}
                  disabled={subscribing === def.key}
                  className={`w-full h-10 rounded-lg text-[13px] font-semibold mb-4 flex items-center justify-center gap-1.5 transition-all ${
                    def.highlight
                      ? "bg-[#7CB342] text-zinc-950 hover:bg-[#8BC34A] active:scale-[0.98]"
                      : "bg-zinc-800 text-zinc-100 border border-white/[0.08] hover:bg-zinc-700 active:scale-[0.98]"
                  } disabled:opacity-60`}
                >
                  {subscribing === def.key ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <>
                      {authed ? "Subscribe" : "Get started"}
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>

                <div className="space-y-1.5">
                  {def.features.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-1.5 text-[11.5px] text-zinc-300"
                    >
                      <Check
                        size={12}
                        className="text-[#7CB342] flex-shrink-0 mt-0.5"
                      />
                      <span className="leading-relaxed">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl bg-zinc-900/60 border border-white/[0.06] overflow-hidden mb-12">
          <div className="p-5 border-b border-white/[0.06]">
            <h2 className="text-[20px] font-bold">vs a content-marketing retainer</h2>
            <p className="text-[12px] text-zinc-500 mt-1">
              Most indie SaaS / Shopify operators pay an agency $2-5K/mo
              and still have GEO and mention-tracking gaps. Same budget →
              Cabbge replaces the retainer + ships an order-of-magnitude
              more work.
            </p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            <div className="grid grid-cols-[1fr_1fr_1fr] px-5 py-2.5 bg-zinc-900/80 text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">
              <div>Dimension</div>
              <div>Agency retainer</div>
              <div>Cabbge Growth ($199/mo)</div>
            </div>
            {VS_AGENCY.map((row) => (
              <div
                key={row.dim}
                className="grid grid-cols-[1fr_1fr_1fr] px-5 py-3 text-[13px]"
              >
                <div className="text-zinc-400">{row.dim}</div>
                <div className="text-zinc-500">{row.agency}</div>
                <div className="text-[#7CB342] font-medium">{row.cabbge}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {[
            {
              title: "Five engines, not two",
              body: "Most GEO tools track ChatGPT and maybe Gemini. Cabbge runs the same prompt set across ChatGPT, Gemini, Perplexity, Claude, and Grok — because your buyer is using whichever one fits their habit, not the one your tool happens to support.",
            },
            {
              title: "Mentions on top of GEO",
              body: "AI visibility is half the picture. Cabbge also pulls every Reddit thread, HN comment, YouTube review, and X post mentioning your brand — surfaced in one panel, refreshed weekly. The combo most tools sell separately, in one product.",
            },
            {
              title: "Execution, not reporting",
              body: "Other tools tell you your AI visibility score and stop there. Cabbge ships the article that fixes it, drafts the outreach DM, and points to the exact site change for each engine. Every feature ends in a concrete thing you ship.",
            },
          ].map((b) => (
            <div
              key={b.title}
              className="rounded-xl bg-zinc-900/40 border border-white/[0.04] p-5"
            >
              <div className="text-[13px] font-semibold text-zinc-100 mb-2">
                {b.title}
              </div>
              <p className="text-[12px] text-zinc-400 leading-relaxed">
                {b.body}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-zinc-900/40 border border-white/[0.04] p-5 mb-12">
          <h2 className="text-[16px] font-semibold mb-4">FAQ</h2>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <div key={f.q}>
                <div className="text-[13px] text-zinc-100 font-medium mb-1">
                  {f.q}
                </div>
                <p className="text-[12px] text-zinc-400 leading-relaxed">
                  {f.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-[12px] text-zinc-500 space-y-1">
          <div>Cancel anytime from Settings. Self-serve, top to bottom.</div>
          <div>
            Questions?{" "}
            <a
              href="mailto:hi@cabbge.com"
              className="text-[#7CB342] hover:text-[#8BC34A]"
            >
              hi@cabbge.com
            </a>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/[0.04] flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] text-zinc-500">
          <Link href="/terms" className="hover:text-zinc-300">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-zinc-300">
            Privacy Policy
          </Link>
          <Link href="/dpa" className="hover:text-zinc-300">
            Data Processing Agreement
          </Link>
          <Link href="/legal" className="hover:text-zinc-300">
            Security and trust
          </Link>
        </div>
      </div>
    </div>
  );
}
