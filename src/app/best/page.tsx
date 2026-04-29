import Link from "next/link";
import type { Metadata } from "next";
import { getServiceClient } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Best of every category, ranked by AI visibility — cabbge",
  description:
    "Independent rankings of the brands ChatGPT, Gemini, Perplexity, Claude, and Grok recommend most often, by category. Updated weekly. Free.",
  alternates: { canonical: "/best" },
};

interface BrandRow {
  slug: string;
  brand: string;
  category: string | null;
  vertical: string | null;
  scores: { overall?: number } | null;
  scanned_at: string;
}

export function categorySlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default async function BestIndexPage() {
  const service = getServiceClient();
  const { data: rows } = await service
    .from("public_grades")
    .select("slug, brand, category, vertical, scores, scanned_at")
    .order("scanned_at", { ascending: false })
    .limit(50_000);

  const buckets = new Map<
    string,
    {
      category: string;
      vertical: string;
      scores: number[];
      topBrand: string;
      topScore: number;
    }
  >();

  for (const r of (rows as BrandRow[] | null) || []) {
    const cat = (r.category || "").trim();
    if (!cat) continue;
    const slug = categorySlug(cat);
    if (!slug) continue;
    const score = r.scores?.overall ?? 0;
    const cur = buckets.get(slug);
    if (cur) {
      cur.scores.push(score);
      if (score > cur.topScore) {
        cur.topScore = score;
        cur.topBrand = r.brand;
      }
    } else {
      buckets.set(slug, {
        category: cat,
        vertical: r.vertical || "unknown",
        scores: [score],
        topBrand: r.brand,
        topScore: score,
      });
    }
  }

  const cats = Array.from(buckets.entries())
    .filter(([, v]) => v.scores.length >= 3)
    .map(([slug, v]) => ({
      slug,
      category: v.category,
      vertical: v.vertical,
      count: v.scores.length,
      avgScore: Math.round(
        v.scores.reduce((a, b) => a + b, 0) / v.scores.length,
      ),
      topBrand: v.topBrand,
      topScore: v.topScore,
    }))
    .sort((a, b) => b.count - a.count);

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
            Best of every category
          </h1>
          <p className="text-zinc-400 mt-2 max-w-2xl">
            Brands ranked by how often AI engines recommend them in real
            buyer queries. Updated weekly. Free to read.
          </p>
        </div>

        {cats.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-8 text-center text-sm text-zinc-500">
            Categories will appear here as brands get graded. Run a scan
            from the homepage to seed yours.
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cats.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/best/${c.slug}`}
                  className="block rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 hover:border-zinc-700 hover:bg-zinc-900/40 transition"
                >
                  <div className="text-sm text-zinc-100 font-semibold">
                    Best {c.category}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {c.count} brands ranked · top: {c.topBrand} ({c.topScore})
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
