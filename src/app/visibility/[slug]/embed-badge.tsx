"use client";

import { useState } from "react";

export function EmbedBadge({
  slug,
  brand,
}: {
  slug: string;
  brand: string;
}) {
  const [copied, setCopied] = useState(false);
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://cabbge.com";
  const badgeUrl = `${origin}/badge/${slug}.svg`;
  const linkUrl = `${origin}/visibility/${slug}`;

  const html = `<a href="${linkUrl}" target="_blank" rel="noreferrer">
  <img src="${badgeUrl}" alt="AI visibility for ${brand} by cabbge" height="40" />
</a>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-5 space-y-3">
      <div className="text-sm font-semibold text-zinc-100">
        Add a live badge to your site
      </div>
      <p className="text-xs text-zinc-500">
        Auto-updates every time we re-scan. Drives traffic to your grade
        page and signals AI-savvy to your visitors.
      </p>

      <div className="flex justify-center py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={badgeUrl}
          alt={`AI visibility badge for ${brand}`}
          height={40}
          className="h-10"
        />
      </div>

      <pre className="bg-zinc-950 border border-zinc-900 rounded-lg p-3 text-[11px] text-zinc-300 overflow-x-auto whitespace-pre">
{html}
      </pre>

      <button
        onClick={copy}
        className="text-xs px-3 py-1.5 rounded border border-zinc-800 hover:border-zinc-600 text-zinc-200"
      >
        {copied ? "Copied" : "Copy embed code"}
      </button>
    </div>
  );
}
