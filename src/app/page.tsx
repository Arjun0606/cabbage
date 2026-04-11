"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
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

  const goToDashboard = () => {
    const normalized = url.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
    const namePart = normalized.split(".")[0];
    const companyData = {
      name: namePart.charAt(0).toUpperCase() + namePart.slice(1),
      description: "",
      website: url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`,
      city: "",
      sites: [],
      projects: [],
      competitors: [],
      documents: { productInfo: "", competitorAnalysis: "", brandVoice: "", marketingStrategy: "" },
    };
    localStorage.setItem("cabbageseo_company", JSON.stringify(companyData));
    router.push("/dashboard");
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "text-emerald-400" :
    score >= 60 ? "text-yellow-400" :
    score >= 40 ? "text-orange-400" :
    "text-red-400";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <Sparkles size={24} className="text-emerald-400" />
        </div>
        <h1 className="text-xl font-semibold text-zinc-100">
          Meet CabbageSEO, the AI CMO
        </h1>
        <p className="text-sm text-zinc-500 text-center max-w-md">
          The only AI CMO you need for growth and marketing.
        </p>
      </div>

      {/* Input */}
      <div className="w-full max-w-lg flex items-center gap-0 bg-zinc-900 border border-zinc-800 rounded-lg p-1.5">
        <div className="pl-3 text-zinc-600">
          <Sparkles size={16} />
        </div>
        <Input
          placeholder="example.com"
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
              <h3 className="text-sm font-medium text-zinc-300 mb-3">SEO Checks</h3>
              {[
                { label: "RERA / Regulatory number visible", passed: report.checks.rera },
                { label: "Pricing displayed on page", passed: report.checks.pricing },
                { label: "Enquiry CTA above the fold", passed: report.checks.ctaAboveFold },
                { label: "WhatsApp quick-connect", passed: report.checks.whatsapp },
                { label: "Schema.org markup", passed: report.checks.schema },
                { label: "Floor plans on page", passed: report.checks.floorPlans },
                { label: "EMI / loan information", passed: report.checks.emiLoan },
                { label: "Location map with landmarks", passed: report.checks.locationMap },
                { label: "llms.txt for AI crawlers", passed: report.checks.llmsTxt },
                { label: "Sitemap.xml", passed: report.checks.sitemap },
              ].map(({ label, passed }) => (
                <div key={label} className="flex items-center gap-2 text-sm py-0.5">
                  {passed ? (
                    <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
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
          <Card className="bg-emerald-950/30 border-emerald-800/50">
            <CardContent className="p-5 text-center space-y-3">
              <p className="text-sm text-zinc-300">
                This is just the surface. Get the full report with <strong>AI Visibility across ChatGPT, Claude, Gemini</strong>, backlink analysis, competitor intelligence, and AI-generated content.
              </p>
              <Button
                onClick={goToDashboard}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Sparkles size={14} className="mr-2" />
                Open Full Dashboard — Free
              </Button>
              <p className="text-[10px] text-zinc-600">14-day free trial. No credit card.</p>
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
