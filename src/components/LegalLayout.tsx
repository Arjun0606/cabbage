"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

interface Props {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

/**
 * Shared layout for the legal pages (Terms, Privacy, DPA, etc.).
 * Centralises the page chrome so all three pages stay visually
 * consistent and we can add the "review with counsel" disclaimer
 * banner in one place.
 */
export function LegalLayout({ title, lastUpdated, children }: Props) {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#7CB342] flex items-center justify-center">
              <Sparkles size={14} className="text-zinc-900" />
            </div>
            <span className="text-[15px] font-semibold">Cabbge</span>
          </Link>
          <div className="flex items-center gap-4 text-[12px] text-zinc-400">
            <Link href="/legal" className="hover:text-zinc-200">Legal</Link>
            <Link href="/pricing" className="hover:text-zinc-200">Pricing</Link>
            <Link href="/signin" className="hover:text-zinc-200">Sign in</Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">{title}</h1>
          <div className="text-[12px] text-zinc-500">Last updated: {lastUpdated}</div>
        </div>

        <article className="prose-legal space-y-6 text-[14px] leading-relaxed text-zinc-300">
          {children}
        </article>

        <div className="mt-16 pt-8 border-t border-white/[0.06] text-[12px] text-zinc-500">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/terms" className="hover:text-zinc-300">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-zinc-300">Privacy Policy</Link>
            <Link href="/dpa" className="hover:text-zinc-300">Data Processing Agreement</Link>
            <Link href="/legal" className="hover:text-zinc-300">All legal documents</Link>
            <a href="mailto:legal@cabbge.com" className="hover:text-zinc-300">legal@cabbge.com</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[18px] font-semibold text-zinc-100 mb-3">{title}</h2>
      <div className="space-y-3 text-zinc-300">{children}</div>
    </section>
  );
}
