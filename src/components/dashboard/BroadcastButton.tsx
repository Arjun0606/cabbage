"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Loader2, Check, AlertTriangle, Copy } from "lucide-react";

interface Props {
  bodyText: string;
  label?: string;
}

/**
 * BroadcastButton — one-click WhatsApp broker broadcast via AiSensy /
 * Interakt. Opens a modal asking for recipient numbers (newline or
 * comma-separated), sends via /api/broadcast.
 *
 * When no provider is configured, the modal prompts the user to connect
 * one from Settings → Integrations.
 */
export function BroadcastButton({ bodyText, label }: Props) {
  const [open, setOpen] = useState(false);
  const [rawRecipients, setRawRecipients] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState<null | Array<{ provider: string }>>(null);
  const [result, setResult] = useState<null | { sent: number; failed: number; provider: string }>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch("/api/integrations/whatsapp");
        const data = await res.json();
        setConnected(Array.isArray(data.connected) ? data.connected : []);
      } catch {
        setConnected([]);
      }
    })();
  }, [open]);

  const handleSend = async () => {
    const recipients = rawRecipients
      .split(/[\s,;]+/)
      .map((r) => r.trim())
      .filter(Boolean);
    if (recipients.length === 0) {
      setError("Add at least one recipient number");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients, bodyText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Broadcast failed");
        return;
      }
      setResult({ sent: data.sent, failed: data.failed, provider: data.provider });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Broadcast failed");
    } finally {
      setSending(false);
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(bodyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <>
      <button
        onClick={() => { setOpen(true); setResult(null); setError(null); }}
        className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#7CB342]/10 text-[#7CB342] border border-[#7CB342]/30 hover:bg-[#7CB342]/20 active:scale-[0.97] transition-all"
        title="Broadcast via AiSensy / Interakt"
      >
        <MessageCircle size={11} />
        {label || "Broadcast"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-zinc-900 border border-white/[0.08] rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
              <MessageCircle size={15} className="text-[#7CB342]" />
              <h3 className="text-[14px] font-semibold text-zinc-100">WhatsApp broker broadcast</h3>
              <span className="ml-auto text-[11px] text-zinc-500">
                {connected === null ? "checking..." : connected.length === 0 ? "Not connected" : `via ${connected[0].provider}`}
              </span>
            </div>

            {connected !== null && connected.length === 0 ? (
              <div className="p-5 space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-[12px] text-zinc-300">
                    Connect AiSensy or Interakt under <strong>Settings → Integrations</strong> first.
                    Both require a pre-approved WhatsApp Business template with one body variable —
                    Cabbge passes the generated copy in as that variable.
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Until then, copy the text below and paste into your usual broadcast tool.
                </p>
                <div className="relative">
                  <pre className="bg-zinc-800/60 border border-white/[0.06] rounded-lg p-3 text-[12px] text-zinc-300 whitespace-pre-wrap">{bodyText}</pre>
                  <button
                    onClick={copyText}
                    className="absolute top-2 right-2 text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 bg-zinc-900/80 px-2 py-1 rounded-md"
                  >
                    {copied ? <Check size={10} className="text-[#7CB342]" /> : <Copy size={10} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => setOpen(false)}
                    className="px-4 py-1.5 rounded-md bg-zinc-100 text-zinc-900 text-[12px] font-semibold hover:bg-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : result ? (
              <div className="p-5 space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[#7CB342]/10 border border-[#7CB342]/20">
                  <Check size={14} className="text-[#7CB342] flex-shrink-0 mt-0.5" />
                  <div className="text-[12px] text-zinc-300">
                    Sent <strong>{result.sent}</strong> message{result.sent === 1 ? "" : "s"} via {result.provider}.
                    {result.failed > 0 && <> {result.failed} failed — check number format + template approval.</>}
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setOpen(false)}
                    className="px-4 py-1.5 rounded-md bg-zinc-100 text-zinc-900 text-[12px] font-semibold hover:bg-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">Recipient numbers</label>
                  <textarea
                    value={rawRecipients}
                    onChange={(e) => setRawRecipients(e.target.value)}
                    placeholder="+91 98765 43210&#10;+91 91234 56789&#10;..."
                    rows={6}
                    className="w-full mt-1 bg-zinc-800/60 border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-[#7CB342]/40 font-mono"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    One number per line (or comma-separated). 10 digits defaults to +91. Max 500 per send.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">Message body</label>
                  <pre className="mt-1 bg-zinc-800/60 border border-white/[0.06] rounded-lg p-3 text-[12px] text-zinc-300 whitespace-pre-wrap max-h-[160px] overflow-y-auto">{bodyText}</pre>
                </div>

                {error && (
                  <div className="text-[12px] text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => setOpen(false)}
                    className="px-3 py-1.5 rounded-md text-[12px] text-zinc-400 hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending || !rawRecipients.trim()}
                    className="px-4 py-1.5 rounded-md bg-[#7CB342] text-zinc-950 text-[12px] font-semibold hover:bg-[#8BC34A] disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {sending ? <Loader2 size={12} className="animate-spin" /> : <MessageCircle size={12} />}
                    {sending ? "Sending..." : "Send"}
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
