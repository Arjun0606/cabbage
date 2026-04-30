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
    <main>
      <div className="border-b border-white/15 px-6 sm:px-8 py-8">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#7CB342] mb-2">
          §01 / MENTIONS
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-[0.95]">
          Where humans
          <br />
          are talking.
        </h1>
        <p className="mt-3 text-[13px] text-zinc-400 leading-relaxed max-w-2xl">
          Reddit · Hacker News · YouTube · X. Every public mention of
          the brands you track. Refreshed weekly; scan on demand for
          1 credit.
        </p>
      </div>

      <div className="px-6 sm:px-8 py-8 max-w-5xl">

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
