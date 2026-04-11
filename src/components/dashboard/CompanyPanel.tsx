"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  FileText,
  Users,
  Plus,
  X,
  Globe,
} from "lucide-react";
import { useState } from "react";

interface Company {
  name: string;
  description: string;
  website: string;
  city: string;
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
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const addCompetitor = () => {
    if (!newCompetitor.trim()) return;
    setCompany({
      ...company,
      competitors: [
        ...company.competitors,
        { name: newCompetitor, website: newCompetitor },
      ],
    });
    setNewCompetitor("");
  };

  const removeCompetitor = (idx: number) => {
    setCompany({
      ...company,
      competitors: company.competitors.filter((_, i) => i !== idx),
    });
  };

  const documents = [
    { key: "productInfo", label: "Product Information", icon: FileText },
    { key: "competitorAnalysis", label: "Competitor Analysis", icon: Users },
    { key: "brandVoice", label: "Brand Voice", icon: Building2 },
    { key: "marketingStrategy", label: "Marketing Strategy", icon: Globe },
  ];

  return (
    <ScrollArea className="bg-zinc-950 p-4">
      <div className="space-y-4">
        {/* Company Info */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 size={14} />
              Company
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Company name (e.g. Urbanrise)"
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-sm"
            />
            <Input
              placeholder="Website URL"
              value={company.website}
              onChange={(e) =>
                setCompany({ ...company, website: e.target.value })
              }
              className="bg-zinc-800 border-zinc-700 text-sm"
            />
            <Input
              placeholder="City (e.g. Hyderabad, Dubai, London...)"
              value={company.city}
              onChange={(e) => setCompany({ ...company, city: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-sm"
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
              onChange={(e) =>
                setCompany({ ...company, description: e.target.value })
              }
              className="bg-zinc-800 border-zinc-700 text-sm min-h-[60px]"
            />
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {documents.map(({ key, label, icon: Icon }) => (
              <div key={key}>
                <button
                  onClick={() =>
                    setExpandedDoc(expandedDoc === key ? null : key)
                  }
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800 transition-colors text-sm text-zinc-300"
                >
                  <Icon size={14} className="text-zinc-500" />
                  {label}
                  {company.documents[key as keyof typeof company.documents] && (
                    <Badge
                      variant="secondary"
                      className="ml-auto text-[10px] bg-emerald-900/50 text-emerald-400"
                    >
                      Set
                    </Badge>
                  )}
                </button>
                {expandedDoc === key && (
                  <Textarea
                    placeholder={`Enter ${label.toLowerCase()}...`}
                    value={
                      company.documents[key as keyof typeof company.documents]
                    }
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        documents: {
                          ...company.documents,
                          [key]: e.target.value,
                        },
                      })
                    }
                    className="mt-1 bg-zinc-800 border-zinc-700 text-sm min-h-[80px]"
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Competitors */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Competitors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {company.competitors.map((c, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="bg-zinc-800 text-zinc-300 gap-1 pr-1"
                >
                  {c.name}
                  <button
                    onClick={() => removeCompetitor(i)}
                    className="ml-1 hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-1">
              <Input
                placeholder="+ Add competitor domain"
                value={newCompetitor}
                onChange={(e) => setNewCompetitor(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
                className="bg-zinc-800 border-zinc-700 text-sm flex-1"
              />
              <button
                onClick={addCompetitor}
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
