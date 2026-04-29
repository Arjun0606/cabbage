"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/db/supabase-browser";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Lock, User, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: fullName.trim() || undefined },
        },
      });
      if (error) throw error;
      // If email confirmation is disabled in Supabase settings, session exists already → dashboard
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
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
          <h1 className="text-2xl font-bold mb-1">Create your workspace</h1>
          <p className="text-[13px] text-zinc-500">Next we&apos;ll capture your projects, brand, and AI-search context — about 5 minutes.</p>
        </div>

        {success ? (
          <div className="bg-zinc-900/60 border border-white/[0.06] rounded-xl p-8 text-center">
            <CheckCircle2 size={32} className="text-[#7CB342] mx-auto mb-3" />
            <h3 className="text-[16px] font-semibold mb-1">Check your email</h3>
            <p className="text-[13px] text-zinc-500">
              We sent a confirmation link to <span className="text-zinc-300">{email}</span>. Click it to activate your account.
            </p>
          </div>
        ) : (
          <div className="bg-zinc-900/60 border border-white/[0.06] rounded-xl p-6 space-y-4">
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-wide block mb-1.5">Your name</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  placeholder="Arjun Varma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoFocus
                  className="bg-zinc-800/60 border-white/[0.06] text-[14px] h-10 pl-9"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-wide block mb-1.5">Work email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-800/60 border-white/[0.06] text-[14px] h-10 pl-9"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-wide block mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  type="password"
                  placeholder="8+ characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              disabled={loading || !email.trim() || password.length < 8}
              className="w-full bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 h-10 font-semibold"
            >
              {loading ? <><Loader2 size={14} className="animate-spin mr-2" /> Creating account...</> : "Create account"}
            </Button>

            <p className="text-[11px] text-zinc-500 text-center">
              By signing up you agree to our terms.
            </p>
          </div>
        )}

        <p className="text-center mt-6 text-[13px] text-zinc-500">
          Already have an account?{" "}
          <Link href="/signin" className="text-[#7CB342] hover:text-[#8BC34A] font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
