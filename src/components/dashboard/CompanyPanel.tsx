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
} from "lucide-react";
import { useState } from "react";

interface Company {
  name: string;
  description: string;
  website: string;
  city: string;
  sites: { url: string; label: string }[];
  projects: { name: string; website: string; location: string }[];
  competitors: { name: string; website: string }[];
  documents: {
    productInfo: string;
    competitorAnalysis: string;
    brandVoice: string;
    marketingStrategy: string;
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

  const documents = [
    { key: "productInfo", label: "Product Information", icon: FileText },
    { key: "competitorAnalysis", label: "Competitor Analysis", icon: Users },
    { key: "brandVoice", label: "Brand Voice", icon: Building2 },
    { key: "marketingStrategy", label: "Marketing Strategy", icon: Globe },
  ];

  return (
    <div className="p-4 space-y-5">
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
            className="bg-zinc-900/80 border-zinc-800 text-[13px] h-9 placeholder:text-zinc-600"
          />
          <Input
            placeholder="https://www.example.com/"
            value={company.website}
            onChange={(e) => setCompany({ ...company, website: e.target.value })}
            className="bg-zinc-900/80 border-zinc-800 text-[13px] h-9 placeholder:text-zinc-600"
          />
          <Input
            placeholder="City (e.g. Hyderabad, Dubai, London...)"
            value={company.city}
            onChange={(e) => setCompany({ ...company, city: e.target.value })}
            className="bg-zinc-900/80 border-zinc-800 text-[13px] h-9 placeholder:text-zinc-600"
            list="dashboard-city-suggestions"
          />
          <datalist id="dashboard-city-suggestions">
            {["Hyderabad","Bangalore","Chennai","Mumbai","Pune","Delhi NCR","Gurgaon","Noida","Kolkata","Ahmedabad","Kochi","Goa","Lucknow","Jaipur","Chandigarh","Indore","Vizag","Dubai","Abu Dhabi","Riyadh","London"].map(c => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Textarea
            placeholder="About the company..."
            value={company.description}
            onChange={(e) => setCompany({ ...company, description: e.target.value })}
            className="bg-zinc-900/80 border-zinc-800 text-[13px] min-h-[72px] placeholder:text-zinc-600 leading-relaxed"
          />
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
        <p className="text-[11px] text-zinc-600 mb-2.5">Main site + project microsites. Each scan uses credits.</p>

        <div className="space-y-1.5">
          {company.website && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/50">
              <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-[13px] text-zinc-300 truncate flex-1">
                {company.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </span>
              <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-0 h-5 px-1.5 rounded-md font-medium">
                Main
              </Badge>
            </div>
          )}

          {(company.sites || []).map((site, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/50">
              <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="text-[13px] text-zinc-300 truncate flex-1">{site.label}</span>
              <button
                onClick={() => removeSite(i)}
                className="text-zinc-600 hover:text-red-400 transition-colors p-0.5"
              >
                <X size={13} />
              </button>
            </div>
          ))}

          <div className="flex gap-1.5">
            <Input
              placeholder="+ Add project site (e.g. makutataranga.com)"
              value={newSite}
              onChange={(e) => setNewSite(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSite()}
              className="bg-zinc-900/80 border-zinc-800 text-[13px] h-9 flex-1 placeholder:text-zinc-600"
            />
            <button
              onClick={addSite}
              className="h-9 w-9 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all flex-shrink-0"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Documents */}
      <section>
        <h3 className="text-[13px] font-semibold text-zinc-200 mb-2">Documents</h3>
        <div className="space-y-0.5">
          {documents.map(({ key, label, icon: Icon }) => (
            <div key={key}>
              <button
                onClick={() => setExpandedDoc(expandedDoc === key ? null : key)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors text-[13px] text-zinc-300 group"
              >
                <Icon size={15} className="text-zinc-500 group-hover:text-zinc-400 transition-colors" />
                <span className="flex-1 text-left">{label}</span>
                {company.documents[key as keyof typeof company.documents] ? (
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-0 h-5 px-1.5 rounded-md">
                    Set
                  </Badge>
                ) : (
                  <ChevronRight size={14} className={`text-zinc-600 transition-transform ${expandedDoc === key ? "rotate-90" : ""}`} />
                )}
              </button>
              {expandedDoc === key && (
                <div className="px-1 pb-1">
                  <Textarea
                    placeholder={`Enter ${label.toLowerCase()}...`}
                    value={company.documents[key as keyof typeof company.documents]}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        documents: { ...company.documents, [key]: e.target.value },
                      })
                    }
                    className="bg-zinc-900/80 border-zinc-800 text-[13px] min-h-[80px] placeholder:text-zinc-600 leading-relaxed"
                  />
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
                <button
                  onClick={() => removeCompetitor(i)}
                  className="ml-0.5 hover:text-red-400 transition-colors p-0.5"
                >
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
            className="bg-zinc-900/80 border-zinc-800 text-[13px] h-9 flex-1 placeholder:text-zinc-600"
          />
          <button
            onClick={addCompetitor}
            className="h-9 w-9 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all flex-shrink-0"
          >
            <Plus size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}
