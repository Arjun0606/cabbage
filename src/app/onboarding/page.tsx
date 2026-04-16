"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Globe, ArrowRight, Loader2, Sparkles } from "lucide-react";

/**
 * One-step onboarding — Okara model.
 * User pastes their website URL. Everything else is auto-discovered.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!website.trim()) return;

    // Normalize URL
    let url = website.trim();
    if (!url.match(/^https?:\/\//)) url = `https://${url}`;

    // Extract a sensible company name from the domain
    const hostname = url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    const inferredName = hostname.split(".")[0].charAt(0).toUpperCase() + hostname.split(".")[0].slice(1);

    setLoading(true);

    // Minimal seed data — dashboard auto-discover will fill everything else
    const data = {
      name: inferredName,
      description: "",
      website: url,
      city: "",
      industry: "real_estate",
      yearEstablished: "",
      projectsCompleted: "",
      awards: "",
      sites: [] as { url: string; label: string }[],
      projects: [] as any[],
      competitors: [] as { name: string; website: string }[],
      documents: {
        productInfo: "",
        competitorAnalysis: "",
        brandVoice: "",
        marketingStrategy: "",
        brandValues: "",
        brandVision: "",
        targetAudience: "",
      },
    };
    localStorage.setItem("cabbge_company", JSON.stringify(data));

    // Brief delay to show loading state, then redirect
    setTimeout(() => router.push("/dashboard"), 600);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-8">
        {/* Logo + headline */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <img src="/logo.png" alt="Cabbge" className="w-12 h-12 object-contain" />
            <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">Cabbge</h1>
          </div>
          <div className="space-y-2">
            <p className="text-[20px] text-zinc-200 font-medium">Your AI CMO for Real Estate</p>
            <p className="text-[14px] text-zinc-500">
              Paste your website. We&apos;ll analyze your brand, audit your SEO, check your AI visibility, and generate everything you need to dominate your market.
            </p>
          </div>
        </div>

        {/* URL input — the entire onboarding */}
        <div className="space-y-3">
          <div className="relative">
            <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              type="url"
              placeholder="yourdeveloper.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              autoFocus
              disabled={loading}
              className="bg-zinc-900/80 border-white/[0.08] text-[16px] h-14 pl-12 pr-4 placeholder:text-zinc-600 focus:border-[#7CB342]/40 focus:ring-[#7CB342]/10 transition-all"
            />
          </div>

          <Button
            onClick={handleStart}
            disabled={!website.trim() || loading}
            className="w-full bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 h-14 text-[15px] font-semibold rounded-lg active:scale-[0.99] transition-all disabled:opacity-40 shadow-[0_0_20px_rgba(124,179,66,0.2)]"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin mr-2" />Initializing your CMO...</>
            ) : (
              <><Sparkles size={16} className="mr-2" />Activate Cabbge<ArrowRight size={16} className="ml-2" /></>
            )}
          </Button>
        </div>

        {/* What happens next */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { step: "1", label: "Analyze", desc: "Read your website & brand" },
            { step: "2", label: "Scan", desc: "Check SEO + AI visibility" },
            { step: "3", label: "Execute", desc: "Generate content & fixes" },
          ].map(({ step, label, desc }) => (
            <div key={step} className="p-3 rounded-lg bg-zinc-900/40 border border-white/[0.04]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full bg-[#7CB342]/10 flex items-center justify-center text-[11px] font-semibold text-[#7CB342]">
                  {step}
                </div>
                <span className="text-[12px] font-semibold text-zinc-200">{label}</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-snug">{desc}</p>
            </div>
          ))}
        </div>

        {/* Reassurance */}
        <p className="text-center text-[11px] text-zinc-600">
          Free scan, no credit card. Takes under a minute.
        </p>
      </div>
    </div>
  );
}
