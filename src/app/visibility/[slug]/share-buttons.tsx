"use client";

import { useState } from "react";

export function ShareButtons({
  brand,
  slug,
  score,
}: {
  brand: string;
  slug: string;
  score: number;
}) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/visibility/${slug}`
      : `https://cabbge.com/visibility/${slug}`;
  const text = `${brand} scored ${score}/100 on AI visibility. See yours →`;

  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={twitterHref}
        target="_blank"
        rel="noreferrer"
        className="px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-200"
      >
        Share on X
      </a>
      <a
        href={linkedinHref}
        target="_blank"
        rel="noreferrer"
        className="px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-200"
      >
        Share on LinkedIn
      </a>
      <button
        onClick={copyLink}
        className="px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-200"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
