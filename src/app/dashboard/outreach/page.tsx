import { OutreachKit } from "./outreach-kit";

export const dynamic = "force-dynamic";

// Auth gate runs in app/dashboard/layout.tsx.
export default function OutreachPage() {
  return (
    <main className="px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#7CB342] font-semibold">
            Outreach
          </div>
          <h1 className="text-3xl font-bold text-zinc-100 mt-2 tracking-tight">
            Cold-outreach kit
          </h1>
          <p className="text-[14px] text-zinc-400 mt-2 max-w-2xl leading-relaxed">
            Paste up to 100 URLs of brands you want to convert.
            We&apos;ll grade each one and draft a personalized email +
            LinkedIn DM referencing their actual AI visibility score
            and the top engine-specific findings. Drop the output into
            Lemlist, Instantly, or your CRM.
          </p>
          <p className="text-[11px] text-zinc-500 mt-2 font-mono">
            1 credit per URL · cache hits don&apos;t cost extra
          </p>
        </div>

        <OutreachKit />
      </div>
    </main>
  );
}
