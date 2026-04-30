import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { lookupGrade } from "@/lib/agents/grader";
import { ShareButtons } from "./share-buttons";
import { EmbedBadge } from "./embed-badge";
import { EmailCapture } from "./email-capture";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const grade = await lookupGrade(slug).catch(() => null);
  if (!grade) {
    return {
      title: `AI visibility for ${slug} — cabbge`,
      description: `See how ChatGPT, Gemini, Perplexity, Claude and Grok recommend ${slug} when buyers ask. Free AI visibility grader.`,
    };
  }
  const score = grade.scores.overall;
  const ogImage = `/og/${grade.slug}`;
  return {
    title: `${grade.brand} scores ${score}/100 on AI visibility — cabbge`,
    description: `Independent grade of how often AI engines recommend ${grade.brand} in ${grade.category || grade.vertical} buyer queries. Updated ${new Date(grade.scannedAt).toLocaleDateString()}.`,
    openGraph: {
      title: `${grade.brand} · AI visibility ${score}/100`,
      description: `How often AI engines recommend ${grade.brand}. Free grader by cabbge.`,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${grade.brand} · AI visibility ${score}/100`,
      description: `Free AI visibility grade. See yours.`,
      images: [ogImage],
    },
    alternates: { canonical: `/visibility/${grade.slug}` },
  };
}

export default async function VisibilityPage({ params }: Params) {
  const { slug } = await params;
  const cleanSlug = slug.replace(/^www\./, "").toLowerCase();
  const grade = await lookupGrade(cleanSlug);
  if (!grade) notFound();

  const mentionedChatGPT = grade.queryResults.filter(
    (q) => q.chatgpt.mentioned,
  ).length;
  const mentionedGemini = grade.queryResults.filter(
    (q) => q.gemini.mentioned,
  ).length;
  const hasPerplexity = grade.queryResults.some((q) => q.perplexity);
  const mentionedPerplexity = hasPerplexity
    ? grade.queryResults.filter((q) => q.perplexity?.mentioned).length
    : 0;
  const hasClaude = grade.queryResults.some((q) => q.claude);
  const mentionedClaude = hasClaude
    ? grade.queryResults.filter((q) => q.claude?.mentioned).length
    : 0;
  const hasGrok = grade.queryResults.some((q) => q.grok);
  const mentionedGrok = hasGrok
    ? grade.queryResults.filter((q) => q.grok?.mentioned).length
    : 0;
  const total = grade.queryResults.length || 1;
  const offDomain = grade.offDomainCoverage ?? [];

  const scoreColor =
    grade.scores.overall >= 70
      ? "text-emerald-400"
      : grade.scores.overall >= 40
        ? "text-amber-300"
        : "text-rose-300";

  const scoreRing =
    grade.scores.overall >= 70
      ? "from-emerald-500/20 to-emerald-500/0 border-emerald-500/30"
      : grade.scores.overall >= 40
        ? "from-amber-500/20 to-amber-500/0 border-amber-500/30"
        : "from-rose-500/20 to-rose-500/0 border-rose-500/30";

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-zinc-100 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <span>← cabbge</span>
        </Link>

        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#7CB342] font-semibold">
                AI visibility · {grade.category || grade.vertical}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 mt-2 tracking-tight">
                {grade.brand}
              </h1>
              <div className="text-[12px] text-zinc-500 mt-1.5 font-mono">
                {grade.slug}
              </div>
              <div className="text-[11px] text-zinc-500 mt-2">
                Scanned {new Date(grade.scannedAt).toLocaleDateString()} ·
                refreshed every 7 days
              </div>
            </div>
            <div
              className={`shrink-0 rounded-2xl border bg-gradient-to-br ${scoreRing} px-6 py-4 flex flex-col items-center min-w-[140px]`}
            >
              <div
                className={`text-6xl font-bold tabular-nums leading-none ${scoreColor}`}
              >
                {grade.scores.overall}
              </div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-zinc-500 mt-3 font-semibold">
                / 100
              </div>
            </div>
          </div>
        </div>

        <ShareButtons
          brand={grade.brand}
          slug={grade.slug}
          score={grade.scores.overall}
        />

        <EmailCapture brandSlug={grade.slug} brand={grade.brand} />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <ScoreCard label="ChatGPT" value={grade.scores.chatgpt} />
          <ScoreCard label="Gemini" value={grade.scores.gemini} />
          {hasPerplexity && (
            <ScoreCard
              label="Perplexity"
              value={grade.scores.perplexity ?? 0}
            />
          )}
          {hasClaude && (
            <ScoreCard label="Claude" value={grade.scores.claude ?? 0} />
          )}
          {hasGrok && (
            <ScoreCard label="Grok" value={grade.scores.grok ?? 0} />
          )}
          <ScoreCard label="Mentions" value={grade.scores.mentions} />
          <ScoreCard label="Readiness" value={grade.scores.readiness} />
          {grade.scores.offDomain != null && (
            <ScoreCard label="Off-domain" value={grade.scores.offDomain} />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MentionRate
            engine="ChatGPT"
            mentioned={mentionedChatGPT}
            total={total}
          />
          <MentionRate
            engine="Gemini"
            mentioned={mentionedGemini}
            total={total}
          />
          {hasPerplexity && (
            <MentionRate
              engine="Perplexity"
              mentioned={mentionedPerplexity}
              total={total}
            />
          )}
          {hasClaude && (
            <MentionRate
              engine="Claude"
              mentioned={mentionedClaude}
              total={total}
            />
          )}
          {hasGrok && (
            <MentionRate
              engine="Grok"
              mentioned={mentionedGrok}
              total={total}
            />
          )}
        </div>

        {offDomain.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500">
              Off-domain presence
            </h2>
            <p className="text-xs text-zinc-500">
              82–89% of AI citations come from earned media. Here&apos;s
              where you stand on the sources AI engines actually cite.
            </p>
            <ul className="rounded-lg border border-zinc-800 divide-y divide-zinc-900">
              {offDomain.map((item) => (
                <li key={item.source} className="flex items-start gap-3 p-4">
                  <span
                    className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      item.present ? "bg-emerald-500" : "bg-zinc-700"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-zinc-100">{item.label}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {item.details}
                    </div>
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="text-xs text-zinc-300 hover:text-white shrink-0 underline"
                    >
                      {item.present ? "view" : "go"} ↗
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-lg border border-zinc-700 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 sm:p-8 text-center space-y-4">
          <div className="text-zinc-100 font-semibold text-lg">
            This is 8 prompts. The full scan runs 40+.
          </div>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Plus weekly re-scans, competitor tracking, mention monitoring
            across Reddit + HN + X + YouTube, and one-click schema + FAQ
            + article generation to lift the score.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/signup?next=/dashboard"
              className="px-5 py-2.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-sm"
            >
              Start tracking — $49/mo
            </Link>
            <Link
              href="/pricing"
              className="px-5 py-2.5 rounded-md border border-zinc-700 text-zinc-200 hover:border-zinc-500 font-semibold text-sm"
            >
              See plans
            </Link>
          </div>
        </div>

        {grade.queryResults.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500">
              Per-prompt results
            </h2>
            <ul className="rounded-lg border border-zinc-800 divide-y divide-zinc-900">
              {grade.queryResults.map((q, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-100">{q.query}</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
                      {q.intent}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                    <Pill
                      label="GPT"
                      mentioned={q.chatgpt.mentioned}
                      position={q.chatgpt.position}
                    />
                    <Pill
                      label="Gem"
                      mentioned={q.gemini.mentioned}
                      position={q.gemini.position}
                    />
                    {q.perplexity && (
                      <Pill
                        label="Plx"
                        mentioned={q.perplexity.mentioned}
                        position={q.perplexity.position}
                      />
                    )}
                    {q.claude && (
                      <Pill
                        label="Cld"
                        mentioned={q.claude.mentioned}
                        position={q.claude.position}
                      />
                    )}
                    {q.grok && (
                      <Pill
                        label="Grk"
                        mentioned={q.grok.mentioned}
                        position={q.grok.position}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {grade.aiReadiness.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500">
              AI readiness signals
            </h2>
            <ul className="rounded-lg border border-zinc-800 divide-y divide-zinc-900">
              {grade.aiReadiness.map((c, i) => (
                <li key={i} className="flex items-start gap-3 p-4">
                  <span
                    className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      c.passed ? "bg-emerald-500" : "bg-zinc-700"
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-100">{c.check}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {c.details}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {grade.competitors.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500">
              Tracked against
            </h2>
            <div className="flex flex-wrap gap-2">
              {grade.competitors.map((c) => (
                <span
                  key={c}
                  className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <EmbedBadge slug={grade.slug} brand={grade.brand} />

        <div className="text-center text-xs text-zinc-600 pt-8">
          Scanned {grade.scanCount} time{grade.scanCount === 1 ? "" : "s"} ·
          last refreshed {new Date(grade.scannedAt).toLocaleString()} ·
          cached 7 days
        </div>
      </div>
    </main>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  const c =
    value >= 70
      ? "text-emerald-400"
      : value >= 40
        ? "text-amber-300"
        : "text-rose-300";
  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4 hover:border-white/[0.12] transition-colors">
      <div className="text-[9px] uppercase tracking-[0.25em] text-zinc-500 font-semibold">
        {label}
      </div>
      <div className={`text-3xl font-bold tabular-nums mt-1.5 ${c}`}>
        {value}
      </div>
    </div>
  );
}

function MentionRate({
  engine,
  mentioned,
  total,
}: {
  engine: string;
  mentioned: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((mentioned / total) * 100) : 0;
  const c =
    pct >= 70
      ? "text-emerald-400"
      : pct >= 40
        ? "text-amber-300"
        : "text-rose-300";
  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4 hover:border-white/[0.12] transition-colors">
      <div className="text-[9px] uppercase tracking-[0.25em] text-zinc-500 font-semibold mb-1.5">
        {engine} mention rate
      </div>
      <div className={`text-2xl font-bold tabular-nums ${c}`}>{pct}%</div>
      <div className="text-[10.5px] text-zinc-500 mt-1 font-mono">
        {mentioned} / {total} prompts
      </div>
    </div>
  );
}

function Pill({
  label,
  mentioned,
  position,
}: {
  label: string;
  mentioned: boolean;
  position: number;
}) {
  if (!mentioned) {
    return (
      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500">
        {label} ✗
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-900 text-emerald-300">
      {label} #{position || "?"}
    </span>
  );
}
