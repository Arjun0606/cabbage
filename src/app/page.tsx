"use client";

/**
 * Marketing home page.
 *
 * Repositioned 2026-04-29 after the Makuta meeting. Old hero pitched
 * "AI search visibility" as the headline value. Real-estate developers
 * don't buy visibility — they buy CAC reduction. New hero leads with
 * the unit-of-value (lower CAC, measurable lead channel) and treats
 * AI search + SEO as the engine, not the headline.
 *
 * Target ICP is now premium / NRI-heavy Indian developers + ME
 * developers (Emaar, Damac, Aldar, etc.) — entry pricing $5-15K/mo.
 * See cabbage_icp_premium memory entry for the full target list.
 */

import {
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { JsonLd, organizationSchema, softwareApplicationSchema, homepageFaqSchema } from "@/components/seo/JsonLd";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      <JsonLd schema={[organizationSchema(), softwareApplicationSchema(), homepageFaqSchema()]} />

      {/* Logo + headline */}
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <img src="/logo.png" alt="Cabbge" className="w-14 h-14 object-contain" />
        <div className="text-[10px] uppercase tracking-[0.25em] text-[#7CB342] font-semibold">
          Lead Acquisition for Real Estate · India + Middle East
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-zinc-100 tracking-tight max-w-3xl leading-tight">
          Premium real estate developers spend ₹2-5 lakh per booked buyer. Cabbge brings that down.
        </h1>
        <p className="text-sm text-zinc-400 text-center max-w-xl leading-relaxed">
          We add a measurable organic + AI-search lead channel to your acquisition mix. Every lead we
          deliver is attributable, every rupee saved on blended CAC shows up in your dashboard.
          Built for developers whose buyers research on ChatGPT, Google, and from abroad.
        </p>
      </div>

      {/* Three outcome stats — what we actually move */}
      <div className="grid grid-cols-3 gap-3 max-w-2xl w-full mb-10">
        {[
          { headline: "Lower CAC", body: "Replace expensive paid-channel leads with organic + AI-search leads that cost ₹0 incremental once subscription is paid." },
          { headline: "Measurable", body: "GSC impressions → landing-page clicks → form fills → leads. Every step attributed. CFO-ready ROI math." },
          { headline: "Built for RE", body: "RERA-aware, locality-scoped, NRI-segment-aware. Articles your team can publish, not generic SEO templates." },
        ].map((s) => (
          <div key={s.headline} className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-3.5">
            <div className="text-[12px] font-semibold text-zinc-100 mb-1.5">{s.headline}</div>
            <div className="text-[11px] text-zinc-500 leading-relaxed">{s.body}</div>
          </div>
        ))}
      </div>

      {/* Primary CTAs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap justify-center">
        <Link
          href="/signup"
          className="h-10 px-5 rounded-lg bg-[#7CB342] text-zinc-950 text-[13px] font-semibold hover:bg-[#8BC34A] active:scale-[0.97] flex items-center gap-1.5"
        >
          Start your scan <ArrowRight size={13} />
        </Link>
        <Link
          href="/pricing"
          className="h-10 px-4 rounded-lg text-[13px] text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 flex items-center gap-1.5"
        >
          See pricing
        </Link>
        <Link
          href="/about"
          className="h-10 px-4 rounded-lg text-[13px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 flex items-center gap-1.5"
        >
          How it works
        </Link>
        <Link
          href="/signin"
          className="h-10 px-4 rounded-lg text-[13px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 flex items-center gap-1.5"
        >
          Sign in
        </Link>
      </div>

      <p className="text-xs text-zinc-600 max-w-md text-center leading-relaxed mb-1">
        Sign up, add your projects + brand voice, and we run a comprehensive AI-visibility, SEO,
        and RERA scan. You see your real numbers before you commit.
      </p>
      <p className="text-xs text-zinc-700 max-w-md text-center leading-relaxed">
        Enterprise / multi-city builders — <Link href="/pricing#enterprise" className="text-[#8BC34A] hover:text-[#9CCC65]">talk to sales</Link> for custom pricing.
      </p>

      {/* Footer */}
      <div className="mt-16 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-zinc-700">
        <Link href="/pricing" className="hover:text-zinc-400 transition-colors">Pricing</Link>
        <span>&bull;</span>
        <Link href="/compare" className="hover:text-zinc-400 transition-colors">Compare</Link>
        <span>&bull;</span>
        <Link href="/about" className="hover:text-zinc-400 transition-colors">About</Link>
        <span>&bull;</span>
        <Link href="/methodology" className="hover:text-zinc-400 transition-colors">Methodology</Link>
        <span>&bull;</span>
        <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
        <span>&bull;</span>
        <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
        <span>&bull;</span>
        <Link href="/dpa" className="hover:text-zinc-400 transition-colors">DPA</Link>
        <span>&bull;</span>
        <Link href="/legal" className="hover:text-zinc-400 transition-colors">Security</Link>
      </div>
    </div>
  );
}
