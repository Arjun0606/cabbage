import { aiLight } from "@/lib/ai";
import { sanitizeUrl } from "@/lib/security";

/**
 * Vertical-aware URL classifier.
 *
 * Single LLM pass on the homepage HTML extracts everything the grader
 * + dashboard need: vertical, brand, aliases, category, subcategory,
 * competitor hypotheses, classification signals.
 *
 * Replaces the RE-specific /api/auto-discover for the public funnel.
 * /api/auto-discover stays for now to keep the existing dashboard
 * onboarding compiling; pivot.18 deletes it alongside the projects/
 * cities concepts.
 */

export type Vertical =
  | "saas"
  | "ecommerce"
  | "app"
  | "local_service"
  | "media"
  | "marketplace"
  | "unknown";

export interface VerticalClassification {
  vertical: Vertical;
  confidence: number;
  signals: string[];
  subcategory?: string;
}

export interface ClassifiedSite {
  classification: VerticalClassification;
  brand: string;
  brandAliases: string[];
  category: string;
  /** Competitor guesses from homepage — user confirms before scans. */
  competitorHypotheses: string[];
}

const USER_AGENT = "Cabbge/1.0";

const VERTICAL_LABELS: Record<Vertical, string> = {
  saas: "SaaS / software product",
  ecommerce: "E-commerce / online store",
  app: "Mobile app (iOS / Android)",
  local_service: "Local service business",
  media: "Media / publisher",
  marketplace: "Marketplace",
  unknown: "Unknown",
};

const VERTICAL_IDS: Vertical[] = [
  "saas",
  "ecommerce",
  "app",
  "local_service",
  "media",
  "marketplace",
];

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface HomepageContext {
  title: string;
  metaDescription: string;
  h1: string;
  visibleText: string;
  schemaTypes: string[];
  ogSiteName: string;
}

async function fetchHomepage(url: string): Promise<HomepageContext> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Homepage fetch failed: HTTP ${res.status}`);
  const html = await res.text();

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
  const metaDescription =
    html
      .match(
        /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i,
      )?.[1]
      ?.trim() || "";
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "").trim();
  const ogSiteName =
    html
      .match(
        /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']*)["']/i,
      )?.[1]
      ?.trim() || "";
  const visibleText = stripHtml(html).slice(0, 5000);

  const schemaBlocks =
    html.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ) || [];
  const schemaTypes: string[] = [];
  for (const block of schemaBlocks) {
    try {
      const jsonText = block
        .replace(/<script[^>]*>/i, "")
        .replace(/<\/script>/i, "")
        .trim();
      const parsed = JSON.parse(jsonText);
      if (parsed["@type"]) schemaTypes.push(String(parsed["@type"]));
      if (Array.isArray(parsed["@graph"])) {
        for (const item of parsed["@graph"]) {
          if (item?.["@type"]) schemaTypes.push(String(item["@type"]));
        }
      }
    } catch {
      /* skip malformed */
    }
  }

  return {
    title: stripHtml(title),
    metaDescription,
    h1: stripHtml(h1),
    visibleText,
    schemaTypes: Array.from(new Set(schemaTypes)).slice(0, 10),
    ogSiteName,
  };
}

export async function classifyUrl(inputUrl: string): Promise<ClassifiedSite> {
  const { valid, url, error } = sanitizeUrl(inputUrl);
  if (!valid) throw new Error(error || "Invalid URL");

  const homepage = await fetchHomepage(url);

  const system = `You classify websites and extract brand metadata from a homepage. Return valid JSON only — no markdown fences, no prose.`;

  const prompt = `URL: ${url}

HOMEPAGE TITLE: ${homepage.title || "(empty)"}
OG:SITE_NAME: ${homepage.ogSiteName || "(empty)"}
META DESCRIPTION: ${homepage.metaDescription || "(empty)"}
H1: ${homepage.h1 || "(empty)"}
SCHEMA TYPES: ${homepage.schemaTypes.join(", ") || "(none)"}

HOMEPAGE VISIBLE TEXT (truncated):
"""
${homepage.visibleText}
"""

Classify this site and extract brand metadata. Return this JSON:
{
  "vertical": "saas" | "ecommerce" | "app" | "local_service" | "media" | "marketplace" | "unknown",
  "confidence": <0.0 to 1.0>,
  "signals": ["<3-5 short phrases from the homepage that drove the classification>"],
  "subcategory": "<specific category e.g. 'CRM', 'running shoes', 'meditation app', 'plumber', 'tech news'>",
  "brand": "<primary brand name>",
  "brandAliases": ["<alternate spellings / acronyms / domain name minus TLD / full legal name>"],
  "category": "<2-4 word canonical category — e.g. 'CRM software', 'Payment processing', 'Wireless earbuds', 'Meditation app', 'Project management software'>",
  "competitorHypotheses": ["<up to 5 well-known competitors in the same category>"]
}

CATEGORY rules — STRICT:
- Title Case, 2-4 words MAX. NEVER more than 60 characters.
- Generic enough that 5+ competitors share it. ("CRM software" not "CRM platform with native marketing automation".)
- NO parentheses, NO hyphens, NO "platform for X", NO descriptive prose.
- Examples GOOD: "CRM software", "Payment processing", "Email marketing", "Project management software", "Headless CMS", "Web analytics", "Note taking app".
- Examples BAD: "payment processing platform for businesses (payments, billing, financial services APIs)", "AI-powered customer relationship management software", "the CRM that loves you back".

Classification rules:
- saas: sells software subscriptions (login, dashboard, free trial, "book a demo", pricing tiers)
- ecommerce: sells physical or digital products directly (cart, checkout, product pages with prices)
- app: mobile app landing page (App Store / Play Store badges, download CTAs, feature tour)
- local_service: serves a geographic area (address, service areas, "book appointment" CTA)
- media: content-driven (articles, newsletter, news/blog homepage)
- marketplace: multi-seller (vendors, listings, "become a seller")
- unknown: genuinely unclear — use sparingly

Be thorough with brandAliases. Include:
- Domain name minus TLD (e.g. "notion" from notion.so)
- Acronym visible in copy
- OG site name if different from title
- Common casings ("Notion" and "notion")

confidence: 0.9+ for clear cases, 0.5-0.8 for mixed signals, <0.5 for genuinely unclear.`;

  try {
    const raw = await aiLight(system, prompt, 700);
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const vertical: Vertical = VERTICAL_IDS.includes(parsed?.vertical)
      ? parsed.vertical
      : "unknown";
    const confidence = Math.max(
      0,
      Math.min(1, Number(parsed?.confidence) || 0),
    );
    const signals = Array.isArray(parsed?.signals)
      ? parsed.signals.slice(0, 5).map((s: unknown) => String(s))
      : [];
    const subcategory = parsed?.subcategory
      ? String(parsed.subcategory)
      : undefined;
    const brand =
      String(parsed?.brand || homepage.ogSiteName || homepage.title || "")
        .trim()
        .slice(0, 120) || new URL(url).hostname;
    const brandAliases = Array.isArray(parsed?.brandAliases)
      ? parsed.brandAliases.slice(0, 8).map((s: unknown) => String(s))
      : [];
    // Hard cap at 60 chars + strip parens noise + drop trailing
    // descriptors after a colon — a few prompt failures still slip
    // through ("CRM software (the AI-native one)" → "CRM software").
    let category = String(parsed?.category || "")
      .trim()
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/[:—–-]\s.*$/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60);
    // Title case if the model returned lowercase prose.
    if (category && category === category.toLowerCase()) {
      category = category.replace(/\b([a-z])/g, (m) => m.toUpperCase());
    }
    const competitorHypotheses = Array.isArray(parsed?.competitorHypotheses)
      ? parsed.competitorHypotheses.slice(0, 5).map((s: unknown) => String(s))
      : [];

    return {
      classification: { vertical, confidence, signals, subcategory },
      brand,
      brandAliases,
      category,
      competitorHypotheses,
    };
  } catch {
    const host = new URL(url).hostname;
    return {
      classification: {
        vertical: "unknown",
        confidence: 0,
        signals: ["AI classifier failed — user must confirm"],
      },
      brand: homepage.ogSiteName || homepage.title || host,
      brandAliases: [host.replace(/^www\./, "").split(".")[0]],
      category: "",
      competitorHypotheses: [],
    };
  }
}

export function verticalLabel(v: Vertical): string {
  return VERTICAL_LABELS[v];
}
