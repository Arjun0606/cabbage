"use client";

import { useState } from "react";

interface OutreachItem {
  url: string;
  slug?: string;
  brand?: string;
  category?: string;
  score?: number;
  cacheHit?: boolean;
  emailSubject?: string;
  emailBody?: string;
  linkedinDm?: string;
  visibilityUrl?: string;
  error?: string;
}

interface BatchResponse {
  results: OutreachItem[];
  processed: number;
  cacheHits: number;
  credits?: { cost: number; remaining: number; monthly: number };
  error?: string;
}

export function OutreachKit() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batch, setBatch] = useState<BatchResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const urls = input
    .split(/\r?\n|,/)
    .map((u) => u.trim())
    .filter(Boolean);
  const urlCount = urls.length;
  const overLimit = urlCount > 100;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBatch(null);
    setLoading(true);
    try {
      const res = await fetch("/api/outreach/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = (await res.json()) as BatchResponse;
      if (!res.ok) {
        setError(data.error || "Batch failed");
        setBatch(data);
        return;
      }
      setBatch(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      /* noop */
    }
  }

  function downloadCsv() {
    if (!batch) return;
    const rows: string[][] = [
      [
        "url",
        "brand",
        "category",
        "score",
        "visibility_url",
        "email_subject",
        "email_body",
        "linkedin_dm",
        "error",
      ],
    ];
    for (const r of batch.results) {
      rows.push([
        r.url,
        r.brand ?? "",
        r.category ?? "",
        r.score?.toString() ?? "",
        r.visibilityUrl ?? "",
        r.emailSubject ?? "",
        r.emailBody ?? "",
        r.linkedinDm ?? "",
        r.error ?? "",
      ]);
    }
    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? "");
            if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
            return s;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cabbge-outreach-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-5 space-y-3"
      >
        <div>
          <label className="text-[11px] text-zinc-500 uppercase tracking-wide block mb-1.5">
            URLs · one per line, or comma-separated · max 100
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`stripe.com\nshopify.com\nnotion.so\n…`}
            rows={8}
            disabled={loading}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 disabled:opacity-50 font-mono"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-zinc-500">
            {urlCount} URL{urlCount === 1 ? "" : "s"}
            {overLimit && (
              <span className="text-red-300 ml-2">
                · over the 100-URL cap
              </span>
            )}
            {urlCount > 0 && !overLimit && (
              <span className="text-zinc-400 ml-2">
                · {urlCount} credit{urlCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || urlCount === 0 || overLimit}
            className="px-5 h-10 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-semibold transition disabled:opacity-50"
          >
            {loading
              ? `Grading ${urlCount}…`
              : `Generate outreach for ${urlCount}`}
          </button>
        </div>
        <p className="text-[11px] text-zinc-500">
          Cache hits (URLs we&apos;ve graded for any user in the last
          7 days) return instantly and still count as 1 credit. Fresh
          grades take ~30-60 seconds each; we run 4 in parallel.
        </p>
      </form>

      {error && (
        <div className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {batch && batch.results && batch.results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-zinc-300">
              {batch.processed} graded · {batch.cacheHits} cache hit
              {batch.cacheHits === 1 ? "" : "s"}
              {batch.credits && (
                <span className="text-zinc-500 ml-2">
                  · {batch.credits.cost} credits used ·{" "}
                  {batch.credits.remaining} of {batch.credits.monthly}{" "}
                  left this month
                </span>
              )}
            </div>
            <button
              onClick={downloadCsv}
              className="text-xs px-3 h-8 rounded border border-zinc-800 hover:border-zinc-600 text-zinc-200"
            >
              Download CSV
            </button>
          </div>

          <ul className="space-y-3">
            {batch.results.map((r, i) => (
              <li
                key={i}
                className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-100 font-semibold truncate">
                      {r.brand ?? r.url}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      {r.url}
                      {r.category ? ` · ${r.category}` : ""}
                    </div>
                  </div>
                  {r.error ? (
                    <div className="text-xs text-red-300 shrink-0">
                      {r.error}
                    </div>
                  ) : (
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-semibold text-zinc-100">
                        {r.score}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                        {r.cacheHit ? "cached" : "fresh"}
                      </div>
                    </div>
                  )}
                </div>

                {r.emailSubject && r.emailBody && (
                  <CopyBlock
                    label={`Email · subject: ${r.emailSubject}`}
                    value={`Subject: ${r.emailSubject}\n\n${r.emailBody}`}
                    copyKey={`email-${i}`}
                    copiedKey={copiedKey}
                    onCopy={copy}
                  />
                )}

                {r.linkedinDm && (
                  <CopyBlock
                    label="LinkedIn DM"
                    value={r.linkedinDm}
                    copyKey={`linkedin-${i}`}
                    copiedKey={copiedKey}
                    onCopy={copy}
                  />
                )}

                {r.visibilityUrl && (
                  <div className="flex items-center gap-3 text-xs">
                    <a
                      href={r.visibilityUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-300 hover:text-white underline"
                    >
                      {r.visibilityUrl}
                    </a>
                    <button
                      onClick={() => copy(r.visibilityUrl!, `link-${i}`)}
                      className="text-[11px] text-zinc-500 hover:text-zinc-300"
                    >
                      {copiedKey === `link-${i}` ? "copied" : "copy link"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CopyBlock({
  label,
  value,
  copyKey,
  copiedKey,
  onCopy,
}: {
  label: string;
  value: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 truncate">
          {label}
        </div>
        <button
          onClick={() => onCopy(value, copyKey)}
          className="text-[11px] px-2 py-0.5 rounded border border-zinc-800 hover:border-zinc-600 text-zinc-300"
        >
          {copiedKey === copyKey ? "copied" : "copy"}
        </button>
      </div>
      <pre className="bg-zinc-950 border border-zinc-900 rounded p-3 text-[12px] text-zinc-200 whitespace-pre-wrap leading-relaxed">
        {value}
      </pre>
    </div>
  );
}
