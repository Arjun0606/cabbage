"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, ArrowRight, Zap, Shield, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function GraderPage() {
  const searchParams = useSearchParams();
  const [brand, setBrand] = useState("");
  const [city, setCity] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const autoRanRef = useRef(false);

  const runGrader = async (overrideBrand?: string, overrideCity?: string) => {
    const b = (overrideBrand ?? brand).trim();
    const c = (overrideCity ?? city).trim();
    if (!b || !c) return;
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/grader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: b, city: c }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch {
      setResult({ error: true });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-run when the URL has ?brand=X&city=Y&autorun=1 — this is what
  // makes the preview link in cold-outreach emails work on click. The
  // prospect lands here and immediately sees their brand's scan running.
  useEffect(() => {
    if (autoRanRef.current) return;
    const qBrand = searchParams.get("brand")?.trim();
    const qCity = searchParams.get("city")?.trim();
    const qAuto = searchParams.get("autorun");
    if (qBrand) setBrand(qBrand);
    if (qCity) setCity(qCity);
    if (qBrand && qCity && qAuto) {
      autoRanRef.current = true;
      runGrader(qBrand, qCity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#7CB342] flex items-center justify-center">
              <Zap size={14} className="text-zinc-900" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Cabbge</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-[13px] text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Is AI recommending your brand?
          </h1>
          <p className="text-zinc-400 text-[15px] max-w-lg mx-auto">
            When home buyers ask ChatGPT &quot;best developers in your city&quot;, does your name come up?
            Find out in 60 seconds. Free, no login required.
          </p>
        </div>

        {/* Input form */}
        <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl mb-8">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[11px] text-zinc-500 uppercase tracking-wide mb-1.5 block">Company / Developer Name</label>
                <Input
                  placeholder="e.g. Aparna Constructions"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="bg-zinc-800/60 border-white/[0.06] text-[14px] h-11 placeholder:text-zinc-600"
                  onKeyDown={(e) => e.key === "Enter" && runGrader()}
                />
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-zinc-500 uppercase tracking-wide mb-1.5 block">City</label>
                <Input
                  placeholder="e.g. Hyderabad"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-zinc-800/60 border-white/[0.06] text-[14px] h-11 placeholder:text-zinc-600"
                  onKeyDown={(e) => e.key === "Enter" && runGrader()}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => runGrader()}
                  disabled={isLoading || !brand.trim() || !city.trim()}
                  className="h-11 px-6 rounded-lg bg-[#7CB342] text-zinc-900 font-semibold text-[14px] hover:bg-[#8BC34A] active:scale-[0.97] transition-all disabled:opacity-40 flex items-center gap-2"
                >
                  {isLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Scanning...</>
                  ) : (
                    <><Shield size={16} /> Check AI Visibility</>
                  )}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 size={32} className="animate-spin text-[#7CB342] mx-auto mb-4" />
            <p className="text-[14px] text-zinc-400">Asking ChatGPT about {brand} in {city}...</p>
            <p className="text-[12px] text-zinc-600 mt-1">Running 3 buyer queries against ChatGPT + Gemini with live web search</p>
          </div>
        )}

        {/* Results */}
        {result && !result.error && (
          <div className="space-y-5">
            {/* Score card */}
            <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
              <CardContent className="p-8 text-center">
                <div className={`text-6xl font-bold tabular-nums mb-2 ${
                  result.score >= 80 ? "text-[#7CB342]" :
                  result.score >= 40 ? "text-amber-400" :
                  "text-red-400"
                }`}>
                  {result.score}
                </div>
                <div className="text-[13px] text-zinc-500 mb-4">AI Visibility Score</div>
                <div className="text-[14px] text-zinc-300 max-w-md mx-auto">
                  {result.verdict}
                </div>
              </CardContent>
            </Card>

            {/* Query results */}
            <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
              <CardContent className="p-6">
                <h3 className="text-[14px] font-semibold mb-4">Query-by-Query Results</h3>
                <div className="space-y-3">
                  {result.results.map((r: any, i: number) => (
                    <div key={i} className={`flex items-center justify-between py-3 px-4 rounded-lg ${
                      r.mentioned ? "bg-[#7CB342]/[0.04]" : "bg-red-500/[0.04]"
                    }`}>
                      <div className="flex items-center gap-3">
                        {r.mentioned ? (
                          <CheckCircle2 size={16} className="text-[#7CB342] flex-shrink-0" />
                        ) : (
                          <XCircle size={16} className="text-red-400 flex-shrink-0" />
                        )}
                        <span className="text-[13px] text-zinc-300">&quot;{r.query}&quot;</span>
                      </div>
                      <Badge className={`text-[10px] border-0 rounded-md ${
                        r.mentioned ? "bg-[#7CB342]/10 text-[#7CB342]" : "bg-red-500/10 text-red-400"
                      }`}>
                        {r.mentioned ? "Found" : "Not found"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Competitors */}
            {result.competitors?.length > 0 && (
              <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
                <CardContent className="p-6">
                  <h3 className="text-[14px] font-semibold mb-2">Who AI Recommends Instead</h3>
                  <p className="text-[12px] text-zinc-500 mb-3">
                    These companies appear when buyers ask about your market. They&apos;re getting the leads you&apos;re missing.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.competitors.map((c: string, i: number) => (
                      <Badge key={i} className="text-[12px] bg-zinc-800 text-zinc-300 border-zinc-700/50 rounded-md px-3 py-1">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CTA */}
            <Card className="bg-[#7CB342]/[0.06] border-[#7CB342]/20 rounded-xl">
              <CardContent className="p-8 text-center">
                <TrendingUp size={24} className="text-[#7CB342] mx-auto mb-3" />
                <h3 className="text-[16px] font-semibold mb-2">
                  {result.score === 100
                    ? "You're visible — but are you #1?"
                    : "Fix your AI invisibility"}
                </h3>
                <p className="text-[13px] text-zinc-400 max-w-md mx-auto mb-5">
                  {result.score === 100
                    ? "The full scan tests 20+ hyper-local queries (specific BHK types, price ranges, localities). See exactly where competitors beat you."
                    : `The full Cabbge platform scans 20+ hyper-local queries, generates optimized content for every blind spot, publishes it to your site, and re-scans to prove it worked. Daily.`}
                </p>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 h-11 px-8 rounded-lg bg-[#7CB342] text-zinc-900 font-semibold text-[14px] hover:bg-[#8BC34A] active:scale-[0.97] transition-all"
                >
                  Start Full Scan <ArrowRight size={16} />
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error state */}
        {result?.error && (
          <Card className="bg-red-500/[0.04] border-red-500/20 rounded-xl">
            <CardContent className="p-6 text-center">
              <XCircle size={24} className="text-red-400 mx-auto mb-2" />
              <p className="text-[14px] text-red-400">Something went wrong. Please try again.</p>
            </CardContent>
          </Card>
        )}

        {/* Social proof / How it works — shown before scan */}
        {!result && !isLoading && (
          <div className="grid grid-cols-3 gap-4 mt-12">
            {[
              { title: "Real Web Search", desc: "We ask ChatGPT with live web search — the same way your buyers do. Not cached or simulated." },
              { title: "3 Buyer Queries", desc: "We test the exact phrases home buyers type when searching for developers in your city." },
              { title: "60 Second Results", desc: "See your score, which queries found you, and who AI recommends instead — instantly." },
            ].map((item) => (
              <div key={item.title} className="p-4 rounded-xl bg-zinc-900/40 border border-white/[0.04]">
                <h4 className="text-[13px] font-semibold text-zinc-200 mb-1.5">{item.title}</h4>
                <p className="text-[12px] text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
