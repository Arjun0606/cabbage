"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Sparkles, ArrowRight, Globe, AlertCircle } from "lucide-react";
import Link from "next/link";

/**
 * Sales demo mode — for pitching prospects.
 *
 * Flow:
 *  1. Salesperson enters the demo password
 *  2. Enters prospect's website URL
 *  3. Auto-discovers everything (brand, projects, competitors, city)
 *  4. Drops into a full-access dashboard with a DEMO banner
 *  5. No paywall, no auth required, no Supabase writes
 *
 * Dashboard persistence is localStorage-only in demo mode so we don't
 * pollute the customer DB. On exit we wipe localStorage.
 */
export default function DemoPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"password" | "url" | "loading">("password");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already authenticated for demo, skip password step. Cookie is now
  // httpOnly so we check via the status endpoint rather than reading it.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/demo/auth", { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) setPhase("url");
        }
      } catch { /* offline or blocked — stay on password step */ }
    })();
  }, []);

  const handlePassword = async () => {
    if (!password) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/demo/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Wrong password");
        return;
      }
      setPhase("url");
    } catch {
      setError("Could not reach server");
    } finally {
      setLoading(false);
    }
  };

  const handleStartDemo = async () => {
    if (!url.trim()) return;
    let normalized = url.trim();
    if (!normalized.match(/^https?:\/\//)) normalized = `https://${normalized}`;
    setPhase("loading");
    setError(null);

    try {
      // Auto-discover the prospect's site
      const hostname = normalized.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      const inferredName = hostname.split(".")[0].charAt(0).toUpperCase() + hostname.split(".")[0].slice(1);

      const discoverRes = await fetch("/api/auto-discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized, companyName: inferredName, industry: "real_estate" }),
      });
      const discovered = await discoverRes.json();

      const placeholders = /^(unknown|featured|project\s*\d*|placeholder|n\/?a|not\s+specified|tbd)/i;
      const validProjects = (discovered.inferredProjects || []).filter(
        (p: any) => p?.name && !placeholders.test(p.name.trim()) && p.name.trim().length >= 3
      );

      let name = inferredName;
      if (discovered.companyDescription) {
        const nameFromDesc = discovered.companyDescription.split(" is ")[0]?.trim();
        if (nameFromDesc && nameFromDesc.length > 2 && nameFromDesc.length < 60) name = nameFromDesc;
      }

      const companyData = {
        name,
        description: discovered.companyDescription || "",
        website: normalized,
        city: discovered.city || "",
        industry: "real_estate",
        sites: [] as { url: string; label: string }[],
        projects: validProjects.map((p: any) => ({
          name: p.name || "",
          location: p.location || "",
          configurations: p.configurations || "",
          priceRange: p.priceRange || "",
          website: p.website || "",
          reraNumber: p.reraNumber || "",
          amenities: p.amenities || "",
          status: p.status || "Active",
        })),
        competitors: (discovered.inferredCompetitors || [])
          .filter((c: string) => c && c.trim().length >= 3 && !placeholders.test(c))
          .map((c: string) => ({ name: c, website: "" })),
        documents: {
          productInfo: discovered.documents?.productInfo || "",
          brandVoice: discovered.documents?.brandVoice || "",
          competitorAnalysis: discovered.documents?.competitorAnalysis || "",
        },
      };

      // Save + mark demo mode
      localStorage.setItem("cabbge_company", JSON.stringify(companyData));
      localStorage.setItem("cabbge_demo_mode", "true");
      localStorage.setItem("cabbge_demo_target", normalized);
      // Cookie lets middleware + server know to skip auth/paywall
      document.cookie = "cabbge_demo=1; path=/; max-age=86400; samesite=lax";

      router.push("/dashboard?demo=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-discover failed. Try again.");
      setPhase("url");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#7CB342] flex items-center justify-center">
            <Sparkles size={16} className="text-zinc-900" />
          </div>
          <span className="text-[16px] font-bold">Cabbge</span>
          <span className="text-[10px] uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md font-semibold">Sales Demo</span>
        </Link>

        {phase === "password" && (
          <div className="bg-zinc-900/60 border border-white/[0.06] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4 text-zinc-400">
              <Lock size={14} />
              <span className="text-[12px] uppercase tracking-wide font-semibold">Sales team access</span>
            </div>
            <h1 className="text-[20px] font-bold mb-2">Demo mode</h1>
            <p className="text-[13px] text-zinc-400 mb-5">
              For pitching prospects. Enter the demo password, then any website URL —
              we&apos;ll pull their data and drop you into a full dashboard instantly.
            </p>
            <Input
              type="password"
              placeholder="Demo password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePassword()}
              autoFocus
              className="bg-zinc-800/60 border-white/[0.06] text-[14px] h-10 mb-3"
            />
            {error && (
              <div className="p-2 mb-3 rounded-md bg-red-500/[0.06] border border-red-500/20 text-[12px] text-red-400 flex items-center gap-2">
                <AlertCircle size={12} /> {error}
              </div>
            )}
            <Button
              onClick={handlePassword}
              disabled={loading || !password}
              className="w-full bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 h-10 font-semibold"
            >
              {loading ? <><Loader2 size={14} className="animate-spin mr-2" /> Verifying...</> : "Enter"}
            </Button>
          </div>
        )}

        {phase === "url" && (
          <div className="bg-zinc-900/60 border border-white/[0.06] rounded-xl p-6">
            <h1 className="text-[20px] font-bold mb-2">Any website</h1>
            <p className="text-[13px] text-zinc-400 mb-5">
              Paste <span className="text-zinc-200">any</span> website URL — real estate developer, your own site, a prospect,
              a competitor. We auto-discover brand, projects, competitors, and city in ~10 seconds, then drop you into
              a full dashboard with unlimited access to every feature.
            </p>
            <div className="relative mb-3">
              <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                type="url"
                placeholder="https://yourwebsite.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStartDemo()}
                autoFocus
                className="bg-zinc-800/60 border-white/[0.06] text-[14px] h-10 pl-9"
              />
            </div>
            {error && (
              <div className="p-2 mb-3 rounded-md bg-red-500/[0.06] border border-red-500/20 text-[12px] text-red-400 flex items-center gap-2">
                <AlertCircle size={12} /> {error}
              </div>
            )}
            <Button
              onClick={handleStartDemo}
              disabled={!url.trim()}
              className="w-full bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 h-10 font-semibold"
            >
              Start Demo <ArrowRight size={14} className="ml-1.5" />
            </Button>
            <p className="text-[10px] text-zinc-600 mt-3 text-center">
              Demo data lives in your browser only. Exiting clears it completely.
            </p>
          </div>
        )}

        {phase === "loading" && (
          <div className="bg-zinc-900/60 border border-white/[0.06] rounded-xl p-8 text-center">
            <Loader2 size={28} className="animate-spin text-[#7CB342] mx-auto mb-4" />
            <h2 className="text-[16px] font-semibold mb-1">Pulling prospect data...</h2>
            <p className="text-[12px] text-zinc-500">Scraping site, inferring projects, detecting competitors, generating buyer queries.</p>
          </div>
        )}
      </div>
    </div>
  );
}
