"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Globe, ArrowRight, Loader2, Sparkles, CheckCircle2, Plus, X,
  Building2, MapPin, Layers, AlertCircle,
} from "lucide-react";
import { CityAutocomplete } from "@/components/CityAutocomplete";

/**
 * Three-step onboarding:
 *   Step 1 — Paste URL, auto-discover runs, extracts company data.
 *   Step 2 — Review structured data: brand, cities, sites, projects, competitors.
 *   Step 3 — Brand context: voice, values, vision, target audience, marketing
 *            strategy, competitor analysis. Auto-discover prefills each;
 *            user can edit, replace, or expand any field. This is where
 *            the brand's marketing dump lives — every downstream agent
 *            (article writer, portal optimizer, GEO improvement) reads
 *            from these fields, so the more the user puts here, the
 *            sharper the generated output.
 *
 * The user MUST confirm city + at least 1 project before reaching Step 3.
 * Step 3 is optional — they can skip and edit later from the Company panel.
 */

interface Project {
  name: string;
  location: string;
  configurations: string;
  priceRange: string;
  website: string;
  reraNumber: string;
  amenities: string;
  status: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Company data (populated by auto-discover, editable by user)
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cities, setCities] = useState<string[]>([""]);
  // Industry is fixed for now — Cabbge is scoped to Indian real estate.
  const industry = "real_estate";
  const [projects, setProjects] = useState<Project[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [extraSites, setExtraSites] = useState<Array<{ url: string; label: string; type?: string }>>([]);
  const [siteCandidates, setSiteCandidates] = useState<Array<{ url: string; label: string; type: string; reason: string }>>([]);
  const [importingSites, setImportingSites] = useState(false);
  const [newCityInput, setNewCityInput] = useState("");

  // Brand-context fields — edited in Step 3, persisted to companies.documents.
  // Every downstream agent reads from these so the user's edits flow through
  // to article quality, portal copy, GEO improvements, hallucination audit.
  const [productInfo, setProductInfo] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [brandValues, setBrandValues] = useState("");
  const [brandVision, setBrandVision] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [marketingStrategy, setMarketingStrategy] = useState("");
  const [competitorAnalysisDoc, setCompetitorAnalysisDoc] = useState("");
  const [savingFinish, setSavingFinish] = useState(false);

  // Auto-discover results for display
  const [discovered, setDiscovered] = useState<any>(null);

  // Step 1: Paste URL and auto-discover
  const handleDiscover = async () => {
    if (!website.trim()) return;
    let url = website.trim();
    if (!url.match(/^https?:\/\//)) url = `https://${url}`;
    setWebsite(url);
    setLoading(true);
    setError(null);

    try {
      // Infer name from domain
      const hostname = url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      const inferredName = hostname.split(".")[0].charAt(0).toUpperCase() + hostname.split(".")[0].slice(1);
      setName(inferredName);

      const res = await fetch("/api/auto-discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, companyName: inferredName, industry }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setDiscovered(data);

      // Populate fields from auto-discover
      if (data.companyDescription) setDescription(data.companyDescription);
      if (data.city) setCities([data.city]);

      // Populate projects (filter out placeholders)
      const placeholders = /^(unknown|featured|project\s*\d*|placeholder|n\/?a|not\s+specified|tbd)/i;
      const validProjects = (data.inferredProjects || []).filter(
        (p: any) => p?.name && !placeholders.test(p.name.trim()) && p.name.trim().length >= 3
      );
      if (validProjects.length > 0) {
        setProjects(validProjects.map((p: any) => ({
          name: p.name || "",
          location: p.location || "",
          configurations: p.configurations || "",
          priceRange: p.priceRange || "",
          website: p.website || "",
          reraNumber: p.reraNumber || "",
          amenities: p.amenities || "",
          status: p.status || "Active",
        })));

        // Extract unique cities from project locations
        const projectCities = new Set<string>();
        if (data.city) projectCities.add(data.city);
        validProjects.forEach((p: any) => {
          if (p.location) {
            const parts = p.location.split(",").map((s: string) => s.trim());
            if (parts.length > 1) projectCities.add(parts[parts.length - 1]);
          }
        });
        if (projectCities.size > 0) setCities(Array.from(projectCities));
      }

      // Populate competitors
      const validCompetitors = (data.inferredCompetitors || []).filter(
        (c: string) => c && c.trim().length >= 3 && !placeholders.test(c)
      );
      if (validCompetitors.length > 0) setCompetitors(validCompetitors);

      // Populate brand-context dump — Step 3 prefills from these.
      const docs = data.documents || {};
      if (typeof docs.productInfo === "string")        setProductInfo(docs.productInfo);
      if (typeof docs.brandVoice === "string")         setBrandVoice(docs.brandVoice);
      if (typeof docs.brandValues === "string")        setBrandValues(docs.brandValues);
      if (typeof docs.brandVision === "string")        setBrandVision(docs.brandVision);
      if (typeof docs.targetAudience === "string")     setTargetAudience(docs.targetAudience);
      if (typeof docs.marketingStrategy === "string")  setMarketingStrategy(docs.marketingStrategy);
      if (typeof docs.competitorAnalysis === "string") setCompetitorAnalysisDoc(docs.competitorAnalysis);

      // If auto-discover gave us a proper name
      if (data.companyDescription) {
        const nameFromDesc = data.companyDescription.split(" is ")[0]?.trim();
        if (nameFromDesc && nameFromDesc.length > 2 && nameFromDesc.length < 60) {
          setName(nameFromDesc);
        }
      }

      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze website. You can still fill in details manually.");
      setStep(2); // Still go to step 2 so they can fill manually
    } finally {
      setLoading(false);
    }
  };

  // Step 2 → Step 3: validate basics then advance to brand-context capture.
  const goToBrandContext = () => {
    const primaryCity = cities.filter(Boolean)[0] || "";
    if (!primaryCity) {
      setError("Please add at least one city where you operate.");
      return;
    }
    if (!name.trim()) {
      setError("Company name is required.");
      return;
    }
    setError(null);
    setStep(3);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Step 3: persist everything, land on dashboard. Brand-context fields
  // are optional — empty strings are fine, the user can fill them later
  // from the Company panel.
  const handleFinish = async () => {
    const primaryCity = cities.filter(Boolean)[0] || "";
    setSavingFinish(true);

    const data = {
      name: name.trim(),
      description,
      website,
      city: primaryCity,
      industry,
      sites: extraSites.map((s) => ({ url: s.url, label: s.label, type: s.type || "other" })),
      projects: projects.length > 0 ? projects : [],
      competitors: competitors.map((c) => ({ name: c, website: "" })),
      documents: {
        productInfo: productInfo.trim(),
        brandVoice: brandVoice.trim(),
        brandValues: brandValues.trim(),
        brandVision: brandVision.trim(),
        targetAudience: targetAudience.trim(),
        marketingStrategy: marketingStrategy.trim(),
        competitorAnalysis: competitorAnalysisDoc.trim(),
      },
    };
    localStorage.setItem("cabbge_company", JSON.stringify(data));

    // Persist to Supabase linked to the authenticated user. Non-blocking —
    // if Supabase isn't configured or auth failed, the localStorage copy
    // still drives the dashboard.
    try {
      await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch { /* non-fatal */ }

    // Also set company ID cookie for per-company rate limiting
    document.cookie = `cabbge_company_id=${encodeURIComponent(name.trim().toLowerCase().replace(/\s+/g, "-"))};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;

    router.push("/dashboard?welcome=1");
  };

  const addProject = () => {
    setProjects([...projects, { name: "", location: "", configurations: "", priceRange: "", website: "", reraNumber: "", amenities: "", status: "Active" }]);
  };

  const updateProject = (idx: number, field: keyof Project, value: string) => {
    const updated = [...projects];
    updated[idx] = { ...updated[idx], [field]: value };
    setProjects(updated);
  };

  const removeProject = (idx: number) => {
    setProjects(projects.filter((_, i) => i !== idx));
  };

  // Auto-detect project microsites from the corporate sitemap.
  const importSitesFromSitemap = async () => {
    if (!website) return;
    setImportingSites(true);
    try {
      const res = await fetch("/api/sitemap-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: website }),
      });
      const data = await res.json();
      if (data.candidates) setSiteCandidates(data.candidates);
    } catch { /* non-fatal */ }
    finally { setImportingSites(false); }
  };

  const toggleSiteCandidate = (c: { url: string; label: string; type: string }) => {
    const exists = extraSites.some((s) => s.url === c.url);
    if (exists) setExtraSites(extraSites.filter((s) => s.url !== c.url));
    else setExtraSites([...extraSites, { url: c.url, label: c.label, type: c.type }]);
  };

  const addCity = () => {
    if (newCityInput.trim() && !cities.includes(newCityInput.trim())) {
      setCities([...cities, newCityInput.trim()]);
      setNewCityInput("");
    }
  };

  const removeCity = (idx: number) => {
    if (cities.length > 1) setCities(cities.filter((_, i) => i !== idx));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#7CB342] flex items-center justify-center">
              <Sparkles size={20} className="text-zinc-900" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Cabbge</h1>
          </div>
          <p className="text-zinc-400 text-[14px]">
            {step === 1
              ? "Paste your website. We will analyze everything about your brand."
              : step === 2
              ? "Review what we found. Fill in anything we missed."
              : "Brand context. Edit, replace, or expand what we extracted — every agent reads from this."}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className={`flex items-center gap-1.5 text-[12px] ${step >= 1 ? "text-[#7CB342]" : "text-zinc-600"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step >= 1 ? "bg-[#7CB342] text-zinc-900" : "bg-zinc-800 text-zinc-500"}`}>
              {step > 1 ? <CheckCircle2 size={14} /> : "1"}
            </div>
            Website
          </div>
          <div className="w-8 h-px bg-zinc-800" />
          <div className={`flex items-center gap-1.5 text-[12px] ${step >= 2 ? "text-[#7CB342]" : "text-zinc-600"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step >= 2 ? "bg-[#7CB342] text-zinc-900" : "bg-zinc-800 text-zinc-500"}`}>
              {step > 2 ? <CheckCircle2 size={14} /> : "2"}
            </div>
            Structure
          </div>
          <div className="w-8 h-px bg-zinc-800" />
          <div className={`flex items-center gap-1.5 text-[12px] ${step >= 3 ? "text-[#7CB342]" : "text-zinc-600"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step >= 3 ? "bg-[#7CB342] text-zinc-900" : "bg-zinc-800 text-zinc-500"}`}>
              3
            </div>
            Brand Context
          </div>
        </div>

        {/* STEP 1: URL Input */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="relative">
              <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                type="url"
                placeholder="yourdeveloper.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDiscover()}
                autoFocus
                disabled={loading}
                className="bg-zinc-900/80 border-white/[0.08] text-[16px] h-14 pl-12 placeholder:text-zinc-600 focus:border-[#7CB342]/40"
              />
            </div>
            <Button
              onClick={handleDiscover}
              disabled={!website.trim() || loading}
              className="w-full bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 h-14 text-[15px] font-semibold rounded-lg"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin mr-2" />Analyzing your website...</>
              ) : (
                <><Sparkles size={16} className="mr-2" />Analyze & Set Up<ArrowRight size={16} className="ml-2" /></>
              )}
            </Button>

            {/* What happens */}
            <div className="grid grid-cols-3 gap-3 mt-8">
              {[
                { icon: Globe, label: "Auto-extract", desc: "Brand, projects, city, competitors" },
                { icon: MapPin, label: "Multi-city", desc: "All your project locations detected" },
                { icon: Layers, label: "Configurations", desc: "BHK types, prices auto-filled" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="p-3 rounded-lg bg-zinc-900/40 border border-white/[0.04]">
                  <Icon size={14} className="text-[#7CB342] mb-1.5" />
                  <div className="text-[12px] font-semibold text-zinc-200">{label}</div>
                  <div className="text-[11px] text-zinc-500">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Review & Fill Gaps */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Auto-discover success banner */}
            {discovered && (
              <div className="p-3 rounded-lg bg-[#7CB342]/[0.06] border border-[#7CB342]/20 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#7CB342] flex-shrink-0" />
                <span className="text-[12px] text-zinc-300">
                  Auto-extracted {projects.length} project{projects.length !== 1 ? "s" : ""}, {competitors.length} competitor{competitors.length !== 1 ? "s" : ""}, and brand intelligence from your website. Review below.
                </span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <span className="text-[12px] text-red-400">{error}</span>
              </div>
            )}

            {/* Company basics */}
            <div className="space-y-3">
              <h3 className="text-[13px] font-semibold text-zinc-300 flex items-center gap-2">
                <Building2 size={14} /> Company
              </h3>
              <Input
                placeholder="Company name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-zinc-900/80 border-white/[0.06] text-[14px] h-10"
              />
              <Textarea
                placeholder="Brief description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-zinc-900/80 border-white/[0.06] text-[13px] min-h-[60px]"
              />
            </div>

            {/* Cities (multi-city) */}
            <div className="space-y-3">
              <h3 className="text-[13px] font-semibold text-zinc-300 flex items-center gap-2">
                <MapPin size={14} /> Cities You Operate In
                <span className="text-[10px] text-red-400 font-normal">* Required</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {cities.filter(Boolean).map((city, i) => (
                  <Badge key={i} className="bg-zinc-800 text-zinc-200 border-zinc-700/50 rounded-md px-3 py-1.5 text-[12px] flex items-center gap-1.5">
                    {city}
                    {cities.length > 1 && (
                      <button onClick={() => removeCity(i)} className="text-zinc-500 hover:text-red-400">
                        <X size={12} />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <CityAutocomplete
                    value={newCityInput}
                    onChange={(v: string) => setNewCityInput(v)}
                    placeholder="Add another city — start typing"
                  />
                </div>
                <button
                  onClick={addCity}
                  disabled={!newCityInput.trim()}
                  className="h-9 px-3 rounded-lg bg-zinc-800 text-zinc-300 text-[12px] hover:bg-zinc-700 disabled:opacity-40 flex items-center gap-1"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              {cities.filter(Boolean).length === 0 && (
                <p className="text-[11px] text-red-400">At least one city is required for accurate AI visibility scans.</p>
              )}
            </div>

            {/* Additional Sites — corporate + project microsites + NRI sites */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-zinc-300 flex items-center gap-2">
                  <Globe size={14} /> Additional Sites
                  <span className="text-[10px] text-zinc-500 font-normal">project microsites, NRI sites, etc.</span>
                </h3>
                <button
                  onClick={importSitesFromSitemap}
                  disabled={!website || importingSites}
                  className="text-[11px] text-[#7CB342] hover:text-[#8BC34A] flex items-center gap-1 disabled:opacity-40"
                >
                  {importingSites ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                  {importingSites ? "Scanning sitemap..." : "Auto-detect from sitemap"}
                </button>
              </div>

              <p className="text-[11px] text-zinc-500">
                Cabbge tracks each site independently — your corporate site, individual project microsites (e.g. <span className="text-zinc-400">thecamellias.com</span>), and country-specific sites (NRI, UAE).
                Each gets its own scans, content decay tracking, and GEO progress.
              </p>

              {/* Currently added sites */}
              {extraSites.length > 0 && (
                <div className="space-y-1.5">
                  {extraSites.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/40 border border-white/[0.04]">
                      <span className="text-[12px] text-zinc-200 flex-1 truncate">{s.label}</span>
                      <span className="text-[10px] text-zinc-500 truncate max-w-[240px]">{s.url.replace(/^https?:\/\//, "")}</span>
                      <button onClick={() => setExtraSites(extraSites.filter((_, j) => j !== i))} className="text-zinc-500 hover:text-red-400 flex-shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Sitemap candidates (pick to add) */}
              {siteCandidates.length > 0 && (
                <div className="p-3 rounded-lg bg-zinc-800/30 border border-white/[0.04]">
                  <p className="text-[11px] text-zinc-400 mb-2">
                    Found {siteCandidates.length} potential site{siteCandidates.length === 1 ? "" : "s"} on your sitemap. Pick the ones you want Cabbge to track:
                  </p>
                  <div className="space-y-1 max-h-[220px] overflow-y-auto">
                    {siteCandidates.map((c, i) => {
                      const selected = extraSites.some((s) => s.url === c.url);
                      return (
                        <button
                          key={i}
                          onClick={() => toggleSiteCandidate(c)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors ${
                            selected ? "bg-[#7CB342]/10 border border-[#7CB342]/30" : "border border-transparent hover:bg-zinc-800/40"
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                            selected ? "bg-[#7CB342] border-[#7CB342]" : "border-zinc-600"
                          }`}>
                            {selected && <CheckCircle2 size={10} className="text-zinc-900" />}
                          </div>
                          <span className="text-[11px] text-zinc-300 truncate flex-1">{c.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wide flex-shrink-0">{c.type.replace("_", " ")}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Manual add */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add site manually (e.g. thecamellias.com)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value.trim()) {
                      let u = e.currentTarget.value.trim();
                      if (!u.match(/^https?:\/\//)) u = `https://${u}`;
                      setExtraSites([...extraSites, { url: u, label: u.replace(/^https?:\/\//, "").replace(/\/$/, ""), type: "other" }]);
                      e.currentTarget.value = "";
                    }
                  }}
                  className="bg-zinc-900/80 border-white/[0.06] text-[13px] h-9 flex-1"
                />
              </div>
            </div>

            {/* Projects */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-zinc-300 flex items-center gap-2">
                  <Layers size={14} /> Projects
                  <span className="text-[10px] text-zinc-500 font-normal">More projects = more hyper-local queries</span>
                </h3>
                <button
                  onClick={addProject}
                  className="text-[11px] text-[#7CB342] hover:text-[#8BC34A] flex items-center gap-1"
                >
                  <Plus size={12} /> Add Project
                </button>
              </div>
              {projects.length === 0 && (
                <div className="p-4 rounded-lg bg-amber-500/[0.04] border border-amber-500/20">
                  <p className="text-[12px] text-amber-400">
                    No projects detected. Add your projects with locations and configurations for the best AI visibility scans.
                  </p>
                  <button onClick={addProject} className="mt-2 text-[12px] text-[#7CB342] underline">
                    + Add your first project
                  </button>
                </div>
              )}
              {projects.map((p, i) => (
                <div key={i} className="p-4 rounded-lg bg-zinc-900/60 border border-white/[0.04] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500 uppercase tracking-wide">Project {i + 1}</span>
                    <button onClick={() => removeProject(i)} className="text-zinc-600 hover:text-red-400">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Project name" value={p.name} onChange={(e) => updateProject(i, "name", e.target.value)} className="bg-zinc-800/60 border-white/[0.04] text-[12px] h-8" />
                    <Input placeholder="Location (e.g. Gachibowli, Hyderabad)" value={p.location} onChange={(e) => updateProject(i, "location", e.target.value)} className="bg-zinc-800/60 border-white/[0.04] text-[12px] h-8" />
                    <Input placeholder="Configurations (e.g. 2BHK, 3BHK, Villa)" value={p.configurations} onChange={(e) => updateProject(i, "configurations", e.target.value)} className="bg-zinc-800/60 border-white/[0.04] text-[12px] h-8" />
                    <Input placeholder="Price range (e.g. ₹80L - 1.5Cr)" value={p.priceRange} onChange={(e) => updateProject(i, "priceRange", e.target.value)} className="bg-zinc-800/60 border-white/[0.04] text-[12px] h-8" />
                  </div>
                </div>
              ))}
            </div>

            {/* Competitors */}
            <div className="space-y-3">
              <h3 className="text-[13px] font-semibold text-zinc-300">Competitors (auto-detected)</h3>
              <div className="flex flex-wrap gap-2">
                {competitors.map((c, i) => (
                  <Badge key={i} className="bg-zinc-800 text-zinc-300 border-zinc-700/50 rounded-md px-2.5 py-1 text-[11px] flex items-center gap-1.5">
                    {c}
                    <button onClick={() => setCompetitors(competitors.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400">
                      <X size={10} />
                    </button>
                  </Badge>
                ))}
                <Input
                  placeholder="+ Add competitor"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value.trim()) {
                      setCompetitors([...competitors, e.currentTarget.value.trim()]);
                      e.currentTarget.value = "";
                    }
                  }}
                  className="bg-zinc-900/80 border-white/[0.06] text-[12px] h-7 w-40"
                />
              </div>
            </div>

            {/* Continue button */}
            <Button
              onClick={goToBrandContext}
              disabled={!name.trim() || cities.filter(Boolean).length === 0}
              className="w-full bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 h-12 text-[15px] font-semibold rounded-lg mt-4"
            >
              Continue to brand context
              <ArrowRight size={16} className="ml-2" />
            </Button>
            <p className="text-center text-[11px] text-zinc-600">
              Last step — review what we drafted for your brand voice and vision.
            </p>
          </div>
        )}

        {/* STEP 3: Brand Context — voice, values, vision, target audience,
            marketing strategy, competitor analysis. Auto-discover prefills
            each from the user's site; the user can edit, replace, or
            expand. Every downstream agent (article writer, portal
            optimizer, GEO, hallucination audit) reads from these. */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="p-3 rounded-lg bg-[#7CB342]/[0.06] border border-[#7CB342]/20 flex items-start gap-2">
              <Sparkles size={14} className="text-[#7CB342] flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-[12px] text-zinc-200 font-semibold">We drafted these from your site.</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Edit, replace, or expand any block. Skip any field — you can come back from the Company panel any time. The richer this context, the sharper every article, portal listing, and AI-visibility scan we generate for you.
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <span className="text-[12px] text-red-400">{error}</span>
              </div>
            )}

            {[
              { label: "Product Info", hint: "What you build, configurations, price segments, signature features", value: productInfo, setter: setProductInfo, placeholder: "e.g. 3-4 BHK apartments in the ₹1.2-2.5 Cr band, IT-corridor focused, sky lounge + rooftop pool amenity stack." },
              { label: "Brand Voice", hint: "How your copy reads — luxury, family-focused, tech-forward, heritage, etc.", value: brandVoice, setter: setBrandVoice, placeholder: "e.g. Heritage-traditional with a contemporary execution. We lead with 30 years of trust + craftsmanship language." },
              { label: "Brand Values", hint: "The 3-4 values your brand actually leans into", value: brandValues, setter: setBrandValues, placeholder: "e.g. Trust (30-year track record), Quality (in-house design + construction), Community (every project has a community space)." },
              { label: "Brand Vision", hint: "Where you're going, the long-term promise to buyers", value: brandVision, setter: setBrandVision, placeholder: "e.g. Become South India's most trusted developer for IT-corridor families through verifiable build quality and community-led projects." },
              { label: "Target Audience", hint: "Who buys from you. Be specific — config, price, locality, family stage, NRI segments", value: targetAudience, setter: setTargetAudience, placeholder: "e.g. First-time IT-corridor buyers 28-35 (₹15-25L household income, 3BHK in Gachibowli/Kondapur). Plus NRI investors via UAE/UK channels for the 1.5 Cr+ tier." },
              { label: "Marketing Strategy", hint: "What your current digital marketing looks like (observable only — no fluff)", value: marketingStrategy, setter: setMarketingStrategy, placeholder: "e.g. We invest in YT walkthroughs, RERA-compliant content, and broker portals. Quarterly NRI campaigns. No paid social currently." },
              { label: "Competitor Analysis", hint: "Who you're up against and how you're positioned", value: competitorAnalysisDoc, setter: setCompetitorAnalysisDoc, placeholder: "e.g. Aparna and My Home are the volume players we compete on price; Total Environment competes on design above us; we differentiate on community + delivery track record." },
            ].map((field) => (
              <div key={field.label} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[13px] font-semibold text-zinc-200">{field.label}</h3>
                  <span className="text-[10px] text-zinc-500">{field.hint}</span>
                </div>
                <Textarea
                  value={field.value}
                  onChange={(e) => field.setter(e.target.value)}
                  placeholder={field.placeholder}
                  className="bg-zinc-900/80 border-white/[0.06] text-[13px] min-h-[100px] leading-relaxed"
                />
                <div className="flex items-center justify-between text-[10px] text-zinc-600">
                  <span>{field.value.length} chars</span>
                  {field.value.trim() && (
                    <button
                      type="button"
                      onClick={() => field.setter("")}
                      className="text-zinc-600 hover:text-red-400"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Nav buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => { setStep(2); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); }}
                disabled={savingFinish}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 h-12 text-[14px] font-medium rounded-lg px-5"
              >
                Back
              </Button>
              <Button
                onClick={handleFinish}
                disabled={savingFinish}
                className="flex-1 bg-[#7CB342] hover:bg-[#8BC34A] text-zinc-950 h-12 text-[15px] font-semibold rounded-lg"
              >
                {savingFinish ? (
                  <><Loader2 size={16} className="animate-spin mr-2" /> Saving...</>
                ) : (
                  <><Sparkles size={16} className="mr-2" />Launch Dashboard<ArrowRight size={16} className="ml-2" /></>
                )}
              </Button>
            </div>
            <p className="text-center text-[11px] text-zinc-600">
              All fields editable later from the Company panel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
