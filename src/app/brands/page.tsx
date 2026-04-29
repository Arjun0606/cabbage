import Link from "next/link";
import type { Metadata } from "next";
import { getServiceClient } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Every brand graded by cabbge — full catalog",
  description:
    "Browse every brand cabbge has graded for AI visibility. Real ChatGPT + Gemini + Perplexity + Claude + Grok scans, updated weekly.",
};

interface BrandRow {
  slug: string;
  brand: string;
  category: string | null;
  scores: { overall?: number } | null;
  scanned_at: string;
}

export default async function BrandsIndexPage() {
  const service = getServiceClient();
  const { data: rows } = await service
    .from("public_grades")
    .select("slug, brand, category, scores, scanned_at")
    .order("brand", { ascending: true })
    .limit(2000);

  const list = (rows as BrandRow[] | null) || [];

  const groups = new Map<string, BrandRow[]>();
  for (const r of list) {
    const letter = (r.brand?.[0] || "?").toUpperCase();
    const key = /[A-Z]/.test(letter) ? letter : "#";
    const arr = groups.get(key) || [];
    arr.push(r);
    groups.set(key, arr);
  }
  const letters = Array.from(groups.keys()).sort();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-10">
        <div>
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
          >
            ← cabbge
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold text-zinc-100 mt-3">
            All graded brands
          </h1>
          <p className="text-zinc-400 mt-2">
            {list.length} brand{list.length === 1 ? "" : "s"} graded so far.
            Updated weekly.
          </p>
        </div>

        {list.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-8 text-center text-sm text-zinc-500">
            No grades yet. Run one from the homepage.
          </div>
        ) : (
          letters.map((letter) => (
            <section key={letter} className="space-y-3">
              <h2 className="text-sm uppercase tracking-widest text-zinc-500">
                {letter}
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {groups.get(letter)!.map((b) => (
                  <li key={b.slug}>
                    <Link
                      href={`/visibility/${b.slug}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-md border border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/40 transition"
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-zinc-100 truncate">
                          {b.brand}
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate">
                          {b.category || b.slug}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-zinc-200 shrink-0">
                        {b.scores?.overall ?? "—"}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
