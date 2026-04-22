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
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const handleScan = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setReport(null);

    try {
      const res = await fetch("/api/free-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReport(data);
    } catch (err) {
      setReport({ error: err instanceof Error ? err.message : "Scan failed" });
    } finally {
      setIsLoading(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "text-zinc-100" :
    score >= 60 ? "text-yellow-400" :
    score >= 40 ? "text-orange-400" :
    "text-red-400";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      {/* Logo + headline */}
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <img src="/logo.png" alt="Cabbge" className="w-14 h-14 object-contain" />
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight max-w-xl">
          SEO + GEO execution for Indian real estate
        </h1>
        <p className="text-sm text-zinc-400 text-center max-w-lg leading-relaxed">
          Cabbge scans your corporate site and project microsites daily, tracks your brand&apos;s visibility
          in ChatGPT and Google AI, and generates + publishes the content you need to win buyer queries.
          Better than an SEO agency, cheaper than hiring in-house.
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
        <span>or try a free scan first</span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      {/* Input */}
      <div className="w-full max-w-lg flex items-center gap-0 bg-zinc-900 border border-zinc-800 rounded-lg p-1.5">
        <div className="pl-3">
          <img src="/logo.png" alt="" className="w-5 h-5 object-contain" />
        </div>
        <Input
          placeholder="yourcompany.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleScan()}
          className="border-0 bg-transparent focus-visible:ring-0 text-sm text-zinc-100 placeholder:text-zinc-600"
        />
        <Button
          onClick={handleScan}
          disabled={!url.trim() || isLoading}
          className="bg-zinc-100 text-zinc-900 hover:bg-white text-sm px-4 rounded-md"
        >
          {isLoading ? (
            <><Loader2 size={14} className="animate-spin mr-1.5" /> Scanning...</>
          ) : (
            <>Get Free Report <ArrowRight size={14} className="ml-1.5" /></>
          )}
        </Button>
      </div>

      <p className="mt-3 text-xs text-zinc-600">
        Free instant report. No signup required.
      </p>

      {/* Report Results */}
      {report && !report.error && (
        <div className="w-full max-w-lg mt-8 space-y-4">
          {/* Scores */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-zinc-300">Your SEO Health</h3>
                  <p className="text-xs text-zinc-600 truncate">{report.url}</p>
                </div>
                <div className={`text-3xl font-bold ${scoreColor(report.scores.overall)}`}>
                  {report.scores.overall}
                  <span className="text-sm text-zinc-600 font-normal">/100</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Performance", score: report.scores.performance },
                  { label: "SEO", score: report.scores.seo },
                  { label: "Real Estate", score: report.scores.realEstate },
                ].map(({ label, score }) => (
                  <div key={label} className="text-center p-2 rounded bg-zinc-800/50">
                    {score !== null && score !== undefined ? (
                      <div className={`text-lg font-bold ${scoreColor(score)}`}>{score}</div>
                    ) : (
                      <div className="text-lg font-bold text-zinc-600">—</div>
                    )}
                    <div className="text-[10px] text-zinc-500">{label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Checks */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5 space-y-1.5">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">Real Estate SEO Checks</h3>
              {[
                { label: "RERA / Regulatory number visible", passed: report.checks.rera },
                { label: "Pricing displayed on page", passed: report.checks.pricing },
                { label: "Enquiry CTA above the fold", passed: report.checks.ctaAboveFold },
                { label: "WhatsApp quick-connect", passed: report.checks.whatsapp },
                { label: "Schema.org markup", passed: report.checks.schema },
                { label: "Floor plans on page", passed: report.checks.floorPlans },
                { label: "EMI / loan information", passed: report.checks.emiLoan },
                { label: "Location map with landmarks", passed: report.checks.locationMap },
                { label: "Virtual tour / 360° gallery", passed: report.checks.virtualTour },
                { label: "Amenities listed", passed: report.checks.amenities },
                { label: "Project gallery", passed: report.checks.gallery },
                { label: "Builder credentials / about", passed: report.checks.builderCredentials },
                { label: "Possession date on page", passed: report.checks.possessionDate },
                { label: "Legal / approval documents", passed: report.checks.legalDocs },
                { label: "llms.txt for AI crawlers", passed: report.checks.llmsTxt },
                { label: "Sitemap.xml", passed: report.checks.sitemap },
              ].map(({ label, passed }) => (
                <div key={label} className="flex items-center gap-2 text-sm py-0.5">
                  {passed ? (
                    <CheckCircle2 size={14} className="text-zinc-100 flex-shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-red-400 flex-shrink-0" />
                  )}
                  <span className={passed ? "text-zinc-400" : "text-zinc-300"}>{label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Top Fixes */}
          {report.fixes?.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5 space-y-2">
                <h3 className="text-sm font-medium text-zinc-300 mb-3">Top 5 Fixes</h3>
                {report.fixes.map((fix: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="text-[10px] border-orange-800 text-orange-400 mt-0.5 flex-shrink-0">
                      {i + 1}
                    </Badge>
                    <span className="text-zinc-300">{fix}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* CTA */}
          <Card className="bg-[#7CB342]/[0.04] border-[#7CB342]/20">
            <CardContent className="p-5 text-center space-y-3">
              <p className="text-sm text-zinc-300">
                This is the surface. Full Cabbge adds <strong className="text-zinc-100">AI visibility tracking on ChatGPT + Google AI</strong>,
                a full-site crawler, keyword research with real volume, content generation that auto-publishes, and daily rank tracking.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Link
                  href="/signup"
                  className="h-10 px-5 rounded-lg bg-[#7CB342] text-zinc-950 text-[13px] font-semibold hover:bg-[#8BC34A] active:scale-[0.97] flex items-center gap-1.5"
                >
                  <Zap size={13} /> Start Free Trial
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

      {/* Error state */}
      {report?.error && (
        <Card className="w-full max-w-lg mt-8 bg-zinc-900 border-red-900/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-sm text-red-300">{report.error}</span>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="mt-12 flex items-center gap-4 text-xs text-zinc-700">
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
