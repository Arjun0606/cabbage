"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

const FEATURES = [
  "SEO & Performance Audit (15 real estate checks)",
  "AI Visibility — ChatGPT + Google AI",
  "AI Crawler Access Analysis",
  "Brand Presence Scanner",
  "Content Citability Audit",
  "Technical SEO Analysis",
  "Backlink Profile & Link Building",
  "Competitor Intelligence",
  "Full Article Writer (7 types incl. NRI Guide)",
  "Festive Campaign Generator (12 festivals)",
  "Channel Partner Content Packs",
  "Property Portal Optimizer (99acres, MagicBricks, Housing.com)",
  "Google & Meta Ads Copy Generator",
  "Landing Page Generator (5 types)",
  "Property Schema / Structured Data Generator",
  "llms.txt Generator for AI Crawlers",
  "30-Day Daily Action Plan",
  "Neighborhood Intelligence & Walk Score",
  "Construction Progress Content (8 channels)",
  "Monthly Board-Ready Marketing Report",
  "AI CMO Chat Assistant",
  "Automated Scans Every 4 Hours",
  "Works for Any City Worldwide",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="CabbageSEO" className="w-7 h-7 object-contain" />
            <span className="font-bold text-zinc-100">CabbageSEO</span>
          </Link>
          <Link href="/">
            <Button size="sm" className="bg-zinc-100 text-zinc-900 hover:bg-white">
              Get Started <ArrowRight size={14} className="ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            One person. Entire SEO &amp; GEO department.
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Everything your marketing team needs to dominate Google Search and AI recommendations. Token-based — pay for what you use.
          </p>
        </div>

        {/* Pricing Card */}
        <Card className="bg-zinc-900 border-zinc-800 max-w-md mx-auto mb-16">
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <div className="text-sm text-zinc-400 mb-2">Starts at</div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold">$500</span>
                <span className="text-zinc-500">/month</span>
              </div>
              <p className="text-sm text-zinc-400 mt-2">
                Includes 1,000 credits. Use more, pay more.
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Larger teams with more projects typically use 1,500–3,000 credits/month.
              </p>
            </div>

            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Credit usage</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {[
                  ["Full SEO audit", "5"],
                  ["AI Visibility check", "10"],
                  ["Full article (1,500+ words)", "3"],
                  ["Festive campaign", "5"],
                  ["Channel partner pack", "3"],
                  ["Landing page", "5"],
                  ["Schema generator", "3"],
                  ["Google + Meta ads", "5"],
                  ["Portal optimizer", "5"],
                  ["Competitor scan", "5"],
                  ["Technical audit", "3"],
                  ["Chat message", "1"],
                ].map(([name, credits]) => (
                  <div key={name} className="flex justify-between text-zinc-400">
                    <span>{name}</span>
                    <span className="text-zinc-600">{credits}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/onboarding" className="block">
              <Button className="w-full bg-zinc-100 text-zinc-900 hover:bg-white h-11">
                <Zap size={14} className="mr-2" />
                Get Started
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Comparison */}
        <div className="mb-16">
          <h2 className="text-center text-xl font-bold mb-8">
            Replace your agency. Keep your results.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold text-red-400 line-through">₹2–5L/mo</div>
                <div className="text-xs text-zinc-500 mt-1">SEO agency retainer</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold text-red-400 line-through">₹1.5L+/mo</div>
                <div className="text-xs text-zinc-500 mt-1">In-house SEO hire</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-100 ring-1 ring-zinc-100">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold text-zinc-100">~₹42K/mo</div>
                <div className="text-xs text-zinc-400 mt-1">CabbageSEO — does 10x more</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-lg mx-auto">
          <h2 className="text-center text-xl font-bold mb-8">
            Everything included. No upsells.
          </h2>
          <div className="space-y-2.5">
            {FEATURES.map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-sm">
                <Check size={16} className="text-zinc-100 flex-shrink-0" />
                <span className="text-zinc-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <Link href="/onboarding">
            <Button size="lg" className="bg-zinc-100 text-zinc-900 hover:bg-white">
              <Zap size={16} className="mr-2" />
              Start Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
