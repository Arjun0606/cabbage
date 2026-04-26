"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { JsonLd, organizationSchema, pricingFaqSchema } from "@/components/seo/JsonLd";

/**
 * Three-tier pricing, anchored against agency retainers + in-house
 * teams (the real competitors), not self-serve content-SaaS tools.
 *
 * Margin discipline: every tier keeps COGS (mostly OpenAI web_search +
 * article writing) under 5% of list price. Hard caps on the two
 * levers that actually move COGS — site-crawl pages per scan and
 * articles generated per month — let us size and upsell cleanly.
 *
 * Positioning per tier:
 *   Starter     — Single-city developer, <10 projects. The "prove
 *                 Cabbge works for us" tier.
 *   Pro         — Multi-city developer, 10-40 projects. Sweet spot
 *                 for regional developers + mid-size national brands.
 *   Enterprise  — DLF / Prestige / Lodha / Godrej scale. Unlimited
 *                 projects + cities + priority support.
 *
 * Annual prepay: 20% off (10 months cost, 12 months product).
 */

const TIERS = [
  {
    key: "starter",
    name: "Starter",
    usd: 600,
    inr: 49999,
    credits: 2000,
    articles: 30,
    projects: 10,
    cities: 1,
    subtitle: "Single-city developer · 5-10 projects",
    anchor: "Replaces a small agency retainer at the same price with 10× the output.",
    features: [
      "2,000 credits per month",
      "Up to 10 projects · 1 city",
      "30 articles generated per month",
      "Daily AI visibility scans",
      "Weekly full scan (every surface, every project)",
      "500 pages per full-site crawl",
      "7 competitors tracked",
      "Portal Optimizer + submission tracker",
      "RERA + possession tracking",
      "Hallucination audit on every scan",
      "Email support (24h)",
    ],
  },
  {
    key: "pro",
    name: "Growth",
    usd: 1200,
    inr: 99999,
    credits: 5000,
    articles: 80,
    projects: 40,
    cities: 3,
    highlight: true,
    subtitle: "Regional developer · 10-40 projects · 2-3 cities",
    anchor: "Replaces a ₹3-5L/mo agency retainer. The sweet spot.",
    features: [
      "5,000 credits per month",
      "Up to 40 projects · 3 cities",
      "80 articles generated per month",
      "Daily full scan (every surface, every microsite)",
      "1,500 pages per full-site crawl",
      "20 competitors · per-locality map",
      "Daily AI visibility + citation drift + query fanout",
      "Daily review monitor across every platform",
      "CMO monthly digest (CEO-ready)",
      "Infrastructure news → content pipeline",
      "NRI track (UAE / UK / US / SG)",
      "Priority email + WhatsApp (4h)",
    ],
  },
  {
    key: "scale",
    name: "Scale",
    usd: 3000,
    inr: 249999,
    credits: 15000,
    articles: 200,
    projects: 100,
    cities: 10,
    subtitle: "National developer · 40-100 projects · 5-10 cities",
    anchor: "Replaces a 3-person in-house marketing team. Multi-city operational depth.",
    features: [
      "15,000 credits per month",
      "Up to 100 projects · 10 cities",
      "200 articles generated per month",
      "Daily full scan on every project microsite",
      "3,000 pages per full-site crawl",
      "50 competitors · per-locality + per-city map",
      "Per-city AI visibility across every metro",
      "Multi-state RERA tracking + 30/60-day expiry alerts",
      "Custom report templates",
      "Hallucination audit on every scan",
      "Priority WhatsApp (2h) + monthly strategy call",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    usd: 7200,
    inr: 599999,
    credits: 40000,
    articles: 500,
    projects: -1,
    cities: -1,
    subtitle: "DLF · Prestige · Lodha · Godrej · Sobha scale",
    anchor: "One CMO + Cabbge = a 5-person digital team. Replaces a ₹15-25L/mo in-house stack.",
    features: [
      "40,000 credits per month",
      "Unlimited projects · unlimited cities",
      "500 articles generated per month",
      "Daily full scan on every microsite + brand-level",
      "10,000 pages per full-site crawl",
      "Unlimited competitors",
      "Per-city AI visibility across every metro",
      "Multi-state RERA tracking + 30-day expiry alerts",
      "Brand disambiguation (Godrej Properties vs Consumer)",
      "Dedicated success manager + 2h WhatsApp SLA",
      "Custom integrations (Ahrefs, GSC, CRM, DMS)",
      "Early access to new features",
    ],
  },
];

// What each scan action deducts from the monthly credit pool.
// Shown on the pricing page so prospects can do the math themselves.
const CREDIT_COSTS_DISPLAY: Array<{ action: string; cost: number }> = [
  { action: "Full scan (main site)", cost: 16 },
  { action: "Full scan (+ each microsite)", cost: 3 },
  { action: "AI visibility (ChatGPT + Gemini)", cost: 4 },
  { action: "Article writer", cost: 5 },
  { action: "Portal coverage audit", cost: 4 },
  { action: "RERA state-portal verification", cost: 3 },
  { action: "Query fanout (per query)", cost: 4 },
  { action: "Hallucination audit", cost: 0 },
  { action: "Review monitor", cost: 3 },
];

const AGENCY_COMPARE = [
  { label: "Articles shipped per month", agency: "4-8", cabbge: "20-200" },
  { label: "Scan cadence", agency: "Monthly", cabbge: "Daily" },
  { label: "AI visibility measurement (ChatGPT + Gemini)", agency: "Not measured", cabbge: "Tracked daily per city" },
  { label: "Review monitor (Housing / 99acres / Google)", agency: "Manual / spreadsheet", cabbge: "Automated, prioritised" },
  { label: "Portal submission tracker", agency: "In your team's head", cabbge: "Per project × portal matrix" },
  { label: "Ramp / onboarding time", agency: "4-8 weeks", cabbge: "15 minutes" },
  { label: "Price (multi-city developer)", agency: "₹3-10 L/mo", cabbge: "₹79,999/mo (Growth)" },
];

export default function PricingPage() {
  const router = useRouter();
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [inDemoMode, setInDemoMode] = useState(false);
  const [billed, setBilled] = useState<"monthly" | "annual">("annual");

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d) => { setAuthed(!!d.authenticated); setInDemoMode(!!d.demoMode); })
      .catch(() => setAuthed(false));
  }, []);

  const handleSubscribe = async (tierKey: string) => {
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
        alert(`Demo mode — in a real session Dodo Payments Checkout would open for the ${tierKey} plan.`);
        router.push("/dashboard?upgraded=demo");
        return;
      }

      // Dodo returns a hosted checkout URL. Full-page redirect — the
      // Dodo page handles card / upi / wallet / international methods
      // end-to-end and sends the customer back to /dashboard on success.
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

  const priceFor = (tier: typeof TIERS[number]) =>
    billed === "annual" ? Math.round(tier.inr * 0.8) : tier.inr;

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
          <Link href={authed ? "/dashboard" : "/signin"} className="text-[13px] text-zinc-400 hover:text-zinc-200">
            {authed ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      </div>

      {inDemoMode && (
        <div className="bg-amber-500/[0.08] border-b border-amber-500/30 px-5 py-2 text-center text-[12px] text-amber-200">
          <span className="font-semibold text-amber-400">Sales Demo · </span>
          Checkout buttons won&apos;t charge — they simulate the full flow.
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="text-[11px] uppercase tracking-[0.25em] text-[#7CB342] font-semibold mb-3">
            Pricing
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            From a single-city developer to DLF. One product.
          </h1>
          <p className="text-zinc-400 text-[15px] max-w-2xl mx-auto leading-relaxed">
            Credit-based pricing that scales with your portfolio. Every tier does the work — audit, AI visibility, article writing, portal coverage, RERA verification. Starts at ₹49,999/mo because Cabbge is built for serious marketing teams, not hobbyists.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-zinc-900 border border-white/[0.06]">
            <button
              onClick={() => setBilled("monthly")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                billed === "monthly" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilled("annual")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors flex items-center gap-1.5 ${
                billed === "annual" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Annual
              <span className="text-[10px] text-[#7CB342]">save 20%</span>
            </button>
          </div>
        </div>

        {/* Tier cards — 4 tiers, responsive: 1→2→4 columns */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {TIERS.map((tier) => (
            <div
              key={tier.key}
              className={`rounded-2xl p-5 flex flex-col ${
                tier.highlight
                  ? "bg-[#7CB342]/[0.06] border border-[#7CB342]/30 shadow-[0_0_48px_rgba(124,179,66,0.08)]"
                  : "bg-zinc-900/60 border border-white/[0.06]"
              }`}
            >
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] uppercase tracking-wide text-[#7CB342] font-semibold">
                    {tier.name}
                  </span>
                  {tier.highlight && (
                    <span className="text-[9px] uppercase tracking-wide bg-[#7CB342]/15 text-[#7CB342] px-1.5 py-0.5 rounded">
                      Most popular
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-3xl font-bold tabular-nums">₹{priceFor(tier).toLocaleString("en-IN")}</span>
                  <span className="text-[12px] text-zinc-400">/ mo</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  ~${Math.round(tier.usd * (billed === "annual" ? 0.8 : 1))}/mo · {billed === "annual" ? "annual" : "monthly"} · GST extra
                </div>
                <div className="mt-3 py-2 px-2.5 rounded-lg bg-zinc-800/60 border border-white/[0.04] flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">Credits / mo</span>
                  <span className="text-[14px] font-bold text-[#7CB342] tabular-nums">{tier.credits.toLocaleString("en-IN")}</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-3 leading-relaxed">
                  {tier.subtitle}
                </p>
                <p className="text-[10px] text-[#7CB342]/80 mt-2 leading-relaxed">
                  {tier.anchor}
                </p>
              </div>

              <button
                onClick={() => handleSubscribe(tier.key)}
                disabled={subscribing === tier.key}
                className={`w-full h-10 rounded-lg text-[13px] font-semibold mb-4 flex items-center justify-center gap-1.5 transition-all ${
                  tier.highlight
                    ? "bg-[#7CB342] text-zinc-950 hover:bg-[#8BC34A] active:scale-[0.98]"
                    : "bg-zinc-800 text-zinc-100 border border-white/[0.08] hover:bg-zinc-700 active:scale-[0.98]"
                } disabled:opacity-60`}
              >
                {subscribing === tier.key ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <>
                    {authed ? "Subscribe" : "Get started"}
                    <ArrowRight size={13} />
                  </>
                )}
              </button>

              <div className="space-y-1.5">
                {tier.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11.5px] text-zinc-300">
                    <Check size={12} className="text-[#7CB342] flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Per-tier spec comparison — scannable in 10 seconds */}
        <div className="rounded-2xl bg-zinc-900/60 border border-white/[0.06] overflow-hidden mb-12">
          <div className="p-5 border-b border-white/[0.06]">
            <h2 className="text-[20px] font-bold">Tier specs at a glance</h2>
            <p className="text-[12px] text-zinc-500 mt-1">
              Match your project count and city footprint to the right tier. Every tier includes every feature — the numbers scale with your portfolio.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-zinc-900/80 border-b border-white/[0.04]">
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">Spec</th>
                  {TIERS.map((t) => (
                    <th key={t.key} className={`text-center px-3 py-2.5 text-[11px] uppercase tracking-wide font-semibold ${t.highlight ? "text-[#7CB342]" : "text-zinc-400"}`}>
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                <tr>
                  <td className="px-4 py-2.5 text-zinc-500">Price / month</td>
                  {TIERS.map((t) => (
                    <td key={t.key} className={`text-center px-3 py-2.5 tabular-nums ${t.highlight ? "text-[#7CB342] font-semibold" : "text-zinc-300"}`}>
                      ₹{priceFor(t).toLocaleString("en-IN")}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-zinc-500">Credits / month</td>
                  {TIERS.map((t) => (
                    <td key={t.key} className="text-center px-3 py-2.5 text-zinc-200 font-semibold tabular-nums">
                      {t.credits.toLocaleString("en-IN")}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-zinc-500">Projects</td>
                  {TIERS.map((t) => (
                    <td key={t.key} className="text-center px-3 py-2.5 text-zinc-300 tabular-nums">
                      {t.projects === -1 ? "Unlimited" : `Up to ${t.projects}`}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-zinc-500">Cities</td>
                  {TIERS.map((t) => (
                    <td key={t.key} className="text-center px-3 py-2.5 text-zinc-300 tabular-nums">
                      {t.cities === -1 ? "Unlimited" : t.cities}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-zinc-500">Articles / month</td>
                  {TIERS.map((t) => (
                    <td key={t.key} className="text-center px-3 py-2.5 text-zinc-300 tabular-nums">
                      {t.articles}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-zinc-500">Full scan cadence</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300">Weekly</td>
                  <td className="text-center px-3 py-2.5 text-[#7CB342]">Daily</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300">Daily</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300">Daily</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-zinc-500">AI visibility scans</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300">Daily</td>
                  <td className="text-center px-3 py-2.5 text-[#7CB342]">Daily</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300">Daily, per city</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300">Daily, every metro</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-zinc-500">Review monitor</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300">Weekly</td>
                  <td className="text-center px-3 py-2.5 text-[#7CB342]">Daily</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300">Daily</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300">Daily</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-zinc-500">Site crawl pages</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300 tabular-nums">500</td>
                  <td className="text-center px-3 py-2.5 text-[#7CB342] tabular-nums">1,500</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300 tabular-nums">3,000</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300 tabular-nums">10,000</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-zinc-500">Competitors tracked</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300 tabular-nums">7</td>
                  <td className="text-center px-3 py-2.5 text-[#7CB342] tabular-nums">20</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300 tabular-nums">50</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300">Unlimited</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-zinc-500">CMO monthly digest</td>
                  <td className="text-center px-3 py-2.5 text-zinc-600">—</td>
                  <td className="text-center px-3 py-2.5 text-[#7CB342]">✓</td>
                  <td className="text-center px-3 py-2.5 text-[#7CB342]">✓</td>
                  <td className="text-center px-3 py-2.5 text-[#7CB342]">✓ Weekly</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-zinc-500">Infrastructure news pipeline</td>
                  <td className="text-center px-3 py-2.5 text-zinc-600">—</td>
                  <td className="text-center px-3 py-2.5 text-[#7CB342]">✓</td>
                  <td className="text-center px-3 py-2.5 text-[#7CB342]">✓</td>
                  <td className="text-center px-3 py-2.5 text-[#7CB342]">✓</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-zinc-500">Custom report templates</td>
                  <td className="text-center px-3 py-2.5 text-zinc-600">—</td>
                  <td className="text-center px-3 py-2.5 text-zinc-600">—</td>
                  <td className="text-center px-3 py-2.5 text-[#7CB342]">✓</td>
                  <td className="text-center px-3 py-2.5 text-[#7CB342]">✓</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-zinc-500">Dedicated success manager</td>
                  <td className="text-center px-3 py-2.5 text-zinc-600">—</td>
                  <td className="text-center px-3 py-2.5 text-zinc-600">—</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300">Monthly call</td>
                  <td className="text-center px-3 py-2.5 text-[#7CB342]">✓</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-zinc-500">Support SLA</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300">24h email</td>
                  <td className="text-center px-3 py-2.5 text-[#7CB342]">4h WhatsApp</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300">2h WhatsApp</td>
                  <td className="text-center px-3 py-2.5 text-zinc-300">2h + CSM</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-white/[0.04] text-[11px] text-zinc-500 leading-relaxed">
            Credits roll over 0% month-to-month. Overages billed at ₹4/credit so a 500-credit overage on Growth is ₹2,000. Need a custom plan? <a href="mailto:sales@cabbge.com" className="text-[#7CB342]">sales@cabbge.com</a>.
          </div>
        </div>

        {/* Agency comparison table */}
        <div className="rounded-2xl bg-zinc-900/60 border border-white/[0.06] overflow-hidden mb-12">
          <div className="p-5 border-b border-white/[0.06]">
            <h2 className="text-[20px] font-bold">vs a digital agency retainer</h2>
            <p className="text-[12px] text-zinc-500 mt-1">
              Most Indian residential developers pay an agency ₹3-10L/mo and still have content and GEO gaps. Same budget → Cabbge replaces the retainer + ships 15× the work.
            </p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            <div className="grid grid-cols-[1fr_1fr_1fr] px-5 py-2.5 bg-zinc-900/80 text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">
              <div>Dimension</div>
              <div>Digital agency</div>
              <div>Cabbge Growth (₹79,999/mo)</div>
            </div>
            {AGENCY_COMPARE.map((row) => (
              <div key={row.label} className="grid grid-cols-[1fr_1fr_1fr] px-5 py-3 text-[13px]">
                <div className="text-zinc-400">{row.label}</div>
                <div className="text-zinc-500">{row.agency}</div>
                <div className="text-[#7CB342] font-medium">{row.cabbge}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Moat / why-Cabbge */}
        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {[
            {
              title: "The GEO layer nobody else has",
              body: "Digital agencies don't measure AI visibility — they still think in Google rankings. Cabbge tracks how ChatGPT and Gemini answer buyer queries about your projects daily, catches negative-sentiment mentions, and auto-drafts response content. This one capability is worth the whole subscription.",
            },
            {
              title: "Indian real estate depth",
              body: "RERA state split. Locality query matrix (Kukatpally / Gachibowli / Whitefield level). Per-country NRI content (UAE / UK / US / SG). Possession date + delay-risk tracking. Review monitor across Housing / 99acres / MagicBricks. No generic SEO tool has this depth.",
            },
            {
              title: "Execution, not reporting",
              body: "Agencies deliver a dashboard. Freelancers deliver a spreadsheet. Cabbge ships articles, deploys landing pages to your site, submits portal copy, drafts review responses. Every feature ends in a concrete thing a buyer sees.",
            },
          ].map((b) => (
            <div key={b.title} className="rounded-xl bg-zinc-900/40 border border-white/[0.04] p-5">
              <div className="text-[13px] font-semibold text-zinc-100 mb-2">{b.title}</div>
              <p className="text-[12px] text-zinc-400 leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>

        {/* FAQ / trust row */}
        <div className="text-center text-[12px] text-zinc-500 space-y-1">
          <div>GST extra as applicable. No free trial — Cabbge is a paid product.</div>
          <div>
            Cancel anytime from Settings. Need something custom?{" "}
            <a href="mailto:sales@cabbge.com" className="text-[#7CB342] hover:text-[#8BC34A]">
              sales@cabbge.com
            </a>.
          </div>
        </div>

        {/* Legal footer — every marketing page links to the trust surface. */}
        <div className="mt-12 pt-6 border-t border-white/[0.04] flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] text-zinc-500">
          <Link href="/terms" className="hover:text-zinc-300">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-zinc-300">Privacy Policy</Link>
          <Link href="/dpa" className="hover:text-zinc-300">Data Processing Agreement</Link>
          <Link href="/legal" className="hover:text-zinc-300">Security and trust</Link>
        </div>
      </div>
    </div>
  );
}
