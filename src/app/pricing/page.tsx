"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

const FEATURES = [
  "SEO & Performance Audit",
  "Real Estate-Specific Checks",
  "AI Visibility (ChatGPT, Claude, Gemini, Perplexity)",
  "Technical SEO Analysis",
  "Backlink Profile & Recommendations",
  "Competitor Intelligence",
  "AI Content Generation (Blogs, Social, WhatsApp)",
  "Locality-Specific SEO Pages",
  "4-Week Content Calendar",
  "AI Chat Assistant (Your AI CMO)",
  "Daily Automated Scans",
  "Works for Any City Worldwide",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-emerald-400">
            <Sparkles size={20} />
            <span className="font-bold">CabbageSEO</span>
          </Link>
          <Link href="/">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              Get Started <ArrowRight size={14} className="ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Simple, usage-based pricing
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            One account. One website. All features included.
            Pay for what you use. Still cheaper than any agency, freelancer, or in-house team.
          </p>
        </div>

        {/* Pricing Card — Single, clean */}
        <Card className="bg-zinc-900 border-zinc-800 max-w-md mx-auto mb-16">
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <div className="text-sm text-zinc-400 mb-2">Starts at</div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold">$499</span>
                <span className="text-zinc-500">/month</span>
              </div>
              <p className="text-xs text-zinc-600 mt-2">
                Includes 1,000 credits. Additional credits at $0.40 each.
              </p>
            </div>

            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">What counts as a credit</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Full site audit</span>
                  <span className="text-zinc-500">5 credits</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>AI Visibility check</span>
                  <span className="text-zinc-500">10 credits</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Blog post</span>
                  <span className="text-zinc-500">3 credits</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Social post</span>
                  <span className="text-zinc-500">1 credit</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Competitor scan</span>
                  <span className="text-zinc-500">5 credits</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Locality page</span>
                  <span className="text-zinc-500">2 credits</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Chat message</span>
                  <span className="text-zinc-500">1 credit</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Content plan</span>
                  <span className="text-zinc-500">8 credits</span>
                </div>
              </div>
            </div>

            <Link href="/" className="block">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 h-11">
                <Sparkles size={14} className="mr-2" />
                Start Free Trial — 14 Days
              </Button>
            </Link>
            <p className="text-center text-[10px] text-zinc-600">
              No credit card required. 200 free credits to start.
            </p>
          </CardContent>
        </Card>

        {/* How it compares */}
        <div className="mb-16">
          <h2 className="text-center text-xl font-bold mb-8">
            Cheaper than every alternative
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold text-red-400 line-through">$2,000+/mo</div>
                <div className="text-xs text-zinc-500 mt-1">SEO agency retainer</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold text-red-400 line-through">$1,500+/mo</div>
                <div className="text-xs text-zinc-500 mt-1">In-house SEO hire</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-emerald-800 ring-1 ring-emerald-800">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold text-emerald-400">$499/mo</div>
                <div className="text-xs text-zinc-400 mt-1">CabbageSEO — does more</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* All features */}
        <div className="max-w-md mx-auto">
          <h2 className="text-center text-xl font-bold mb-8">
            Everything included
          </h2>
          <div className="space-y-3">
            {FEATURES.map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-sm">
                <Check size={16} className="text-emerald-400 flex-shrink-0" />
                <span className="text-zinc-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link href="/">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
              <Sparkles size={16} className="mr-2" />
              Enter Your Website to Start
            </Button>
          </Link>
          <p className="text-xs text-zinc-600 mt-3">
            One account per website. All pages and microsites included automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
