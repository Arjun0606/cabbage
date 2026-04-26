/**
 * Review ORM agent.
 *
 * Every Indian residential developer manually monitors Housing.com,
 * 99acres, MagicBricks, Google Reviews, Reddit, and Quora for reviews
 * of their projects. A single negative Housing review kills 10-20
 * leads because buyers check it during research. The typical workflow
 * is a marketing analyst opening 6 tabs a day; CMOs routinely cite
 * this as their biggest unresolved ORM pain.
 *
 * Cabbge's approach:
 *  1. Use the ChatGPT web_search tool to surface recent mentions of
 *     each project on the major Indian review platforms. No scraping,
 *     no legal surface (we're asking a published search model what's
 *     publicly visible, not ingesting private data).
 *  2. Extract per-mention { platform, title, url, excerpt, sentiment,
 *     priority }. Priority is high when sentiment is negative and the
 *     platform is high-authority (Housing / 99acres / Google).
 *  3. Return a single structured list the UI groups by project.
 *
 * One call per project per scan. Cached server-side for 24h because
 * reviews don't move that fast and web_search is our most expensive
 * primitive.
 */

import { queryForVisibility, aiLight } from "@/lib/ai";

export interface ReviewMention {
  platform: string;          // "Housing.com" | "99acres" | "MagicBricks" | "Google" | "Reddit" | "Quora" | other
  title?: string;             // short summary line the user can scan
  excerpt?: string;           // ~200 char quote from the review
  url?: string;
  sentiment: "positive" | "neutral" | "negative";
  priority: "high" | "medium" | "low";
  projectName: string;
  postedDate?: string;        // free-text if the source carries it
}

export interface ReviewMonitorResult {
  generatedAt: string;
  totalMentions: number;
  mentions: ReviewMention[];
  /** Per-platform tally for the summary strip at the top. */
  counts: {
    byPlatform: Record<string, number>;
    byPriority: { high: number; medium: number; low: number };
    bySentiment: { positive: number; neutral: number; negative: number };
  };
  /** Which projects had a lookup fail (web search rate-limited or blocked). */
  failedProjects: string[];
}

interface ProjectInput {
  name: string;
  locality?: string | null;
  city?: string | null;
  website?: string | null;
}

const PLATFORM_WHITELIST = new Set([
  "housing.com",
  "99acres.com",
  "magicbricks.com",
  "google.com",           // Google reviews land on maps.google / g.co
  "maps.google.com",
  "nobroker.in",
  "commonfloor.com",
  "reddit.com",
  "quora.com",
  "proptiger.com",
  "roofandfloor.com",
]);

function normalisePlatform(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (host.endsWith(".reddit.com") || host === "reddit.com") return "Reddit";
    if (host.endsWith(".quora.com") || host === "quora.com") return "Quora";
    if (host === "housing.com" || host.endsWith(".housing.com")) return "Housing.com";
    if (host === "99acres.com" || host.endsWith(".99acres.com")) return "99acres";
    if (host === "magicbricks.com" || host.endsWith(".magicbricks.com")) return "MagicBricks";
    if (host === "nobroker.in" || host.endsWith(".nobroker.in")) return "NoBroker";
    if (host.includes("google.") || host === "g.co") return "Google";
    if (host === "commonfloor.com" || host.endsWith(".commonfloor.com")) return "CommonFloor";
    if (host.includes("proptiger")) return "PropTiger";
    if (host.includes("roofandfloor")) return "Roof & Floor";
    return host;
  } catch {
    return "unknown";
  }
}

function priorityFrom(sentiment: ReviewMention["sentiment"], platform: string): ReviewMention["priority"] {
  // High-authority platforms where a negative review visibly hurts
  // conversion — these need same-day attention.
  const highAuthority = ["Housing.com", "99acres", "MagicBricks", "Google"];
  if (sentiment === "negative" && highAuthority.includes(platform)) return "high";
  if (sentiment === "negative") return "medium";
  if (sentiment === "positive") return "low";
  return "medium";
}

/**
 * Ask ChatGPT (with web_search) to surface review-platform mentions of
 * one project, then extract them to structured records.
 */
async function fetchProjectMentions(
  brand: string,
  project: ProjectInput
): Promise<ReviewMention[]> {
  const location = [project.locality, project.city].filter(Boolean).join(", ");
  const searchQuery = `Find recent reviews, comments, or discussions about "${project.name}" ${location ? `in ${location}` : ""} by ${brand} on Housing.com, 99acres, MagicBricks, Google reviews, Reddit, or Quora. Include the platform, a short excerpt, the URL if visible, and a rough posting date if available. Prefer posts from the last 6 months. Skip marketing pages and broker listings — only real buyer / resident reviews and discussion threads.`;

  let rawText = "";
  try {
    const { text, source } = await queryForVisibility("openai", searchQuery);
    if (!text || (source !== "web_search" && source !== "grounded")) return [];
    rawText = text;
  } catch {
    return [];
  }

  // Second pass: have a cheap model extract structured JSON. Keeps the
  // expensive web-search call focused on recall; extraction is cheap.
  const extractPrompt = `Extract review mentions from this search result into JSON.

Project: ${project.name}
Developer: ${brand}

Search result:
"""
${rawText.slice(0, 6000)}
"""

Return JSON ONLY, no markdown fences:
{
  "mentions": [
    {
      "platform": "Housing.com | 99acres | MagicBricks | Google | Reddit | Quora | NoBroker | CommonFloor | other",
      "title": "short summary, max 90 chars",
      "excerpt": "quoted text from the review, max 220 chars",
      "url": "source URL if visible in the search result, else empty string",
      "sentiment": "positive | neutral | negative",
      "postedDate": "free-text date string or empty"
    }
  ]
}

Rules:
- Only include genuine review content — skip listing pages, ads, broker pitches.
- Only include mentions actually about "${project.name}" — not the developer's other projects.
- If the search result contains no real reviews, return an empty mentions array.
- Max 8 mentions.
- "sentiment" reflects the content of the review, not the AI model's opinion.`;

  try {
    const parsed = await aiLight("Return only valid JSON.", extractPrompt, 1200);
    const match = parsed.match(/\{[\s\S]*\}/);
    if (!match) return [];
    const obj = JSON.parse(match[0]);
    const raw = Array.isArray(obj?.mentions) ? obj.mentions : [];
    const out: ReviewMention[] = [];
    for (const m of raw.slice(0, 8)) {
      if (!m || typeof m !== "object") continue;
      const rawPlatform = String(m.platform || "").trim();
      const url = typeof m.url === "string" ? m.url : "";
      const platform = url ? normalisePlatform(url) : rawPlatform || "unknown";
      const sentiment: ReviewMention["sentiment"] = ["positive", "neutral", "negative"].includes(m.sentiment)
        ? m.sentiment
        : "neutral";
      const mention: ReviewMention = {
        platform,
        title: typeof m.title === "string" ? m.title.slice(0, 140) : undefined,
        excerpt: typeof m.excerpt === "string" ? m.excerpt.slice(0, 300) : undefined,
        url: url || undefined,
        sentiment,
        priority: priorityFrom(sentiment, platform),
        projectName: project.name,
        postedDate: typeof m.postedDate === "string" && m.postedDate.trim() ? m.postedDate.slice(0, 40) : undefined,
      };
      out.push(mention);
    }
    return out;
  } catch (err) {
    console.error("reviewMonitor: extract parse failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Brand-only fallback search.
 *
 * Used when the customer has no projects in their portfolio yet (or the
 * caller didn't pass any). Searches the same review platforms but
 * scoped to the developer name + optional primary city. Less granular
 * than the per-project version but keeps the panel functional during
 * onboarding instead of throwing "projects required".
 */
async function fetchBrandMentions(
  brand: string,
  city: string | null
): Promise<ReviewMention[]> {
  const cityTag = city ? ` based in ${city}` : "";
  const searchQuery = `Find recent reviews, comments, complaints, or buyer discussions about the real estate developer "${brand}"${cityTag} on Housing.com, 99acres, MagicBricks, NoBroker, CommonFloor, Google reviews, Reddit, or Quora. Include the platform, a short excerpt, the URL if visible, and a rough posting date if available. Prefer posts from the last 12 months. Skip marketing pages, broker pitches, and the developer's own listings — only real buyer / resident reviews and discussion threads about the developer's reputation, project quality, possession delays, or customer service.`;

  let rawText = "";
  try {
    const { text, source } = await queryForVisibility("openai", searchQuery);
    if (!text || (source !== "web_search" && source !== "grounded")) return [];
    rawText = text;
  } catch {
    return [];
  }

  const extractPrompt = `Extract review mentions from this search result into JSON.

Developer: ${brand}${city ? `\nCity: ${city}` : ""}

Search result:
"""
${rawText.slice(0, 6000)}
"""

Return JSON ONLY, no markdown fences:
{
  "mentions": [
    {
      "platform": "Housing.com | 99acres | MagicBricks | NoBroker | CommonFloor | Google | Reddit | Quora | other",
      "title": "short summary, max 90 chars",
      "excerpt": "quoted text from the review, max 220 chars",
      "url": "source URL if visible in the search result, else empty string",
      "sentiment": "positive | neutral | negative",
      "postedDate": "free-text date string or empty",
      "projectName": "project name if a specific project is mentioned, else 'developer-level'"
    }
  ]
}

Rules:
- Only include genuine review/discussion content — skip listing pages, ads, broker pitches.
- Mentions can be developer-level (overall reputation) or project-level (specific project named).
- "sentiment" reflects the content of the review, not the AI model's opinion.
- Max 12 mentions.`;

  try {
    const parsed = await aiLight("Return only valid JSON.", extractPrompt, 1500);
    const match = parsed.match(/\{[\s\S]*\}/);
    if (!match) return [];
    const obj = JSON.parse(match[0]);
    const raw = Array.isArray(obj?.mentions) ? obj.mentions : [];
    const out: ReviewMention[] = [];
    for (const m of raw.slice(0, 12)) {
      if (!m || typeof m !== "object") continue;
      const rawPlatform = String(m.platform || "").trim();
      const url = typeof m.url === "string" ? m.url : "";
      const platform = url ? normalisePlatform(url) : rawPlatform || "unknown";
      const sentiment: ReviewMention["sentiment"] = ["positive", "neutral", "negative"].includes(m.sentiment)
        ? m.sentiment
        : "neutral";
      out.push({
        platform,
        title: typeof m.title === "string" ? m.title.slice(0, 140) : undefined,
        excerpt: typeof m.excerpt === "string" ? m.excerpt.slice(0, 300) : undefined,
        url: url || undefined,
        sentiment,
        priority: priorityFrom(sentiment, platform),
        projectName: typeof m.projectName === "string" && m.projectName.trim() ? m.projectName.slice(0, 80) : "developer-level",
        postedDate: typeof m.postedDate === "string" && m.postedDate.trim() ? m.postedDate.slice(0, 40) : undefined,
      });
    }
    return out;
  } catch (err) {
    console.error("reviewMonitor (brand-only): extract parse failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

// Process-local cache. Reviews don't churn intraday; the TTL is also
// the tier-level cadence gate — "weekly" cadence effectively means
// "the cache returns for 7 days, rescans only after".
interface CacheEntry {
  value: ReviewMonitorResult;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();
const DAY = 24 * 60 * 60 * 1000;

function cacheKey(brand: string, projects: ProjectInput[]): string {
  return [
    brand.toLowerCase(),
    projects.map((p) => `${p.name.toLowerCase()}|${(p.locality || "").toLowerCase()}|${(p.city || "").toLowerCase()}`).sort().join(","),
  ].join("::");
}

export async function runReviewMonitor(
  brand: string,
  projects: ProjectInput[],
  options?: { cadence?: "daily" | "weekly"; brandCity?: string | null }
): Promise<ReviewMonitorResult> {
  const cadence = options?.cadence || "daily";
  const ttl = cadence === "weekly" ? 7 * DAY : DAY;
  const k = cacheKey(brand, projects);
  const hit = cache.get(k);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  // Limit parallelism — 6 projects at a time is enough coverage and
  // stays well inside the OpenAI rate limit for web_search.
  const CONCURRENCY = 6;
  const allMentions: ReviewMention[] = [];
  const failed: string[] = [];

  // Only scan projects that have at least a locality or city context;
  // otherwise web search is too vague and returns noise.
  const targets = projects.filter((p) => p.name && (p.locality || p.city));

  // Brand-only fallback when the customer has no projects yet — keeps
  // the review panel useful during onboarding instead of demanding
  // project entry before they can see value.
  if (targets.length === 0) {
    try {
      const brandMentions = await fetchBrandMentions(brand, options?.brandCity || null);
      allMentions.push(...brandMentions);
    } catch {
      failed.push(brand);
    }
  }

  let i = 0;
  while (i < targets.length) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (p) => {
        try {
          const m = await fetchProjectMentions(brand, p);
          return { name: p.name, mentions: m, failed: false };
        } catch {
          return { name: p.name, mentions: [], failed: true };
        }
      })
    );
    for (const r of results) {
      if (r.failed) failed.push(r.name);
      allMentions.push(...r.mentions);
    }
    i += CONCURRENCY;
  }

  const counts = {
    byPlatform: {} as Record<string, number>,
    byPriority: { high: 0, medium: 0, low: 0 },
    bySentiment: { positive: 0, neutral: 0, negative: 0 },
  };
  for (const m of allMentions) {
    counts.byPlatform[m.platform] = (counts.byPlatform[m.platform] || 0) + 1;
    counts.byPriority[m.priority]++;
    counts.bySentiment[m.sentiment]++;
  }

  const out: ReviewMonitorResult = {
    generatedAt: new Date().toISOString(),
    totalMentions: allMentions.length,
    // Sort high-priority / negative first so the UI opens on the
    // items that actually need action.
    mentions: allMentions.sort((a, b) => {
      const r: Record<ReviewMention["priority"], number> = { high: 0, medium: 1, low: 2 };
      if (r[a.priority] !== r[b.priority]) return r[a.priority] - r[b.priority];
      const s: Record<ReviewMention["sentiment"], number> = { negative: 0, neutral: 1, positive: 2 };
      return s[a.sentiment] - s[b.sentiment];
    }),
    counts,
    failedProjects: failed,
  };

  cache.set(k, { value: out, expiresAt: Date.now() + ttl });
  return out;
}
