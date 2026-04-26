"use client";

/**
 * Brand-context refresh nudge.
 *
 * Cabbge can't auto-detect when a brand pivots — but it can ask. Once
 * a customer's brand-context fields have been untouched for 28+ days,
 * we surface a banner asking them to confirm or update. The nudge:
 *   - normalises the cadence (a CMO who pivots quarterly will refresh
 *     once a quarter, prompted; a steady brand will dismiss and the
 *     timer resets for another 28 days).
 *   - preserves authorship: every article generated AFTER the refresh
 *     uses the new context. Old articles aren't retroactively rewritten.
 *
 * The dismissal timestamp is per-company, stored in localStorage so
 * we don't need a new Supabase column. Server still has updated_at on
 * the company row as the source of truth for "really stale".
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X, Edit3 } from "lucide-react";

interface Props {
  companyId?: string;
  brandUpdatedAt?: string | null;
}

const STALE_DAYS = 28;
const DISMISS_KEY_PREFIX = "cabbge_brand_nudge_dismissed_";

export function BrandContextRefreshNudge({ companyId, brandUpdatedAt }: Props) {
  const [show, setShow] = useState(false);
  const [daysSince, setDaysSince] = useState<number>(0);

  useEffect(() => {
    if (!brandUpdatedAt || !companyId) {
      setShow(false);
      return;
    }
    const updated = new Date(brandUpdatedAt);
    const days = Math.floor((Date.now() - updated.getTime()) / (24 * 60 * 60 * 1000));
    setDaysSince(days);
    if (days < STALE_DAYS) {
      setShow(false);
      return;
    }
    // Was the nudge dismissed less than 14 days ago? Don't re-prompt.
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY_PREFIX + companyId);
      if (dismissed) {
        const dismissedAt = parseInt(dismissed, 10);
        if (!isNaN(dismissedAt) && Date.now() - dismissedAt < 14 * 24 * 60 * 60 * 1000) {
          setShow(false);
          return;
        }
      }
    } catch { /* localStorage unavailable */ }
    setShow(true);
  }, [brandUpdatedAt, companyId]);

  const dismiss = () => {
    if (!companyId) return;
    try {
      localStorage.setItem(DISMISS_KEY_PREFIX + companyId, String(Date.now()));
    } catch { /* ignore */ }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.05] px-4 py-3 mb-4 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-zinc-900/80 flex items-center justify-center flex-shrink-0">
        <Sparkles size={15} className="text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold text-amber-400 flex items-center gap-1.5">
          Brand context last edited {daysSince} days ago
          <span className="text-[10px] uppercase tracking-wide text-zinc-600 font-normal">Refresh</span>
        </div>
        <div className="text-[11.5px] text-zinc-400 leading-relaxed mt-0.5">
          New campaigns, messaging shifts, repositioned audience? Update Brand Context — every article we generate from here on out matches your current voice and vision.
        </div>
      </div>
      <Link
        href="/onboarding?step=3"
        className="text-[11.5px] font-semibold px-3 py-1.5 rounded-md bg-amber-500 text-zinc-950 hover:bg-amber-400 flex items-center gap-1 flex-shrink-0"
      >
        <Edit3 size={11} /> Edit
      </Link>
      <button
        onClick={dismiss}
        title="Dismiss for 14 days"
        className="text-zinc-600 hover:text-zinc-300 flex-shrink-0 p-1"
      >
        <X size={14} />
      </button>
    </div>
  );
}
