import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";
import { FileText, Shield, FileCheck, Lock, Mail } from "lucide-react";

export const metadata = {
  title: "Legal — Cabbge",
  description: "Cabbge's public legal documents: Terms of Service, Privacy Policy, Data Processing Agreement, and security posture.",
};

/**
 * Legal index — the single page enterprise procurement can link to.
 * Shows the ToS / Privacy / DPA trio plus a security-posture summary
 * so a CMO or their InfoSec team can self-serve most of the diligence
 * in one read.
 */
export default function LegalPage() {
  return (
    <LegalLayout title="Legal and trust" lastUpdated="2026-04-24">
      <p>
        Everything a CMO or procurement team needs to diligence Cabbge. Each document below is a live, versioned page; &quot;Last updated&quot; reflects the current draft.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mt-6 not-prose">
        <Link
          href="/terms"
          className="group rounded-xl border border-white/[0.06] bg-zinc-900/60 p-5 hover:border-[#7CB342]/30 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#7CB342]/10 flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-[#7CB342]" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white">Terms of Service</div>
              <div className="text-[12px] text-zinc-500 mt-1">Subscription terms, acceptable use, liability, and jurisdiction.</div>
            </div>
          </div>
        </Link>

        <Link
          href="/privacy"
          className="group rounded-xl border border-white/[0.06] bg-zinc-900/60 p-5 hover:border-[#7CB342]/30 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#7CB342]/10 flex items-center justify-center flex-shrink-0">
              <Shield size={16} className="text-[#7CB342]" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white">Privacy Policy</div>
              <div className="text-[12px] text-zinc-500 mt-1">What data we collect, sub-processors we use, and your rights under the DPDP Act.</div>
            </div>
          </div>
        </Link>

        <Link
          href="/dpa"
          className="group rounded-xl border border-white/[0.06] bg-zinc-900/60 p-5 hover:border-[#7CB342]/30 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#7CB342]/10 flex items-center justify-center flex-shrink-0">
              <FileCheck size={16} className="text-[#7CB342]" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-zinc-100 group-hover:text-white">Data Processing Agreement</div>
              <div className="text-[12px] text-zinc-500 mt-1">DPA that controls Cabbge&apos;s processing of personal data on your behalf. Signed counterpart available on request.</div>
            </div>
          </div>
        </Link>

        <div className="rounded-xl border border-white/[0.06] bg-zinc-900/60 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#7CB342]/10 flex items-center justify-center flex-shrink-0">
              <Lock size={16} className="text-[#7CB342]" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-zinc-100">Security posture</div>
              <div className="text-[12px] text-zinc-500 mt-1">Summary below. Full answers to standard infosec questionnaires (SIG Lite, CAIQ) available on request.</div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-[18px] font-semibold text-zinc-100 mt-10 mb-3">Security at a glance</h2>
      <ul className="list-disc pl-6 space-y-1.5">
        <li><strong>Hosting</strong>: Vercel (app) + Supabase on AWS ap-south-1, Mumbai (database + auth + storage).</li>
        <li><strong>Encryption</strong>: TLS 1.2+ in transit, AES-256 at rest.</li>
        <li><strong>Access control</strong>: role-based; production data accessed only by personnel with documented need.</li>
        <li><strong>Tenant isolation</strong>: row-level security on every customer-owned table. Users can only read and modify their own company&apos;s data.</li>
        <li><strong>Secrets</strong>: environment variables only; never in source control.</li>
        <li><strong>AI providers</strong>: OpenAI and Google Gemini operate under commercial API agreements that prohibit training on our prompts or completions.</li>
        <li><strong>Backups</strong>: automatic through Supabase; point-in-time restore available.</li>
        <li><strong>Breach response</strong>: 72-hour notification to affected customers, in line with DPDP Act timelines.</li>
        <li><strong>Subprocessors</strong>: full list with region, purpose, and data type on the <Link href="/privacy" className="text-[#7CB342] hover:underline">Privacy Policy</Link>.</li>
      </ul>

      <h2 className="text-[18px] font-semibold text-zinc-100 mt-10 mb-3">RERA and regulatory data</h2>
      <p>
        Cabbge surfaces and cross-references RERA registration numbers that are already published on your own website and on state RERA portals. The platform treats this data as public informational content only. It is not legal advice, and state portals remain the authoritative source of truth. You are responsible for your own RERA compliance.
      </p>

      <h2 className="text-[18px] font-semibold text-zinc-100 mt-10 mb-3">Questions</h2>
      <p className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
        <a href="mailto:legal@cabbge.com" className="inline-flex items-center gap-1.5 text-[#7CB342] hover:underline"><Mail size={12} /> legal@cabbge.com</a>
        <a href="mailto:privacy@cabbge.com" className="inline-flex items-center gap-1.5 text-[#7CB342] hover:underline"><Mail size={12} /> privacy@cabbge.com</a>
        <a href="mailto:security@cabbge.com" className="inline-flex items-center gap-1.5 text-[#7CB342] hover:underline"><Mail size={12} /> security@cabbge.com</a>
        <a href="mailto:sales@cabbge.com" className="inline-flex items-center gap-1.5 text-[#7CB342] hover:underline"><Mail size={12} /> sales@cabbge.com</a>
      </p>
    </LegalLayout>
  );
}
