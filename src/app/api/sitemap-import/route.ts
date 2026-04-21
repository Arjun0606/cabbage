import { NextRequest, NextResponse } from "next/server";
import { sanitizeUrl } from "@/lib/security";

/**
 * Sitemap import — auto-detect a customer's project microsites + section pages.
 *
 * Real estate developers often have:
 *  - A corporate site (dlf.in)
 *  - Individual project microsites (thecamellias.com, dlfprivana.com)
 *  - Sometimes as subdomains (camellias.dlf.in)
 *  - Sometimes as paths (dlf.in/projects/camellias)
 *
 * User enters corporate URL → we pull sitemap.xml + homepage links → detect
 * subdomains + external project sites → return candidates for them to pick.
 */

const USER_AGENT = "Cabbge/1.0 Sitemap Importer (+https://cabbge.com)";
const FETCH_TIMEOUT = 10_000;

interface CandidateSite {
  url: string;
  label: string;
  type: "corporate" | "subdomain" | "external" | "project_page";
  /** How we detected it (helps user verify) */
  reason: string;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      redirect: "follow",
    });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

function labelFromUrl(u: string): string {
  try {
    const url = new URL(u);
    const host = url.hostname.replace(/^www\./, "");
    const base = host.split(".")[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return u;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const { valid, url: safeUrl, error } = sanitizeUrl(url);
    if (!valid) return NextResponse.json({ error }, { status: 400 });

    const origin = new URL(safeUrl).origin;
    const rootHost = new URL(safeUrl).hostname.replace(/^www\./, "");
    const rootDomain = rootHost.split(".").slice(-2).join(".");

    // Try common sitemap locations in parallel
    const sitemapUrls = [
      `${origin}/sitemap.xml`,
      `${origin}/sitemap_index.xml`,
      `${origin}/sitemap.xml.gz`,
    ];

    const sitemapTexts = await Promise.all(sitemapUrls.map(fetchText));
    const homepageHtml = await fetchText(safeUrl);

    const allUrls = new Set<string>();

    // Extract <loc> from any sitemap we found. Follows nested sitemap indexes too.
    for (const text of sitemapTexts) {
      if (!text) continue;
      const locs = text.match(/<loc>([^<]+)<\/loc>/gi) || [];
      for (const loc of locs) {
        const u = loc.replace(/<\/?loc>/gi, "").trim();
        if (u.endsWith(".xml")) {
          // Nested sitemap — fetch it too
          const nested = await fetchText(u);
          if (nested) {
            const nestedLocs = nested.match(/<loc>([^<]+)<\/loc>/gi) || [];
            for (const nl of nestedLocs) {
              allUrls.add(nl.replace(/<\/?loc>/gi, "").trim());
            }
          }
        } else {
          allUrls.add(u);
        }
      }
    }

    // Extract outbound links from homepage HTML too (catches cross-domain projects)
    if (homepageHtml) {
      const hrefs = homepageHtml.match(/href=["']([^"']+)["']/gi) || [];
      for (const h of hrefs) {
        const match = h.match(/href=["']([^"']+)["']/i);
        if (!match) continue;
        try {
          const abs = new URL(match[1], safeUrl);
          if (abs.protocol === "https:" || abs.protocol === "http:") {
            allUrls.add(`${abs.origin}${abs.pathname}`);
          }
        } catch { /* skip */ }
      }
    }

    // Classify
    const candidates = new Map<string, CandidateSite>();
    const projectPathPatterns = /\/(projects?|properties|residences?|developments?)\/[a-z0-9-]{3,}/i;

    for (const u of allUrls) {
      try {
        const parsed = new URL(u);
        const host = parsed.hostname.replace(/^www\./, "");
        const key = parsed.origin;

        // Skip if we already have this origin
        if (candidates.has(key)) continue;

        // Skip common non-project hosts
        if (/\b(google|facebook|twitter|instagram|youtube|linkedin|whatsapp|tiktok|pinterest|wikipedia|recaptcha|doubleclick|cloudflare|jsdelivr|unpkg|cdn)\./i.test(host)) continue;
        // Skip media and asset hosts
        if (/\b(cdn|static|assets|img|images|media|files)\./i.test(host) && !host.startsWith("cdn.")) continue;

        if (host === rootHost) {
          // Same host — look for project pages
          if (projectPathPatterns.test(parsed.pathname)) {
            candidates.set(u, {
              url: u,
              label: parsed.pathname.split("/").filter(Boolean).pop() || "project page",
              type: "project_page",
              reason: "Found in sitemap — looks like a project page",
            });
          }
          continue;
        }

        if (host.endsWith(`.${rootDomain}`)) {
          // Subdomain of corporate site — likely a project microsite
          candidates.set(key, {
            url: key,
            label: labelFromUrl(key),
            type: "subdomain",
            reason: `Subdomain of ${rootDomain}`,
          });
        } else if (!/\.(png|jpg|jpeg|gif|webp|svg|pdf|ico|css|js)(\?|$)/i.test(u)) {
          // External domain — might be a separate project microsite
          candidates.set(key, {
            url: key,
            label: labelFromUrl(key),
            type: "external",
            reason: "Referenced from corporate site — possible microsite",
          });
        }
      } catch { /* skip invalid URLs */ }
    }

    // Cap results and sort — subdomains first (most likely project sites), then externals
    const typeOrder = { subdomain: 0, external: 1, project_page: 2, corporate: 3 };
    const sorted = Array.from(candidates.values())
      .sort((a, b) => typeOrder[a.type] - typeOrder[b.type])
      .slice(0, 20);

    return NextResponse.json({
      rootUrl: safeUrl,
      rootDomain,
      candidates: sorted,
      foundSitemap: sitemapTexts.some(Boolean),
    });
  } catch (error) {
    console.error("Sitemap import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sitemap import failed" },
      { status: 500 }
    );
  }
}
