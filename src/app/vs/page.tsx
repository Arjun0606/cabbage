import Link from "next/link";
import type { Metadata } from "next";
import { COMPETITORS } from "@/lib/competitors";

export const metadata: Metadata = {
  title: "cabbge vs every AI visibility tool — honest comparisons (2026)",
  description:
    "Side-by-side comparisons of cabbge vs Profound, Otterly, AthenaHQ, Knowatoa, and Goodie. Honest pricing, honest feature gaps, when to pick each.",
  alternates: { canonical: "/vs" },
};

export default function VsIndexPage() {
  const list = Object.values(COMPETITORS);
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-10">
        <div>
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
          >
            ← cabbge
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold text-zinc-100 mt-3">
            cabbge vs the alternatives
          </h1>
          <p className="text-zinc-400 mt-2">
            Honest, side-by-side. We tell you what they do better and
            when to pick them. Pricing and features current as of April
            2026.
          </p>
        </div>

        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/vs/${c.slug}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 hover:border-zinc-700 hover:bg-zinc-900/40 transition"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-100 font-semibold">
                      cabbge vs {c.name}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5 truncate">
                      {c.tagline}
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-500 shrink-0">
                    {c.pricing.entry || c.pricing.mid || c.pricing.notes || "—"}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
