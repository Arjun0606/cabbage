"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Globe,
  MapPin,
  Plus,
  X,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { DEMO_CUSTOMERS } from "@/data/customers";

interface Project {
  name: string;
  website: string;
  location: string;
  configurations: string;
  priceRange: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Company
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [city, setCity] = useState("hyderabad");
  const [description, setDescription] = useState("");

  // Projects
  const [projects, setProjects] = useState<Project[]>([
    { name: "", website: "", location: "", configurations: "", priceRange: "" },
  ]);

  // Competitors
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [newCompetitor, setNewCompetitor] = useState("");

  const addProject = () => {
    setProjects([
      ...projects,
      { name: "", website: "", location: "", configurations: "", priceRange: "" },
    ]);
  };

  const updateProject = (idx: number, field: keyof Project, value: string) => {
    const updated = [...projects];
    updated[idx] = { ...updated[idx], [field]: value };
    setProjects(updated);
  };

  const removeProject = (idx: number) => {
    if (projects.length > 1) {
      setProjects(projects.filter((_, i) => i !== idx));
    }
  };

  const addCompetitor = () => {
    if (newCompetitor.trim()) {
      setCompetitors([...competitors, newCompetitor.trim()]);
      setNewCompetitor("");
    }
  };

  const loadDemo = (key: keyof typeof DEMO_CUSTOMERS) => {
    const demo = DEMO_CUSTOMERS[key];
    setCompanyName(demo.name);
    setWebsite(demo.website);
    setCity(demo.city);
    setDescription(demo.description);
    setProjects(
      demo.projects.map((p) => ({
        name: p.name,
        website: p.website,
        location: p.location,
        configurations: p.configurations,
        priceRange: p.priceRange,
      }))
    );
    setCompetitors(demo.competitors.map((c) => c.website));
  };

  const handleComplete = () => {
    // Store in localStorage for the dashboard to read
    const data = {
      name: companyName,
      description,
      website,
      city,
      projects: projects.filter((p) => p.name),
      competitors: competitors.map((c) => ({ name: c, website: c })),
      documents: {
        productInfo: description,
        competitorAnalysis: "",
        brandVoice: "",
        marketingStrategy: "",
      },
    };
    localStorage.setItem("cabbageseo_company", JSON.stringify(data));
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-emerald-400">
            <Sparkles size={24} />
            <h1 className="text-2xl font-bold">CabbageSEO</h1>
          </div>
          <p className="text-zinc-400 text-sm">
            AI Marketing Agent for Real Estate Developers
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s <= step
                    ? "w-12 bg-emerald-500"
                    : "w-8 bg-zinc-800"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Quick Demo Load */}
        {step === 1 && (
          <Card className="bg-zinc-900/50 border-zinc-800 border-dashed">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 mb-2">Quick start with demo data:</p>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(DEMO_CUSTOMERS).map(([key, val]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => loadDemo(key as keyof typeof DEMO_CUSTOMERS)}
                    className="text-xs border-zinc-700 hover:border-emerald-600 hover:text-emerald-400"
                  >
                    <Zap size={12} className="mr-1" />
                    {val.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Company */}
        {step === 1 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 size={18} />
                Tell us about your company
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Company Name *</label>
                <Input
                  placeholder="e.g. Urbanrise, Prestige, Aparna"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Main Website *</label>
                <Input
                  placeholder="e.g. urbanrise.in"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Primary City</label>
                <Input
                  placeholder="e.g. Hyderabad, Dubai, London, Gurgaon..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                  list="city-suggestions"
                />
                <datalist id="city-suggestions">
                  <option value="Hyderabad" />
                  <option value="Bangalore" />
                  <option value="Chennai" />
                  <option value="Mumbai" />
                  <option value="Pune" />
                  <option value="Delhi NCR" />
                  <option value="Gurgaon" />
                  <option value="Noida" />
                  <option value="Kolkata" />
                  <option value="Ahmedabad" />
                  <option value="Kochi" />
                  <option value="Goa" />
                  <option value="Lucknow" />
                  <option value="Jaipur" />
                  <option value="Chandigarh" />
                  <option value="Indore" />
                  <option value="Vizag" />
                  <option value="Dubai" />
                  <option value="Abu Dhabi" />
                  <option value="Riyadh" />
                  <option value="London" />
                </datalist>
                <p className="text-[10px] text-zinc-600 mt-1">Works globally — type any city</p>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">About the company</label>
                <Textarea
                  placeholder="Brief description of your company, target buyers, USPs..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 min-h-[80px]"
                />
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!companyName || !website}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                Continue <ArrowRight size={14} className="ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Projects */}
        {step === 2 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin size={18} />
                Your active projects
              </CardTitle>
              <p className="text-xs text-zinc-500">
                Add your residential projects. Each project gets its own SEO audit, AI visibility tracking, and content strategy.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {projects.map((project, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Project {idx + 1}</span>
                    {projects.length > 1 && (
                      <button
                        onClick={() => removeProject(idx)}
                        className="text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Project name"
                      value={project.name}
                      onChange={(e) => updateProject(idx, "name", e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-sm"
                    />
                    <Input
                      placeholder="Project website/URL"
                      value={project.website}
                      onChange={(e) => updateProject(idx, "website", e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-sm"
                    />
                    <Input
                      placeholder="Location (e.g. Kompally)"
                      value={project.location}
                      onChange={(e) => updateProject(idx, "location", e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-sm"
                    />
                    <Input
                      placeholder="Configs (e.g. 2BHK, 3BHK)"
                      value={project.configurations}
                      onChange={(e) => updateProject(idx, "configurations", e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-sm"
                    />
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={addProject}
                className="w-full border-dashed border-zinc-700 text-zinc-400 hover:text-emerald-400 hover:border-emerald-600"
              >
                <Plus size={14} className="mr-2" />
                Add another project
              </Button>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="border-zinc-700"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  Continue <ArrowRight size={14} className="ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Competitors + Launch */}
        {step === 3 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe size={18} />
                Competitors & Launch
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">
                  Add competitor websites (we'll track their SEO + content)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {competitors.map((c, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="bg-zinc-800 text-zinc-300 gap-1 pr-1"
                    >
                      {c}
                      <button
                        onClick={() =>
                          setCompetitors(competitors.filter((_, j) => j !== i))
                        }
                        className="ml-1 hover:text-red-400"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="competitor-website.com"
                    value={newCompetitor}
                    onChange={(e) => setNewCompetitor(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
                    className="bg-zinc-800 border-zinc-700 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addCompetitor}
                    className="border-zinc-700"
                  >
                    <Plus size={14} />
                  </Button>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-zinc-800/50 p-4 space-y-2">
                <h4 className="text-sm font-medium text-emerald-400">Ready to launch</h4>
                <div className="text-xs text-zinc-400 space-y-1">
                  <p>
                    <span className="text-zinc-300">{companyName}</span> &bull;{" "}
                    {website} &bull; {city}
                  </p>
                  <p>{projects.filter((p) => p.name).length} project(s) configured</p>
                  <p>{competitors.length} competitor(s) tracked</p>
                </div>
                <div className="text-xs text-zinc-500 pt-2">
                  CabbageSEO will immediately run:
                </div>
                <ul className="text-xs text-zinc-400 space-y-1">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    SEO audit on your main site + all project pages
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                    AI visibility check across ChatGPT, Claude, Perplexity, Gemini
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    Real estate-specific checks (RERA, pricing, floor plans, schema)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Localized content generation for all project microlocations
                  </li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="border-zinc-700"
                >
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Sparkles size={14} className="mr-2" />
                  Launch CabbageSEO
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-zinc-600">
          Built for Indian real estate developers. Hyderabad &bull; Bangalore &bull; Chennai
        </p>
      </div>
    </div>
  );
}
