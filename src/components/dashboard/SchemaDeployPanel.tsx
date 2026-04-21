"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Code2, Copy, Check, Rocket, Loader2, ExternalLink } from "lucide-react";

interface Props {
  defaultPageUrl?: string;
  schemaJson?: Record<string, unknown> | null;
  schemaType?: string;
  companyId?: string;
  onDeployed?: (publicUrl: string) => void;
}

export function SchemaDeployPanel({ defaultPageUrl, schemaJson, schemaType, companyId, onDeployed }: Props) {
  const [pageUrl, setPageUrl] = useState(defaultPageUrl || "");
  const [deploying, setDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployWarning, setDeployWarning] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!pageUrl.trim() || !schemaJson || !schemaType) return;
    setDeploying(true);
    setDeployError(null);
    setDeployWarning(null);
    try {
      const res = await fetch("/api/schema-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageUrl: pageUrl.trim(),
          schemaType,
          schemaJson,
          companyId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setDeployError(data.error || `Deploy failed (HTTP ${res.status})`);
        return;
      }
      if (data.warning) setDeployWarning(data.warning);
      if (data.publicUrl) {
        setDeployedUrl(data.publicUrl);
        if (onDeployed) onDeployed(data.publicUrl);
      } else {
        setDeployError("Deploy succeeded but no public URL was returned. Supabase may not be configured — your schema is saved locally only and won't serve to your live site. See SETUP.md.");
      }
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : "Could not reach Cabbge server. Check your internet connection.");
    } finally {
      setDeploying(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const oneLineSnippet = `<script async src="https://cabbge.com/api/schema-loader"></script>`;
  const directSnippet = schemaJson
    ? `<script type="application/ld+json">\n${JSON.stringify(schemaJson, null, 2)}\n</script>`
    : "";

  if (!schemaJson || !schemaType) {
    return (
      <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
        <CardContent className="p-6 text-center">
          <Code2 size={24} className="text-zinc-500 mx-auto mb-2" />
          <h3 className="text-[13px] font-semibold mb-1">Deploy schema to your live site</h3>
          <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
            Generate a schema first (Schema tab or Content tab), then come back here to deploy it in one click.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <Rocket size={15} className="text-[#7CB342]" />
          <CardTitle className="text-[14px] font-semibold">Deploy Schema</CardTitle>
          <Badge className="text-[10px] bg-zinc-800 text-zinc-300 border-0 rounded-md h-5 px-1.5 ml-auto">
            {schemaType}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: enter target page URL */}
        <div>
          <label className="text-[11px] text-zinc-500 uppercase tracking-wide block mb-1.5">
            1. Target page on your website
          </label>
          <Input
            placeholder="https://yoursite.com/projects/camellias"
            value={pageUrl}
            onChange={(e) => setPageUrl(e.target.value)}
            className="bg-zinc-800/60 border-white/[0.06] text-[13px] h-9"
          />
          <p className="text-[10px] text-zinc-600 mt-1">This schema will be served when Googlebot loads this exact URL.</p>
        </div>

        {/* Step 2: deploy */}
        <div>
          <label className="text-[11px] text-zinc-500 uppercase tracking-wide block mb-1.5">
            2. Save to Cabbge
          </label>
          <button
            onClick={handleDeploy}
            disabled={deploying || !pageUrl.trim()}
            className="h-9 w-full rounded-lg bg-[#7CB342] text-zinc-950 text-[13px] font-semibold hover:bg-[#8BC34A] active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {deploying ? <Loader2 size={13} className="animate-spin" /> : <Rocket size={13} />}
            {deployedUrl ? "Redeploy" : "Deploy Schema"}
          </button>
          {deployedUrl && !deployError && (
            <div className="mt-2 p-2 rounded-md bg-[#7CB342]/[0.06] border border-[#7CB342]/20 text-[11px] text-[#7CB342] flex items-center gap-2">
              <Check size={12} /> Deployed. Schema is live at your public endpoint.
            </div>
          )}
          {deployWarning && !deployError && (
            <div className="mt-2 p-2 rounded-md bg-amber-500/[0.06] border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              <span>{deployWarning}</span>
            </div>
          )}
          {deployError && (
            <div className="mt-2 p-2 rounded-md bg-red-500/[0.06] border border-red-500/20 text-[11px] text-red-300 flex items-start gap-2">
              <span className="mt-0.5">⚠</span>
              <span>{deployError}</span>
            </div>
          )}
        </div>

        {/* Step 3: install snippet */}
        {deployedUrl && (
          <div>
            <label className="text-[11px] text-zinc-500 uppercase tracking-wide block mb-1.5">
              3. Add this one line to your website&apos;s &lt;head&gt; (do this once, works for all future schemas)
            </label>
            <div className="relative">
              <pre className="bg-zinc-800/60 border border-white/[0.06] rounded-lg p-3 text-[11px] font-mono text-zinc-300 overflow-x-auto">
                {oneLineSnippet}
              </pre>
              <button
                onClick={() => copy(oneLineSnippet, "oneliner")}
                className="absolute top-2 right-2 h-6 px-2 rounded bg-zinc-800 border border-white/[0.06] text-[10px] text-zinc-300 hover:bg-zinc-700 flex items-center gap-1"
              >
                {copied === "oneliner" ? <Check size={10} /> : <Copy size={10} />}
                {copied === "oneliner" ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
              Alternative: paste via Google Tag Manager (Custom HTML tag, fires on All Pages).
              Once the loader is installed, every schema you deploy in Cabbge automatically appears on the matching page — no code changes needed per schema.
            </p>
          </div>
        )}

        {/* Fallback: direct inline snippet */}
        <details className="group">
          <summary className="text-[11px] text-zinc-500 cursor-pointer hover:text-zinc-300 select-none">
            Or: copy raw JSON-LD to paste manually into this one page
          </summary>
          <div className="relative mt-2">
            <pre className="bg-zinc-800/60 border border-white/[0.06] rounded-lg p-3 text-[10px] font-mono text-zinc-300 overflow-x-auto max-h-[240px]">
              {directSnippet}
            </pre>
            <button
              onClick={() => copy(directSnippet, "direct")}
              className="absolute top-2 right-2 h-6 px-2 rounded bg-zinc-800 border border-white/[0.06] text-[10px] text-zinc-300 hover:bg-zinc-700 flex items-center gap-1"
            >
              {copied === "direct" ? <Check size={10} /> : <Copy size={10} />}
              {copied === "direct" ? "Copied" : "Copy"}
            </button>
          </div>
        </details>

        {/* Verify link */}
        {deployedUrl && (
          <a
            href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(pageUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            Verify in Google Rich Results Test <ExternalLink size={10} />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
