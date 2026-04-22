import crypto from "crypto";

/**
 * Competitor Watch — snapshot a competitor site into a small, stable
 * fingerprint, then diff consecutive snapshots to detect meaningful
 * changes. Runs daily from cron.
 *
 * We capture:
 *  - <title>
 *  - first 3 H1s
 *  - first 5 H2s
 *  - meta description
 *  - sitemap URL count (if /sitemap.xml exists)
 *  - any price tokens (`₹`, `Cr`, `Lakh`, `crore`) in the top 20 KB
 *  - any "new project" / "launch" hero signals
 *
 * A stable SHA256 over the canonicalised signals is the fingerprint.
 * When the new snapshot's hash differs from the previous one, we
 * classify what changed and emit structured alerts.
 */

export interface CompetitorSignals {
  title: string;
  metaDescription: string;
  h1s: string[];
  h2s: string[];
  priceTokens: string[];
  hasLaunchSignal: boolean;
  sitemapUrlCount: number;
}

function safeExtract(html: string, regex: RegExp, limit = 20): string[] {
  const out: string[] = [];
  let m;
  while ((m = regex.exec(html)) !== null && out.length < limit) {
    const text = m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text && text.length < 300) out.push(text);
  }
  return out;
}

const LAUNCH_PHRASES = [
  "new launch",
  "newly launched",
  "launching soon",
  "now launching",
  "pre-launch",
  "grand opening",
  "coming soon",
  "just launched",
];

export async function captureCompetitorSignals(url: string): Promise<CompetitorSignals | null> {
  try {
    let target = url;
    if (!/^https?:\/\//.test(target)) target = `https://${target}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(target, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Cabbge/1.0 (+https://cabbge.com)" },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const raw = await res.text();
    const html = raw.slice(0, 200_000);

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);

    const h1s = safeExtract(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi, 3);
    const h2s = safeExtract(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi, 5);

    // Extract price-shaped tokens: "₹1.2 Cr", "1.5 crore", "75 Lakh", etc.
    const priceRegex = /(?:₹\s*[\d.,]+|\b[\d.,]+\s*(?:Cr\.?|crore|Lakh|Lac|L\b))/gi;
    const priceTokens = Array.from(
      new Set(
        (html.slice(0, 40_000).match(priceRegex) || [])
          .map((t) => t.trim())
          .slice(0, 15)
      )
    );

    const lowerTop = html.slice(0, 20_000).toLowerCase();
    const hasLaunchSignal = LAUNCH_PHRASES.some((p) => lowerTop.includes(p));

    // Try sitemap for URL count as a coarse "site grew" signal.
    let sitemapUrlCount = 0;
    try {
      const origin = new URL(target).origin;
      const sitemapRes = await fetch(`${origin}/sitemap.xml`, {
        headers: { "User-Agent": "Cabbge/1.0" },
      });
      if (sitemapRes.ok) {
        const sm = await sitemapRes.text();
        const urlMatches = sm.match(/<loc>/g);
        sitemapUrlCount = urlMatches ? urlMatches.length : 0;
      }
    } catch { /* ignore */ }

    return {
      title: titleMatch ? titleMatch[1].trim().slice(0, 300) : "",
      metaDescription: metaMatch ? metaMatch[1].trim().slice(0, 300) : "",
      h1s,
      h2s,
      priceTokens,
      hasLaunchSignal,
      sitemapUrlCount,
    };
  } catch {
    return null;
  }
}

export function signalsHash(signals: CompetitorSignals): string {
  const canonical = JSON.stringify({
    t: signals.title,
    m: signals.metaDescription,
    h1: signals.h1s,
    h2: signals.h2s,
    p: signals.priceTokens,
    l: signals.hasLaunchSignal,
    s: signals.sitemapUrlCount,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export type AlertType =
  | "new_project"
  | "hero_change"
  | "sitemap_grew"
  | "price_change"
  | "headline_change";

export interface CompetitorAlert {
  type: AlertType;
  title: string;
  description: string;
  details: Record<string, unknown>;
}

/**
 * Diff two snapshots and return the alerts that should fire.
 * Prior is nullable — first observation never produces alerts (we need
 * a baseline).
 */
export function diffSnapshots(
  prior: CompetitorSignals | null,
  next: CompetitorSignals,
  competitorName: string
): CompetitorAlert[] {
  if (!prior) return [];
  const alerts: CompetitorAlert[] = [];

  // New project / launch signal surfaced in hero
  if (!prior.hasLaunchSignal && next.hasLaunchSignal) {
    alerts.push({
      type: "new_project",
      title: `${competitorName} is promoting a new launch`,
      description: `Launch phrasing appeared on the homepage. Review for pricing + location overlap with your active projects.`,
      details: {
        titleNow: next.title,
        h1sNow: next.h1s,
      },
    });
  }

  // Sitemap grew significantly (new pages — often project microsites)
  if (
    prior.sitemapUrlCount > 0 &&
    next.sitemapUrlCount > prior.sitemapUrlCount + 5 &&
    next.sitemapUrlCount > prior.sitemapUrlCount * 1.1
  ) {
    alerts.push({
      type: "sitemap_grew",
      title: `${competitorName} added ${next.sitemapUrlCount - prior.sitemapUrlCount} pages`,
      description: `Sitemap grew from ${prior.sitemapUrlCount} to ${next.sitemapUrlCount} URLs. Likely new project pages or locality guides.`,
      details: { before: prior.sitemapUrlCount, after: next.sitemapUrlCount },
    });
  }

  // Hero text changed (title or H1)
  const titleChanged = prior.title && next.title && prior.title !== next.title;
  const firstH1Changed =
    prior.h1s.length > 0 &&
    next.h1s.length > 0 &&
    prior.h1s[0] !== next.h1s[0];
  if (titleChanged || firstH1Changed) {
    alerts.push({
      type: "hero_change",
      title: `${competitorName} changed their homepage hero`,
      description: titleChanged
        ? `Page title changed from "${prior.title.slice(0, 60)}" to "${next.title.slice(0, 60)}"`
        : `H1 changed from "${prior.h1s[0].slice(0, 60)}" to "${next.h1s[0].slice(0, 60)}"`,
      details: {
        titleBefore: prior.title,
        titleAfter: next.title,
        h1Before: prior.h1s[0],
        h1After: next.h1s[0],
      },
    });
  }

  // New prices that weren't on the page yesterday
  const priorPriceSet = new Set(prior.priceTokens);
  const addedPrices = next.priceTokens.filter((p) => !priorPriceSet.has(p));
  if (addedPrices.length >= 2) {
    alerts.push({
      type: "price_change",
      title: `${competitorName} added new pricing`,
      description: `${addedPrices.length} new price tokens appeared: ${addedPrices.slice(0, 5).join(", ")}`,
      details: { added: addedPrices, before: prior.priceTokens },
    });
  }

  // New H2 lines (often product names / project names in RE)
  const priorH2 = new Set(prior.h2s.map((h) => h.toLowerCase()));
  const newH2s = next.h2s.filter((h) => !priorH2.has(h.toLowerCase()));
  if (newH2s.length >= 2) {
    alerts.push({
      type: "headline_change",
      title: `${competitorName} surfaced ${newH2s.length} new section${newH2s.length === 1 ? "" : "s"}`,
      description: `New H2s: ${newH2s.slice(0, 3).join(" \u2022 ")}`,
      details: { newH2s },
    });
  }

  return alerts;
}
