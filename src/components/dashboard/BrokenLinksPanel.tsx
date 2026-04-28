"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ExternalLink, Link2Off } from "lucide-react";

interface BrokenLink {
  url: string;
  statusCode: number;
  fetchError: string | null;
  crawledAt: string;
}

interface Response {
  latestCrawledAt: string | null;
  total: number;
  links: BrokenLink[];
}

/**
 * Broken-link panel.
 *
 * Reads broken_links rows for the company and shows the most-recent
 * crawl batch — every URL on the customer's site that returned 4xx /
 * 5xx / network error during the latest crawl. AI overviews and Google
 * search both penalize sites with broken internal links; surfacing
 * this prominently so customers can fix it before it dings their
 * citation rate.
 *
 * Hides when no broken links exist (good news doesn't need a panel).
 */
export function BrokenLinksPanel({ companyId }: { companyId?: string | null }) {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/broken-links?companyId=${encodeURIComponent(companyId)}&limit=200`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as Response;
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        // Best-effort; just hide the panel on error.
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (!companyId || loading) return null;
  if (!data || data.total === 0) return null;

  // Group by status-code family for the summary line.
  const four04 = data.links.filter((l) => l.statusCode === 404).length;
  const otherClient = data.links.filter((l) => l.statusCode >= 400 && l.statusCode < 500 && l.statusCode !== 404).length;
  const server = data.links.filter((l) => l.statusCode >= 500).length;
  const network = data.links.filter((l) => l.statusCode === 0).length;

  const crawledLabel = data.latestCrawledAt
    ? new Date(data.latestCrawledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "recent crawl";

  return (
    <div className="rounded-xl border border-rose-500/15 bg-rose-500/[0.03] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-rose-500/10">
        <Link2Off size={13} className="text-rose-400" />
        <span className="text-[13px] font-semibold text-rose-300">
          {data.total} broken {data.total === 1 ? "link" : "links"} on your site
        </span>
        <span className="text-[10px] text-zinc-500 ml-auto">crawled {crawledLabel}</span>
      </div>
      <div className="px-4 py-2.5 border-b border-rose-500/[0.08] flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400">
        {four04 > 0 && (
          <span><span className="text-zinc-200 font-semibold">{four04}</span> · 404 not found</span>
        )}
        {otherClient > 0 && (
          <span><span className="text-zinc-200 font-semibold">{otherClient}</span> · other 4xx</span>
        )}
        {server > 0 && (
          <span><span className="text-zinc-200 font-semibold">{server}</span> · server 5xx</span>
        )}
        {network > 0 && (
          <span><span className="text-zinc-200 font-semibold">{network}</span> · network failure</span>
        )}
      </div>
      <div className="max-h-[300px] overflow-y-auto divide-y divide-rose-500/[0.06]">
        {data.links.slice(0, 100).map((l, i) => (
          <div key={`${l.url}-${i}`} className="px-4 py-2.5 flex items-center gap-3">
            <span className="text-[10px] tabular-nums w-10 flex-shrink-0 text-rose-400 font-mono">
              {l.statusCode === 0 ? "ERR" : l.statusCode}
            </span>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-zinc-300 truncate flex-1 hover:text-zinc-100"
              title={l.url}
            >
              {l.url}
            </a>
            {l.fetchError && (
              <span className="text-[10px] text-rose-400/70 truncate max-w-[200px]" title={l.fetchError}>
                {l.fetchError}
              </span>
            )}
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-300 flex-shrink-0"
            >
              <ExternalLink size={11} />
            </a>
          </div>
        ))}
      </div>
      <div className="px-4 py-2.5 bg-zinc-900/40 border-t border-rose-500/[0.08]">
        <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
          <AlertCircle size={11} />
          AI overviews and Google search both downrank sites with broken internal links — fix these in your CMS, then re-crawl.
        </p>
      </div>
    </div>
  );
}
