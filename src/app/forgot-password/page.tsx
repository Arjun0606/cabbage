"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/db/supabase-browser";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Sparkles, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * Forgot Password page.
 *
 * Sends a Supabase recovery email. The link in the email lands on
 * /auth/callback?next=/reset-password — the existing callback already
 * exchanges the recovery code for a session, then forwards the now-
 * authenticated user to /reset-password to pick a new password.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim()) return;
    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#7CB342] flex items-center justify-center">
              <Sparkles size={18} className="text-zinc-900" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Cabbge</span>
          </Link>
          <h1 className="text-2xl font-bold mb-1">Reset your password</h1>
          <p className="text-[13px] text-zinc-500">We&apos;ll email you a link to set a new password</p>
        </div>

        <div className="bg-zinc-900/60 border border-white/[0.06] rounded-xl p-6 space-y-4">
          {sent ? (
            <div className="text-center py-6">
              <Mail size={28} className="text-[#7CB342] mx-auto mb-3" />
              <h3 className="text-[15px] font-semibold mb-1">Check your inbox</h3>
              <p className="text-[12px] text-zinc-500">
                If <span className="text-zinc-300">{email}</span> matches an account, a reset link is on its way.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wide block mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    autoFocus
                    className="bg-zinc-800/60 border-white/[0.06] text-[14px] h-10 pl-9"
                  />
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-red-500/[0.06] border border-red-500/20 text-[12px] text-red-400 flex items-center gap-2">
                  <AlertCircle size={12} /> {error}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={loading || !email.trim()}
                className="w-full bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 h-10 font-semibold"
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin mr-2" /> Sending link...</>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </>
          )}
        </div>

        <p className="text-center mt-6 text-[13px] text-zinc-500">
          <Link href="/signin" className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200">
            <ArrowLeft size={12} />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
