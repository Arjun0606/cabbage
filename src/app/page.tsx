"use client";

/**
 * Marketing home page.
 *
 * Repositioned 2026-04-29 (pivot.9) — second pivot in 30 days. Old
 * hero pitched real-estate developers ("₹2-5 lakh per booked buyer").
 * Real estate teams don't pay for SaaS GEO tools. New pitch is the
 * sister-product cabbge_global's hero — generic AI visibility +
 * brand-mention tracking, self-serve from $49, for indie SaaS,
 * ecom, Shopify, internet stores.
 *
 * Design north stars (per docs/PIVOT_PLAN.md):
 *   - 5-minute first win (paste URL → see real score, no signup)
 *   - Shareable everything (every result is a permalink)
 *   - Self-serve all the way (no demo CTAs anywhere)
 *   - Polish over breadth
 *   - Founder taste over committee scoping
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  JsonLd,
  organizationSchema,
  softwareApplicationSchema,
  homepageFaqSchema,
} from "@/components/seo/JsonLd";

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Grader failed");
        return;
      }
      router.push(`/visibility/${data.grade.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-6">
      <JsonLd schema={[organizationSchema(), softwareApplicationSchema(), homepageFaqSchema()]} />

      <div className="max-w-3xl w-full space-y-14 py-16 sm:py-24">
        <div className="space-y-5">
          <div className="text-xs uppercase tracking-widest text-zinc-500">
            cabbge · GEO &amp; brand-mention tracking for indie founders
          </div>
          <h1 className="text-4xl sm:text-6xl font-semibold leading-[1.02] tracking-tight">
            Be the brand AI recommends.
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-xl">
            Paste your URL. We run real buyer prompts on ChatGPT,
            Gemini, Perplexity, Claude, and Grok, then ship the
            schema, FAQ pages, and citations that make AI engines
            pick you. Score in 60 seconds. No signup.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            name="url"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://yourcompany.com"
            disabled={loading}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-4 py-3 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !url}
            className="px-6 py-3 rounded-md bg-zinc-100 text-zinc-900 font-semibold hover:bg-white transition disabled:opacity-50"
          >
            {loading ? "Scanning…" : "Grade my site"}
          </button>
        </form>

        {error && (
          <div className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-5 space-y-2">
            <div className="text-sm text-zinc-300 font-medium">
              Running 8 buyer prompts across ChatGPT, Gemini, Perplexity, Claude &amp; Grok
            </div>
            <ul className="text-xs text-zinc-500 space-y-1">
              <li>· Crawling your homepage and detecting your category</li>
              <li>· Auto-finding 3-5 real competitors</li>
              <li>· Asking real AI engines what they recommend in your category</li>
              <li>· Auditing AI-readiness: server-rendering, schema, bot access, entity grounding</li>
              <li>· Checking off-domain coverage (Wikipedia, Wikidata, G2, Trustpilot, Reddit)</li>
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat label="Engines" value="ChatGPT · Gemini · Perplexity · Claude · Grok" />
          <Stat label="Time to result" value="~60 seconds" />
          <Stat label="Signup" value="Not required" />
        </div>

        <Section title="Why this matters">
          <p>
            82–89% of AI citations come from earned media, not your
            own site. ~30 domains capture two-thirds of citations in
            any given category. If you&apos;re not in that set, AI
            engines literally don&apos;t recommend you when your
            buyer asks.
          </p>
          <p>
            cabbge measures whether you&apos;re recommended right
            now, then ships the schema, FAQ pages, and on-site fixes
            that lift the score. Reports without execution don&apos;t
            move the needle. Execution without measurement is
            gambling. We do both.
          </p>
        </Section>

        <Section title="How it works">
          <Step
            n={1}
            title="Grade"
            text="Paste a URL. We classify your business, find your real competitors, and run real buyer prompts across 5 AI engines. Real scan, no mocks."
          />
          <Step
            n={2}
            title="Diagnose"
            text="We score visibility per engine, audit AI-readiness signals (server-rendered content, schema completeness, AI bot access, entity grounding), and flag what's costing you citations."
          />
          <Step
            n={3}
            title="Ship the fix"
            text="One-click schema generators, FAQ pages, full GEO-scored articles with QA pass + cannibalization checks. Every artifact ships ready to paste into your <head> or your CMS."
          />
        </Section>

        <Section title="Built for indie">
          <p>
            Profound starts at $99/mo and points at enterprise.
            Athena starts at $295. The market underneath is wide
            open. cabbge is for bootstrapped SaaS, Shopify and
            independent ecom store owners, marketing folks at small
            SaaS using personally — and the agencies who serve them.
            Self-serve. No demo calls. From{" "}
            <Link href="/pricing" className="text-zinc-200 hover:text-white underline">
              $49/mo
            </Link>
            .
          </p>
        </Section>

        <div className="text-xs text-zinc-600 pt-4 border-t border-zinc-900 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link href="/pricing" className="hover:text-zinc-400">
            Pricing
          </Link>
          <span>·</span>
          <Link href="/methodology" className="hover:text-zinc-400">
            Methodology
          </Link>
          <span>·</span>
          <Link href="/about" className="hover:text-zinc-400">
            About
          </Link>
          <span>·</span>
          <Link href="/signin" className="hover:text-zinc-400">
            Sign in
          </Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-zinc-400">
            Privacy
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-zinc-400">
            Terms
          </Link>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      <div className="text-sm text-zinc-200 mt-1 leading-snug">{value}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm uppercase tracking-widest text-zinc-500">
        {title}
      </h2>
      <div className="space-y-3 text-sm sm:text-base text-zinc-300 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  text,
}: {
  n: number;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-zinc-400 font-mono">
        {n}
      </div>
      <div>
        <div className="text-zinc-100 font-semibold">{title}</div>
        <div className="text-sm text-zinc-400 mt-0.5">{text}</div>
      </div>
    </div>
  );
}
