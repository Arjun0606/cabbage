import { OutreachKit } from "./outreach-kit";

export const dynamic = "force-dynamic";

// Auth gate runs in app/dashboard/layout.tsx.
export default function OutreachPage() {
  return (
    <main className="px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">
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
