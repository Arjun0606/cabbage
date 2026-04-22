"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Zap,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [brand, setBrand] = useState("");
  const [city, setCity] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [grade, setGrade] = useState<any>(null);

  const handleGrade = async () => {
    if (!brand.trim() || !city.trim()) return;
    setIsLoading(true);
    setGrade(null);
    try {
      const res = await fetch("/api/grader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: brand.trim(), city: city.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGrade(data);
    } catch (err) {
      setGrade({ error: err instanceof Error ? err.message : "Scan failed" });
    } finally {
      setIsLoading(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "text-[#7CB342]" :
    score >= 60 ? "text-yellow-400" :
    score >= 40 ? "text-orange-400" :
    "text-red-400";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      {/* Logo + headline */}
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <img src="/logo.png" alt="Cabbge" className="w-14 h-14 object-contain" />
        <div className="text-[10px] uppercase tracking-[0.25em] text-[#7CB342] font-semibold">
          AI Search Visibility for Indian Real Estate
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-zinc-100 tracking-tight max-w-2xl leading-tight">
          When buyers ask ChatGPT which developer to choose, do you show up?
        </h1>
        <p className="text-sm text-zinc-400 text-center max-w-lg leading-relaxed">
          Cabbge tracks how ChatGPT and Gemini answer buyer queries about your city — and generates,
          deploys and measures the content you need to win them. Your SEO agency won&apos;t do this.
          Your in-house team can&apos;t do this alone.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Link
            href="/signup"
            className="h-9 px-4 rounded-lg bg-[#7CB342] text-zinc-950 text-[13px] font-semibold hover:bg-[#8BC34A] active:scale-[0.97] flex items-center gap-1.5"
          >
            Start 14-day trial <ArrowRight size={13} />
          </Link>
          <Link
            href="/pricing"
            className="h-9 px-4 rounded-lg text-[13px] text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 flex items-center gap-1.5"
          >
            See pricing
          </Link>
        </div>
      </div>

      {/* Free report divider */}
      <div className="w-full max-w-lg flex items-center gap-3 mb-4 text-[11px] text-zinc-600 uppercase tracking-wide">
        <div className="h-px flex-1 bg-zinc-800" />
        <span>Grade your AI visibility free</span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      {/* Input — brand + city, runs the AI visibility grader */}
      <div className="w-full max-w-lg flex flex-col sm:flex-row items-stretch gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1.5">
        <Input
          placeholder="Your brand (e.g. Prestige)"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGrade()}
          className="border-0 bg-transparent focus-visible:ring-0 text-sm text-zinc-100 placeholder:text-zinc-600 flex-1"
        />
        <Input
          placeholder="City (e.g. Bangalore)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGrade()}
          className="border-0 bg-transparent focus-visible:ring-0 text-sm text-zinc-100 placeholder:text-zinc-600 sm:w-40"
        />
        <Button
          onClick={handleGrade}
          disabled={!brand.trim() || !city.trim() || isLoading}
          className="bg-[#7CB342] text-zinc-950 hover:bg-[#8BC34A] text-sm px-4 rounded-md"
        >
          {isLoading ? (
            <><Loader2 size={14} className="animate-spin mr-1.5" /> Grading...</>
          ) : (
            <>Grade Now <ArrowRight size={14} className="ml-1.5" /></>
          )}
        </Button>
      </div>

      <p className="mt-3 text-xs text-zinc-600">
        6 live queries to ChatGPT &amp; Gemini. Instant result. No signup required.
      </p>

      {/* Grader result */}
      {grade && !grade.error && (
        <div className="w-full max-w-lg mt-8 space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-zinc-300">
                    AI Visibility for <span className="text-zinc-100">{grade.brand}</span> in {grade.city}
                  </h3>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Mentioned in {grade.mentionedCount} of {grade.totalQueries} buyer queries
                  </p>
                </div>
                <div className={`text-4xl font-bold ${scoreColor(grade.score)}`}>
                  {grade.score}
                  <span className="text-sm text-zinc-600 font-normal">/100</span>
                </div>
              </div>
              <p className="text-[13px] text-zinc-300 leading-relaxed">{grade.verdict}</p>
            </CardContent>
          </Card>

          {grade.results?.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5 space-y-2">
                <h3 className="text-sm font-medium text-zinc-300 mb-3">Per-query breakdown</h3>
                {grade.results.map((r: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm py-1">
                    {r.mentioned ? (
                      <CheckCircle2 size={14} className="text-[#7CB342] flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-zinc-300 text-[13px]">&ldquo;{r.query}&rdquo;</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {r.platform}
                        {r.mentioned && r.competitors?.length > 0 && " \u2014 alongside "}
                        {r.mentioned && r.competitors?.length > 0 && (
                          <span className="text-zinc-400">{r.competitors.slice(0, 3).join(", ")}</span>
                        )}
                        {!r.mentioned && r.competitors?.length > 0 && (
                          <>recommended: <span className="text-red-400">{r.competitors.slice(0, 3).join(", ")}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {grade.competitors?.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5">
                <h3 className="text-sm font-medium text-zinc-300 mb-2">Who AI recommends in {grade.city}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {grade.competitors.map((c: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-[11px] border-zinc-700 text-zinc-300">
                      {c}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-[#7CB342]/[0.04] border-[#7CB342]/20">
            <CardContent className="p-5 text-center space-y-3">
              <p className="text-sm text-zinc-300">
                The full product tests <strong className="text-zinc-100">20+ hyper-local queries</strong> across your projects, tracks AI visibility daily,
                and auto-generates the content you need to win queries you&apos;re invisible on.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Link
                  href="/signup"
                  className="h-10 px-5 rounded-lg bg-[#7CB342] text-zinc-950 text-[13px] font-semibold hover:bg-[#8BC34A] active:scale-[0.97] flex items-center gap-1.5"
                >
                  <Zap size={13} /> Start 14-day trial
                </Link>
                <Link
                  href="/pricing"
                  className="h-10 px-4 rounded-lg text-[13px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5"
                >
                  See pricing
                </Link>
              </div>
              <p className="text-[10px] text-zinc-500">14 days free. No credit card required.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {grade?.error && (
        <Card className="w-full max-w-lg mt-8 bg-zinc-900 border-red-900/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-sm text-red-300">{grade.error}</span>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="mt-12 flex items-center gap-4 text-xs text-zinc-700">
        <Link href="/pricing" className="hover:text-zinc-400 transition-colors">
          Pricing
        </Link>
        <span>&bull;</span>
        <Link href="/signup" className="hover:text-zinc-400 transition-colors">
          Full setup
        </Link>
      </div>
    </div>
  );
}
