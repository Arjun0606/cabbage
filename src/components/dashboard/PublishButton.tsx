"use client";

import { useState } from "react";
import { Upload, Check, Loader2, ExternalLink, Globe } from "lucide-react";

interface Props {
  title: string;
  content: string;       // HTML or markdown content to publish
  excerpt?: string;
  targetKeyword?: string;
  onPublished?: (url: string) => void;
}

/**
 * PublishButton — one-click publish to WordPress/Webflow
 *
 * Shows a "Publish" button that sends content to the connected CMS.
 * Falls back to "Connect WordPress" if no CMS is connected.
 * Shows the live URL after successful publish.
 */
export function PublishButton({ title, content, excerpt, targetKeyword, onPublished }: Props) {
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getCredentials = () => {
    try {
      const raw = localStorage.getItem("cabbge_cms_credentials");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  };

  const handlePublish = async () => {
    const creds = getCredentials();
    if (!creds) {
      // Show connection prompt
      setError("Connect your WordPress or Webflow first in Settings");
      return;
    }

    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: creds.type || "self_hosted",
          credentials: creds,
          post: {
            title,
            content,
            excerpt: excerpt || "",
            status: "draft",  // Always draft first — user reviews before going live
            tags: targetKeyword ? [targetKeyword] : [],
            meta: targetKeyword ? {
              _yoast_wpseo_focuskw: targetKeyword,
              _yoast_wpseo_title: title,
              _yoast_wpseo_metadesc: excerpt || "",
            } : undefined,
          },
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setPublished(true);
      setPublishUrl(data.postUrl || null);
      if (data.postUrl && onPublished) onPublished(data.postUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publishing failed");
    } finally {
      setPublishing(false);
    }
  };

  if (published && publishUrl) {
    return (
      <a
        href={publishUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#7CB342]/10 text-[#7CB342] border border-[#7CB342]/20 hover:bg-[#7CB342]/20 transition-all"
      >
        <Check size={11} />Published as draft
        <ExternalLink size={10} />
      </a>
    );
  }

  if (published) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7CB342]">
        <Check size={11} />Published as draft
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        onClick={handlePublish}
        disabled={publishing}
        className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/50 hover:bg-zinc-700 hover:text-zinc-100 active:scale-[0.97] transition-all disabled:opacity-40"
        title="Publish as draft to your website"
      >
        {publishing ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
        {publishing ? "Publishing..." : "Publish Draft"}
      </button>
      {error && (
        <span className="text-[10px] text-red-400">{error}</span>
      )}
    </div>
  );
}

/**
 * ConnectCMSPrompt — shown when no CMS is connected
 */
export function ConnectCMSPrompt() {
  return (
    <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.04]">
      <div className="flex items-center gap-2 mb-2">
        <Globe size={14} className="text-amber-400" />
        <h4 className="text-[13px] font-semibold text-amber-400">Connect Your Website</h4>
      </div>
      <p className="text-[12px] text-zinc-400 mb-2">
        Content you generate here only helps your SEO when it's published on your website. Connect WordPress or Webflow to publish with one click.
      </p>
      <p className="text-[11px] text-zinc-500">
        Go to Settings → Connect WordPress (self-hosted or WordPress.com) or Webflow.
      </p>
    </div>
  );
}
