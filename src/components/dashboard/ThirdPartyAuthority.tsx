"use client";

/**
 * Third-party authority view.
 *
 * Foundation Inc's research on GEO is direct: 85% of brand mentions in
 * AI answers come from third-party sources; only 15% from the brand's
 * own site. A real estate developer optimising only their own website
 * is leaving 85% of the citation opportunity on the table.
 *
 * This panel breaks down citations by platform:
 *   Reddit      22.9% of top-cited domains in AI answers
 *   YouTube     13.4%
 *   Wikipedia    6.4%
 *   Forbes       4.7%
 *   LinkedIn     4.0%
 *   Portal sites (99acres / MagicBricks / Housing etc.)
 *   News sites
 *   Gov sites (RERA portals)
 *
 * For each platform we count how many of the brand's citations the
 * scan surfaced + show the share vs the category norm. Under-
 * represented platforms get a red "gap" tag with a one-line strategy
 * hint so the CMO knows what to do next week.
 */

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Globe2 } from "lucide-react";

interface Citation {
  url: string;
  type?: string;
}

interface LLMResult {
  citationSources?: Citation[];
  coCitations?: string[];
}

interface QueryResult {
  query: string;
  chatgpt?: LLMResult;
  gemini?: LLMResult;
}

interface Props {
  aiVisResult: { queryResults?: QueryResult[] } | null;
  websiteUrl: string;
}

const PLATFORM_BENCHMARKS: Array<{
  key: string;
  label: string;
  share: number; // percentage of top-cited domains industry-wide
  strategy: string;
  match: (host: string) => boolean;
}> = [
  {
    key: "reddit",
    label: "Reddit",
    share: 22.9,
    strategy: "Join 2-3 locality subreddits (r/bangalore, r/mumbai, r/hyderabad). Post genuine buyer-experience threads — not promotional.",
    match: (h) => h === "reddit.com" || h.endsWith(".reddit.com"),
  },
  {
    key: "youtube",
    label: "YouTube",
    share: 13.4,
    strategy: "Commission 2-3 walkthrough videos per project on mid-size (10k-100k) Indian real-estate YouTubers. AI cites YT on 75% of educational queries.",
    match: (h) => h === "youtube.com" || h === "youtu.be" || h.endsWith(".youtube.com"),
  },
  {
    key: "wikipedia",
    label: "Wikipedia",
    share: 6.4,
    strategy: "Create or maintain a neutral-tone Wikipedia page for the parent company. Cite only verifiable news sources (Mint, ET, Hindu).",
    match: (h) => h.endsWith(".wikipedia.org"),
  },
  {
    key: "forbes",
    label: "Forbes / news",
    share: 4.7,
    strategy: "Pitch the head-of-digital for thought-leadership bylines on Forbes India, ET Realty, Mint, Business Standard. One Forbes article compounds for years in AI answers.",
    match: (h) => /forbes|economictimes|livemint|thehindu|businessstandard|hindustantimes|moneycontrol/.test(h),
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    share: 4.0,
    strategy: "Founder + senior sales team publish 1 long-form post per week tagged with project name + locality. LinkedIn is the #1 cited source for professional queries.",
    match: (h) => h === "linkedin.com" || h.endsWith(".linkedin.com"),
  },
  {
    key: "portals",
    label: "Property portals",
    share: 0,
    strategy: "Every project listed on 99acres, Magicbricks, Housing, NoBroker. The Authority tab tracks your submission coverage.",
    match: (h) =>
      /99acres|magicbricks|housing\.com|nobroker|commonfloor|proptiger|roofandfloor/.test(h),
  },
  {
    key: "government",
    label: "Government / RERA",
    share: 0,
    strategy: "RERA-registered status drives government-domain citations. Every article should cite your RERA number by name.",
    match: (h) => /rera\.|\.gov\.in|nic\.in/.test(h),
  },
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function ThirdPartyAuthority({ aiVisResult, websiteUrl }: Props) {
  const queryResults = aiVisResult?.queryResults || [];

  const breakdown = useMemo(() => {
    const ownHost = websiteUrl ? hostOf(websiteUrl) : "";
    const platformCounts = new Map<string, number>();
    let ownCount = 0;
    let totalCount = 0;

    for (const q of queryResults) {
      const all = [
        ...(q.chatgpt?.citationSources || []),
        ...(q.gemini?.citationSources || []),
      ];
      for (const c of all) {
        if (!c.url) continue;
        totalCount++;
        const h = hostOf(c.url);
        if (ownHost && h === ownHost) {
          ownCount++;
          continue;
        }
        let matched = false;
        for (const p of PLATFORM_BENCHMARKS) {
          if (p.match(h)) {
            platformCounts.set(p.key, (platformCounts.get(p.key) || 0) + 1);
            matched = true;
            break;
          }
        }
        if (!matched) platformCounts.set("other", (platformCounts.get("other") || 0) + 1);
      }
    }

    const ownShare = totalCount > 0 ? (ownCount / totalCount) * 100 : 0;
    const thirdPartyShare = 100 - ownShare;

    return { platformCounts, ownCount, totalCount, ownShare, thirdPartyShare };
  }, [queryResults, websiteUrl]);

  if (breakdown.totalCount === 0) return null;

  return (
    <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Globe2 size={14} className="text-zinc-300" />
          <h3 className="text-[13px] font-semibold text-zinc-200">Off-site authority</h3>
          <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border-0 rounded-md h-5 px-1.5">
            {breakdown.totalCount} citations
          </Badge>
          <span className="text-[11px] text-zinc-500 ml-auto">
            Industry norm: 85% third-party, 15% own site
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 mb-3">
          AI engines cite third-party sources 85% of the time on brand queries. Optimising only your own website caps your ceiling. Here&apos;s where AI is actually citing you from — and which platforms you&apos;re missing.
        </p>
        <div className="grid grid-cols-[120px_1fr_auto] gap-3 mb-3 items-center pb-2 border-b border-zinc-800/60">
          <div className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold">Own site</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full ${breakdown.ownShare <= 20 ? "bg-[#7CB342]" : "bg-amber-400"}`}
                style={{ width: `${Math.min(100, breakdown.ownShare)}%` }}
              />
            </div>
            <span className="text-[11px] text-zinc-400 tabular-nums w-12 text-right">
              {breakdown.ownShare.toFixed(0)}%
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 tabular-nums w-12 text-right">
            {breakdown.ownCount}
          </span>
        </div>
        <div className="space-y-2">
          {PLATFORM_BENCHMARKS.map((p) => {
            const count = breakdown.platformCounts.get(p.key) || 0;
            const share = breakdown.totalCount > 0 ? (count / breakdown.totalCount) * 100 : 0;
            const gap = p.share > 0 && share < p.share * 0.5;
            return (
              <div key={p.key} className="grid grid-cols-[120px_1fr_auto] gap-3 items-start">
                <div className="text-[12px] text-zinc-300 font-medium">
                  {p.label}
                  {p.share > 0 && (
                    <div className="text-[10px] text-zinc-500">norm {p.share}%</div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full ${
                          gap ? "bg-red-400" : share > 0 ? "bg-[#7CB342]" : "bg-zinc-700"
                        }`}
                        style={{ width: `${Math.min(100, share)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-zinc-400 tabular-nums w-12 text-right">
                      {share.toFixed(1)}%
                    </span>
                  </div>
                  {gap && (
                    <div className="text-[11px] text-red-400 mt-0.5 leading-relaxed">
                      Gap — {p.strategy}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-zinc-500 tabular-nums w-12 text-right pt-0.5">
                  {count}
                </span>
              </div>
            );
          })}
          {breakdown.platformCounts.has("other") && (
            <div className="grid grid-cols-[120px_1fr_auto] gap-3 items-center">
              <div className="text-[12px] text-zinc-500">Other</div>
              <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-zinc-600"
                  style={{
                    width: `${Math.min(
                      100,
                      ((breakdown.platformCounts.get("other") || 0) / breakdown.totalCount) * 100
                    )}%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-zinc-500 tabular-nums w-12 text-right">
                {breakdown.platformCounts.get("other")}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
