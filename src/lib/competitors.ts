/**
 * Hardcoded competitor data for /vs/[slug] comparison pages.
 *
 * Honest comparisons matter for trust + SEO. We win on price, SMB
 * focus, and execution depth. They win on engine breadth (some),
 * brand recognition, and enterprise integrations. Don't lie about
 * what they do — readers will check.
 *
 * Source data current as of April 2026 from publicly visible
 * pricing pages and product marketing. Update when re-researched.
 */

export interface CompetitorInfo {
  slug: string;
  name: string;
  url: string;
  tagline: string;
  /** What they're best known for. Concrete, no fluff. */
  strengths: string[];
  /** Honest weaknesses we can exploit. */
  weaknesses: string[];
  /** Where they fit. */
  targetCustomer: string;
  pricing: {
    entry?: string;
    mid?: string;
    top?: string;
    free?: string;
    notes?: string;
  };
  engines: string[];
  /** What they have that we don't (yet). */
  advantagesOverCabbge: string[];
  /** What we have that they don't. */
  cabbgeAdvantages: string[];
  /** When should the reader pick them over us? Honest answer. */
  pickThemIf: string[];
  /** When should the reader pick us? */
  pickCabbgeIf: string[];
  /** SEO meta description. */
  metaDescription: string;
}

export const COMPETITORS: Record<string, CompetitorInfo> = {
  profound: {
    slug: "profound",
    name: "Profound",
    url: "https://tryprofound.com",
    tagline: "AI search analytics + autonomous marketing agents.",
    strengths: [
      "9 engines monitored: ChatGPT, Gemini, Claude, Perplexity, Grok, Copilot, Meta AI, DeepSeek, AI Overviews",
      "Query Fanout feature — exposes the actual sub-queries an engine fans out to",
      "AI bot crawl analytics — tracks GPTBot/ClaudeBot/PerplexityBot hits to your site",
      "Autonomous content agents that draft and publish",
      "Enterprise customers, well-funded",
    ],
    weaknesses: [
      "Starter is $99/mo and only includes ChatGPT — Gemini / Perplexity / Copilot are higher tiers",
      "Real-feature tier starts at $399/mo (Growth)",
      "Enterprise pricing $2,000–$5,000+/mo at the top",
      "Sales-led for the tiers that matter; not truly self-serve",
      "Pricing assumes you already have a marketing team to act on the reports",
    ],
    targetCustomer: "Enterprise marketing teams and growth-stage SaaS",
    pricing: {
      entry: "$99/mo (ChatGPT only, 50 prompts)",
      mid: "$399/mo (Growth, multi-engine + agents)",
      top: "$2,000–$5,000+/mo enterprise",
    },
    engines: [
      "ChatGPT",
      "Gemini",
      "Claude",
      "Perplexity",
      "Grok",
      "Microsoft Copilot",
      "Meta AI",
      "DeepSeek",
      "AI Overviews",
    ],
    advantagesOverCabbge: [
      "More engines (9 vs our 5)",
      "AI bot crawl analytics — we don't track AI bot traffic to your site yet",
      "Autonomous publishing agents",
      "Enterprise integrations (Salesforce, etc.)",
    ],
    cabbgeAdvantages: [
      "Half the price at every comparable tier ($49 vs $99 for entry; $199 vs $399 for mid)",
      "All 5 engines (ChatGPT + Gemini + Perplexity + Claude + Grok) included from $49 — Profound gates engines behind tier upgrades",
      "Self-serve from signup to first scan — no sales call",
      "Free public grader with permanent shareable result page",
      "Off-domain coverage audit (Wikipedia / Wikidata / G2 / Trustpilot / Reddit) — Profound doesn't have it",
      "Execution included at every tier (schema generator, FAQ generator, full article writer with QA pass)",
    ],
    pickThemIf: [
      "You need 9-engine coverage and have $400+/mo to spend",
      "You want autonomous agents handling publishing",
      "You're enterprise and need Salesforce / GA4 integration",
      "AI bot crawl analytics is a non-negotiable feature for you",
    ],
    pickCabbgeIf: [
      "You're under 50 employees or bootstrapped",
      "$49–$599/mo is your real budget",
      "You want to self-serve everything — no sales calls, no demo gates",
      "You'd rather have schema + FAQ + article artifacts generated for you than a report telling you to write them",
    ],
    metaDescription:
      "cabbge vs Profound (April 2026). Profound is enterprise-priced at $99–$5,000+/mo. cabbge is $49–$599/mo, self-serve, with execution included at every tier. Honest comparison.",
  },

  otterly: {
    slug: "otterly",
    name: "Otterly",
    url: "https://otterly.ai",
    tagline: "Country-level AI search visibility tracking.",
    strengths: [
      "Cheap entry tier — $29/mo for 15 prompts",
      "Country-level segmentation — see how visibility differs in US vs UK vs DE",
      "Looker Studio connector for serious data teams",
      "25k+ users, established brand",
    ],
    weaknesses: [
      "Lite tier is only 15 prompts — too few to track a real product seriously",
      "Gemini and AI Mode are paid add-ons even at higher tiers ($9–$149/mo extra)",
      "Reporting only — no execution / content generation included",
      "Premium is $489/mo for 400 prompts — competitive but expensive once add-ons stack",
      "No schema or FAQ generation, no article writer",
      "No off-domain coverage audit",
    ],
    targetCustomer: "International marketing teams, agencies tracking many domains",
    pricing: {
      entry: "$29/mo (Lite, 15 prompts)",
      mid: "$189/mo (Standard, 100 prompts)",
      top: "$489/mo (Premium, 400 prompts)",
      notes: "Gemini / AI Mode are $9–$149/mo add-ons.",
    },
    engines: ["ChatGPT", "Gemini (add-on)", "AI Mode (add-on)", "Copilot", "Perplexity", "AI Overviews"],
    advantagesOverCabbge: [
      "Cheaper entry point at $29/mo",
      "Country-level segmentation",
      "Looker Studio export",
      "Established brand with 25k+ users",
    ],
    cabbgeAdvantages: [
      "Execution included — schema generator + FAQ generator + full article writer at every paid tier",
      "All 5 engines included at $49 — Otterly Lite is $29 but only 15 prompts and no Gemini",
      "Free public grader with shareable permalink + embed badge",
      "Off-domain coverage audit (Wikipedia / Wikidata / G2 / Trustpilot / Reddit) — Otterly only reports visibility, doesn't audit your site",
      "JS-render audit, AI bot access audit, entity-grounding audit",
    ],
    pickThemIf: [
      "You operate in multiple countries and need geo-segmented visibility",
      "Looker Studio is core to your stack",
      "You only need 15 tracked prompts and reporting is enough",
    ],
    pickCabbgeIf: [
      "You want execution (schema, FAQ, articles) included in the price",
      "You want all engines from $49 with no add-on math",
      "You'd rather have a free public shareable grader than a paid trial",
    ],
    metaDescription:
      "cabbge vs Otterly (April 2026). Otterly does country-level AI tracking starting at $29/mo for 15 prompts (reporting only). cabbge is $49 for 40 prompts plus execution generators. Honest comparison.",
  },

  athenahq: {
    slug: "athenahq",
    name: "AthenaHQ",
    url: "https://athenahq.ai",
    tagline: "AI engine optimization platform for AEO specialists.",
    strengths: [
      "ACE Citation Engine — well-regarded citation tracking",
      "8 engines monitored",
      "Board-ready ROI dashboards positioned for marketing leadership",
      "&quot;Ask Athena&quot; copilot for in-product research",
      "Strong enterprise reputation",
    ],
    weaknesses: [
      "Self-serve starts at $295/mo — locks out indies and bootstrapped startups",
      "Markets &quot;AEO specialist&quot; as a job title — assumes you have one or are willing to become one",
      "Reporting-heavy, execution-light",
      "No public free tool / grader — gated discovery",
    ],
    targetCustomer:
      "Mid-market and enterprise marketing teams with a dedicated AEO/SEO lead",
    pricing: {
      entry: "$295/mo self-serve",
      top: "Custom enterprise",
    },
    engines: ["ChatGPT", "Gemini", "Claude", "Perplexity", "Copilot", "AI Overviews", "AI Mode", "Grok"],
    advantagesOverCabbge: ["More engines (8 vs 5)", "More mature dashboard / ROI views", "Larger customer base in mid-market"],
    cabbgeAdvantages: [
      "$49 entry vs $295 — Athena's price assumes you have a dedicated specialist",
      "Self-serve all the way through — no sales pipeline pressure",
      "Free public grader with permanent shareable URL",
      "Execution generators (schema, FAQ, full article writer) ship the actual fix",
      "Off-domain coverage audit nobody at Athena's price has",
    ],
    pickThemIf: [
      "You have a dedicated SEO/AEO person on staff",
      "$295+/mo is comfortable for the marketing tools line",
      "You need board-style ROI reporting for executives",
    ],
    pickCabbgeIf: [
      "You're a founder doing your own marketing",
      "You want to ship actual schema and FAQ fixes, not just see them flagged",
      "You'd rather pay $49–$599 with everything included than $295+ with add-ons",
    ],
    metaDescription:
      "cabbge vs AthenaHQ (April 2026). Athena is $295+/mo and assumes you have an AEO specialist on staff. cabbge is $49 self-serve with execution included. Honest comparison.",
  },

  knowatoa: {
    slug: "knowatoa",
    name: "Knowatoa",
    url: "https://knowatoa.com",
    tagline: "AI search rank tracking with done-for-you content drafts.",
    strengths: [
      "Done-for-you content drafting on Growth ($199/mo)",
      "&quot;Sam&quot; and &quot;Connie&quot; agent personas for content generation",
      "7 engines monitored",
      "Direct competitor at our $199 tier — they bundle execution like we do",
    ],
    weaknesses: [
      "Starter is $59/mo — limited prompts and engines",
      "Done-for-you content is generic — works but rarely wins citation lifts vs custom briefs",
      "No JS-render audit, no AI bot access audit, no entity-grounding audit",
      "No off-domain coverage audit",
      "No free public grader to drive top-of-funnel",
    ],
    targetCustomer: "B2B SaaS marketers, mid-funnel agencies",
    pricing: {
      entry: "$59/mo (Starter)",
      mid: "$199/mo (Growth, with content drafts)",
    },
    engines: ["ChatGPT", "Gemini", "Claude", "Perplexity", "Copilot", "AI Overviews", "Grok"],
    advantagesOverCabbge: [
      "More engines covered (7 vs 5)",
      "Auto-publishing agent personas marketed as part of the product",
      "Established B2B SaaS customer base",
    ],
    cabbgeAdvantages: [
      "Public free grader with shareable permalink — Knowatoa starts at $59, no free tool",
      "JS-render + AI bot access + entity grounding + off-domain audits — Knowatoa reports rank, doesn't audit infra",
      "Schema + FAQ + full article writer with cannibalization check + GEO score + QA pass",
      "Public best-of category pages drive SEO acquisition",
    ],
    pickThemIf: [
      "Done-for-you content drafts are the feature you came for",
      "You're already running a B2B SaaS marketing stack and want everything in one familiar shape",
      "You don't care about technical AI-readiness audits",
    ],
    pickCabbgeIf: [
      "You'd rather generate specific artifacts (schema, FAQ pages, GEO-scored articles) than receive blog drafts",
      "Auditing your own site for JS-render traps and AI bot access is valuable to you",
      "You want a public free grader to share with your team or audience",
    ],
    metaDescription:
      "cabbge vs Knowatoa (April 2026). Both bundle execution at $199/mo. cabbge audits AI-readiness deeply (JS-render, bot access, entity grounding, off-domain) and ships concrete schema + FAQ + article artifacts. Honest comparison.",
  },

  goodie: {
    slug: "goodie",
    name: "Goodie",
    url: "https://goodie.ai",
    tagline: "AI search optimization for content teams.",
    strengths: [
      "Strong content optimization workflow",
      "Editorial-friendly UI for in-house writers",
      "Tracks major AI engines",
      "Active product development",
    ],
    weaknesses: [
      "Pricing is sales-led — opaque to indie founders shopping around",
      "Built around editorial teams, less natural for solo founders",
      "No public grader / free top-of-funnel surface",
      "Less depth on technical AI-readiness audits",
    ],
    targetCustomer: "Content marketing teams at content-driven brands",
    pricing: {
      notes: "Sales-led. Public pricing not advertised; treat as mid-market enterprise tier.",
    },
    engines: ["ChatGPT", "Gemini", "Perplexity", "Claude"],
    advantagesOverCabbge: [
      "Editorial workflow polish for content teams",
      "Tighter integration with content production processes",
    ],
    cabbgeAdvantages: [
      "Public, transparent pricing from $49/mo — no &quot;contact sales&quot; gate",
      "Free public grader with shareable URL — Goodie is gated all the way",
      "Self-serve from signup to first scan in minutes",
      "Built for founders and small teams, not editorial departments",
      "Concrete artifact generators (schema, FAQ, articles) over content workflows",
    ],
    pickThemIf: [
      "You have a content team and editorial workflow is the bottleneck",
      "You're comfortable with sales-led procurement and budget approvals",
    ],
    pickCabbgeIf: [
      "You're shopping with a real budget number in mind and want transparent pricing",
      "You want to self-serve the whole loop without a sales call",
      "Concrete schema / FAQ / article artifacts are more useful than a content workflow",
    ],
    metaDescription:
      "cabbge vs Goodie (April 2026). Goodie is sales-led with content-team workflows. cabbge is $49 self-serve with public pricing and a free grader. Honest comparison.",
  },
};

export function getCompetitor(slug: string): CompetitorInfo | null {
  return COMPETITORS[slug.toLowerCase()] ?? null;
}

export function allCompetitorSlugs(): string[] {
  return Object.keys(COMPETITORS);
}
