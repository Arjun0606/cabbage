import { OutreachKit } from "./outreach-kit";

export const dynamic = "force-dynamic";

// Auth gate runs in app/dashboard/layout.tsx.
export default function OutreachPage() {
  return (
    <main>
      <div className="border-b border-white/15 px-6 sm:px-8 py-8">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#7CB342] mb-2">
          §02 / OUTREACH
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-[0.95]">
          Cold-outreach
          <br />
          generator.
        </h1>
        <p className="mt-3 text-[13px] text-zinc-400 leading-relaxed max-w-2xl">
          Paste up to 100 URLs. We grade each one and draft a
          personalized email + LinkedIn DM referencing their actual AI
          visibility score and top fixes. Drop the output into
          Lemlist, Instantly, or your CRM.
        </p>
        <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">
          1 CREDIT / URL · CACHE HITS FREE
        </div>
      </div>

      <div className="px-6 sm:px-8 py-8 max-w-4xl">
        <OutreachKit />
      </div>
    </main>
  );
}
