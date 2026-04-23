"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/db/supabase-browser";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Lock, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0b]" />}>
      <SignInInner />
    </Suspense>
  );
}

function SignInInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("next") || "/dashboard";
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentMagic, setSentMagic] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim()) return;
    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: `${window.location.origin}${redirectTo}` },
        });
        if (error) throw error;
        setSentMagic(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
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
          <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
          <p className="text-[13px] text-zinc-500">Sign in to continue improving your AI visibility</p>
        </div>

        <div className="bg-zinc-900/60 border border-white/[0.06] rounded-xl p-6 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-1 p-0.5 bg-zinc-800/60 rounded-lg">
            <button
              onClick={() => { setMode("password"); setSentMagic(false); setError(null); }}
              className={`flex-1 text-[12px] py-1.5 rounded-md transition-colors ${mode === "password" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Password
            </button>
            <button
              onClick={() => { setMode("magic"); setSentMagic(false); setError(null); }}
              className={`flex-1 text-[12px] py-1.5 rounded-md transition-colors ${mode === "magic" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Magic Link
            </button>
          </div>

          {sentMagic ? (
            <div className="text-center py-6">
              <Mail size={28} className="text-[#7CB342] mx-auto mb-3" />
              <h3 className="text-[15px] font-semibold mb-1">Check your inbox</h3>
              <p className="text-[12px] text-zinc-500">We sent a magic link to <span className="text-zinc-300">{email}</span>. Click it to sign in.</p>
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

              {mode === "password" && (
                <div>
                  <label className="text-[11px] text-zinc-500 uppercase tracking-wide block mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      className="bg-zinc-800/60 border-white/[0.06] text-[14px] h-10 pl-9"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-2.5 rounded-lg bg-red-500/[0.06] border border-red-500/20 text-[12px] text-red-400 flex items-center gap-2">
                  <AlertCircle size={12} /> {error}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={loading || !email.trim() || (mode === "password" && !password)}
                className="w-full bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 h-10 font-semibold"
              >
                {loading ? <><Loader2 size={14} className="animate-spin mr-2" /> Signing in...</> : mode === "magic" ? "Send Magic Link" : "Sign In"}
              </Button>
            </>
          )}
        </div>

        <p className="text-center mt-6 text-[13px] text-zinc-500">
          New to Cabbge?{" "}
          <Link href="/signup" className="text-[#7CB342] hover:text-[#8BC34A] font-medium">
            Create your workspace
          </Link>
        </p>
      </div>
    </div>
  );
}
