"use client";

import { useState } from "react";
import { Check, Loader2, Upload, ExternalLink, Code2, Copy } from "lucide-react";

interface Props {
  html: string;
  title?: string;
  metaDescription?: string;
  defaultSlot?: string;
  defaultSiteUrl?: string;
  contentType?: "article" | "gbp_post" | "locality_page" | "html_block";
}

/**
 * DeployViaLoader — publishes generated content through the Cabbge
 * loader script. One <script> + one <div> and the content renders on
 * any site (Drupal, custom React, bespoke stacks) — not just WordPress.
 *
 * Workflow:
 *  1. User clicks "Deploy via Cabbge"
 *  2. Modal asks for the destination URL + slot
 *  3. POST /api/content-deploy stores the HTML keyed by (site, slot)
 *  4. UI shows the two snippets to paste: one-time loader, per-slot div
 */
export function DeployViaLoader({
  html,
  title,
  metaDescription,
  defaultSlot,
  defaultSiteUrl,
  contentType = "article",
}: Props) {
  const [open, setOpen] = useState(false);
  const [siteUrl, setSiteUrl] = useState(defaultSiteUrl || "");
  const [slot, setSlot] = useState(defaultSlot || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    loaderScript: string;
    slotTag: string;
    publicUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const suggestedSlot =
    defaultSlot ||
    (title
      ? `${contentType === "article" ? "blog" : contentType}/${title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 80)}`
      : "");

  const handleDeploy = async () => {
    if (!siteUrl.trim() || !slot.trim()) {
      setError("Site URL and slot are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/content-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: siteUrl.trim(),
          slot: slot.trim(),
          html,
          contentType,
          meta: { title, metaDescription },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Deploy failed");
        return;
      }
      setResult({
        loaderScript: data.loaderScript,
        slotTag: data.slotTag,
        publicUrl: data.publicUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch { /* ignore */ }
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          if (!slot && suggestedSlot) setSlot(suggestedSlot);
        }}
        className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#7CB342]/10 text-[#7CB342] border border-[#7CB342]/30 hover:bg-[#7CB342]/20 active:scale-[0.97] transition-all"
        title="Publish via Cabbge loader — works on any CMS"
      >
        <Code2 size={11} />
        Deploy via Cabbge
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-zinc-900 border border-white/[0.08] rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
              <Code2 size={15} className="text-[#7CB342]" />
              <h3 className="text-[14px] font-semibold text-zinc-100">Deploy via Cabbge</h3>
              <span className="ml-auto text-[11px] text-zinc-500">Works on any CMS</span>
            </div>

            {!result ? (
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">Destination site</label>
                  <input
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="w-full mt-1 bg-zinc-800/60 border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-[#7CB342]/40"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Must be one of your verified sites. Add extra sites on the Company panel if needed.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">Slot</label>
                  <input
                    value={slot}
                    onChange={(e) => setSlot(e.target.value)}
                    placeholder={suggestedSlot || "blog/my-article-slug"}
                    className="w-full mt-1 bg-zinc-800/60 border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-[#7CB342]/40"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Unique identifier inside your site. You&apos;ll paste{" "}
                    <code className="bg-zinc-800 px-1 rounded text-zinc-300">
                      &lt;div data-cabbge-slot=&quot;{slot || "..."}&quot;&gt;
                    </code>{" "}
                    where the content should render.
                  </p>
                </div>

                {error && (
                  <div className="text-[12px] text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="px-3 py-1.5 rounded-md text-[12px] text-zinc-400 hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeploy}
                    disabled={loading || !siteUrl.trim() || !slot.trim()}
                    className="px-4 py-1.5 rounded-md bg-[#7CB342] text-zinc-950 text-[12px] font-semibold hover:bg-[#8BC34A] disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {loading ? "Deploying..." : "Deploy"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[#7CB342]/10 border border-[#7CB342]/20">
                  <Check size={14} className="text-[#7CB342] flex-shrink-0 mt-0.5" />
                  <div className="text-[12px] text-zinc-300">
                    Deployed. Paste the two snippets below into your site — once the loader is in place,
                    refresh the page and your content will appear.
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
                      1. Add once to your site <code className="bg-zinc-800 px-1 rounded text-zinc-300">&lt;head&gt;</code>
                    </span>
                    <button
                      onClick={() => copy(result.loaderScript, "loader")}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                    >
                      {copied === "loader" ? <Check size={10} className="text-[#7CB342]" /> : <Copy size={10} />}
                      {copied === "loader" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="bg-zinc-950 border border-white/[0.06] rounded-lg p-3 text-[12px] text-zinc-300 overflow-x-auto">
                    {result.loaderScript}
                  </pre>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
                      2. Put this where the content should render
                    </span>
                    <button
                      onClick={() => copy(result.slotTag, "slot")}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                    >
                      {copied === "slot" ? <Check size={10} className="text-[#7CB342]" /> : <Copy size={10} />}
                      {copied === "slot" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="bg-zinc-950 border border-white/[0.06] rounded-lg p-3 text-[12px] text-zinc-300 overflow-x-auto">
                    {result.slotTag}
                  </pre>
                </div>

                <div className="text-[11px] text-zinc-500 space-y-1">
                  <p>
                    Can&apos;t paste directly? Open the raw content here:{" "}
                    <a
                      href={result.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#7CB342] hover:underline inline-flex items-center gap-0.5"
                    >
                      public feed <ExternalLink size={9} />
                    </a>
                  </p>
                  <p>
                    Want to replace this later? Generate a new version and deploy to the same slot —
                    the existing content is overwritten cleanly.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setOpen(false);
                      setResult(null);
                    }}
                    className="px-4 py-1.5 rounded-md bg-zinc-100 text-zinc-900 text-[12px] font-semibold hover:bg-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
