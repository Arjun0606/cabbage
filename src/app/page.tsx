"use client";

/**
 * Marketing home page.
 *
 * The previous version embedded a free brand-grader (POST /api/grader)
 * directly on the homepage so any visitor could type a brand + city and
 * see an AI-visibility score in 60 seconds. We pulled that surface
 * 2026-04-27 because:
 *
 *  1. The /demo flow already covers "see the product in action" for
 *     prospects (sales-team-only, password-gated). Two free-look surfaces
 *     diluted the funnel.
 *  2. Grader bandwidth was a real cost line — every random visitor was
 *     burning OpenAI tokens with no commercial intent.
 *  3. The intended onboarding is signup → input details → run a real
 *     scan → see results → paywall + plan recommendation. The free
 *     grader on the home page short-circuited that intent ladder.
 *
 * /api/grader is kept (still used by /api/cron/benchmark) but no public
 * page calls it. /grader the route is removed.
 */

import {
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { JsonLd, organizationSchema, softwareApplicationSchema, homepageFaqSchema } from "@/components/seo/JsonLd";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <JsonLd schema={[organizationSchema(), softwareApplicationSchema(), homepageFaqSchema()]} />

      {/* Logo + headline */}
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <img src="/logo.png" alt="Cabbge" className="w-14 h-14 object-contain" />
        <div className="text-[10px] uppercase tracking-[0.25em] text-[#7CB342] font-semibold">
          AI Search Visibility for Indian Real Estate
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-zinc-100 tracking-tight max-w-2xl leading-tight">
          When buyers ask ChatGPT which developer to choose, do you show up?
        </h1>
        <p className="text-sm text-zinc-400 text-center max-w-lg leading-relaxed">
          Cabbge tracks how ChatGPT and Gemini answer buyer queries about your city — and generates,
          deploys and measures the content you need to win them. Your SEO agency won&apos;t do this.
          Your in-house team can&apos;t do this alone.
        </p>
      </div>

      {/* Primary CTAs */}
      <div className="flex items-center gap-2 mb-10">
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
          href="/signin"
          className="h-10 px-4 rounded-lg text-[13px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 flex items-center gap-1.5"
        >
          Sign in
        </Link>
      </div>

      <p className="text-xs text-zinc-600 max-w-md text-center leading-relaxed">
        Sign up, add your projects + brand voice, and we&apos;ll run a comprehensive AI-visibility, SEO,
        and RERA scan. You see your real numbers before you commit to a plan.
      </p>

      {/* Footer */}
      <div className="mt-16 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-zinc-700">
        <Link href="/pricing" className="hover:text-zinc-400 transition-colors">Pricing</Link>
        <span>&bull;</span>
        <Link href="/compare" className="hover:text-zinc-400 transition-colors">Compare</Link>
        <span>&bull;</span>
        <Link href="/about" className="hover:text-zinc-400 transition-colors">About</Link>
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
