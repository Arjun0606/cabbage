import { getServiceClient } from "@/lib/db/supabase";
import {
  JsonLd,
  organizationSchema,
  softwareApplicationSchema,
  homepageFaqSchema,
} from "@/components/seo/JsonLd";
import { HomeClient } from "./home-client";

/**
 * Marketing home page — brutalist redesign.
 *
 * Server component: fetches the most recent rows from public_grades
 * so the live-feed sidecar in the hero is a real demo, not seeded
 * data. Falls back to an empty list if Supabase is unreachable —
 * the rest of the page renders fine.
 */

export const dynamic = "force-dynamic";

interface RecentGrade {
  slug: string;
  brand: string;
  overall: number;
  scannedAt: string;
}

export default async function Home() {
  let recent: RecentGrade[] = [];
  try {
    const svc = getServiceClient();
    const { data } = await svc
      .from("public_grades")
      .select("slug, brand, scores, scanned_at")
      .order("scanned_at", { ascending: false })
      .limit(8);
    recent = (data || []).map(
      (r: {
        slug: string;
        brand: string;
        scores: { overall?: number } | null;
        scanned_at: string;
      }) => ({
        slug: r.slug,
        brand: r.brand,
        overall: r.scores?.overall ?? 0,
        scannedAt: r.scanned_at,
      }),
    );
  } catch {
    /* server unreachable; render empty feed */
  }

  return (
    <>
      <JsonLd
        schema={[
          organizationSchema(),
          softwareApplicationSchema(),
          homepageFaqSchema(),
        ]}
      />
      <HomeClient recent={recent} />
    </>
  );
}
