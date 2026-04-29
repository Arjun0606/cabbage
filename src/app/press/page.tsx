import Link from "next/link";
import type { Metadata } from "next";
import { getServiceClient } from "@/lib/db/supabase";

export const metadata: Metadata = {
  title: "Press kit — cabbge AI Visibility Index data",
  description:
    "Reporter-ready data on AI visibility across SaaS, e-commerce, and apps. Numbers, methodology, founder contact. Cite freely.",
  alternates: { canonical: "/press" },
};

export const dynamic = "force-dynamic";
export const revalidate = 1800;

interface BrandRow {
  slug: string;
  brand: string;
  category: string | null;
  scores: { overall?: number } | null;
  scanned_at: string;
}

export default async function PressPage() {
  const service = getServiceClient();
  const { data: rowsRaw } = await service
    .from("public_grades")
    .select("slug, brand, category, scores, scanned_at")
    .order("scanned_at", { ascending: false })
    .limit(1000);
  const rows = (rowsRaw as BrandRow[] | null) || [];

  const total = rows.length;
  const withScore = rows.filter((r) => r.scores?.overall != null);
  const avg = withScore.length
    ? Math.round(
        withScore.reduce((s, r) => s + (r.scores?.overall || 0), 0) /
          withScore.length,
      )
    : 0;
  const above70 = withScore.filter((r) => (r.scores?.overall ?? 0) >= 70).length;
  const below40 = withScore.filter((r) => (r.scores?.overall ?? 0) < 40).length;

  const top = [...withScore]
    .sort((a, b) => (b.scores?.overall ?? 0) - (a.scores?.overall ?? 0))
    .slice(0, 10);
  const bottom = [...withScore]
    .sort((a, b) => (a.scores?.overall ?? 0) - (b.scores?.overall ?? 0))
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-12">
        <div>
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
          >
            ← cabbge
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold text-zinc-100 mt-3">
            Press kit
          </h1>
          <p className="text-zinc-400 mt-2 max-w-2xl">
            cabbge measures how often AI engines (ChatGPT, Gemini,
            Perplexity, Claude, Grok) recommend brands when buyers ask.
            Reporters and researchers can cite anything on this page
            freely.
          </p>
        </div>

        <Section title="One-paragraph summary">
          <p>
            cabbge is a self-serve GEO (Generative Engine Optimization)
            platform measuring how often AI engines recommend brands
            when real buyers ask. It runs real prompts on ChatGPT,
            Gemini, Perplexity, Claude, and Grok, scores per-engine
            visibility, audits AI-readiness signals on a brand&apos;s
            site, audits off-domain coverage on Wikipedia / Wikidata /
            G2 / Trustpilot / Reddit, and ships schema, FAQ, and
            full GEO-scored articles to lift the score. Built for
            indie founders, bootstrapped SaaS, ecom and Shopify store
            owners, and small marketing teams. Self-serve only,
            $49–$599/mo, no demo calls.
          </p>
        </Section>

        <Section title="Index snapshot">
          <ul className="space-y-1 text-sm">
            <Bullet>{total} brands graded so far</Bullet>
            <Bullet>Average AI visibility score: {avg} / 100</Bullet>
            <Bullet>
              {above70} brands score ≥70 (recommended) ·{" "}
              {below40} score &lt;40 (rarely recommended)
            </Bullet>
          </ul>
        </Section>

        <Section title="Top 10 by AI visibility (April 2026 snapshot)">
          {top.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No brands graded yet. Check back after seed cron runs.
            </p>
          ) : (
            <ol className="space-y-1 text-sm">
              {top.map((b, i) => (
                <li key={b.slug} className="flex justify-between gap-3">
                  <span className="text-zinc-300">
                    <span className="text-zinc-600 font-mono mr-2">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Link
                      href={`/visibility/${b.slug}`}
                      className="hover:text-zinc-100 underline"
                    >
                      {b.brand}
                    </Link>
                    <span className="text-zinc-500">
                      {b.category ? ` — ${b.category}` : ""}
                    </span>
                  </span>
                  <span className="text-emerald-300 font-semibold shrink-0">
                    {b.scores?.overall}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Section>

        {bottom.length > 0 && (
          <Section title="Most invisible famous brands (worth a story)">
            <p className="text-xs text-zinc-500">
              Famous brands AI engines are surprisingly bad at
              recommending. Often a useful angle for &quot;why AI
              search doesn&apos;t work the way you think&quot; pieces.
            </p>
            <ol className="space-y-1 text-sm">
              {bottom.map((b) => (
                <li key={b.slug} className="flex justify-between gap-3">
                  <Link
                    href={`/visibility/${b.slug}`}
                    className="text-zinc-300 hover:text-zinc-100 underline"
                  >
                    {b.brand}
                    <span className="text-zinc-500">
                      {b.category ? ` — ${b.category}` : ""}
                    </span>
                  </Link>
                  <span className="text-amber-300 font-semibold shrink-0">
                    {b.scores?.overall}
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        <Section title="Methodology">
          <p>
            Full methodology lives at{" "}
            <Link
              href="/methodology"
              className="underline hover:text-zinc-100"
            >
              /methodology
            </Link>
            . Short version: real ChatGPT, Gemini, Perplexity, Claude,
            and Grok APIs (no scraping); 8 prompts on the free public
            grader, up to 40 on paid scans; mention detection includes
            a deterministic verification pass to suppress LLM
            hallucinated positives; scoring blends per-engine
            share-of-answer with a 13-point AI-readiness audit and a
            5-source off-domain coverage check.
          </p>
        </Section>

        <Section title="Citing us">
          <p>
            Quote any score on a public{" "}
            <Link
              href="/visibility"
              className="underline hover:text-zinc-100"
            >
              /visibility/[domain]
            </Link>{" "}
            page. Each is a permanent shareable URL with the scan date,
            engine breakdown, and methodology link. We refresh public
            grades every 7 days; cite the &quot;scanned&quot; date on
            the page.
          </p>
          <p>
            Suggested attribution: &quot;according to cabbge&apos;s AI
            visibility grader&quot; or &quot;cabbge.com/visibility/[brand]
            (April 2026 scan)&quot;.
          </p>
        </Section>

        <Section title="Founder contact">
          <p>
            Email{" "}
            <a
              href="mailto:hello@cabbge.com"
              className="underline hover:text-zinc-100"
            >
              hello@cabbge.com
            </a>{" "}
            with subject line &quot;press&quot; for fast routing. Available
            for quotes on AI search, GEO, AI visibility for SMBs, and
            the broader market shift from Google to generative answers.
          </p>
        </Section>

        <div className="text-xs text-zinc-600 pt-8 border-t border-zinc-900">
          Last updated: April 2026 · Data refreshes every 30 minutes via
          cache revalidation.
        </div>
      </div>
    </main>
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
      <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-zinc-300">
      <span className="text-zinc-600 shrink-0 mt-0.5">·</span>
      <span>{children}</span>
    </li>
  );
}
