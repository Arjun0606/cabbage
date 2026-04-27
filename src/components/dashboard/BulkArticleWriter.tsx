"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Trash2, AlertCircle, CheckCircle2, Zap } from "lucide-react";

/**
 * Bulk article writer — UI surface for the article_jobs queue.
 *
 * Sits at the top of the Content tab. Customer hands the worker a
 * batch of queries (from gap analysis, blind spots, decay refresh,
 * landing-page opportunities) by clicking "Auto-write all (N)". The
 * worker cron picks them up and generates each end-to-end without
 * per-article human review, using the brand voice / project / city /
 * RERA context that's already on file.
 *
 * The component polls /api/article-queue every 30s to update its
 * status strip (queued / writing / done / failed). When all jobs are
 * done it stops polling.
 */

interface Job {
  id: string;
  query: string;
  articleType: string | null;
  priority: number;
  status: "queued" | "writing" | "done" | "failed" | "capped" | "needs_brand_context";
  enqueuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedReason: string | null;
  generatedArticleId: string | null;
}

interface Counts {
  queued: number;
  writing: number;
  done: number;
  failed: number;
  capped: number;
  needs_brand_context: number;
}

const ZERO_COUNTS: Counts = { queued: 0, writing: 0, done: 0, failed: 0, capped: 0, needs_brand_context: 0 };

export function BulkArticleWriter({
  companyId,
  candidateQueries,
  isDemo,
}: {
  companyId: string | null | undefined;
  /** Queries the customer could enqueue. Drawn from blind spots,
   *  landing-page opportunities, infra-news suggestions, decay refresh.
   *  De-duped at the source so we don't enqueue the same query twice. */
  candidateQueries: string[];
  isDemo: boolean;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counts, setCounts] = useState<Counts>(ZERO_COUNTS);
  const [enqueuing, setEnqueuing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await fetch(`/api/article-queue?companyId=${encodeURIComponent(companyId)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.jobs)) setJobs(data.jobs);
      if (data.counts) setCounts(data.counts);
    } catch { /* polling failure is non-fatal */ }
  }, [companyId]);

  useEffect(() => {
    if (!companyId || isDemo) return;
    refresh();
    // Poll while there's work in flight. Once everything's terminal we
    // back off so we're not banging the API for nothing.
    const id = setInterval(() => {
      if (counts.queued + counts.writing > 0) refresh();
    }, 30000);
    return () => clearInterval(id);
  }, [companyId, isDemo, counts.queued, counts.writing, refresh]);

  if (isDemo || hidden) return null;
  if (!companyId) return null;

  const queuedQueries = new Set(jobs.filter((j) => j.status === "queued" || j.status === "writing").map((j) => j.query.toLowerCase()));
  const enqueueable = candidateQueries.filter((q) => !queuedQueries.has(q.toLowerCase()));
  const total = counts.queued + counts.writing + counts.done + counts.failed + counts.capped;

  const enqueueAll = async () => {
    if (!enqueueable.length) return;
    setEnqueuing(true);
    setError(null);
    try {
      const res = await fetch("/api/article-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          items: enqueueable.map((q) => ({ query: q, priority: 10 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Enqueue failed");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enqueue failed");
    } finally {
      setEnqueuing(false);
    }
  };

  const dropJob = async (jobId: string) => {
    if (!companyId) return;
    await fetch(`/api/article-queue?companyId=${encodeURIComponent(companyId)}&id=${encodeURIComponent(jobId)}`, {
      method: "DELETE",
    });
    await refresh();
  };

  return (
    <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
            <Zap size={14} className="text-[#7CB342]" />
            Auto-write the queue
            {total > 0 && (
              <Badge className="text-[10px] h-5 px-1.5 rounded-md border-0 bg-zinc-800 text-zinc-400">
                {total} job{total === 1 ? "" : "s"}
              </Badge>
            )}
          </CardTitle>
          <Button
            onClick={() => setHidden(true)}
            variant="outline"
            className="h-7 text-[11px] border-zinc-700 text-zinc-500 hover:text-zinc-300 px-2"
          >
            Hide
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-[11.5px] text-zinc-500 leading-relaxed">
          Hand a batch of suggested queries to the worker. It generates each article end-to-end using your brand voice, project list, and city — no per-article review needed. Drafts land in your tracked-articles list ready to publish.
        </p>

        {/* Brand-context unblock banner. The worker stops at the first
            brand-context rejection per tick (every job after would hit
            the same wall) so this banner is the one signal the customer
            needs to act on. */}
        {counts.needs_brand_context > 0 && (
          <div className="p-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/30 flex items-start gap-2.5">
            <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-[12px]">
              <div className="font-semibold text-amber-300 mb-1">
                {counts.needs_brand_context} job{counts.needs_brand_context === 1 ? "" : "s"} paused — brand context incomplete
              </div>
              <p className="text-zinc-400 leading-relaxed">
                The article writer needs your brand voice + product info filled in before it'll produce drafts that read like your brand. Generic articles from empty context are why customers churn.
                Open <span className="text-zinc-200 font-medium">Settings &rarr; Brand Context</span> and fill the required fields, then re-enqueue.
              </p>
            </div>
          </div>
        )}

        {/* Status strip */}
        {total > 0 && (
          <div className="grid grid-cols-5 gap-1.5">
            <StatusPip label="Queued" count={counts.queued} tone="zinc" />
            <StatusPip label="Writing" count={counts.writing} tone="amber" />
            <StatusPip label="Done" count={counts.done} tone="green" />
            <StatusPip label={counts.needs_brand_context > 0 ? "Brand ctx" : "Failed"} count={counts.needs_brand_context > 0 ? counts.needs_brand_context : counts.failed} tone={counts.needs_brand_context > 0 ? "amber" : "red"} />
            <StatusPip label="Capped" count={counts.capped} tone="zinc" />
          </div>
        )}

        {/* Primary CTA */}
        <div className="flex items-center gap-2">
          <Button
            onClick={enqueueAll}
            disabled={enqueuing || enqueueable.length === 0}
            className="flex-1 bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 h-9 text-[12px] font-semibold rounded-md"
          >
            {enqueuing ? (
              <><Loader2 size={13} className="animate-spin mr-1.5" />Enqueuing...</>
            ) : enqueueable.length === 0 ? (
              "Nothing new to enqueue"
            ) : (
              `Auto-write all (${enqueueable.length})`
            )}
          </Button>
          {(counts.queued > 0 || counts.writing > 0) && (
            <Button
              onClick={refresh}
              variant="outline"
              className="h-9 text-[12px] border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-3"
            >
              Refresh
            </Button>
          )}
        </div>
        {error && (
          <div className="flex items-start gap-1.5 text-[11px] text-red-400">
            <AlertCircle size={11} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Job list — collapsed by default once we have results, but
            always show in-flight items so the customer sees motion. */}
        {jobs.length > 0 && (
          <details className="text-[11.5px]">
            <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200 select-none">
              {counts.queued + counts.writing > 0
                ? `${counts.queued + counts.writing} in flight, ${counts.done} drafted`
                : `${counts.done} drafted${counts.failed > 0 ? `, ${counts.failed} failed` : ""}`}
            </summary>
            <div className="mt-2 space-y-1 max-h-[280px] overflow-y-auto">
              {jobs.map((j) => (
                <JobRow key={j.id} job={j} onDelete={() => dropJob(j.id)} />
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

function StatusPip({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "zinc" | "amber" | "green" | "red";
}) {
  const palette =
    tone === "amber" ? "bg-amber-500/10 text-amber-300" :
    tone === "green" ? "bg-[#7CB342]/15 text-[#7CB342]" :
    tone === "red" ? "bg-red-500/10 text-red-400" :
    "bg-zinc-800/60 text-zinc-400";
  return (
    <div className={`rounded-md px-2 py-1.5 text-center ${palette}`}>
      <div className="text-[15px] font-bold tabular-nums leading-none">{count}</div>
      <div className="text-[9px] uppercase tracking-wide font-semibold mt-0.5">{label}</div>
    </div>
  );
}

function JobRow({ job, onDelete }: { job: Job; onDelete: () => void }) {
  const status = job.status;
  const palette =
    status === "writing" ? "text-amber-300" :
    status === "done" ? "text-[#7CB342]" :
    status === "failed" ? "text-red-400" :
    status === "needs_brand_context" ? "text-amber-300" :
    status === "capped" ? "text-zinc-500" :
    "text-zinc-400";
  const icon =
    status === "writing" ? <Loader2 size={11} className="animate-spin flex-shrink-0" /> :
    status === "done" ? <CheckCircle2 size={11} className="flex-shrink-0" /> :
    status === "failed" || status === "needs_brand_context" ? <AlertCircle size={11} className="flex-shrink-0" /> :
    <FileText size={11} className="flex-shrink-0" />;
  const label = status === "needs_brand_context" ? "needs brand ctx" : status;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-zinc-800/30 border border-white/[0.04]">
      <span className={palette}>{icon}</span>
      <span className="flex-1 truncate text-zinc-300" title={job.query}>{job.query}</span>
      <span className={`text-[10px] uppercase tracking-wide font-semibold ${palette}`}>{label}</span>
      {(status === "queued" || status === "failed" || status === "capped" || status === "needs_brand_context") && (
        <button
          onClick={onDelete}
          className="text-zinc-600 hover:text-red-400"
          title="Drop from queue"
        >
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
}
