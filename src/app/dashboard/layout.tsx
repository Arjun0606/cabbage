import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { Sidebar } from "@/components/dashboard/Sidebar";

export const dynamic = "force-dynamic";

/**
 * Shared layout for every /dashboard/* surface.
 *
 * Server-renders the auth gate once instead of duplicating it on
 * each page, then drops Sidebar + the content slot into a flex row.
 * Pages render only their inner content; the outer chrome
 * (sidebar, padding, the bg color) lives here.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/dashboard");

  const avatarLabel =
    (user.user_metadata?.full_name as string | undefined) || user.email || "";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      <Sidebar companyName={avatarLabel} />
      <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
    </div>
  );
}
