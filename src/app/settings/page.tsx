"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plug,
  PenTool,
  Save,
  CheckCircle2,
  Bot,
  User,
  CreditCard,
  Shield,
  ArrowUpCircle,
} from "lucide-react";
import Link from "next/link";
import { Sidebar } from "@/components/dashboard/Sidebar";

// ---------- Integration definitions ----------

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "publishing" | "analytics" | "socials";
  connected: boolean;
  fields: { key: string; label: string; placeholder: string; type: "text" | "password" }[];
}

const INTEGRATIONS: Integration[] = [
  {
    id: "wordpress", name: "WordPress", description: "Publish articles to WordPress.com",
    icon: "W", category: "publishing", connected: false,
    fields: [
      { key: "siteUrl", label: "Site URL", placeholder: "yoursite.wordpress.com", type: "text" },
      { key: "accessToken", label: "Access Token", placeholder: "WordPress.com OAuth token", type: "password" },
    ],
  },
  {
    id: "wordpress_self", name: "WordPress (Self-Hosted)", description: "Connect via application password",
    icon: "W", category: "publishing", connected: false,
    fields: [
      { key: "siteUrl", label: "Site URL", placeholder: "https://yoursite.com", type: "text" },
      { key: "username", label: "Username", placeholder: "admin", type: "text" },
      { key: "applicationPassword", label: "Application Password", placeholder: "xxxx xxxx xxxx xxxx", type: "password" },
    ],
  },
  {
    id: "webflow", name: "Webflow", description: "Publish to Webflow CMS collections",
    icon: "Wf", category: "publishing", connected: false,
    fields: [
      { key: "apiToken", label: "API Token", placeholder: "Webflow API token", type: "password" },
      { key: "siteId", label: "Site ID", placeholder: "Your Webflow site ID", type: "text" },
      { key: "collectionId", label: "Blog Collection ID", placeholder: "Collection ID for articles", type: "text" },
    ],
  },
  {
    id: "gsc", name: "Google Search Console", description: "Monitor SEO performance and indexing",
    icon: "G", category: "analytics", connected: false, fields: [],
  },
  {
    id: "linkedin", name: "LinkedIn", description: "Share professional content",
    icon: "in", category: "socials", connected: false, fields: [],
  },
];

// ---------- Component ----------

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("ai-cmo");
  const [companyName, setCompanyName] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const [integrationValues, setIntegrationValues] = useState<Record<string, Record<string, string>>>({});
  const [connectedIntegrations, setConnectedIntegrations] = useState<Set<string>>(new Set());
  const [testingId, setTestingId] = useState<string | null>(null);

  const [writingInstructions, setWritingInstructions] = useState({
    linkedin: "", instagram: "", whatsapp: "", facebook: "", articles: "", general: "",
  });
  const [instructionsSaved, setInstructionsSaved] = useState(false);

  // Load saved state
  useEffect(() => {
    try {
      const company = localStorage.getItem("cabbageseo_company");
      if (company) {
        const parsed = JSON.parse(company);
        setCompanyName(parsed.name || "");
        setCompanyUrl(parsed.website || "");
      }
      const savedIntegrations = localStorage.getItem("cabbageseo_integrations");
      if (savedIntegrations) {
        const parsed = JSON.parse(savedIntegrations);
        setConnectedIntegrations(new Set(parsed.connected || []));
        setIntegrationValues(parsed.values || {});
      }
      const savedInstructions = localStorage.getItem("cabbageseo_writing_instructions");
      if (savedInstructions) setWritingInstructions(JSON.parse(savedInstructions));
    } catch { /* use defaults */ }
  }, []);

  const changeProductUrl = () => {
    if (!newUrl.trim()) return;
    const url = newUrl.trim().startsWith("http") ? newUrl.trim() : `https://${newUrl.trim()}`;
    const name = url.replace(/^https?:\/\//, "").split(".")[0];
    const companyData = {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      description: "", website: url, city: "", sites: [], projects: [], competitors: [],
      documents: { productInfo: "", competitorAnalysis: "", brandVoice: "", marketingStrategy: "" },
    };
    localStorage.setItem("cabbageseo_company", JSON.stringify(companyData));
    setCompanyName(companyData.name);
    setCompanyUrl(url);
    setNewUrl("");
  };

  const handleConnect = async (integration: Integration) => {
    if (integration.id === "gsc") {
      try {
        const res = await fetch("/api/integrations/gsc");
        const data = await res.json();
        if (data.authUrl) window.location.href = data.authUrl;
        else alert("Google Search Console requires GOOGLE_CLIENT_ID to be configured.");
      } catch { alert("Failed to start Google OAuth flow."); }
      return;
    }
    const values = integrationValues[integration.id] || {};
    if (integration.fields.length > 0 && Object.keys(values).length === 0) {
      alert("Please fill in the connection details first.");
      return;
    }
    setTestingId(integration.id);
    try {
      const provider = integration.id === "wordpress" ? "wordpress_com" : integration.id === "wordpress_self" ? "self_hosted" : "webflow";
      const res = await fetch("/api/publish", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, credentials: values }) });
      const data = await res.json();
      if (data.connected) {
        const newConnected = new Set(connectedIntegrations);
        newConnected.add(integration.id);
        setConnectedIntegrations(newConnected);
        localStorage.setItem("cabbageseo_integrations", JSON.stringify({ connected: Array.from(newConnected), values: integrationValues }));
      } else {
        alert(`Connection failed: ${data.error || "Unknown error"}`);
      }
    } catch { alert("Connection test failed."); }
    finally { setTestingId(null); }
  };

  const handleDisconnect = (id: string) => {
    const newConnected = new Set(connectedIntegrations);
    newConnected.delete(id);
    setConnectedIntegrations(newConnected);
    const newValues = { ...integrationValues };
    delete newValues[id];
    setIntegrationValues(newValues);
    localStorage.setItem("cabbageseo_integrations", JSON.stringify({ connected: Array.from(newConnected), values: newValues }));
  };

  const saveWritingInstructions = () => {
    localStorage.setItem("cabbageseo_writing_instructions", JSON.stringify(writingInstructions));
    setInstructionsSaved(true);
    setTimeout(() => setInstructionsSaved(false), 2000);
  };

  const renderIntegrationCard = (integration: Integration) => {
    const isConnected = connectedIntegrations.has(integration.id);
    return (
      <Card key={integration.id} className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-400">{integration.icon}</div>
              <div>
                <h4 className="text-sm font-medium text-zinc-200">{integration.name}</h4>
                <p className="text-xs text-zinc-500">{integration.description}</p>
              </div>
            </div>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-900/50 text-emerald-400 text-[10px]">Connected</Badge>
                <Button size="sm" variant="outline" className="text-xs border-zinc-700 text-red-400" onClick={() => handleDisconnect(integration.id)}>Disconnect</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="text-xs border-zinc-700" onClick={() => handleConnect(integration)} disabled={testingId === integration.id}>
                {testingId === integration.id ? "Testing..." : "Connect"}
              </Button>
            )}
          </div>
          {integration.fields.length > 0 && !isConnected && (
            <div className="mt-3 space-y-2 pt-3 border-t border-zinc-800">
              {integration.fields.map((field) => (
                <div key={field.key}>
                  <label className="text-[10px] text-zinc-500 mb-1 block">{field.label}</label>
                  <Input type={field.type} placeholder={field.placeholder} value={integrationValues[integration.id]?.[field.key] || ""}
                    onChange={(e) => setIntegrationValues({ ...integrationValues, [integration.id]: { ...integrationValues[integration.id], [field.key]: e.target.value } })}
                    className="bg-zinc-800 border-zinc-700 text-sm h-8" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const writingPlatforms = [
    { key: "linkedin", label: "LinkedIn", placeholder: "Use founder voice, short paragraphs, no fluff, clear takeaway." },
    { key: "instagram", label: "Instagram", placeholder: "Visual-first hooks, short punchy captions, trending hashtags." },
    { key: "whatsapp", label: "WhatsApp", placeholder: "Personal, concise, under 100 words. Light emoji usage." },
    { key: "facebook", label: "Facebook", placeholder: "Conversational, community-focused, include a question." },
    { key: "articles", label: "Articles", placeholder: "Prioritize practical depth, specific examples, professional tone." },
    { key: "general", label: "General", placeholder: "Overall brand voice and tone guidelines." },
  ];

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden">
      <Sidebar companyName={companyName} />
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="px-8 pt-8 pb-2">
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>

        {/* Tabs */}
        <div className="px-8 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-b border-zinc-800 rounded-none w-full justify-start gap-0 h-auto p-0">
              {[
                { value: "ai-cmo", label: "AI CMO", icon: Bot },
                { value: "writing", label: "Personalization", icon: PenTool },
                { value: "subscription", label: "Subscription", icon: CreditCard },
                { value: "security", label: "Account and Security", icon: Shield },
                { value: "integrations", label: "Integrations", icon: Plug },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-100 data-[state=active]:bg-transparent data-[state=active]:text-zinc-100 text-zinc-500 px-4 py-2.5 text-sm gap-1.5">
                  <Icon size={14} />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* AI CMO Tab — matches Okara's main settings tab */}
            <TabsContent value="ai-cmo" className="pt-6 max-w-2xl space-y-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium text-zinc-100 mb-4">Current Product</h3>
                  {companyUrl ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold text-emerald-400">
                        {companyName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm text-zinc-200">{companyUrl.replace(/^https?:\/\//, "")}</div>
                        <div className="text-xs text-zinc-500">{companyName}</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">No product connected yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6">
                  <h3 className="text-sm font-medium text-zinc-100 mb-1">Change Product URL</h3>
                  <p className="text-xs text-zinc-500 mb-4">Switching products will delete all current data and restart the full analysis.</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="example.com"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && changeProductUrl()}
                        className="bg-zinc-800 border-zinc-700 text-sm pr-10"
                      />
                      <button onClick={changeProductUrl} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                        <ArrowUpCircle size={18} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Personalization (Writing Instructions) */}
            <TabsContent value="writing" className="pt-6 max-w-2xl space-y-6">
              <div>
                <h3 className="text-sm font-medium text-zinc-100 mb-1">Writing Instructions</h3>
                <p className="text-xs text-zinc-500 mb-6">
                  These instructions are treated as primary directives and applied with your product context.
                </p>
              </div>

              {writingPlatforms.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-zinc-300">{label}</label>
                    <button onClick={() => setWritingInstructions({ ...writingInstructions, [key]: "" })} className="text-[10px] text-zinc-600 hover:text-zinc-400">Reset</button>
                  </div>
                  <Textarea
                    placeholder={placeholder}
                    value={writingInstructions[key as keyof typeof writingInstructions]}
                    onChange={(e) => setWritingInstructions({ ...writingInstructions, [key]: e.target.value })}
                    className="bg-zinc-900 border-zinc-800 text-sm min-h-[80px]"
                  />
                  <p className="text-[10px] text-zinc-700 mt-1 text-right">
                    {(writingInstructions[key as keyof typeof writingInstructions] || "").length}/4000
                  </p>
                </div>
              ))}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                {instructionsSaved && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> Saved</span>}
                <Button variant="outline" size="sm" className="border-zinc-700 text-xs"
                  onClick={() => setWritingInstructions({ linkedin: "", instagram: "", whatsapp: "", facebook: "", articles: "", general: "" })}>Cancel</Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={saveWritingInstructions}>
                  <Save size={12} className="mr-1" /> Save changes
                </Button>
              </div>
            </TabsContent>

            {/* Subscription */}
            <TabsContent value="subscription" className="pt-6 max-w-2xl space-y-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-zinc-100">Current Plan</h3>
                      <p className="text-xs text-zinc-500">Contact us to manage your subscription.</p>
                    </div>
                    <Badge className="bg-emerald-900/50 text-emerald-400">Active</Badge>
                  </div>
                  <p className="text-xs text-zinc-400">Your usage and billing details will be available in your account dashboard once connected.</p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-sm font-medium text-zinc-100">Need help?</h3>
                  <p className="text-xs text-zinc-500">Contact our team for plan details, upgrades, or billing questions.</p>
                  <Link href="/pricing">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700">View Plans</Button>
                  </Link>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account & Security */}
            <TabsContent value="security" className="pt-6 max-w-2xl space-y-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-sm font-medium text-zinc-100">Account</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      <User size={18} className="text-zinc-500" />
                    </div>
                    <div>
                      <div className="text-sm text-zinc-200">{companyName || "Not configured"}</div>
                      <div className="text-xs text-zinc-500">CabbageSEO account</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-sm font-medium text-zinc-100">Data</h3>
                  <p className="text-xs text-zinc-500">All scan data is stored locally in your browser. Upgrade to a paid plan for cloud persistence.</p>
                  <Button variant="outline" size="sm" className="border-zinc-700 text-xs text-red-400 hover:text-red-300"
                    onClick={() => { localStorage.clear(); window.location.href = "/"; }}>
                    Clear all data and sign out
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Integrations */}
            <TabsContent value="integrations" className="pt-6 max-w-3xl space-y-8">
              <div>
                <h3 className="text-sm font-medium text-zinc-300 mb-1">Article Publishing</h3>
                <p className="text-xs text-zinc-600 mb-4">Publish articles directly to your CMS or blog platform</p>
                <div className="grid grid-cols-2 gap-4">
                  {INTEGRATIONS.filter(i => i.category === "publishing").map(renderIntegrationCard)}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-300 mb-1">Socials</h3>
                <p className="text-xs text-zinc-600 mb-4">Connect your social accounts to post and share content</p>
                <div className="grid grid-cols-2 gap-4">
                  {INTEGRATIONS.filter(i => i.category === "socials").map(renderIntegrationCard)}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-300 mb-1">Analytics</h3>
                <p className="text-xs text-zinc-600 mb-4">Connect analytics tools to track performance</p>
                <div className="grid grid-cols-2 gap-4">
                  {INTEGRATIONS.filter(i => i.category === "analytics").map(renderIntegrationCard)}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
