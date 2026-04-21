"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

type Plan = "starter" | "growth" | "enterprise";

interface Tier {
  id: Plan;
  name: string;
  tagline: string;
  price: string;
  priceUnit: string;
  highlight?: boolean;
  features: string[];
  cta: string;
}

const TIERS: Tier[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Single-site developers getting serious about AI search",
    price: "₹7,500",
    priceUnit: "/month",
    features: [
      "1 website (+ up to 3 project microsites)",
      "Daily AI visibility scans (ChatGPT + Gemini)",
      "Full-site SEO crawler (up to 50 pages)",
      "Keyword research with real volume & KD",
      "GEO-optimized article generation (unlimited within credits)",
      "Internal linking analysis",
      "Content decay detection",
      "Google Search Console integration",
      "Schema auto-deploy",
      "500 credits/month",
      "Email support",
    ],
    cta: "Start Free Trial",
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "Mid-tier builders with multiple projects",
    price: "₹24,000",
    priceUnit: "/month",
    highlight: true,
    features: [
      "Everything in Starter, plus:",
      "5 websites + unlimited project microsites",
      "Daily scans on every site",
      "Full-site crawler (up to 200 pages per site)",
      "Competitive citation alerts",
      "Per-segment GEO breakdowns (config / price / funnel)",
      "Publish-to-WordPress / Webflow integration",
      "Auto-refresh queries when projects change",
      "2,500 credits/month",
      "Priority email + WhatsApp support",
    ],
    cta: "Start Free Trial",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "DLF / Prestige / Godrej scale — many brands, many cities",
    price: "Custom",
    priceUnit: "",
    features: [
      "Everything in Growth, plus:",
      "Unlimited websites & project microsites",
      "Multi-team access with role-based permissions",
      "Multi-site publish to many WordPress sites at once",
      "Dedicated Razorpay / Stripe billing",
      "India data residency",
      "SLA + dedicated account manager",
      "Custom credit pools + rollover",
      "Weekly strategy call",
      "White-label option available",
    ],
    cta: "Talk to Sales",
  },
];

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: (response: unknown) => void) => void };
  }
}

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<Plan | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    // Preload Razorpay checkout
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);

    // Check auth state (so we can send unauth'd users to signup first)
    fetch("/api/billing/status").then((r) => r.json()).then((d) => setAuthed(!!d.authenticated)).catch(() => setAuthed(false));
  }, []);

  const handleChoose = async (plan: Plan) => {
    if (plan === "enterprise") {
      window.location.href = "mailto:sales@cabbge.com?subject=Cabbge%20Enterprise%20Pricing";
      return;
    }

    if (!authed) {
      router.push(`/signup?next=${encodeURIComponent(`/pricing?plan=${plan}`)}`);
      return;
    }

    setLoading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "Cabbge",
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan`,
        prefill: { email: data.email },
        theme: { color: "#7CB342" },
        handler: () => {
          // Webhook will flip status to active. Redirect to dashboard.
          router.push("/dashboard?upgraded=true");
        },
        modal: {
          ondismiss: () => setLoading(null),
        },
      });
      rzp.open();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Checkout failed");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
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

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Simple pricing. Always-on SEO + GEO execution.</h1>
          <p className="text-zinc-400 text-[15px] max-w-2xl mx-auto">
            14-day free trial. No credit card required. Full features. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-2xl p-6 border ${
                tier.highlight
                  ? "bg-[#7CB342]/[0.04] border-[#7CB342]/30 shadow-[0_0_32px_rgba(124,179,66,0.08)]"
                  : "bg-zinc-900/60 border-white/[0.06]"
              }`}
            >
              {tier.highlight && (
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[#7CB342] mb-2">
                  Most popular
                </div>
              )}
              <h3 className="text-[18px] font-bold mb-1">{tier.name}</h3>
              <p className="text-[12px] text-zinc-500 mb-4 min-h-[32px]">{tier.tagline}</p>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-3xl font-bold">{tier.price}</span>
                {tier.priceUnit && <span className="text-[13px] text-zinc-500">{tier.priceUnit}</span>}
              </div>
              <button
                onClick={() => handleChoose(tier.id)}
                disabled={loading === tier.id}
                className={`w-full h-10 rounded-lg font-semibold text-[13px] transition-all mb-6 flex items-center justify-center gap-1.5 ${
                  tier.highlight
                    ? "bg-[#7CB342] text-zinc-950 hover:bg-[#8BC34A] active:scale-[0.97]"
                    : "bg-zinc-800 text-zinc-100 border border-white/[0.08] hover:bg-zinc-700 active:scale-[0.97]"
                } disabled:opacity-60`}
              >
                {loading === tier.id ? <Loader2 size={14} className="animate-spin" /> : null}
                {tier.cta} {!loading && <ArrowRight size={13} />}
              </button>
              <ul className="space-y-2">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-zinc-300">
                    <Check size={13} className="text-[#7CB342] flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-[12px] text-zinc-500">
          All plans include GST as applicable. Billed monthly in INR via Razorpay.
          <br />
          Need a custom setup, dedicated region, or annual pricing?{" "}
          <a href="mailto:sales@cabbge.com" className="text-[#7CB342] hover:text-[#8BC34A]">Contact sales</a>.
        </div>
      </div>
    </div>
  );
}
