import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  COMPETITORS,
  getCompetitor,
  allCompetitorSlugs,
} from "@/lib/competitors";

export const dynamic = "force-static";
export const revalidate = 86400;

export function generateStaticParams() {
  return allCompetitorSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getCompetitor(slug);
  if (!c) return {};
  return {
    title: `cabbge vs ${c.name}: AI visibility tools compared (2026)`,
    description: c.metaDescription,
    alternates: { canonical: `/vs/${slug}` },
    openGraph: {
      title: `cabbge vs ${c.name}`,
      description: c.metaDescription,
    },
  };
}

export default async function VsCompetitorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getCompetitor(slug);
  if (!c) notFound();

  const others = Object.values(COMPETITORS).filter((x) => x.slug !== c.slug);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-10">
        <div>
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
          >
            ← cabbge
          </Link>
          <h1 className="text-3xl sm:text-5xl font-semibold text-zinc-100 mt-3 leading-[1.05]">
            cabbge vs {c.name}
          </h1>
          <p className="text-lg text-zinc-400 mt-3 max-w-2xl">
            {c.tagline} Honest comparison, current as of April 2026.
            Where they win, where we win, when to pick which.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-5 space-y-2">
          <div className="text-xs uppercase tracking-widest text-zinc-500">
            TL;DR
          </div>
          <p className="text-zinc-200 text-sm leading-relaxed">
            {c.name} is{" "}
            {c.targetCustomer.toLowerCase().startsWith("enterprise")
              ? "an enterprise tool"
              : `built for ${c.targetCustomer.toLowerCase()}`}
            . Pricing starts around{" "}
            {c.pricing.entry || c.pricing.mid || c.pricing.top || "sales-led"}.
            cabbge is for indie founders, bootstrapped startups, e-commerce
            shops, and small agencies. Self-serve from $49/mo with execution
            (schema generators, FAQ pages, GEO-scored articles) included
            at every tier.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToolCard
            heading={c.name}
            url={c.url}
            pricing={[
              c.pricing.free,
              c.pricing.entry,
              c.pricing.mid,
              c.pricing.top,
            ]
              .filter(Boolean)
              .join(" · ") || c.pricing.notes || "—"}
            engines={c.engines}
            target={c.targetCustomer}
            external
          />
          <ToolCard
            heading="cabbge"
            url="/"
            pricing="Free public grader · $49 / $199 / $599 mo"
            engines={["ChatGPT", "Gemini", "Perplexity", "Claude", "Grok"]}
            target="Indie founders, bootstrapped SaaS, ecom, small agencies"
          />
        </div>

        <Section title={`Where ${c.name} wins`} intro={`Honest list of what ${c.name} does well or has that we don't.`}>
          <BulletList items={c.advantagesOverCabbge} />
        </Section>

        <Section title="Where cabbge wins" intro="Where we beat them, in concrete terms.">
          <BulletList items={c.cabbgeAdvantages} />
        </Section>

        <Section title="Their strengths" intro={`What ${c.name} markets, in their own framing.`}>
          <BulletList items={c.strengths} />
        </Section>

        <Section title="Their weaknesses" intro={`Public, observable shortcomings — verifiable on their site.`}>
          <BulletList items={c.weaknesses} />
        </Section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PickCard heading={`Pick ${c.name} if…`} items={c.pickThemIf} tone="neutral" />
          <PickCard heading="Pick cabbge if…" items={c.pickCabbgeIf} tone="primary" />
        </div>

        <div className="rounded-lg border border-zinc-700 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 text-center space-y-3">
          <div className="text-zinc-100 font-semibold text-lg">
            Compare on your own site
          </div>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Run a free grade. cabbge will tell you exactly what AI engines
            recommend for your category, where you rank, and what to fix.
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-sm"
          >
            Grade my site
          </Link>
        </div>

        {others.length > 0 && (
          <div className="space-y-2 pt-6 border-t border-zinc-900">
            <div className="text-xs uppercase tracking-widest text-zinc-500">
              Other comparisons
            </div>
            <ul className="flex flex-wrap gap-2">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link
                    href={`/vs/${o.slug}`}
                    className="px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300"
                  >
                    cabbge vs {o.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}

function ToolCard({
  heading,
  url,
  pricing,
  engines,
  target,
  external = false,
}: {
  heading: string;
  url: string;
  pricing: string;
  engines: string[];
  target: string;
  external?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-zinc-100">{heading}</div>
        {external ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer nofollow"
            className="text-[11px] text-zinc-500 hover:text-zinc-300"
          >
            visit ↗
          </a>
        ) : (
          <Link href={url} className="text-[11px] text-zinc-500 hover:text-zinc-300">
            home →
          </Link>
        )}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-zinc-500">
          Pricing
        </div>
        <div className="text-sm text-zinc-200">{pricing}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-zinc-500">
          Engines
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {engines.map((e) => (
            <span
              key={e}
              className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300"
            >
              {e}
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-zinc-500">
          Best for
        </div>
        <div className="text-xs text-zinc-300">{target}</div>
      </div>
    </div>
  );
}

function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm uppercase tracking-widest text-zinc-500">
        {title}
      </h2>
      {intro && <p className="text-xs text-zinc-500">{intro}</p>}
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-sm text-zinc-300">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-zinc-600 shrink-0">·</span>
          <span dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      ))}
    </ul>
  );
}

function PickCard({
  heading,
  items,
  tone,
}: {
  heading: string;
  items: string[];
  tone: "primary" | "neutral";
}) {
  return (
    <div
      className={`rounded-lg p-5 space-y-3 border ${
        tone === "primary"
          ? "border-zinc-700 bg-zinc-900/60"
          : "border-zinc-800 bg-zinc-950/60"
      }`}
    >
      <div className="text-sm font-semibold text-zinc-100">{heading}</div>
      <ul className="space-y-1.5 text-sm text-zinc-300">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-zinc-600 shrink-0">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
