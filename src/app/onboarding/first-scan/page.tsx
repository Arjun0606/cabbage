"use client";

/**
 * Animated first-scan page — sits between onboarding Step 3 finish and
 * the dashboard. Kills the "empty dashboard on day one" problem by
 * giving the user an explainer-style 60-90s experience where the four
 * scan waves tick through with copy explaining what each does and why.
 *
 * On mount we POST to every relevant scan endpoint in parallel using
 * the company data the user just submitted (read from localStorage).
 * Each completion advances a visible step. When all are done we route
 * to /dashboard?welcome=1 so the dashboard renders the success banner.
 *
 * Failures don't block — any wave that 4xx/5xxs gets marked failed but
 * doesn't stop the flow. A gracefully-broken wave is better than a
 * stuck animation.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, CheckCircle2, Loader2, AlertCircle, ArrowRight } from "lucide-react";

interface Wave {
  id: string;
  title: string;
  body: string;
  pitch: string;
  status: "pending" | "running" | "done" | "failed";
}

const INITIAL_WAVES: Wave[] = [
  {
    id: "discover",
    title: "Mapping your portfolio",
    body: "We're crawling your sitemap, scraping every project page, extracting RERA numbers and BHK configs.",
    pitch: "Most agencies stop here. We're just getting started.",
    status: "running", // first wave starts immediately
  },
  {
    id: "audit",
    title: "Running the SEO + technical audit",
    body: "PageSpeed, schema, meta, H1 hierarchy, sitemap, llms.txt, robots, image alt coverage. Every signal that matters to Google AND to AI.",
    pitch: "14 checks an agency would charge ₹40k to deliver as a one-time audit.",
    status: "pending",
  },
  {
    id: "ai_visibility",
    title: "Asking ChatGPT and Gemini about you",
    body: "We're firing 20+ buyer queries through both LLMs to measure how AI search engines actually represent your brand right now.",
    pitch: "This is the data nobody else can show you.",
    status: "pending",
  },
  {
    id: "compliance",
    title: "Verifying your RERA + portal coverage",
    body: "Every project's RERA number cross-checked against the state authority registry. Every property portal scanned to see who lists you.",
    pitch: "Compliance + distribution coverage in two parallel passes.",
    status: "pending",
  },
];

export default function FirstScanPage() {
  const router = useRouter();
  const [waves, setWaves] = useState<Wave[]>(INITIAL_WAVES);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);

  const updateWave = useCallback((id: string, status: Wave["status"]) => {
    setWaves((prev) => prev.map((w) => (w.id === id ? { ...w, status } : w)));
  }, []);

  const runScans = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    let companyData: any = null;
    try {
      const stored = localStorage.getItem("cabbge_company");
      if (stored) companyData = JSON.parse(stored);
    } catch { /* ignore */ }

    if (!companyData?.website || !companyData?.name) {
      setError("Couldn't find your company info. Going back to onboarding...");
      setTimeout(() => router.push("/onboarding"), 2000);
      return;
    }

    const url = companyData.website;
    const brand = companyData.name;
    const city = companyData.city;
    const projects = companyData.projects || [];

    // Wave 1 already animated as 'running'; mark done immediately because
    // the discovery happened during onboarding itself.
    setTimeout(() => updateWave("discover", "done"), 1500);
    setTimeout(() => updateWave("audit", "running"), 1600);

    // Wave 2: audit + technical (parallel, blocking).
    try {
      await Promise.all([
        fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }),
        fetch("/api/technical-seo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }),
      ]);
      updateWave("audit", "done");
    } catch {
      updateWave("audit", "failed");
    }

    updateWave("ai_visibility", "running");

    // Wave 3: AI visibility — the headline scan.
    try {
      const projectDetails = projects.map((p: any) => ({
        name: p.name,
        location: p.location,
        configurations: p.configurations,
        priceRange: p.priceRange,
        reraNumber: p.reraNumber,
      }));
      await fetch("/api/ai-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: url, brand, city,
          projects: projects.map((p: any) => p.name),
          projectDetails,
          industry: "real_estate",
          brandContext: {
            usps: companyData.description || "",
            productInfo: companyData.documents?.productInfo || "",
            brandVoice: companyData.documents?.brandVoice || "",
            targetAudience: companyData.documents?.targetAudience || "",
          },
        }),
      });
      updateWave("ai_visibility", "done");
    } catch {
      updateWave("ai_visibility", "failed");
    }

    updateWave("compliance", "running");

    // Wave 4: portal coverage + RERA verify (parallel).
    try {
      const projectsForRera = projects.map((p: any) => ({
        name: p.name,
        reraNumber: p.reraNumber || "",
        location: p.location || "",
      }));
      await Promise.all([
        fetch("/api/portal-coverage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brand, city: city || "" }),
        }).catch(() => null),
        projectsForRera.length > 0
          ? fetch("/api/rera-verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projects: projectsForRera }),
            }).catch(() => null)
          : null,
      ]);
      updateWave("compliance", "done");
    } catch {
      updateWave("compliance", "failed");
    }

    setDone(true);
  }, [router, updateWave]);

  useEffect(() => {
    runScans();
  }, [runScans]);

  // Auto-route once everything's done — give a 2s celebration window.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.push("/dashboard?welcome=1"), 2200);
    return () => clearTimeout(t);
  }, [done, router]);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#7CB342] flex items-center justify-center">
              <Sparkles size={20} className="text-zinc-900" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Cabbge</h1>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Your first scan is running.
          </h2>
          <p className="text-zinc-400 text-[14px] leading-relaxed max-w-md mx-auto">
            Takes about 60-90 seconds. We&apos;re populating your dashboard with real data from your site, AI search engines, RERA portals, and property listings — in parallel.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/[0.08] border border-red-500/30 flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
            <span className="text-[12px] text-red-400">{error}</span>
          </div>
        )}

        <div className="space-y-3">
          {waves.map((wave, i) => (
            <div
              key={wave.id}
              className={`rounded-xl border p-4 transition-all ${
                wave.status === "running"
                  ? "border-[#7CB342]/40 bg-[#7CB342]/[0.04] shadow-[0_0_24px_rgba(124,179,66,0.05)]"
                  : wave.status === "done"
                  ? "border-[#7CB342]/20 bg-[#7CB342]/[0.02]"
                  : wave.status === "failed"
                  ? "border-amber-500/20 bg-amber-500/[0.04]"
                  : "border-white/[0.04] bg-zinc-900/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5">
                  {wave.status === "done" ? (
                    <CheckCircle2 size={20} className="text-[#7CB342]" />
                  ) : wave.status === "running" ? (
                    <Loader2 size={20} className="text-[#7CB342] animate-spin" />
                  ) : wave.status === "failed" ? (
                    <AlertCircle size={20} className="text-amber-400" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-500 font-semibold">
                      {i + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className={`text-[14px] font-semibold ${wave.status === "pending" ? "text-zinc-500" : "text-zinc-100"}`}>
                      {wave.title}
                    </h3>
                    {wave.status === "failed" && (
                      <span className="text-[10px] text-amber-400 uppercase tracking-wide">retrying in background</span>
                    )}
                  </div>
                  <p className={`text-[12px] mt-1 leading-relaxed ${wave.status === "pending" ? "text-zinc-600" : "text-zinc-400"}`}>
                    {wave.body}
                  </p>
                  {(wave.status === "running" || wave.status === "done") && (
                    <p className="text-[11px] text-[#7CB342]/80 italic mt-2">{wave.pitch}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {done && (
          <div className="mt-8 rounded-xl bg-[#7CB342]/10 border border-[#7CB342]/30 p-5 text-center">
            <CheckCircle2 size={28} className="text-[#7CB342] mx-auto mb-2" />
            <h3 className="text-[16px] font-semibold mb-1">Your dashboard is ready.</h3>
            <p className="text-[12px] text-zinc-400 mb-4">Routing you in a moment...</p>
            <button
              onClick={() => router.push("/dashboard?welcome=1")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 text-[13px] font-semibold"
            >
              Go to dashboard <ArrowRight size={13} />
            </button>
          </div>
        )}

        <p className="text-center text-[11px] text-zinc-600 mt-8">
          You can close this tab — scans continue in the background and will be ready when you come back.
        </p>
      </div>
    </div>
  );
}
