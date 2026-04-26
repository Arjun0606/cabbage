"use client";

/**
 * Always-on "What to do next" banner.
 *
 * Sits at the top of the dashboard. Shows ONE thing — the single
 * highest-leverage action the customer should take right now, derived
 * from the current dashboard state. The customer should never have to
 * think "what do I do next inside this product?".
 *
 * The decision tree below is ordered: first matching condition wins.
 * Order reflects priority, not severity — a hallucination flagged with
 * critical severity beats an article-publishing nudge.
 *
 * No AI cost: pure JS evaluation over the data the dashboard already
 * has in memory.
 */

import { useMemo } from "react";
import { Sparkles, AlertOctagon, Zap, FileText, Target, TrendingUp, ChevronRight } from "lucide-react";

interface Props {
  // Snapshot of current dashboard state — keep loose typing so this
  // component can be added without forcing every caller to enumerate
  // exact shapes.
  hasScanned: boolean;
  aiVisResult?: {
    queryResults?: Array<{
      chatgpt?: { mentioned?: boolean; hallucinations?: Array<{ severity?: string }> };
      gemini?: { mentioned?: boolean; hallucinations?: Array<{ severity?: string }> };
    }>;
    scores?: { mentions?: number };
  };
  auditResult?: { fixes?: Array<{ severity?: string }>; scores?: { overall?: number } };
  citationDrift?: Array<{ flippedToAbsent?: boolean; gainedCompetitors?: string[] }>;
  goldenPrompts?: string[];
  daysSinceFirstScan?: number | null;
  articlesPublishedThisMonth?: number;
  scansRunThisWeek?: number;
  // Action triggers — wired by the parent
  onRunFirstScan?: () => void;
  onFixHallucinations?: () => void;
  onWriteArticles?: () => void;
  onPinGoldenPrompts?: () => void;
  onRunFanout?: () => void;
  onRunBrandDefense?: () => void;
}

interface Suggestion {
  icon: typeof Sparkles;
  title: string;
  body: string;
  cta: string;
  tone: "primary" | "warning" | "danger" | "info";
  onClick?: () => void;
}

function deriveSuggestion(p: Props): Suggestion {
  // Priority 0 — first run hasn't happened yet.
  if (!p.hasScanned) {
    return {
      icon: Sparkles,
      title: "Run your first scan",
      body: "We need a baseline before anything else. ~90s — every dashboard panel populates after.",
      cta: "Run Full Scan",
      tone: "primary",
      onClick: p.onRunFirstScan,
    };
  }

  // Priority 1 — critical hallucinations. Compliance / legal exposure
  // outranks everything.
  const allHallucinations = (p.aiVisResult?.queryResults || []).flatMap((q) => [
    ...(q.chatgpt?.hallucinations || []),
    ...(q.gemini?.hallucinations || []),
  ]);
  const criticalCount = allHallucinations.filter((h) => h?.severity === "critical").length;
  if (criticalCount > 0) {
    return {
      icon: AlertOctagon,
      title: `${criticalCount} critical AI accuracy ${criticalCount === 1 ? "issue" : "issues"} flagged`,
      body: "AI is stating wrong RERA numbers or attributing competitor projects to your brand. These are legally exposed — fix today.",
      cta: "Open AI Accuracy Audit",
      tone: "danger",
      onClick: p.onFixHallucinations,
    };
  }

  // Priority 2 — competitor encroachment via citation drift.
  const newCompetitors = new Set<string>();
  for (const d of p.citationDrift || []) {
    for (const c of d.gainedCompetitors || []) newCompetitors.add(c);
  }
  if (newCompetitors.size > 0) {
    const namesList = Array.from(newCompetitors).slice(0, 2).join(", ");
    return {
      icon: AlertOctagon,
      title: `${namesList} just entered your queries`,
      body: "AI started recommending these competitors on queries you used to win. Run brand-defense playbook before they compound.",
      cta: "Run brand defense",
      tone: "warning",
      onClick: p.onRunBrandDefense,
    };
  }

  // Priority 3 — pin golden prompts (only relevant if user hasn't yet).
  if ((p.goldenPrompts || []).length === 0 && (p.aiVisResult?.queryResults?.length || 0) > 0) {
    return {
      icon: Target,
      title: "Pin your top buyer queries",
      body: "Lock in 5-20 queries to track every scan. Without a fixed set you can't tell signal from the 20-30% noise floor in AI visibility scans.",
      cta: "Pin queries on AI Search tab",
      tone: "info",
      onClick: p.onPinGoldenPrompts,
    };
  }

  // Priority 4 — low mention rate + no articles published this month.
  // This is the canonical "first-week" nudge.
  const mentionRate = p.aiVisResult?.scores?.mentions ?? 100;
  const articlesThisMonth = p.articlesPublishedThisMonth ?? 0;
  if (mentionRate < 40 && articlesThisMonth < 5) {
    return {
      icon: FileText,
      title: "Ship your first 5 articles",
      body: `You're mentioned in ${mentionRate}% of buyer queries. Each article published widens the surface AI can cite — the curve compounds visibly within 21-30 days.`,
      cta: "Open Content Queue",
      tone: "primary",
      onClick: p.onWriteArticles,
    };
  }

  // Priority 5 — high mention rate but no fanout run on goldens.
  // Hidden-ceiling territory.
  if (mentionRate >= 50 && (p.goldenPrompts || []).length > 0) {
    return {
      icon: TrendingUp,
      title: "Test your hidden ceiling with query fanout",
      body: "Your anchor mention rate is strong. AI engines expand each query into ~20 variants. Run fanout on your golden prompts to see if you're winning the variants too.",
      cta: "Run fanout on a golden prompt",
      tone: "info",
      onClick: p.onRunFanout,
    };
  }

  // Priority 6 — staleness nudge: no scans in 7+ days.
  if ((p.scansRunThisWeek ?? 0) === 0 && (p.daysSinceFirstScan ?? 0) > 7) {
    return {
      icon: Zap,
      title: "Run a fresh scan this week",
      body: "Your last scan is over a week old. AI answers drift 40-60% per month — stale data leads to stale decisions.",
      cta: "Run Full Scan",
      tone: "info",
      onClick: p.onRunFirstScan,
    };
  }

  // Default fallback — never empty. Encourage compounding.
  return {
    icon: TrendingUp,
    title: "You're compounding. Keep shipping.",
    body: "Mention rate is healthy, no critical issues, articles flowing. Open the Progress tab to see the curve filling in.",
    cta: "Open Progress",
    tone: "primary",
  };
}

export function NextActionBanner(props: Props) {
  const suggestion = useMemo(() => deriveSuggestion(props), [props]);
  const { icon: Icon, title, body, cta, tone, onClick } = suggestion;

  const styles = {
    primary: { border: "border-[#7CB342]/30", bg: "bg-[#7CB342]/[0.04]", text: "text-[#7CB342]" },
    danger:  { border: "border-red-500/30",   bg: "bg-red-500/[0.06]",  text: "text-red-400" },
    warning: { border: "border-amber-500/30", bg: "bg-amber-500/[0.06]", text: "text-amber-400" },
    info:    { border: "border-blue-500/30",  bg: "bg-blue-500/[0.04]",  text: "text-blue-400" },
  }[tone];

  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} px-4 py-3 mb-4 flex items-center gap-3`}>
      <div className="w-8 h-8 rounded-lg bg-zinc-900/80 flex items-center justify-center flex-shrink-0">
        <Icon size={15} className={styles.text} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[12.5px] font-semibold ${styles.text} flex items-center gap-1.5`}>
          {title}
          <span className="text-[10px] uppercase tracking-wide text-zinc-600 font-normal">Next action</span>
        </div>
        <div className="text-[11.5px] text-zinc-400 leading-relaxed mt-0.5 line-clamp-2">{body}</div>
      </div>
      {onClick ? (
        <button
          onClick={onClick}
          className={`text-[11.5px] font-semibold px-3 py-1.5 rounded-md flex items-center gap-1 flex-shrink-0 transition-all ${
            tone === "primary"
              ? "bg-[#7CB342] text-zinc-950 hover:bg-[#8BC34A]"
              : tone === "danger"
              ? "bg-red-500 text-zinc-950 hover:bg-red-400"
              : tone === "warning"
              ? "bg-amber-500 text-zinc-950 hover:bg-amber-400"
              : "bg-blue-500 text-zinc-950 hover:bg-blue-400"
          }`}
        >
          {cta} <ChevronRight size={12} />
        </button>
      ) : (
        <span className="text-[11px] text-zinc-500 flex-shrink-0">{cta}</span>
      )}
    </div>
  );
}
