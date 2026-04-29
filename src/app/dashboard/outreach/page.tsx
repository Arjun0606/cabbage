import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { OutreachKit } from "./outreach-kit";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/dashboard/outreach");

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link
            href="/dashboard"
            className="text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-100 mt-3">
            Outreach kit
          </h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
            Paste up to 100 URLs of brands you want to convert. We&apos;ll
            grade each one and draft a personalized email + LinkedIn DM
            referencing their actual AI visibility score and the top
            engine-specific findings. Drop the output into Lemlist,
            Instantly, or your CRM.
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            1 credit per URL · cache hits don&apos;t cost extra (we
            re-use the public grade).
          </p>
        </div>

        <OutreachKit />
      </div>
    </main>
  );
}
