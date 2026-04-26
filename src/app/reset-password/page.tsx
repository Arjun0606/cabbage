"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/db/supabase-browser";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

/**
 * Reset Password page.
 *
 * Reached via the recovery email → /auth/callback → here. By the time
 * this component renders, the callback has already exchanged the
 * recovery code for a session, so the user is authenticated and we can
 * call updateUser({ password }) directly.
 *
 * If the user lands here without a session (link expired, already used,
 * navigated directly), we bounce them back to /forgot-password.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getBrowserSupabase();
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(!!data.session);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
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
          <h1 className="text-2xl font-bold mb-1">Choose a new password</h1>
          <p className="text-[13px] text-zinc-500">Pick something you&apos;ll remember</p>
        </div>

        <div className="bg-zinc-900/60 border border-white/[0.06] rounded-xl p-6 space-y-4">
          {hasSession === false ? (
            <div className="text-center py-6">
              <AlertCircle size={28} className="text-amber-400 mx-auto mb-3" />
              <h3 className="text-[15px] font-semibold mb-1">Reset link expired</h3>
              <p className="text-[12px] text-zinc-500 mb-4">
                Recovery links can only be used once and expire after an hour.
              </p>
              <Link
                href="/forgot-password"
                className="inline-block text-[13px] text-[#7CB342] hover:text-[#8BC34A] font-medium"
              >
                Request a new link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center py-6">
              <CheckCircle2 size={28} className="text-[#7CB342] mx-auto mb-3" />
              <h3 className="text-[15px] font-semibold mb-1">Password updated</h3>
              <p className="text-[12px] text-zinc-500">Taking you to the dashboard...</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wide block mb-1.5">New password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <Input
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    className="bg-zinc-800/60 border-white/[0.06] text-[14px] h-10 pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-wide block mb-1.5">Confirm</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <Input
                    type="password"
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
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
                disabled={loading || hasSession !== true || !password || !confirm}
                className="w-full bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 h-10 font-semibold"
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin mr-2" /> Updating...</>
                ) : (
                  "Update password"
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
