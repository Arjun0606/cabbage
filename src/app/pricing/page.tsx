"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

const FEATURES = [
  "AI visibility scans on ChatGPT + Gemini — daily, automatic",
  "Real-time competitor alerts (new launches, pricing, sitemap changes)",
  "Full-site SEO crawler (per-URL audit, up to 200 pages)",
  "Keyword research with real search volume, difficulty, CPC",
  "Internal linking graph + orphan page detection",
  "Content decay tracking + Content Health score from GSC history",
  "One-line JS loader — publishes to any CMS (WordPress, Drupal, custom React, bespoke PHP)",
  "Schema auto-deploy with the same one-line embed",
  "GEO-optimised article writer grounded in your brand's data",
  "Portal Optimizer — auto-picks the top Indian property portals for your city",
  "GBP post generator — 4 weeks of Google Business Profile posts",
  "llms.txt + structured data + crawler-access check",
  "Google Search Console integration — real query data, not estimates",
  "Multi-site support — corporate + project microsites + NRI sites",
  "Per-config / per-price-tier / per-city GEO breakdowns",
  "Email support — priority response",
];

const CREDIT_PACKS = [
  { id: "small", credits: 1000, rupees: 5000, perCredit: "₹5.00" },
  { id: "medium", credits: 5000, rupees: 20000, perCredit: "₹4.00", highlight: true },
  { id: "large", credits: 10000, rupees: 35000, perCredit: "₹3.50" },
];

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: (response: unknown) => void) => void };
  }
}

export default function PricingPage() {
  const router = useRouter();
  const [subscribing, setSubscribing] = useState(false);
  const [toppingUp, setToppingUp] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [inDemoMode, setInDemoMode] = useState(false);

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);

    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d) => { setAuthed(!!d.authenticated); setInDemoMode(!!d.demoMode); })
      .catch(() => setAuthed(false));
  }, []);

  const handleSubscribe = async () => {
    if (!authed && !inDemoMode) {
      router.push("/signup?next=/pricing");
      return;
    }
    setSubscribing(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.demoMode) {
        alert("Demo mode — in a real session, Razorpay Checkout would open here for the ₹50,000/mo base plan.");
        router.push("/dashboard?upgraded=demo");
        return;
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "Cabbge",
        description: "Cabbge Base — ₹50,000/month",
        prefill: { email: data.email },
        theme: { color: "#7CB342" },
        handler: () => router.push("/dashboard?upgraded=true"),
        modal: { ondismiss: () => setSubscribing(false) },
      });
      rzp.open();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Checkout failed");
      setSubscribing(false);
    }
  };

  const handleTopup = async (packId: string) => {
    if (!authed && !inDemoMode) {
      router.push("/signup?next=/pricing");
      return;
    }
    setToppingUp(packId);
    try {
      const res = await fetch("/api/billing/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: packId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.demoMode) {
        alert(data.message || "Demo mode — topup simulated.");
        setToppingUp(null);
        return;
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: "INR",
        name: "Cabbge",
        description: `${data.credits.toLocaleString()} credits top-up`,
        prefill: { email: data.email },
        theme: { color: "#7CB342" },
        handler: async (response: any) => {
          // Verify and add credits
          await fetch("/api/billing/topup?verify=1", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              credits: data.credits,
            }),
          });
          router.push("/dashboard?topup=success");
        },
        modal: { ondismiss: () => setToppingUp(null) },
      });
      rzp.open();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Topup failed");
      setToppingUp(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">One plan. Everything Cabbge does.</h1>
          <p className="text-zinc-400 text-[15px] max-w-xl mx-auto">
            Less than one month of an in-house SEO hire. Replaces your agency retainer. 14-day free trial, no card required.
          </p>
        </div>

        {/* Main subscription card */}
        <div className="rounded-2xl p-8 bg-[#7CB342]/[0.05] border border-[#7CB342]/30 shadow-[0_0_48px_rgba(124,179,66,0.08)] mb-12">
          <div className="flex items-baseline justify-between flex-wrap gap-4 mb-6">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[#7CB342] font-semibold mb-1">Cabbge Base</div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">₹50,000</span>
                <span className="text-[15px] text-zinc-400">/ month</span>
              </div>
              <div className="text-[13px] text-zinc-500 mt-1">or $600/mo · billed monthly in INR via Razorpay</div>
            </div>
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="h-12 px-7 rounded-lg bg-[#7CB342] text-zinc-950 text-[15px] font-semibold hover:bg-[#8BC34A] active:scale-[0.97] disabled:opacity-60 flex items-center gap-2"
            >
              {subscribing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={15} />}
              {authed ? "Subscribe" : "Start Free Trial"}
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-y-2 gap-x-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-[13px] text-zinc-300">
                <Check size={14} className="text-[#7CB342] flex-shrink-0 mt-0.5" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.06] text-[12px] text-zinc-500">
            Every plan includes a generous monthly credit allowance.
            Use more than your base allotment? Top up below — no tier jumping, no renegotiation.
          </div>
        </div>

        {/* Credit top-ups — only shown to signed-in customers, never on
            the public marketing pricing page. Per product philosophy:
            credits are hidden from acquisition, surfaced inside the
            product when a customer actually needs more. */}
        {(authed || inDemoMode) && (
          <div className="mb-6">
            <h2 className="text-[20px] font-bold mb-1">Need more credits?</h2>
            <p className="text-[13px] text-zinc-400 mb-5">
              Top up anytime. Credits never expire. Use what you need, buy more when you need it.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {CREDIT_PACKS.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-xl p-5 border ${p.highlight ? "bg-zinc-900/80 border-white/[0.1]" : "bg-zinc-900/40 border-white/[0.04]"}`}
                >
                  {p.highlight && (
                    <div className="text-[10px] uppercase tracking-wide text-[#7CB342] font-semibold mb-2">Best value</div>
                  )}
                  <div className="text-[24px] font-bold mb-0.5">{p.credits.toLocaleString()} credits</div>
                  <div className="text-[13px] text-zinc-500 mb-3">{p.perCredit} / credit</div>
                  <div className="text-[18px] font-semibold mb-3">₹{p.rupees.toLocaleString()}</div>
                  <button
                    onClick={() => handleTopup(p.id)}
                    disabled={toppingUp === p.id}
                    className="w-full h-9 rounded-lg bg-zinc-800 border border-white/[0.08] text-[13px] font-semibold hover:bg-zinc-700 active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {toppingUp === p.id ? <Loader2 size={13} className="animate-spin" /> : null}
                    Top up
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 text-center text-[12px] text-zinc-500">
          GST extra as applicable. Cancel anytime. Enterprise + team seats →{" "}
          <a href="mailto:sales@cabbge.com" className="text-[#7CB342] hover:text-[#8BC34A]">sales@cabbge.com</a>.
        </div>
      </div>
    </div>
  );
}
