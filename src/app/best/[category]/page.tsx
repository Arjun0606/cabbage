import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServiceClient } from "@/lib/db/supabase";
import { categorySlug } from "@/app/best/page";

export const dynamic = "force-dynamic";
export const revalidate = 1800;

interface Params {
  params: Promise<{ category: string }>;
}

interface BrandRow {
  slug: string;
  brand: string;
  category: string;
  vertical: string;
  scores: { overall?: number; chatgpt?: number; gemini?: number } | null;
  scanned_at: string;
}

async function loadCategory(
  slug: string,
): Promise<{ category: string; vertical: string; brands: BrandRow[] } | null> {
  const service = getServiceClient();
  const { data } = await service
    .from("public_grades")
    .select("slug, brand, category, vertical, scores, scanned_at")
    .order("scanned_at", { ascending: false })
    .limit(50_000);
  if (!data) return null;

  const matching: BrandRow[] = [];
  let displayCategory = "";
  let displayVertical = "";
  for (const r of data as BrandRow[]) {
    const cat = (r.category || "").trim();
    if (!cat) continue;
    if (categorySlug(cat) === slug) {
      matching.push(r);
      if (!displayCategory) displayCategory = cat;
      if (!displayVertical) displayVertical = r.vertical;
    }
  }
  if (matching.length === 0) return null;
  matching.sort(
    (a, b) => (b.scores?.overall ?? 0) - (a.scores?.overall ?? 0),
  );
  return { category: displayCategory, vertical: displayVertical, brands: matching };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  const data = await loadCategory(category).catch(() => null);
  if (!data) {
    return { title: `Best ${category.replace(/-/g, " ")} — cabbge` };
  }
  const top = data.brands[0];
  return {
    title: `Best ${data.category} ranked by AI visibility (${new Date().getFullYear()}) — cabbge`,
    description: `${data.brands.length} ${data.category} brands ranked by how often AI engines recommend them. Top result: ${top.brand} with a visibility score of ${top.scores?.overall ?? 0}/100.`,
    alternates: { canonical: `/best/${category}` },
  };
}

export default async function BestCategoryPage({ params }: Params) {
  const { category } = await params;
  const data = await loadCategory(category);
  if (!data) notFound();

  const year = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-10">
        <div>
          <Link
            href="/best"
            className="text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
          >
            ← Best of
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold text-zinc-100 mt-3">
            Best {data.category}, ranked by AI visibility ({year})
          </h1>
          <p className="text-zinc-400 mt-2 max-w-2xl">
            Independent ranking of the {data.brands.length} {data.category}
            {" "}brands AI engines recommend most often when real buyers ask.
            Updated weekly. Free to read.
          </p>
        </div>

        <ol className="space-y-2">
          {data.brands.map((b, i) => {
            const overall = b.scores?.overall ?? 0;
            const accent =
              overall >= 70
                ? "text-emerald-400"
                : overall >= 40
                  ? "text-amber-300"
                  : "text-zinc-400";
            return (
              <li key={b.slug}>
                <Link
                  href={`/visibility/${b.slug}`}
                  className="flex items-center gap-4 p-4 rounded-lg border border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/40 transition"
                >
                  <div className="w-8 text-center text-zinc-500 font-mono text-sm shrink-0">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-zinc-100 font-semibold">
                      {b.brand}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      {b.slug}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-2xl font-semibold ${accent}`}>
                      {overall}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
                      AI visibility
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>

        <div className="rounded-lg border border-zinc-700 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 text-center space-y-3">
          <div className="text-zinc-100 font-semibold">
            Want your brand on this list?
          </div>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Run a free grade from the homepage. If your score qualifies you
            land here automatically — and you get the full toolkit to lift it.
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-sm"
          >
            Grade my site
          </Link>
        </div>
      </div>
    </main>
  );
}
