"use client";

/**
 * Outreach pack generator — founder-only tool.
 *
 * Paste a prospect's URL + recipient name. Get a complete personalised
 * outreach kit in 30s — email body, WhatsApp message, LinkedIn DM, all
 * with REAL findings from a live scan of their site baked in.
 *
 * Why this exists: a generic cold email converts at 2-4%. An email
 * that quotes the prospect's actual hallucinations + their specific
 * blind-spot queries converts at 12-18% in B2B India. That's a 4-6×
 * lift on the same outreach time.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Check, Sparkles, AlertOctagon, Target, Building, ExternalLink } from "lucide-react";
import Link from "next/link";

interface OutreachPack {
  brand: string;
  city: string;
  websiteUrl: string;
  scannedAt: string;
  snapshot: {
    projectsFound: number;
    sampleProjects: string[];
    reraNumbersFound: number;
  };
  mentionRate: { mentioned: number; total: number; pct: number };
  hallucinations: Array<{
    type: string;
    severity: string;
    aiClaim: string;
    project: string;
    truth: string;
    fix: string;
  }>;
  blindSpots: Array<{ query: string; competitor: string }>;
  copy: {
    emailSubject: string;
    emailBody: string;
    whatsapp: string;
    linkedin: string;
  };
  previewUrl: string;
}

function CopyBox({ label, value, rows = 6 }: { label: string; value: string; rows?: number }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="rounded-lg border border-white/[0.06] bg-zinc-900/40 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04] bg-zinc-900/80">
        <span className="text-[11px] uppercase tracking-wide text-zinc-400 font-semibold">{label}</span>
        <button
          onClick={handleCopy}
          className={`text-[11px] px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
            copied ? "bg-[#7CB342]/15 text-[#7CB342]" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          }`}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <textarea
        readOnly
        value={value}
        rows={rows}
        className="w-full bg-zinc-900/40 px-3 py-2 text-[12px] text-zinc-200 font-mono leading-relaxed resize-y outline-none"
      />
    </div>
  );
}

export default function OutreachPage() {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientTitle, setRecipientTitle] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pack, setPack] = useState<OutreachPack | null>(null);

  const generate = async () => {
    if (!websiteUrl.trim()) return;
    setLoading(true);
    setError(null);
    setPack(null);
    try {
      const res = await fetch("/api/outreach-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: websiteUrl.trim(),
          recipientName: recipientName.trim() || undefined,
          recipientTitle: recipientTitle.trim() || undefined,
          city: city.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPack(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#7CB342] flex items-center justify-center">
              <Sparkles size={14} className="text-zinc-900" />
            </div>
            <span className="text-[15px] font-semibold">Cabbge</span>
            <Badge className="text-[9px] uppercase tracking-wide bg-amber-500/15 text-amber-400 border-0 ml-1">Founder tool</Badge>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Outreach pack generator</h1>
          <p className="text-zinc-400 text-[13px] leading-relaxed max-w-2xl">
            Paste a prospect&apos;s URL. We run a live AI visibility scan, pull their factual errors and blind-spot queries, and write an email + WhatsApp + LinkedIn DM with the findings baked in. Paste-and-send — 30 seconds per prospect.
          </p>
        </div>

        <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl mb-6">
          <CardContent className="p-5 space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-wide text-zinc-500 font-semibold mb-1.5 block">
                Prospect website URL <span className="text-red-400">*</span>
              </label>
              <Input
                type="url"
                placeholder="https://www.aparnaconstructions.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generate()}
                className="bg-zinc-800/60 border-white/[0.06] text-[13px] h-10"
              />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wide text-zinc-500 font-semibold mb-1.5 block">
                  Recipient name
                </label>
                <Input
                  placeholder="Priya Reddy"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="bg-zinc-800/60 border-white/[0.06] text-[13px] h-10"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-zinc-500 font-semibold mb-1.5 block">
                  Recipient title
                </label>
                <Input
                  placeholder="CMO / Head of Digital"
                  value={recipientTitle}
                  onChange={(e) => setRecipientTitle(e.target.value)}
                  className="bg-zinc-800/60 border-white/[0.06] text-[13px] h-10"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-zinc-500 font-semibold mb-1.5 block">
                  City (optional override)
                </label>
                <Input
                  placeholder="Hyderabad"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-zinc-800/60 border-white/[0.06] text-[13px] h-10"
                />
              </div>
            </div>
            <Button
              onClick={generate}
              disabled={loading || !websiteUrl.trim()}
              className="w-full bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 h-11 text-[13px] font-semibold mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Scanning + generating (30-60s)...
                </>
              ) : (
                <>
                  <Sparkles size={14} className="mr-2" />
                  Generate outreach pack
                </>
              )}
            </Button>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/[0.08] border border-red-500/30 text-[12px] text-red-300">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {pack && (
          <div className="space-y-5">
            {/* Snapshot strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-zinc-900/60 border border-white/[0.06] p-3.5">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">Brand</div>
                <div className="text-[14px] font-bold text-zinc-100 truncate" title={pack.brand}>{pack.brand}</div>
                <div className="text-[10px] text-zinc-600 truncate">{pack.city || "city unknown"}</div>
              </div>
              <div className="rounded-lg bg-zinc-900/60 border border-white/[0.06] p-3.5">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">Projects scraped</div>
                <div className="text-[18px] font-bold text-zinc-100 tabular-nums">{pack.snapshot.projectsFound}</div>
                <div className="text-[10px] text-zinc-600">{pack.snapshot.reraNumbersFound} with RERA</div>
              </div>
              <div className="rounded-lg bg-zinc-900/60 border border-white/[0.06] p-3.5">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">AI mention rate</div>
                <div className={`text-[18px] font-bold tabular-nums ${pack.mentionRate.pct >= 50 ? "text-[#7CB342]" : pack.mentionRate.pct >= 20 ? "text-amber-400" : "text-red-400"}`}>
                  {pack.mentionRate.pct}%
                </div>
                <div className="text-[10px] text-zinc-600">{pack.mentionRate.mentioned}/{pack.mentionRate.total} buyer queries</div>
              </div>
              <div className="rounded-lg bg-zinc-900/60 border border-white/[0.06] p-3.5">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">Findings</div>
                <div className="text-[18px] font-bold text-zinc-100 tabular-nums">{pack.hallucinations.length + pack.blindSpots.length}</div>
                <div className="text-[10px] text-zinc-600">{pack.hallucinations.length} errors · {pack.blindSpots.length} blind spots</div>
              </div>
            </div>

            {/* Findings preview — what's powering the email */}
            {(pack.hallucinations.length > 0 || pack.blindSpots.length > 0) && (
              <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
                <CardContent className="p-5 space-y-4">
                  {pack.hallucinations.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertOctagon size={13} className="text-red-400" />
                        <span className="text-[12px] font-semibold text-zinc-200 uppercase tracking-wide">AI is making these factual errors</span>
                      </div>
                      <div className="space-y-2">
                        {pack.hallucinations.map((h, i) => (
                          <div key={i} className="text-[12px] text-zinc-300 leading-relaxed border-l-2 border-red-500/30 pl-3">
                            <span className="text-red-400 font-semibold">{h.type}</span>
                            {h.project && <span className="text-zinc-500"> · {h.project}</span>}
                            <div className="mt-0.5 text-zinc-400">&ldquo;{h.aiClaim}&rdquo;</div>
                            {h.truth && <div className="mt-0.5 text-[#7CB342] text-[11px]">Truth: {h.truth}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {pack.blindSpots.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Target size={13} className="text-amber-400" />
                        <span className="text-[12px] font-semibold text-zinc-200 uppercase tracking-wide">Blind-spot queries (competitor wins)</span>
                      </div>
                      <div className="space-y-1">
                        {pack.blindSpots.map((b, i) => (
                          <div key={i} className="text-[12px] flex items-start gap-2">
                            <span className="text-zinc-500 w-4 tabular-nums">{i + 1}.</span>
                            <div className="flex-1">
                              <div className="text-zinc-300">&ldquo;{b.query}&rdquo;</div>
                              <div className="text-[11px] text-zinc-500">→ AI sends buyer to <span className="text-red-400 font-semibold">{b.competitor}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {pack.snapshot.sampleProjects.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Building size={13} className="text-zinc-400" />
                        <span className="text-[12px] font-semibold text-zinc-200 uppercase tracking-wide">Projects we scraped from their site</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {pack.snapshot.sampleProjects.map((p, i) => (
                          <Badge key={i} className="text-[10px] bg-zinc-800 text-zinc-400 border-0 rounded-md">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Preview URL */}
            <div className="rounded-lg bg-[#7CB342]/[0.04] border border-[#7CB342]/20 p-4 flex items-center gap-3">
              <ExternalLink size={14} className="text-[#7CB342] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold">Public preview link (paste in email/WhatsApp)</div>
                <a
                  href={pack.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-[#7CB342] hover:underline font-mono truncate block"
                >
                  {pack.previewUrl}
                </a>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(pack.previewUrl)}
                className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center gap-1.5 flex-shrink-0"
              >
                <Copy size={11} /> Copy
              </button>
            </div>

            {/* Copy boxes */}
            <CopyBox label="Email subject" value={pack.copy.emailSubject} rows={1} />
            <CopyBox label="Email body" value={pack.copy.emailBody} rows={14} />
            <CopyBox label="WhatsApp message" value={pack.copy.whatsapp} rows={9} />
            <CopyBox label="LinkedIn DM" value={pack.copy.linkedin} rows={9} />
          </div>
        )}
      </div>
    </div>
  );
}
