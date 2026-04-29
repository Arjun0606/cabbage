import type { MetadataRoute } from "next";
import { getServiceClient } from "@/lib/db/supabase";
import { allCompetitorSlugs } from "@/lib/competitors";
import { categorySlug } from "@/app/best/page";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/**
 * Dynamic sitemap (rebuilt hourly, cached at the edge).
 *
 * Routes covered:
 *   - Static marketing routes (/, /pricing, /best, /vs, /press, etc.)
 *   - Every public_grades row → /visibility/[slug]
 *   - Every distinct category with ≥3 grades → /best/[category-slug]
 *   - Every competitor → /vs/[slug]
 *
 * Search engines crawl daily-ish, so 3600s revalidate is plenty.
 * Production deployment will produce thousands of indexable URLs
 * once the seed cron + organic grader runs accumulate brands.
 */

interface BrandRow {
  slug: string;
  scanned_at: string;
  category: string | null;
}

const STATIC_URLS: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1.0, changeFrequency: "daily" },
  { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
  { path: "/about", priority: 0.85, changeFrequency: "monthly" },
  { path: "/best", priority: 0.9, changeFrequency: "daily" },
  { path: "/brands", priority: 0.8, changeFrequency: "daily" },
  { path: "/vs", priority: 0.85, changeFrequency: "weekly" },
  { path: "/press", priority: 0.7, changeFrequency: "weekly" },
  { path: "/methodology", priority: 0.85, changeFrequency: "monthly" },
  { path: "/signup", priority: 0.5, changeFrequency: "monthly" },
  { path: "/signin", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "https://cabbge.com"
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_URLS.map((s) => ({
    url: `${base}${s.path}`,
    lastModified: now,
    changeFrequency: s.changeFrequency,
    priority: s.priority,
  }));

  // /vs/[slug] — five named competitor comparisons
  for (const slug of allCompetitorSlugs()) {
    entries.push({
      url: `${base}/vs/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Dynamic: every public_grades row → /visibility/[slug] + /best/[category]
  try {
    const service = getServiceClient();
    const { data: grades } = await service
      .from("public_grades")
      .select("slug, scanned_at, category")
      .order("scanned_at", { ascending: false })
      .limit(50_000);

    const rows = (grades as BrandRow[] | null) || [];

    for (const g of rows) {
      entries.push({
        url: `${base}/visibility/${g.slug}`,
        lastModified: new Date(g.scanned_at),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    // Distinct categories with ≥3 grades become listicle pages.
    const counts = new Map<string, { count: number; latest: string }>();
    for (const g of rows) {
      const cat = (g.category || "").trim();
      if (!cat) continue;
      const slug = categorySlug(cat);
      if (!slug) continue;
      const cur = counts.get(slug);
      if (cur) {
        cur.count++;
        if (g.scanned_at > cur.latest) cur.latest = g.scanned_at;
      } else {
        counts.set(slug, { count: 1, latest: g.scanned_at });
      }
    }
    for (const [slug, info] of counts) {
      if (info.count < 3) continue;
      entries.push({
        url: `${base}/best/${slug}`,
        lastModified: new Date(info.latest),
        changeFrequency: "daily",
        priority: 0.85,
      });
    }
  } catch (err) {
    console.error("sitemap supabase read failed:", err);
  }

  return entries;
}
