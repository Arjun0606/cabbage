import type { AIVisibilityResult } from "./aiVisibility";
import type { OffDomainItem } from "./offDomain";

/**
 * Per-engine playbook. Concrete, engine-specific actions a customer
 * can take to lift their score on each engine. Not generic GEO
 * advice — every action is grounded in the April 2026 research on
 * what each AI engine actually rewards.
 *
 * Why per-engine: Profound, AthenaHQ, Goodie, Semrush were all
 * publicly criticized for "generic recommendations" (Rankability,
 * Writesonic, NoGood reviews). Customers pay to know "for ChatGPT
 * do X, for Perplexity do Y" — because the engines reward
 * different things.
 */

export type EngineKey = "chatgpt" | "gemini" | "perplexity" | "claude" | "grok" | "all";

export interface PlaybookAction {
  engine: EngineKey;
  /** Short label shown as the action title. */
  title: string;
  /** Why this matters for THIS engine. */
  rationale: string;
  /** Concrete fix. Copy-pasteable when possible. */
  fix: string;
  /** Estimated lift if applied. Optional. */
  estimatedLift?: string;
  /** Priority — high = ship today, medium = this sprint, low = nice-to-have. */
  priority: "high" | "medium" | "low";
}

interface Ctx {
  scan: AIVisibilityResult;
  brand: string;
  readiness: AIVisibilityResult["aiReadiness"];
  offDomain: OffDomainItem[];
}

function readinessFailed(ctx: Ctx, partOfCheck: string): boolean {
  return ctx.readiness.some(
    (r) => !r.passed && r.check.toLowerCase().includes(partOfCheck.toLowerCase()),
  );
}

function offDomainMissing(ctx: Ctx, source: string): boolean {
  return ctx.offDomain.some((o) => o.source === source && !o.present);
}

function score(ctx: Ctx, key: keyof AIVisibilityResult["scores"]): number {
  const v = ctx.scan.scores[key];
  return typeof v === "number" ? v : 0;
}

const RULES: Array<(ctx: Ctx) => PlaybookAction | null> = [
  // ---------- ChatGPT ----------
  (ctx) => {
    if (!readinessFailed(ctx, "Server-rendered")) return null;
    return {
      engine: "chatgpt",
      title: "Ship server-rendered HTML",
      rationale:
        "GPTBot does not execute JavaScript. ChatGPT cites pages whose content is in the initial HTML response. Your site looks like a JS-rendered SPA — GPTBot sees a shell.",
      fix: "Move to SSR/SSG (Next.js, Astro, Nuxt, Remix) or add a pre-rendering step (Prerender.io, Vercel ISR) gated on AI bot user-agents. Verify by curling your URL with no JS and confirming H1 + body content present.",
      estimatedLift: "Common 10-20 point overall score lift on the next scan",
      priority: "high",
    };
  },
  (ctx) => {
    if (score(ctx, "chatgpt") >= 60) return null;
    return {
      engine: "chatgpt",
      title: "Front-load a 130-180 word answer block in the top 30%",
      rationale:
        "44.2% of ChatGPT citations come from the first third of a page (Search Engine Land, 2025 study). Pages with a self-contained answer capsule of 130-180 words near the top get 70%+ more citations than equivalent content buried later.",
      fix: 'Add a "Quick answer" block right after the H1: 130-180 words, leads with "X is Y", contains 2-3 specific stats or comparisons, ends with a one-line takeaway. Mark it up with role="doc-abstract" or wrap in <p class="lead">.',
      estimatedLift: "Most cited brands carry such a block",
      priority: "high",
    };
  },
  (ctx) => {
    if (!readinessFailed(ctx, "AI crawler access")) return null;
    return {
      engine: "chatgpt",
      title: "Unblock OAI-SearchBot in robots.txt",
      rationale:
        "ChatGPT's retrieval crawler is OAI-SearchBot (separate from GPTBot which trains). If your robots.txt disallows it, ChatGPT cannot fetch you live to cite — only train on you, which is far weaker.",
      fix: "Add to robots.txt:\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: ChatGPT-User\nAllow: /\n\nVerify at https://platform.openai.com/docs/bots.",
      priority: "high",
    };
  },

  // ---------- Gemini / AI Overviews ----------
  (ctx) => {
    if (!readinessFailed(ctx, "Entity grounding")) return null;
    return {
      engine: "gemini",
      title: "Add Organization sameAs to Wikipedia + Wikidata + LinkedIn",
      rationale:
        "Gemini and Google AI Overviews lean heavily on the Knowledge Graph for entity grounding. Brands with verified Wikidata entries see ~2.8× more AI citations (V9 Digital, 2026). Adding 2+ trust anchors via Organization.sameAs is the single biggest lift.",
      fix: 'Add to your Organization JSON-LD: "sameAs": ["https://en.wikipedia.org/wiki/YourBrand", "https://www.wikidata.org/wiki/Q123456", "https://www.linkedin.com/company/yourbrand", "https://www.crunchbase.com/organization/yourbrand"]. Validate with Google\'s Rich Results Test.',
      estimatedLift: "Up to 2.8× citations on Gemini + AIO",
      priority: "high",
    };
  },
  (ctx) => {
    if (!offDomainMissing(ctx, "wikidata")) return null;
    return {
      engine: "gemini",
      title: "Create or claim your Wikidata entity",
      rationale:
        "Gemini grounds via the Google Knowledge Graph, which is built largely from Wikidata. No Wikidata = no entity confidence = AI hesitates to recommend you in case of misattribution.",
      fix: "Visit https://www.wikidata.org/wiki/Special:NewItem and create an Item with: label = your brand, description = your category, instance of (P31) = appropriate type, official website (P856) = your URL, founder/CEO if public. Then add the Wikidata QID to your Organization.sameAs.",
      priority: "high",
    };
  },

  // ---------- Perplexity ----------
  (ctx) => {
    if (!offDomainMissing(ctx, "reddit")) return null;
    return {
      engine: "perplexity",
      title: "Seed authentic Reddit threads in your category subs",
      rationale:
        "Perplexity historically pulled ~46% of citations from Reddit. After the Oct 2025 Reddit lawsuit that share dropped to ~7%, but YouTube absorbed it — co-occurrence on either platform now matters. We didn't find any Reddit thread mentioning your brand in the last year.",
      fix: 'Identify the 3 most active subreddits in your category. Post one substantive 300+ word answer/week as a real expert (not a marketing post): "I\'ve been using X for Y, here\'s what I\'ve learned about Z". Engagement velocity in the first 24-48h matters most.',
      priority: "high",
    };
  },
  (ctx) => {
    if (!offDomainMissing(ctx, "g2")) return null;
    return {
      engine: "perplexity",
      title: "Claim your G2 product page and seed reviews",
      rationale:
        "G2 alone supplies 33-75% of all review-site citations across major AI engines (Omniscient Digital, 2026). G2 acquired Capterra/SoftwareAdvice in Q1 2026 — concentration is increasing.",
      fix: "Claim your free G2 listing at https://sell.g2.com. Email your last 30 happy customers a one-click G2 review request. 10+ reviews unlocks the AI-citable status.",
      priority: "high",
    };
  },

  // ---------- Claude ----------
  (ctx) => {
    if (score(ctx, "claude") === 0 && score(ctx, "chatgpt") === 0) return null;
    return {
      engine: "claude",
      title: "Add credentialed author bylines + dateModified to Article schema",
      rationale:
        "Claude (Brave-backed retrieval) prefers publication-grade structure: author Person with sameAs to LinkedIn, dateModified, citation array, balanced framing. It cites fewer sources but each carries more weight.",
      fix: 'Update Article JSON-LD with: { "author": { "@type": "Person", "name": "...", "jobTitle": "...", "sameAs": ["https://linkedin.com/in/..."] }, "datePublished": "...", "dateModified": "..." }. Add visible byline + bio + last-updated date on the page.',
      priority: "medium",
    };
  },

  // ---------- Grok ----------
  (ctx) => {
    if (score(ctx, "grok") === 0 && score(ctx, "chatgpt") === 0) return null;
    return {
      engine: "grok",
      title: "Cultivate authentic X / Twitter presence in your category",
      rationale:
        "Grok grounds heavily in X (Twitter) content — recent posts, real-time sentiment, replies. If you have no X presence or a stale account, Grok lacks signal to recommend you.",
      fix: "Post 3-5 substantive replies/week to high-engagement threads in your category. Follow-back the 50 loudest accounts in your space. Pin a tweet linking your homepage. Even modest activity outperforms abandoned accounts.",
      priority: "medium",
    };
  },

  // ---------- Universal ----------
  (ctx) => {
    if (!readinessFailed(ctx, "Heading")) return null;
    return {
      engine: "all",
      title: "Fix heading hierarchy: 1 H1, 2+ H2s with answer-summary phrasing",
      rationale:
        "Pages with 1 H1 + ≥2 H2s get 2.8× the citation rate (Kime, 2026). Generic H2s like 'Overview' or 'Background' are penalized — H2s should summarize the answer.",
      fix: "Rewrite H2s in question or answer-summary form. Bad: 'Background'. Good: 'How does it work?' or 'X delivers Y in three ways'.",
      priority: "medium",
    };
  },
  (ctx) => {
    if (!readinessFailed(ctx, "llms.txt")) return null;
    return {
      engine: "all",
      title: "Ship an llms.txt file at /llms.txt",
      rationale:
        "llms.txt adoption is ~10% (low correlation with citations directly), but pages using developer-facing AI tools (Cursor, Copilot) consume llms-full.txt heavily — and it's cheap insurance for Stripe-style structured discovery.",
      fix: "Generate an llms.txt with: H1 = your brand, blockquote summary, H2 sections linking to your top docs, pricing, FAQ, and changelog. Serve at /llms.txt with Content-Type: text/markdown.",
      priority: "low",
    };
  },
  (ctx) => {
    if (!offDomainMissing(ctx, "wikipedia")) return null;
    return {
      engine: "all",
      title: "Pursue a Wikipedia article (notability permitting)",
      rationale:
        "Wikipedia is the #1 entity ground-truth across all AI engines. ChatGPT, Claude, and Gemini disproportionately cite Wikipedia for factual queries.",
      fix: "Check notability: 3+ independent significant coverage in major outlets. If yes, draft via https://en.wikipedia.org/wiki/Wikipedia:Articles_for_creation. Use neutral, factual tone — promotional drafts are rejected.",
      priority: "medium",
    };
  },
];

export function buildPlaybook(
  scan: AIVisibilityResult,
  brand: string,
): PlaybookAction[] {
  const ctx: Ctx = {
    scan,
    brand,
    readiness: scan.aiReadiness ?? [],
    offDomain: scan.offDomainCoverage ?? [],
  };
  const actions: PlaybookAction[] = [];
  for (const rule of RULES) {
    const action = rule(ctx);
    if (action) actions.push(action);
  }
  const priorityRank: Record<PlaybookAction["priority"], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  return actions.sort(
    (a, b) => priorityRank[a.priority] - priorityRank[b.priority],
  );
}
