/**
 * Moz Link API Integration
 *
 * Uses Moz's free tier API for real backlink data:
 * - Domain Authority (DA)
 * - Page Authority (PA)
 * - Linking domains count
 * - Inbound links count
 * - Top linking domains
 *
 * Free tier: 10 rows/request, 10 requests/month for link data
 * For more: Moz API starts at $99/month
 *
 * Fallback: if no Moz API key, uses the AI-estimated approach.
 */

// ---------- Types ----------

export interface MozBacklinkData {
  url: string;
  domainAuthority: number;
  pageAuthority: number;
  linkingDomains: number;
  inboundLinks: number;
  spamScore: number;
  topLinkingDomains: MozLinkingDomain[];
  source: "moz_api" | "ai_estimated";
}

interface MozLinkingDomain {
  domain: string;
  domainAuthority: number;
  linkCount: number;
}

// ---------- Moz API ----------

const MOZ_API_BASE = "https://lsapi.seomoz.com/v2";

async function mozRequest(endpoint: string, body: object): Promise<any> {
  const apiToken = process.env.MOZ_API_TOKEN;
  if (!apiToken) return null;

  const res = await fetch(`${MOZ_API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`Moz API error: ${res.status}`);
    return null;
  }

  return res.json();
}

// ---------- Public Functions ----------

export async function getMozBacklinks(url: string): Promise<MozBacklinkData | null> {
  const apiToken = process.env.MOZ_API_TOKEN;
  if (!apiToken) return null; // No API key → caller should use AI fallback

  // Normalize URL to root domain
  let target: string;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    target = parsed.hostname;
  } catch {
    target = url;
  }

  try {
    // Fetch URL metrics (DA, PA, spam score)
    const metricsData = await mozRequest("/url_metrics", {
      targets: [target],
    });

    // Fetch top linking domains
    const linksData = await mozRequest("/links", {
      target,
      source_type: "root_domain",
      target_type: "root_domain",
      sort: "domain_authority",
      limit: 10,
    });

    if (!metricsData?.results?.[0]) return null;

    const metrics = metricsData.results[0];

    const topLinkingDomains: MozLinkingDomain[] = (linksData?.results || []).map((link: any) => ({
      domain: link.source?.root_domain || link.source?.page || "unknown",
      domainAuthority: link.source?.domain_authority || 0,
      linkCount: 1,
    }));

    return {
      url: target,
      domainAuthority: Math.round(metrics.domain_authority || 0),
      pageAuthority: Math.round(metrics.page_authority || 0),
      linkingDomains: metrics.root_domains_to_root_domain || 0,
      inboundLinks: metrics.external_links_to_root_domain || 0,
      spamScore: Math.round((metrics.spam_score || 0) * 100),
      topLinkingDomains,
      source: "moz_api",
    };
  } catch (err) {
    console.error("Moz API error:", err);
    return null;
  }
}

/**
 * Check if Moz API is configured.
 */
export function isMozConfigured(): boolean {
  return !!process.env.MOZ_API_TOKEN;
}
