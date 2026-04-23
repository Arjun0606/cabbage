"use client";

import Link from "next/link";
import { Sparkles, Lock, ArrowRight, CheckCircle2 } from "lucide-react";

interface Props {
  email?: string;
  reason: "needs_payment" | "canceled" | "past_due";
}

export function PaywallOverlay({ email, reason }: Props) {
  const headline =
    reason === "needs_payment" ? "Activate your Cabbge access"
    : reason === "past_due" ? "Your last payment didn't go through"
    : "Your subscription was canceled";

  const sub =
    reason === "needs_payment" ? "Cabbge is a paid product. Pick a plan to start running scans, generating content, and tracking AI visibility."
    : reason === "past_due" ? "We'll retry automatically, or you can update your card and reactivate now."
    : "You still have access to your data. Reactivate any time to resume daily scans and content generation.";

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0b]/95 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-zinc-900 border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[#7CB342] flex items-center justify-center">
            <Sparkles size={16} className="text-zinc-900" />
          </div>
          <span className="text-[16px] font-bold">Cabbge</span>
        </div>

        <div className="flex items-center gap-2 mb-2 text-[#7CB342]">
          <Lock size={14} />
          <span className="text-[11px] uppercase tracking-wide font-semibold">Upgrade required</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">{headline}</h1>
        <p className="text-[14px] text-zinc-400 mb-6">{sub}</p>

        <div className="space-y-2 mb-6">
          {[
            "Daily AI visibility scans",
            "Full-site SEO crawler",
            "Keyword research with real volume",
            "Article generator + publish loop",
            "All your existing data preserved",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2 text-[13px] text-zinc-300">
              <CheckCircle2 size={13} className="text-[#7CB342] flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>

        <Link
          href="/pricing"
          className="w-full h-11 rounded-lg bg-[#7CB342] text-zinc-950 font-semibold text-[14px] hover:bg-[#8BC34A] active:scale-[0.97] flex items-center justify-center gap-2 mb-3"
        >
          See Plans <ArrowRight size={14} />
        </Link>

        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          {email && <span>Signed in as {email}</span>}
          <Link href="/auth/signout" className="hover:text-zinc-300">Sign out</Link>
        </div>
      </div>
    </div>
  );
}
