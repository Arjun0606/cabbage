import { getCurrentUser } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";
import { lookupGrade } from "@/lib/agents/grader";
import { buildPlaybook, type PlaybookAction } from "@/lib/agents/playbook";
import { gradeToScan } from "@/lib/outreach";
import { DashboardClient } from "./dashboard-client";

// Auth gate runs in app/dashboard/layout.tsx, so by the time this
// renders we know there's a user. We re-fetch it here only because
// the layout's value isn't passed through to children — could be
// hoisted later via a context or a cached server helper.
export const dynamic = "force-dynamic";

interface TrackedRow {
  brand_slug: string;
  display_name: string | null;
  notify_weekly: boolean;
  last_refreshed_at: string | null;
  created_at: string;
}

interface GradeSummary {
  slug: string;
  brand: string;
  category: string;
  scannedAt: string;
  scores: {
    overall: number;
    chatgpt: number;
    gemini: number;
    perplexity?: number;
    claude?: number;
    grok?: number;
    readiness: number;
    mentions: number;
    offDomain?: number;
  };
}

interface MentionTally {
  brandSlug: string;
  total: number;
  bySource: Record<string, number>;
  newestAt: string | null;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const svc = getServiceClient();

  const { data: trackedRaw } = await svc
    .from("tracked_brands")
    .select(
      "brand_slug, display_name, notify_weekly, last_refreshed_at, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const tracked = (trackedRaw || []) as TrackedRow[];

  const grades: Record<string, GradeSummary | null> = {};
  const playbooks: Record<string, PlaybookAction[]> = {};
  for (const row of tracked) {
    const grade = await lookupGrade(row.brand_slug).catch(() => null);
    grades[row.brand_slug] = grade
      ? {
          slug: grade.slug,
          brand: grade.brand,
          category: grade.category,
          scannedAt: grade.scannedAt,
          scores: grade.scores,
        }
      : null;
    if (grade) {
      // buildPlaybook needs an AIVisibilityResult shape; gradeToScan
      // adapts the persisted PublicGrade. We slice to top 6 actions
      // so the dashboard panel stays scannable.
      playbooks[row.brand_slug] = buildPlaybook(
        gradeToScan(grade),
        grade.brand,
      ).slice(0, 6);
    }
  }

  const mentions: Record<string, MentionTally> = {};
  if (tracked.length > 0) {
    const since = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: rows } = await svc
      .from("brand_mentions")
      .select("brand_slug, source, posted_at")
      .in(
        "brand_slug",
        tracked.map((t) => t.brand_slug),
      )
      .gte("posted_at", since);

    for (const t of tracked) {
      mentions[t.brand_slug] = {
        brandSlug: t.brand_slug,
        total: 0,
        bySource: {},
        newestAt: null,
      };
    }
    for (const r of (rows || []) as Array<{
      brand_slug: string;
      source: string;
      posted_at: string | null;
    }>) {
      const t = mentions[r.brand_slug];
      if (!t) continue;
      t.total += 1;
      t.bySource[r.source] = (t.bySource[r.source] || 0) + 1;
      if (r.posted_at && (!t.newestAt || r.posted_at > t.newestAt)) {
        t.newestAt = r.posted_at;
      }
    }
  }

  return (
    <main className="px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-zinc-500">
            Cabbge
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100 mt-1">
            Your brands
          </h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
            Five engines scanned, four mention sources tracked. Pick
            a brand to see the playbook, or grade something new from
            the home page.
          </p>
        </div>

        <DashboardClient
          tracked={tracked.map((t) => ({
            brandSlug: t.brand_slug,
            displayName: t.display_name,
            lastRefreshedAt: t.last_refreshed_at,
            notifyWeekly: t.notify_weekly,
            createdAt: t.created_at,
          }))}
          grades={grades}
          mentions={mentions}
          playbooks={playbooks}
        />
      </div>
    </main>
  );
}
