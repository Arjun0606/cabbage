import { getCurrentUser } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";
import { MentionsClient } from "./mentions-client";

export const dynamic = "force-dynamic";

export default async function MentionsPage() {
  // Auth gate runs in app/dashboard/layout.tsx.
  const user = await getCurrentUser();
  if (!user) return null;

  const svc = getServiceClient();
  const { data: tracked } = await svc
    .from("tracked_brands")
    .select("brand_slug, display_name, last_refreshed_at, notify_weekly")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#7CB342] font-semibold">
            Mentions
          </div>
          <h1 className="text-3xl font-bold text-zinc-100 mt-2 tracking-tight">
            Mention tracking
          </h1>
          <p className="text-[14px] text-zinc-400 mt-2 max-w-2xl leading-relaxed">
            Reddit, Hacker News, X, and YouTube — every public mention
            of the brands you track. Refreshed weekly; scan on demand
            for 1 credit. The 5-engine GEO scan tells you how AI sees
            you. This tells you where humans are talking.
          </p>
        </div>

        <MentionsClient
          initialTracked={(tracked || []).map((r) => ({
            brandSlug: r.brand_slug,
            displayName: r.display_name,
            lastRefreshedAt: r.last_refreshed_at,
            notifyWeekly: r.notify_weekly,
          }))}
        />
      </div>
    </main>
  );
}
