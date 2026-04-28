"use client";

import { useEffect, useState } from "react";
import { Network, Copy, Check, AlertCircle } from "lucide-react";

interface KGResponse {
  graph: Record<string, unknown>;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    nodeCount: number;
  };
}

/**
 * Knowledge Graph panel.
 *
 * Builds and renders a single connected JSON-LD @graph for the brand
 * (Organization → cities → projects → listings). Customer copies it
 * into a <script type="application/ld+json"> tag on their homepage
 * and AI engines can traverse the whole brand structure in one parse
 * — the GEO frontier most tools haven't attempted.
 *
 * Hidden when no projects exist (graph would be just an Organization
 * node, which doesn't justify the panel).
 */
export function KnowledgeGraphPanel({ companyId }: { companyId?: string | null }) {
  const [data, setData] = useState<KGResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/knowledge-graph?companyId=${encodeURIComponent(companyId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as KGResponse;
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
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
  if (!data || data.validation.nodeCount < 3) return null;

  const scriptTag = `<script type="application/ld+json">\n${JSON.stringify(data.graph, null, 2)}\n</script>`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(scriptTag);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied; user can still select-and-copy from the textarea.
    }
  };

  const cityCount = ((data.graph as any)["@graph"] as Array<{ "@type": string }>).filter((n) => n["@type"] === "City").length;
  const projectCount = ((data.graph as any)["@graph"] as Array<{ "@type": string }>).filter((n) => n["@type"] === "Residence").length;
  const listingCount = ((data.graph as any)["@graph"] as Array<{ "@type": string }>).filter((n) => n["@type"] === "RealEstateListing").length;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.04]">
        <Network size={13} className="text-[#7CB342]" />
        <span className="text-[13px] font-semibold text-zinc-200">Brand knowledge graph</span>
        <span className="text-[10px] text-zinc-500 ml-auto">
          {data.validation.nodeCount} nodes · {cityCount} cities · {projectCount} projects · {listingCount} listings
        </span>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-[12px] text-zinc-400 leading-relaxed">
          A connected JSON-LD graph linking your developer entity, the cities you operate
          in, every project, and any priced listings. AI overviews preferentially cite
          @id-linked graphs over disconnected per-page schema. Paste this into a single
          <code className="text-zinc-300 mx-1">&lt;script type=&quot;application/ld+json&quot;&gt;</code>
          tag on your homepage and AI engines can traverse the full brand structure in
          one parse.
        </p>
        {!data.validation.valid && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2">
            <AlertCircle size={12} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-300 leading-relaxed">
              {data.validation.errors.length} validation {data.validation.errors.length === 1 ? "error" : "errors"} — graph has been emitted with the offending fields stripped, but completeness will improve as you fill more project data.
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-md bg-[#7CB342] text-zinc-900 hover:bg-[#8BC34A] active:scale-[0.97] transition-all"
          >
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy script tag</>}
          </button>
          <span className="text-[11px] text-zinc-500">Paste into your homepage &lt;head&gt;</span>
        </div>
        <pre className="text-[10px] leading-relaxed text-zinc-300 bg-zinc-950/60 border border-white/[0.04] rounded-lg p-3 max-h-[260px] overflow-auto font-mono">
{scriptTag}
        </pre>
      </div>
    </div>
  );
}
