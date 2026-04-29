"use client";

import { useState } from "react";

export function EmailCapture({
  brandSlug,
  brand,
}: {
  brandSlug: string;
  brand: string;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, brandSlug, source: "grade-page" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Subscribe failed");
        return;
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-emerald-900 bg-emerald-950/20 p-5 text-center space-y-1">
        <div className="text-sm font-semibold text-emerald-300">
          Subscribed
        </div>
        <p className="text-xs text-zinc-400">
          We&apos;ll email you when {brand}&apos;s AI visibility score
          changes.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-5 space-y-3">
      <div>
        <div className="text-sm font-semibold text-zinc-100">
          Track this score
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          We re-scan weekly. Drop your email and we&apos;ll tell you when{" "}
          {brand}&apos;s AI visibility moves up or down — no spam.
        </p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          disabled={submitting}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 h-10 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={submitting || !email}
          className="px-4 h-10 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-semibold transition disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Track for free"}
        </button>
      </form>
      {error && <div className="text-xs text-red-300">{error}</div>}
    </div>
  );
}
