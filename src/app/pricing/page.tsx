"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, ArrowRight, Building2 } from "lucide-react";
import Link from "next/link";

const ALL_FEATURES = [
  "SEO & Performance Audit",
  "Real Estate SEO Checks (RERA, pricing, floor plans, schema)",
  "AI Visibility (GEO) — ChatGPT, Claude, Perplexity, Gemini",
  "Backlink Analysis & Link Building Recommendations",
  "Technical SEO (server timing, render blocking, social tags)",
  "Competitor Intelligence & Tracking",
  "Local Content Generation (blogs, locality pages)",
  "Social Media Content (LinkedIn, Instagram, WhatsApp)",
  "AI Chat Assistant (your AI CMO)",
  "Content Calendar & Weekly Plans",
  "10 Indian Cities, 180+ Microlocations",
  "Dynamic Locality Intelligence",
];

const TIERS = [
  {
    name: "Starter",
    price: "$499",
    priceInr: "₹42,000",
    period: "/month",
    description: "For developers with 1-3 active projects",
    scans: "30 scans/month",
    credits: "100 AI content credits",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$999",
    priceInr: "₹84,000",
    period: "/month",
    description: "For developers with 5-10 active projects",
    scans: "100 scans/month",
    credits: "500 AI content credits",
    highlight: true,
  },
  {
    name: "Scale",
    price: "$2,499",
    priceInr: "₹2,10,000",
    period: "/month",
    description: "For large developers with unlimited projects",
    scans: "Unlimited scans",
    credits: "Unlimited AI content",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-emerald-400">
            <Sparkles size={20} />
            <span className="font-bold">CabbageSEO</span>
          </Link>
          <Link href="/onboarding">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              Get Started <ArrowRight size={14} className="ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16 space-y-4">
          <Badge variant="secondary" className="bg-emerald-900/50 text-emerald-400 text-xs">
            Built for Indian Real Estate
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight">
            All features. Every plan.
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            No feature gates. No locked capabilities. Every plan includes the full CabbageSEO
            suite — SEO, AI Visibility, Competitor Intelligence, Content Generation, and more.
            Only usage volume differs.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={`bg-zinc-900 border-zinc-800 relative ${
                tier.highlight ? "ring-2 ring-emerald-500 border-emerald-500/50" : ""
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-emerald-600 text-white text-xs">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                <p className="text-xs text-zinc-500">{tier.description}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-zinc-500 text-sm">{tier.period}</span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">{tier.priceInr}/month</p>
                </div>

                <div className="space-y-2 pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-zinc-300 font-medium">{tier.scans}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                    <span className="text-zinc-300 font-medium">{tier.credits}</span>
                  </div>
                </div>

                <Link href="/onboarding">
                  <Button
                    className={`w-full ${
                      tier.highlight
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-zinc-800 hover:bg-zinc-700"
                    }`}
                  >
                    Start Free Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* All Features */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-center text-xl font-bold mb-8">
            Every plan includes everything
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ALL_FEATURES.map((feature) => (
              <div key={feature} className="flex items-start gap-2 text-sm">
                <Check size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-zinc-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-zinc-500 text-sm">
            <Building2 size={16} />
            <span>Trusted by residential developers across India</span>
          </div>
          <div>
            <Link href="/onboarding">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                <Sparkles size={16} className="mr-2" />
                Start Your Free Trial
              </Button>
            </Link>
          </div>
          <p className="text-xs text-zinc-600">
            No credit card required. 14-day free trial on all plans.
          </p>
        </div>
      </div>
    </div>
  );
}
