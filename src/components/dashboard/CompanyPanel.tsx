"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  FileText,
  Users,
  Plus,
  X,
  Globe,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Upload,
  Loader2,
  MapPin,
} from "lucide-react";
import { useState, useRef } from "react";
import { CityAutocomplete } from "@/components/CityAutocomplete";

interface Company {
  name: string;
  description: string;
  website: string;
  city: string;
  yearEstablished: string;
  projectsCompleted: string;
  awards: string;
  sites: { url: string; label: string }[];
  projects: { name: string; website: string; location: string; configurations?: string; priceRange?: string; reraNumber?: string; amenities?: string; status?: string }[];
  competitors: { name: string; website: string }[];
  documents: {
    productInfo: string;
    competitorAnalysis: string;
    brandVoice: string;
    marketingStrategy: string;
    brandValues: string;
    brandVision: string;
    targetAudience: string;
  };
}

interface Props {
  company: Company;
  setCompany: (c: Company) => void;
}

export function CompanyPanel({ company, setCompany }: Props) {
  const [newCompetitor, setNewCompetitor] = useState("");
  const [newSite, setNewSite] = useState("");
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  const addSite = () => {
    if (!newSite.trim()) return;
    const url = newSite.trim();
    const label = url.replace(/^https?:\/\//, "").replace(/\/$/, "").split("/")[0];
    setCompany({ ...company, sites: [...(company.sites || []), { url, label }] });
    setNewSite("");
  };

  const removeSite = (idx: number) => {
    setCompany({ ...company, sites: (company.sites || []).filter((_, i) => i !== idx) });
  };

  const addCompetitor = () => {
    if (!newCompetitor.trim()) return;
    setCompany({
      ...company,
      competitors: [...company.competitors, { name: newCompetitor, website: newCompetitor }],
    });
    setNewCompetitor("");
  };

  const removeCompetitor = (idx: number) => {
    setCompany({ ...company, competitors: company.competitors.filter((_, i) => i !== idx) });
  };

  const addProject = () => {
    setCompany({
      ...company,
      projects: [...(company.projects || []), { name: "", website: "", location: "", configurations: "", priceRange: "", reraNumber: "", amenities: "", status: "Active" }],
    });
    setExpandedProject((company.projects || []).length);
  };

  const updateProject = (idx: number, field: string, value: string) => {
    const updated = [...(company.projects || [])];
    updated[idx] = { ...updated[idx], [field]: value };
    setCompany({ ...company, projects: updated });
  };

  const removeProject = (idx: number) => {
    setCompany({ ...company, projects: (company.projects || []).filter((_, i) => i !== idx) });
    if (expandedProject === idx) setExpandedProject(null);
  };

  const uploadPdf = async (docKey: string) => {
    setUploadTarget(docKey);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    setUploadingDoc(uploadTarget);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      // Append extracted text to the document field
      const currentValue = company.documents[uploadTarget as keyof typeof company.documents] || "";
      const newValue = currentValue
        ? `${currentValue}\n\n--- Extracted from ${data.fileName} ---\n${data.text}`
        : data.text;

      setCompany({
        ...company,
        documents: { ...company.documents, [uploadTarget]: newValue },
      });
      setExpandedDoc(uploadTarget);
    } catch {
      alert("Failed to process PDF. Try copy-pasting the text instead.");
    } finally {
      setUploadingDoc(null);
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const documents = [
    { key: "productInfo", label: "Product Information", icon: FileText, hint: "What you sell, key features, pricing strategy" },
    { key: "brandVoice", label: "Brand Voice & Tone", icon: Building2, hint: "How your brand speaks — formal, friendly, luxurious?" },
    { key: "brandValues", label: "Brand Values", icon: Globe, hint: "Core values and brand promise" },
    { key: "brandVision", label: "Brand Vision", icon: Globe, hint: "Long-term vision and mission statement" },
    { key: "targetAudience", label: "Target Audience", icon: Users, hint: "Who are your buyers? Demographics, preferences" },
    { key: "marketingStrategy", label: "Marketing Strategy", icon: Globe, hint: "Current strategy, channels, campaigns, budget" },
    { key: "competitorAnalysis", label: "Competitor Analysis", icon: Users, hint: "Key competitors, their strengths, your differentiation" },
  ];

  return (
    <div className="p-4 space-y-5">
      {/* Hidden file input for PDF upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Company Info */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={15} className="text-zinc-500" />
          <h3 className="text-[13px] font-semibold text-zinc-200">Company</h3>
        </div>
        <div className="space-y-2.5">
          <Input
            placeholder="Company name"
            value={company.name}
            onChange={(e) => setCompany({ ...company, name: e.target.value })}
            className="bg-zinc-900/80 border-white/[0.06] text-[13px] h-9 placeholder:text-zinc-500 focus:border-[#7CB342]/40 focus:ring-[#7CB342]/10 transition-colors"
          />
          <Input
            placeholder="https://www.example.com/"
            value={company.website}
            onChange={(e) => setCompany({ ...company, website: e.target.value })}
            className="bg-zinc-900/80 border-white/[0.06] text-[13px] h-9 placeholder:text-zinc-500 focus:border-[#7CB342]/40 focus:ring-[#7CB342]/10 transition-colors"
          />
          <CityAutocomplete
            value={company.city}
            onChange={(city) => setCompany({ ...company, city })}
            placeholder="Primary city"
          />
          <Textarea
            placeholder="About the company..."
            value={company.description}
            onChange={(e) => setCompany({ ...company, description: e.target.value })}
            className="bg-zinc-900/80 border-white/[0.06] text-[13px] min-h-[72px] placeholder:text-zinc-500 leading-relaxed focus:border-[#7CB342]/40 focus:ring-[#7CB342]/10 transition-colors"
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Year established"
              value={company.yearEstablished}
              onChange={(e) => setCompany({ ...company, yearEstablished: e.target.value })}
              className="bg-zinc-900/80 border-white/[0.06] text-[13px] h-9 placeholder:text-zinc-500 focus:border-[#7CB342]/40 focus:ring-[#7CB342]/10 transition-colors"
            />
            <Input
              placeholder="Projects completed"
              value={company.projectsCompleted}
              onChange={(e) => setCompany({ ...company, projectsCompleted: e.target.value })}
              className="bg-zinc-900/80 border-white/[0.06] text-[13px] h-9 placeholder:text-zinc-500 focus:border-[#7CB342]/40 focus:ring-[#7CB342]/10 transition-colors"
            />
            <Input
              placeholder="Awards / recognition"
              value={company.awards}
              onChange={(e) => setCompany({ ...company, awards: e.target.value })}
              className="bg-zinc-900/80 border-white/[0.06] text-[13px] h-9 placeholder:text-zinc-500 focus:border-[#7CB342]/40 focus:ring-[#7CB342]/10 transition-colors"
            />
          </div>
        </div>
      </section>

      {/* Projects — rich data per project */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={15} className="text-zinc-500" />
          <h3 className="text-[13px] font-semibold text-zinc-200">Projects</h3>
          <Badge variant="secondary" className="text-[10px] bg-zinc-800 text-zinc-500 ml-auto h-5 px-1.5 rounded-md">
            {(company.projects || []).length}
          </Badge>
        </div>
        <p className="text-[11px] text-zinc-500 mb-2.5">Each project gets its own SEO, content, and AI visibility tracking.</p>

        <div className="space-y-2">
          {(company.projects || []).map((project, idx) => (
            <div key={idx} className="rounded-lg border border-white/[0.06] bg-zinc-900/40 overflow-hidden hover:border-white/[0.1] transition-colors duration-150">
              <button
                onClick={() => setExpandedProject(expandedProject === idx ? null : idx)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-zinc-800/30 active:scale-[0.99] transition-all duration-150"
              >
                <div className="w-2 h-2 rounded-full bg-[#7CB342] flex-shrink-0" />
                <span className="text-[13px] text-zinc-300 flex-1 truncate">
                  {project.name || `Project ${idx + 1}`}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[9px] h-4 px-1 rounded border-0 flex-shrink-0 ${
                    project.website
                      ? "bg-[#7CB342]/10 text-[#7CB342]"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                  title={project.website ? `Own site: ${project.website}` : "Scanned as part of the main site"}
                >
                  {project.website ? "own site" : "main site"}
                </Badge>
                {project.location && (
                  <span className="text-[11px] text-zinc-500 truncate max-w-[80px]">{project.location}</span>
                )}
                <ChevronDown size={14} className={`text-zinc-600 transition-transform ${expandedProject === idx ? "rotate-180" : ""}`} />
              </button>

              {expandedProject === idx && (
                <div className="px-3 pb-3 space-y-2.5 border-t border-zinc-800/40 pt-2.5">
                  <Input placeholder="Project name" value={project.name} onChange={(e) => updateProject(idx, "name", e.target.value)}
                    className="bg-zinc-900/80 border-zinc-800 text-[12px] h-8 placeholder:text-zinc-500" />

                  {/* Site attachment: either on main site or own URL.
                      Toggle swaps the control; the underlying data is
                      still project.website = "" (attached) or the URL. */}
                  <div className="rounded-lg bg-zinc-800/40 border border-zinc-800/60 p-2.5 space-y-2">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">Where does this project live on the web?</div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => updateProject(idx, "website", "")}
                        className={`flex-1 text-[11px] px-2.5 py-1.5 rounded-md border transition-colors ${
                          !project.website
                            ? "bg-[#7CB342]/10 text-[#7CB342] border-[#7CB342]/30"
                            : "bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:text-zinc-300"
                        }`}
                      >
                        On main site
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!project.website) updateProject(idx, "website", "https://");
                        }}
                        className={`flex-1 text-[11px] px-2.5 py-1.5 rounded-md border transition-colors ${
                          project.website
                            ? "bg-[#7CB342]/10 text-[#7CB342] border-[#7CB342]/30"
                            : "bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:text-zinc-300"
                        }`}
                      >
                        Has own URL
                      </button>
                    </div>
                    {project.website ? (
                      <Input
                        placeholder="https://projectmicrosite.com"
                        value={project.website}
                        onChange={(e) => updateProject(idx, "website", e.target.value)}
                        className="bg-zinc-900/80 border-zinc-800 text-[12px] h-8 placeholder:text-zinc-500"
                      />
                    ) : (
                      <div className="text-[11px] text-zinc-500">
                        Scanned as part of {company.website || "your main site"}.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Location / Locality" value={project.location} onChange={(e) => updateProject(idx, "location", e.target.value)}
                      className="bg-zinc-900/80 border-zinc-800 text-[12px] h-8 placeholder:text-zinc-500" />
                    <Input placeholder="Configs (2BHK, 3BHK, Villa)" value={project.configurations || ""} onChange={(e) => updateProject(idx, "configurations", e.target.value)}
                      className="bg-zinc-900/80 border-zinc-800 text-[12px] h-8 placeholder:text-zinc-500" />
                    <Input placeholder="Price range" value={project.priceRange || ""} onChange={(e) => updateProject(idx, "priceRange", e.target.value)}
                      className="bg-zinc-900/80 border-zinc-800 text-[12px] h-8 placeholder:text-zinc-500" />
                    <Input placeholder="RERA number" value={project.reraNumber || ""} onChange={(e) => updateProject(idx, "reraNumber", e.target.value)}
                      className="bg-zinc-900/80 border-zinc-800 text-[12px] h-8 placeholder:text-zinc-500" />
                  </div>
                  <Textarea placeholder="Key amenities (pool, gym, clubhouse, etc.)" value={project.amenities || ""} onChange={(e) => updateProject(idx, "amenities", e.target.value)}
                    className="bg-zinc-900/80 border-zinc-800 text-[12px] min-h-[50px] placeholder:text-zinc-500" />
                  <div className="flex items-center justify-between pt-1">
                    <select
                      value={project.status || "Active"}
                      onChange={(e) => updateProject(idx, "status", e.target.value)}
                      className="bg-zinc-900/80 border border-zinc-800 text-[12px] h-8 rounded-md px-2 text-zinc-300"
                    >
                      <option value="Active">Active</option>
                      <option value="Pre-launch">Pre-launch</option>
                      <option value="Under Construction">Under Construction</option>
                      <option value="Ready to Move">Ready to Move</option>
                      <option value="Sold Out">Sold Out</option>
                    </select>
                    <button onClick={() => removeProject(idx)} className="text-[11px] text-zinc-600 hover:text-red-400 transition-colors">
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addProject}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-zinc-700/50 text-[12px] text-zinc-500 hover:text-[#7CB342] hover:border-[#7CB342]/30 hover:bg-[#7CB342]/5 active:scale-[0.99] transition-all duration-150"
          >
            <Plus size={13} /> Add project
          </button>
        </div>
      </section>

      {/* Sites */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <ExternalLink size={15} className="text-zinc-500" />
          <h3 className="text-[13px] font-semibold text-zinc-200">Sites</h3>
          <Badge variant="secondary" className="text-[10px] bg-zinc-800 text-zinc-500 ml-auto h-5 px-1.5 rounded-md">
            {(company.sites || []).length + (company.website ? 1 : 0)}
          </Badge>
        </div>

        <div className="space-y-1.5">
          {company.website && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-900/60 border border-white/[0.06]">
              <div className="w-2 h-2 rounded-full bg-[#7CB342] flex-shrink-0" />
              <span className="text-[13px] text-zinc-300 truncate flex-1">
                {company.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </span>
              <Badge variant="secondary" className="text-[10px] bg-zinc-800 text-zinc-300 border-0 h-5 px-1.5 rounded-md font-medium">
                Main
              </Badge>
            </div>
          )}

          {(company.sites || []).map((site, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-900/60 border border-white/[0.06]">
              <div className="w-2 h-2 rounded-full bg-zinc-500 flex-shrink-0" />
              <span className="text-[13px] text-zinc-300 truncate flex-1">{site.label}</span>
              <button onClick={() => removeSite(i)} className="text-zinc-600 hover:text-red-400 transition-colors p-0.5">
                <X size={13} />
              </button>
            </div>
          ))}

          <div className="flex gap-1.5">
            <Input
              placeholder="+ Add site URL"
              value={newSite}
              onChange={(e) => setNewSite(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSite()}
              className="bg-zinc-900/80 border-zinc-800 text-[13px] h-9 flex-1 placeholder:text-zinc-500"
            />
            <button onClick={addSite} className="h-9 w-9 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all flex-shrink-0">
              <Plus size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Documents — with PDF upload */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <FileText size={15} className="text-zinc-500" />
          <h3 className="text-[13px] font-semibold text-zinc-200">Documents</h3>
        </div>
        <p className="text-[11px] text-zinc-500 mb-2.5">Upload PDFs or type text. This context is used by all AI agents.</p>

        <div className="space-y-0.5">
          {documents.map(({ key, label, icon: Icon, hint }) => (
            <div key={key}>
              <button
                onClick={() => setExpandedDoc(expandedDoc === key ? null : key)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors text-[13px] text-zinc-300 group"
              >
                <Icon size={15} className="text-zinc-500 group-hover:text-zinc-400 transition-colors" />
                <span className="flex-1 text-left">{label}</span>
                {company.documents[key as keyof typeof company.documents] ? (
                  <Badge variant="secondary" className="text-[10px] bg-zinc-800 text-zinc-300 border-0 h-5 px-1.5 rounded-md">
                    Set
                  </Badge>
                ) : (
                  <ChevronRight size={14} className={`text-zinc-600 transition-transform ${expandedDoc === key ? "rotate-90" : ""}`} />
                )}
              </button>
              {expandedDoc === key && (
                <div className="px-1 pb-2 space-y-2">
                  <p className="text-[11px] text-zinc-600 px-2">{hint}</p>
                  <Textarea
                    placeholder={`Enter ${label.toLowerCase()} or upload a PDF...`}
                    value={company.documents[key as keyof typeof company.documents] || ""}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        documents: { ...company.documents, [key]: e.target.value },
                      })
                    }
                    className="bg-zinc-900/80 border-zinc-800 text-[13px] min-h-[80px] placeholder:text-zinc-500 leading-relaxed"
                  />
                  <button
                    onClick={() => uploadPdf(key)}
                    disabled={uploadingDoc === key}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/50 text-[12px] text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all disabled:opacity-40"
                  >
                    {uploadingDoc === key ? (
                      <><Loader2 size={13} className="animate-spin" /> Extracting...</>
                    ) : (
                      <><Upload size={13} /> Upload PDF</>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Competitors */}
      <section>
        <h3 className="text-[13px] font-semibold text-zinc-200 mb-2">Competitors</h3>
        {company.competitors.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {company.competitors.map((c, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="bg-zinc-800/80 text-zinc-300 text-[12px] gap-1 pr-1 h-7 rounded-md border border-zinc-700/50"
              >
                {c.name}
                <button onClick={() => removeCompetitor(i)} className="ml-0.5 hover:text-red-400 transition-colors p-0.5">
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-1.5">
          <Input
            placeholder="+ Add competitor domain"
            value={newCompetitor}
            onChange={(e) => setNewCompetitor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
            className="bg-zinc-900/80 border-zinc-800 text-[13px] h-9 flex-1 placeholder:text-zinc-500"
          />
          <button onClick={addCompetitor} className="h-9 w-9 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all flex-shrink-0">
            <Plus size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}
