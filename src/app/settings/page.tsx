"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Globe,
  Plug,
  PenTool,
  Save,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

// ---------- Types ----------

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
    id: "wordpress",
    name: "WordPress",
    description: "Publish articles to WordPress.com",
    icon: "W",
    category: "publishing",
    connected: false,
    fields: [
      { key: "siteUrl", label: "Site URL", placeholder: "yoursite.wordpress.com", type: "text" },
      { key: "accessToken", label: "Access Token", placeholder: "WordPress.com OAuth token", type: "password" },
    ],
  },
  {
    id: "wordpress_self",
    name: "WordPress (Self-Hosted)",
    description: "Connect via application password",
    icon: "W",
    category: "publishing",
    connected: false,
    fields: [
      { key: "siteUrl", label: "Site URL", placeholder: "https://yoursite.com", type: "text" },
      { key: "username", label: "Username", placeholder: "admin", type: "text" },
      { key: "applicationPassword", label: "Application Password", placeholder: "xxxx xxxx xxxx xxxx", type: "password" },
    ],
  },
  {
    id: "webflow",
    name: "Webflow",
    description: "Publish to Webflow CMS collections",
    icon: "Wf",
    category: "publishing",
    connected: false,
    fields: [
      { key: "apiToken", label: "API Token", placeholder: "Webflow API token", type: "password" },
      { key: "siteId", label: "Site ID", placeholder: "Your Webflow site ID", type: "text" },
      { key: "collectionId", label: "Blog Collection ID", placeholder: "Collection ID for articles", type: "text" },
    ],
  },
  {
    id: "gsc",
    name: "Google Search Console",
    description: "Monitor SEO performance and indexing",
    icon: "G",
    category: "analytics",
    connected: false,
    fields: [],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Share professional content",
    icon: "in",
    category: "socials",
    connected: false,
    fields: [],
  },
];

// ---------- Component ----------

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("integrations");
  const [integrationValues, setIntegrationValues] = useState<Record<string, Record<string, string>>>({});
  const [connectedIntegrations, setConnectedIntegrations] = useState<Set<string>>(new Set());
  const [testingId, setTestingId] = useState<string | null>(null);

  const [writingInstructions, setWritingInstructions] = useState({
    linkedin: "",
    instagram: "",
    whatsapp: "",
    facebook: "",
    articles: "",
    general: "",
  });
  const [instructionsSaved, setInstructionsSaved] = useState(false);

  // Load saved state
  useEffect(() => {
    try {
      const savedIntegrations = localStorage.getItem("cabbageseo_integrations");
      if (savedIntegrations) {
        const parsed = JSON.parse(savedIntegrations);
        setConnectedIntegrations(new Set(parsed.connected || []));
        setIntegrationValues(parsed.values || {});
      }
      const savedInstructions = localStorage.getItem("cabbageseo_writing_instructions");
      if (savedInstructions) {
        setWritingInstructions(JSON.parse(savedInstructions));
      }
    } catch { /* use defaults */ }
  }, []);

  const handleConnect = async (integration: Integration) => {
    if (integration.id === "gsc") {
      // OAuth flow — redirect to Google
      try {
        const res = await fetch("/api/integrations/gsc");
        const data = await res.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
        } else {
          alert("Google Search Console requires GOOGLE_CLIENT_ID to be configured.");
        }
      } catch {
        alert("Failed to start Google OAuth flow.");
      }
      return;
    }

    // For other integrations, test the connection
    const values = integrationValues[integration.id] || {};
    if (integration.fields.length > 0 && Object.keys(values).length === 0) {
      alert("Please fill in the connection details first.");
      return;
    }

    setTestingId(integration.id);
    try {
      const provider = integration.id === "wordpress" ? "wordpress_com"
        : integration.id === "wordpress_self" ? "self_hosted"
        : "webflow";

      const res = await fetch("/api/publish", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, credentials: values }),
      });
      const data = await res.json();

      if (data.connected) {
        const newConnected = new Set(connectedIntegrations);
        newConnected.add(integration.id);
        setConnectedIntegrations(newConnected);

        // Save
        localStorage.setItem("cabbageseo_integrations", JSON.stringify({
          connected: Array.from(newConnected),
          values: integrationValues,
        }));
      } else {
        alert(`Connection failed: ${data.error || "Unknown error"}`);
      }
    } catch {
      alert("Connection test failed.");
    } finally {
      setTestingId(null);
    }
  };

  const handleDisconnect = (integrationId: string) => {
    const newConnected = new Set(connectedIntegrations);
    newConnected.delete(integrationId);
    setConnectedIntegrations(newConnected);

    const newValues = { ...integrationValues };
    delete newValues[integrationId];
    setIntegrationValues(newValues);

    localStorage.setItem("cabbageseo_integrations", JSON.stringify({
      connected: Array.from(newConnected),
      values: newValues,
    }));
  };

  const saveWritingInstructions = () => {
    localStorage.setItem("cabbageseo_writing_instructions", JSON.stringify(writingInstructions));
    setInstructionsSaved(true);
    setTimeout(() => setInstructionsSaved(false), 2000);
  };

  const renderIntegrationCard = (integration: Integration) => {
    const isConnected = connectedIntegrations.has(integration.id);
    const isTesting = testingId === integration.id;

    return (
      <Card key={integration.id} className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-400">
                {integration.icon}
              </div>
              <div>
                <h4 className="text-sm font-medium text-zinc-200">{integration.name}</h4>
                <p className="text-xs text-zinc-500">{integration.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && (
                <Badge className="bg-emerald-900/50 text-emerald-400 text-[10px]">
                  Connected
                </Badge>
              )}
              {!isConnected ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-zinc-700"
                  onClick={() => handleConnect(integration)}
                  disabled={isTesting}
                >
                  {isTesting ? "Testing..." : "Connect"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-zinc-700 text-red-400 hover:text-red-300"
                  onClick={() => handleDisconnect(integration.id)}
                >
                  Disconnect
                </Button>
              )}
            </div>
          </div>

          {/* Connection fields */}
          {integration.fields.length > 0 && !isConnected && (
            <div className="mt-3 space-y-2 pt-3 border-t border-zinc-800">
              {integration.fields.map((field) => (
                <div key={field.key}>
                  <label className="text-[10px] text-zinc-500 mb-1 block">{field.label}</label>
                  <Input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={integrationValues[integration.id]?.[field.key] || ""}
                    onChange={(e) => setIntegrationValues({
                      ...integrationValues,
                      [integration.id]: {
                        ...integrationValues[integration.id],
                        [field.key]: e.target.value,
                      },
                    })}
                    className="bg-zinc-800 border-zinc-700 text-sm h-8"
                  />
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
          <Link href="/dashboard">
            <Button size="sm" variant="outline" className="border-zinc-700 text-xs">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900 border border-zinc-800 mb-8">
            <TabsTrigger value="integrations" className="text-xs gap-1.5">
              <Plug size={12} /> Integrations
            </TabsTrigger>
            <TabsTrigger value="writing" className="text-xs gap-1.5">
              <PenTool size={12} /> Writing Instructions
            </TabsTrigger>
          </TabsList>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-8">
            {/* Article Publishing */}
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-1">Article Publishing</h3>
              <p className="text-xs text-zinc-600 mb-4">Publish articles directly to your CMS or blog platform</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INTEGRATIONS.filter(i => i.category === "publishing").map(renderIntegrationCard)}
              </div>
            </div>

            {/* Analytics */}
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-1">Analytics</h3>
              <p className="text-xs text-zinc-600 mb-4">Connect analytics tools to track performance</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INTEGRATIONS.filter(i => i.category === "analytics").map(renderIntegrationCard)}
              </div>
            </div>

            {/* Socials */}
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-1">Socials</h3>
              <p className="text-xs text-zinc-600 mb-4">Connect your social accounts to post and share content</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INTEGRATIONS.filter(i => i.category === "socials").map(renderIntegrationCard)}
              </div>
            </div>
          </TabsContent>

          {/* Writing Instructions Tab */}
          <TabsContent value="writing" className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-1">Writing Instructions</h3>
              <p className="text-xs text-zinc-600 mb-6">
                These instructions are treated as primary directives and applied to all generated content per platform.
              </p>
            </div>

            {writingPlatforms.map(({ key, label, placeholder }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-300">{label}</label>
                  <button
                    onClick={() => setWritingInstructions({ ...writingInstructions, [key]: "" })}
                    className="text-[10px] text-zinc-600 hover:text-zinc-400"
                  >
                    Reset
                  </button>
                </div>
                <Textarea
                  placeholder={placeholder}
                  value={writingInstructions[key as keyof typeof writingInstructions]}
                  onChange={(e) => setWritingInstructions({
                    ...writingInstructions,
                    [key]: e.target.value,
                  })}
                  className="bg-zinc-900 border-zinc-800 text-sm min-h-[80px]"
                />
                <p className="text-[10px] text-zinc-700 mt-1 text-right">
                  {(writingInstructions[key as keyof typeof writingInstructions] || "").length}/4000
                </p>
              </div>
            ))}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              {instructionsSaved && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Saved
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-xs"
                onClick={() => setWritingInstructions({
                  linkedin: "", instagram: "", whatsapp: "", facebook: "", articles: "", general: "",
                })}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                onClick={saveWritingInstructions}
              >
                <Save size={12} className="mr-1" /> Save changes
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
