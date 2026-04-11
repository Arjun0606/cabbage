"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGo = () => {
    if (!url.trim()) return;
    setIsLoading(true);

    // Store the URL and go straight to dashboard
    const normalized = url.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const companyData = {
      name: normalized.split(".")[0].charAt(0).toUpperCase() + normalized.split(".")[0].slice(1),
      description: "",
      website: url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`,
      city: "",
      sites: [],
      projects: [],
      competitors: [],
      documents: {
        productInfo: "",
        competitorAnalysis: "",
        brandVoice: "",
        marketingStrategy: "",
      },
    };
    localStorage.setItem("cabbageseo_company", JSON.stringify(companyData));
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-12 flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <Sparkles size={24} className="text-emerald-400" />
        </div>
        <h1 className="text-xl font-semibold text-zinc-100">
          Meet CabbageSEO, the AI CMO
        </h1>
        <p className="text-sm text-zinc-500">
          The only AI CMO you need for real estate growth and marketing.
        </p>
      </div>

      {/* Single input */}
      <div className="w-full max-w-lg flex items-center gap-0 bg-zinc-900 border border-zinc-800 rounded-lg p-1.5">
        <div className="pl-3 text-zinc-600">
          <Sparkles size={16} />
        </div>
        <Input
          placeholder="urbanrise.in"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGo()}
          className="border-0 bg-transparent focus-visible:ring-0 text-sm text-zinc-100 placeholder:text-zinc-600"
        />
        <Button
          onClick={handleGo}
          disabled={!url.trim() || isLoading}
          className="bg-zinc-100 text-zinc-900 hover:bg-white text-sm px-4 rounded-md"
        >
          Go to Dashboard <ArrowRight size={14} className="ml-1.5" />
        </Button>
      </div>

      {/* Social proof */}
      <p className="mt-4 text-xs text-zinc-600">
        Built for real estate developers. SEO, AI/GEO, content, competitors — all in one.
      </p>

      {/* Footer links */}
      <div className="mt-8 flex items-center gap-4 text-xs text-zinc-700">
        <Link href="/pricing" className="hover:text-zinc-400 transition-colors">
          Pricing
        </Link>
        <span>&bull;</span>
        <Link href="/onboarding" className="hover:text-zinc-400 transition-colors">
          Detailed Setup
        </Link>
      </div>
    </div>
  );
}
