import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";
import { MentionsClient } from "./mentions-client";

export const dynamic = "force-dynamic";

export default async function MentionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/dashboard/mentions");

  const svc = getServiceClient();
  const { data: tracked } = await svc
    .from("tracked_brands")
    .select("brand_slug, display_name, last_refreshed_at, notify_weekly")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <Link
            href="/dashboard"
            className="text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-100 mt-3">
            Mention tracking
          </h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
            Reddit, Hacker News, X, and YouTube — every public mention
            of the brands you track. Refreshed weekly automatically;
            scan on demand for 1 credit. The 5-engine GEO scan tells
            you how AI sees you. This tells you where humans are
            talking.
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
