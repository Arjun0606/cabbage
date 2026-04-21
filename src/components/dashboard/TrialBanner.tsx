"use client";

import Link from "next/link";
import { Clock, Zap } from "lucide-react";

interface Props {
  plan: string;
  status: string;
  daysLeftInTrial: number;
  canAccess: boolean;
}

/**
 * Trial / upgrade banner shown at top of dashboard.
 * - Trialing + >3 days left: subtle amber reminder
 * - Trialing + ≤3 days: urgent red reminder
 * - Trial expired: full paywall card (returned separately, see PaywallOverlay)
 * - Active paid plan: nothing
 */
export function TrialBanner({ plan, status, daysLeftInTrial, canAccess }: Props) {
  if (plan !== "trial" || !canAccess) return null;

  const urgent = daysLeftInTrial <= 3;
  const bg = urgent ? "bg-red-500/[0.08] border-red-500/30" : "bg-amber-500/[0.06] border-amber-500/20";
  const icon = urgent ? "text-red-400" : "text-amber-400";
  const text = urgent ? "text-red-300" : "text-amber-300";

  return (
    <div className={`flex items-center gap-3 px-5 py-2.5 border-b ${bg}`}>
      <Clock size={14} className={`${icon} flex-shrink-0`} />
      <span className={`text-[12px] ${text} flex-1`}>
        {daysLeftInTrial === 0
          ? "Your trial ends today."
          : `${daysLeftInTrial} day${daysLeftInTrial === 1 ? "" : "s"} left in your free trial.`}{" "}
        <span className="text-zinc-400">All features unlocked. Upgrade before it ends to keep your momentum.</span>
      </span>
      <Link
        href="/pricing"
        className="h-7 px-3 rounded-md bg-[#7CB342] text-zinc-950 text-[11px] font-semibold hover:bg-[#8BC34A] active:scale-[0.97] flex items-center gap-1 flex-shrink-0"
      >
        <Zap size={11} /> Upgrade
      </Link>
    </div>
  );
  // Plan / status unused here but kept in signature so parent doesn't need to destructure
  void plan; void status;
}
