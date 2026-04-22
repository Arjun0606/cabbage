import { queryForVisibility } from "@/lib/ai";

/**
 * Dynamic market-knowledge discovery.
 *
 * Used to replace hardcoded lists that drift with the market:
 *  - Top Indian real estate property portals (99acres, MagicBricks etc.
 *    today — but new portals emerge and old ones die)
 *  - Indian festivals with real current-year dates (lunar calendar
 *    shifts every year; a hardcoded month/day was always wrong)
 *  - High-authority RE domains to check for brand mentions
 *
 * Every lookup hits the ChatGPT web-search tool. Results are cached in
 * process memory with a 6-hour TTL so we don't pay the model cost on
 * every API call, but the source is live — monthly cron + first call
 * after deploy will always pick up today's reality.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  const value = await loader();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export interface PropertyPortal {
  name: string;
  domain: string;
  submitUrl?: string;
}

/**
 * Top Indian residential real-estate portals that AI models treat as
 * authoritative for buyer queries. Used by the portal-optimizer prompt,
 * backlink verification, and the execution checklist.
 */
export async function getTopIndianPropertyPortals(): Promise<PropertyPortal[]> {
  return cached("top-indian-property-portals", DEFAULT_TTL_MS, async () => {
    const prompt = `List the top 5-7 Indian residential real-estate property portals by traffic and credibility in 2026. Only include portals buyers actually search, not classifieds with tiny RE sections.

Respond ONLY with valid JSON, no prose or markdown:

{"portals": [{"name": "Display name", "domain": "bare-domain.com", "submitUrl": "https://.../post-property"}]}

Rules:
- Use the exact, current primary domain (lowercase, no www).
- submitUrl should be the public property-posting URL if known, else omit the field entirely.
- No fabrication — if you can't verify a portal still operates, skip it.`;

    try {
      const { text, source } = await queryForVisibility("openai", prompt);
      if (!text || source === "failed" || source === "missing_key" || source === "fallback_chat") return [];

      const match = text.match(/\{[\s\S]*"portals"[\s\S]*\}/);
      if (!match) return [];
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed.portals)) return [];

      const out: PropertyPortal[] = [];
      const seen = new Set<string>();
      for (const raw of parsed.portals) {
        const name = typeof raw?.name === "string" ? raw.name.trim() : "";
        const domain = typeof raw?.domain === "string" ? raw.domain.toLowerCase().trim().replace(/^www\./, "") : "";
        if (!name || !domain || seen.has(domain)) continue;
        const submitUrl =
          typeof raw?.submitUrl === "string" && raw.submitUrl.startsWith("http")
            ? raw.submitUrl
            : undefined;
        out.push({ name, domain, submitUrl });
        seen.add(domain);
        if (out.length >= 8) break;
      }
      return out;
    } catch {
      return [];
    }
  });
}

export interface HighAuthorityDomain {
  domain: string;
  authority: number;
  type: "portal" | "news" | "other";
}

/**
 * Indian domains where a brand mention demonstrably boosts AI visibility.
 * Superset of the portal list (adds news + review sites). Used by
 * backlink verification to check where the customer is already cited.
 */
export async function getHighAuthorityIndianRealEstateDomains(): Promise<HighAuthorityDomain[]> {
  return cached("high-authority-re-domains", DEFAULT_TTL_MS, async () => {
    const prompt = `List 8-12 high-authority Indian websites where a real-estate developer mention meaningfully boosts visibility in AI search (ChatGPT, Google AI Overviews). Include top property portals AND major business/news sites that cover Indian real estate.

Respond ONLY with valid JSON:

{"domains": [{"domain": "bare-domain.com", "authority": 85, "type": "portal" | "news" | "other"}]}

Rules:
- "authority" = your honest estimate of Moz DA for that domain (0-100).
- "type": "portal" for RE-specific sites, "news" for general news/business, "other" otherwise.
- Only include sites you can verify are still operating in 2026.
- No fabrication.`;

    try {
      const { text, source } = await queryForVisibility("openai", prompt);
      if (!text || source === "failed" || source === "missing_key" || source === "fallback_chat") return [];
      const match = text.match(/\{[\s\S]*"domains"[\s\S]*\}/);
      if (!match) return [];
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed.domains)) return [];

      const out: HighAuthorityDomain[] = [];
      const seen = new Set<string>();
      for (const raw of parsed.domains) {
        const domain = typeof raw?.domain === "string" ? raw.domain.toLowerCase().trim().replace(/^www\./, "") : "";
        if (!domain || seen.has(domain)) continue;
        const authority = Math.max(0, Math.min(100, Math.round(Number(raw?.authority) || 0)));
        const t = raw?.type;
        const type: HighAuthorityDomain["type"] = t === "portal" || t === "news" ? t : "other";
        out.push({ domain, authority, type });
        seen.add(domain);
        if (out.length >= 12) break;
      }
      return out;
    } catch {
      return [];
    }
  });
}

export interface UpcomingFestival {
  name: string;
  date: string; // ISO date — YYYY-MM-DD
}

/**
 * The next 1-2 major Indian festivals relevant to RE marketing. The
 * previous hardcoded calendar used fixed dates that drifted year to
 * year (most festivals are lunar). This asks the model for the next
 * dates based on the current UTC date.
 */
export async function getNextIndianFestival(fromDate: Date = new Date()): Promise<UpcomingFestival | null> {
  const key = `next-indian-festival-${fromDate.toISOString().slice(0, 10)}`;
  return cached(key, 24 * 60 * 60 * 1000, async () => {
    const today = fromDate.toISOString().slice(0, 10);
    const prompt = `Today is ${today}. Name the next major Indian festival that Indian real-estate developers would run a marketing campaign around, and its exact date this year.

Respond ONLY with valid JSON:

{"name": "Festival name", "date": "YYYY-MM-DD"}

Rules:
- Only include festivals widely observed across India (Diwali, Holi, Ganesh Chaturthi, Navratri/Durga Puja, Ugadi/Gudi Padwa, Akshaya Tritiya, Ram Navami, Onam, Pongal, Dhanteras, Christmas, New Year, Republic Day, Independence Day).
- Return the NEXT occurrence after ${today}.
- Use the correct current-year date, not a placeholder.`;

    try {
      const { text, source } = await queryForVisibility("openai", prompt);
      if (!text || source === "failed" || source === "missing_key" || source === "fallback_chat") return null;
      const match = text.match(/\{[\s\S]*"name"[\s\S]*"date"[\s\S]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]);
      const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
      const date = typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : "";
      if (!name || !date) return null;
      return { name, date };
    } catch {
      return null;
    }
  });
}
