export const runtime = "nodejs";
export const maxDuration = 300;
import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";
import { enforceCredits } from "@/lib/credits";
import { requireActiveSubscription } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";
import { scoreBrandContext, READY_THRESHOLD } from "@/lib/brandContext";
import { detectCannibalization } from "@/lib/seo/cannibalization";
import { findRelatedArticles, renderRelatedReadingMarkdown } from "@/lib/seo/relatedArticles";
import { buildAndValidateArticleSchemas } from "@/lib/seo/articleSchema";

type ArticleType =
  | "locality_guide"
  | "project_showcase"
  | "market_analysis"
  | "buyer_guide"
  | "comparison"
  | "investment"
  | "nri_guide"
  | "landing_page"
  | "construction_update"
  | "best_of_list"
  | "alternatives_to"
  | "migration_guide";

const ARTICLE_TYPE_INSTRUCTIONS: Record<ArticleType, string> = {
  locality_guide:
    "Write a comprehensive locality guide. Cover connectivity (roads, metro, rail), social infrastructure (schools, hospitals, malls), upcoming developments, livability factors, and why this area is ideal for homebuyers.",
  project_showcase:
    "Write a detailed project showcase article. Highlight the developer's track record, project design and architecture, amenities, floor plans, construction quality, RERA details, and possession timeline.",
  market_analysis:
    "Write a real estate market analysis. Cover price trends, supply-demand dynamics, rental yields, appreciation potential, comparison with neighboring micro-markets, and expert outlook.",
  buyer_guide:
    "Write a homebuyer's guide. Cover the buying process step-by-step, documentation checklist, loan eligibility, RERA verification, hidden costs, negotiation tips, and red flags to watch for.",
  comparison:
    "Write a comparison article. Compare this project with 2-3 competing projects in the area across price, location, amenities, developer reputation, and value for money. Be balanced but highlight unique advantages.",
  investment:
    "Write an investment-focused article. Cover ROI potential, rental yield estimates, capital appreciation trends, infrastructure catalysts, risk factors, and exit strategy considerations.",
  nri_guide:
    "Write a guide specifically for NRI (Non-Resident Indian) buyers. Cover FEMA regulations, repatriation rules, Power of Attorney process, NRE/NRO account usage for transactions, tax implications (TDS, capital gains), virtual site visit and video tour options, property management services, and currency conversion considerations (USD/AED/GBP to INR).",
  landing_page:
    "Write a conversion-optimised locality-config landing page (not a blog article). Structure: (1) H1 with exact locality + config + city (e.g. '3 BHK Flats in Gachibowli, Hyderabad'), (2) a short 2-sentence hook, (3) a 'Project at a glance' block with bullets — configurations, carpet area range, price range, possession, RERA, (4) 'Why {locality}' section with connectivity, social infrastructure, micro-market momentum (no fabricated landmarks), (5) 'Who this suits' block (first-time buyer / investor / NRI / IT-professional — whichever matches the data), (6) Floor plans / typical units description, (7) Frequently asked buyer questions (5-7), (8) Clear final CTA block with 'Book a site visit' and 'Get price sheet' language. Use structured subheadings (H2/H3). Page-length, not blog-length: aim ~800-1200 words, scannable, buyer-decision oriented.",
  construction_update:
    "Write a dated construction-progress update. Open with quarter + year + project name + locality. Cover: (1) structural progress — floors poured, slab casting, block-wise status, (2) amenity progress — clubhouse, landscaping, pool, gym, (3) handover milestone remaining vs completed, (4) key photos/visuals described textually, (5) regulatory updates (RERA extensions, approvals), (6) next-quarter outlook. Dated, specific, factual — no marketing puffery. This becomes the canonical citation source AI models will quote when buyers ask 'what's the latest at {project}'.",
  best_of_list:
    "Write a ranked listicle-style guide (e.g. 'Top 7 3 BHK apartments in Gachibowli, 2026'). Comparative listicles account for ~32.5% of all LLM citations, so this format punches far above its weight. Open with the methodology / what made the list (RERA-registered, delivered on time, etc.). Present 5-10 entries, each with: a one-line positioning, 2-3 feature bullets, price band, stage/possession, RERA number if available, and a one-line pros/cons. Every entry uses the exact project name, not pronouns. Close with a 'how to choose' FAQ. Stay honest — only include projects actually in the supplied data. Do not fabricate unsupplied competitor projects.",
  alternatives_to:
    "Write an 'alternatives to {competitor}' or 'X similar to Y' comparison post. AI search routinely generates these queries for buyers exploring alternatives. Cover: (1) what makes the original interesting, (2) 4-6 alternative options (only projects/brands you have data for — no fabrication), (3) a feature-by-feature comparison table (config, price, locality, stage, RERA, amenities), (4) 'which to choose if...' scenarios, (5) FAQ. Balanced editorial tone, not promotional.",
  migration_guide:
    "Write a 'moving from X to Y' or 'upgrading from X to Y' guide — useful when a buyer is shifting from renting to owning, from one locality to another, or from a smaller config to a larger one. Cover: (1) why buyers make this move, (2) what to expect at each stage (loan, RERA check, site visit, allotment, registration), (3) cost comparison, (4) timeline, (5) checklist. Draws the reader who is mid-journey — higher intent, higher conversion.",
};

/**
 * Cron-actor auth: when the bulk article worker self-calls this route,
 * it carries `Authorization: Bearer ${CRON_SECRET}` plus an
 * `x-cron-actor` header naming the owner the job belongs to. We bypass
 * requireActiveSubscription on that path because the worker has already
 * gated by tier (claimNext only fires while remaining quota > 0) and
 * already verified ownership of the company. Treat the cron-issued
 * call as a Pro-equivalent gate so the brand-context-score check still
 * runs but the article cap is left to the worker.
 */
type Gate =
  | { ok: true; userId: string; plan: string; limits: { articlesPerMonth: number } }
  | { ok: false };

async function resolveGate(req: NextRequest): Promise<{
  gate: Gate;
  response?: NextResponse;
  isCron: boolean;
}> {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    const actor = req.headers.get("x-cron-actor") || "cron";
    return {
      gate: { ok: true, userId: actor, plan: "pro", limits: { articlesPerMonth: 9999 } },
      isCron: true,
    };
  }
  const sub = await requireActiveSubscription(req);
  if (!sub.ok) return { gate: { ok: false }, response: sub.response, isCron: false };
  return {
    gate: { ok: true, userId: sub.userId, plan: sub.plan, limits: { articlesPerMonth: sub.limits.articlesPerMonth } },
    isCron: false,
  };
}

export async function POST(req: NextRequest) {
  try {
    const resolved = await resolveGate(req);
    if (!resolved.gate.ok) return resolved.response!;
    const gate = resolved.gate;
    const isCron = resolved.isCron;

    const body = await req.json();
    const {
      projectName, developerName, location, city,
      configurations, priceRange, usps, topic, targetKeyword, articleType,
      // Brand context
      brandVoice, productInfo, amenities, reraNumber, status,
      allProjects, competitors,
      // Per-channel writing instructions from Settings → Personalization
      writingInstructions,
      companyId,
    } = body;

    if (!projectName || !location || !city) {
      return NextResponse.json(
        { error: "projectName, location, and city are required" },
        { status: 400 }
      );
    }

    // Tier-gated monthly article cap. Starter 30, Growth 80, Scale 200.
    // We count by calendar month of generated_at on tracked_articles so
    // the counter resets the first of each month without cron work.
    // Cron path skips this — the bulk worker enforces the cap before
    // claiming a job, so a second gate here would just double-block.
    if (!isCron && companyId && gate.plan !== "demo") {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      try {
        const svc = getServiceClient();
        const { count } = await svc
          .from("tracked_articles")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .gte("generated_at", start.toISOString());
        if ((count ?? 0) >= gate.limits.articlesPerMonth) {
          return NextResponse.json(
            {
              error: `You've used all ${gate.limits.articlesPerMonth} articles included in your ${gate.plan} plan this month.`,
              hint: "Upgrade your plan for more monthly articles, or wait until the counter resets on the 1st.",
              needsUpgrade: true,
              limit: gate.limits.articlesPerMonth,
              used: count ?? 0,
            },
            { status: 402 }
          );
        }
      } catch (err) {
        // Fail open rather than blocking legitimate writes on infra
        // flake — logs will catch it if this becomes a pattern.
        console.error("article cap check failed:", err);
      }
    }

    // Track credit usage (always allows — upsell model)
    await enforceCredits(body.companyId, "article");

    // Cannibalization check — at 80-200 articles a month, two articles
    // for the same target query split signal between themselves and
    // neither ranks. Block exact-match writes unless the caller passes
    // `override: true`. Near-matches (≥0.6 jaccard) get returned as a
    // warning the UI can surface but don't block. Cron path skips —
    // the bulk worker is just executing what the user already queued,
    // and the queue's own dedup (unique on company_id, query) prevents
    // exact-match enqueues. Demo bypasses.
    let cannibal: Awaited<ReturnType<typeof detectCannibalization>> | null = null;
    if (!isCron && companyId && gate.plan !== "demo" && targetKeyword && body.override !== true) {
      try {
        cannibal = await detectCannibalization(companyId, targetKeyword);
        if (cannibal.exact) {
          return NextResponse.json(
            {
              error: `An article for this query already exists in your library — generating another would split your AI signal between the two.`,
              hint: `Edit the existing article instead, or pass override: true if you intentionally want a fresh draft.`,
              cannibalization: cannibal,
              existingArticleId: cannibal.exact.id,
            },
            { status: 409 },
          );
        }
      } catch (err) {
        // Cannibalization check is best-effort — never block a write on
        // an infra hiccup; just log and skip.
        console.warn("cannibalization check failed:", err instanceof Error ? err.message : err);
      }
    }

    if (!articleType || !ARTICLE_TYPE_INSTRUCTIONS[articleType as ArticleType]) {
      return NextResponse.json(
        {
          error: `Invalid articleType. Must be one of: ${Object.keys(ARTICLE_TYPE_INSTRUCTIONS).join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (!targetKeyword) {
      return NextResponse.json(
        { error: "targetKeyword is required" },
        { status: 400 }
      );
    }

    // Library differentiation context — pull the most recent ~10 article
    // titles for this company so the writer knows what's already in
    // their corpus and can frame the new piece with a distinctly
    // different angle. Cannibalization gate already blocks duplicate
    // queries; this is the structural-uniqueness layer that prevents
    // every locality_guide from reading like the last one. Cheap query
    // (indexed on company_id, generated_at), best-effort, never blocks.
    let recentLibrary: Array<{ title: string; query: string; type: string | null }> = [];
    if (companyId) {
      try {
        const svc = getServiceClient();
        const { data: recent } = await svc
          .from("tracked_articles")
          .select("title, query, generated_at")
          .eq("company_id", companyId)
          .order("generated_at", { ascending: false })
          .limit(10);
        recentLibrary = (recent || [])
          .filter((r) => r && (r.title || r.query))
          .map((r) => ({
            title: r.title || r.query,
            query: r.query,
            type: null,
          }));
      } catch (err) {
        console.warn(
          "library fetch failed:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Brand-context completion gate. Generic articles produced from an
    // empty brand context are the #1 reason customers cancel — they
    // can't publish them, so they stop seeing value, so they churn.
    // We hard-block writes below threshold and tell the user exactly
    // which fields to fill. Demo bypasses (sales pitch needs to render).
    if (gate.plan !== "demo") {
      const ctxScore = scoreBrandContext({
        productInfo,
        brandVoice,
        vision: body.brandContext?.vision || body.vision,
        values: body.brandContext?.values || body.values,
        targetAudience: body.brandContext?.targetAudience || body.targetAudience,
        marketingStrategy: body.brandContext?.marketingStrategy || body.marketingStrategy,
        competitorAnalysis: body.brandContext?.competitorAnalysis || body.competitorAnalysis,
      });
      if (!ctxScore.ready) {
        return NextResponse.json(
          {
            error: `Brand context is ${ctxScore.score}% complete — fill the required fields before generating articles. Articles written from empty context read like every other developer's blog.`,
            hint: `Need ${READY_THRESHOLD}% to unlock. Open Settings → Brand Context and fill: ${ctxScore.missing.map((m) => m.label).join(", ")}.`,
            needsBrandContext: true,
            score: ctxScore.score,
            threshold: READY_THRESHOLD,
            missing: ctxScore.missing,
          },
          { status: 412 }
        );
      }
    }

    const typeInstruction = ARTICLE_TYPE_INSTRUCTIONS[articleType as ArticleType];

    const systemPrompt = `You are an expert real estate content writer whose only job is to produce content that AI search engines (ChatGPT, Google AI Overview, Gemini, Perplexity) will CITE. You understand Generative Engine Optimization (GEO) at an expert level.

CRITICAL HONESTY RULES — these override every other instruction:
- NEVER invent specific prices, distances, areas, percentages, RERA numbers, phone numbers, years, or named entities (schools, hospitals, metro stations, landmarks) unless they appear in the DATA section below. If the data doesn't support it, don't write it.
- If you don't have a specific number for something, omit the claim rather than inventing one. "Premium location" with no fabricated "2.5 km from HITEC City" is better than a confident lie.
- Only name real places if they are extremely well-known regional landmarks in the supplied location/city (e.g., "${location}" itself, the city name). Do not invent specific school names, hospital brand names, or metro station names.
- If you need to reference infrastructure, use generic language tied to the locality ("schools in ${location}", "metro connectivity in ${city}") rather than named entities.

GEO CITATION RULES — follow every one:

1. ANSWER-FIRST PARAGRAPHS. Every section opens with the direct answer in the first sentence. AI models extract the opening sentence as the citation.

2. QUESTION-BASED H2 HEADINGS. Every H2 is a natural-language question a buyer would type into ChatGPT, not a noun phrase. "What is the price of ${configurations || "homes"} in ${location}?" not "Pricing".

3. 40-60 WORD ANSWER TARGETS. Immediately after every H2, a self-contained 40-60 word paragraph that answers the question with a fact. AI models preferentially cite these passage lengths.

4. QUOTABLE STATEMENTS. Produce 2-3 standalone sentences (inside the body) that work as quoteable citations. Each must contain a specific number from the data (configuration count, price range, RERA number, possession date). Example: "${projectName} offers ${configurations || "2-3 BHK"} homes priced ${priceRange || "in the mid-to-premium segment"} in ${location}."

5. LOW PRONOUN DENSITY. Use "${projectName}", "${developerName}", "${location}" by name. Never "it", "they", "this project". Pronouns break citation clarity — AI can't cite a sentence whose subject is "it".

6. FREQUENT NAMED ENTITIES. Repeat the project name + developer name + locality 8-12 times across the article. AI citation matches on entity frequency.

7. FIRST-PARTY DATA FRAMING. Where the data permits, attribute claims with first-party language: "${developerName || "The developer"} has published...", "Based on ${projectName}'s configuration data...", "${developerName || "The developer"}'s RERA-registered inventory includes...". Attributed claims get cited more than unattributed ones.

8. FAQ SECTION — 5-8 FAQs. Every answer 40-60 words, grounded in the data, with at least one specific number.

9. IMAGE SUGGESTIONS — propose 3-5 images the editorial team should include. Each with a descriptive alt string that AI visual crawlers can parse ("facade view of ${projectName} ${configurations || "apartments"} in ${location}" > "building photo").

10. E-E-A-T CLOSING BLOCK — include an "About ${developerName || projectName}" paragraph at the very end with years of experience, number of projects, state/city presence, quality signals. AI models use this to decide if the source is authoritative.

11. FRESHNESS LINE — end the article with "Last updated: ${new Date().toISOString().slice(0, 10)}". AI prefers timestamped content.

12. NO FILLER. Skip "In today's fast-paced world", "Let's dive in", "Looking for your dream home?", "Nestled in the heart of". Every sentence carries a fact.

INDIAN-RE HYPERLOCAL RULES — buyer queries here are compound and specific:

13. COMPOUND-QUERY TARGETING. Indian buyers type compound queries like "3 BHK in Kukatpally under 3 cr ready by 2027" as a single natural-language search, not five filters. Structure sections around compound answers: one H2 combines config + locality + price, another combines stage + locality + year, another combines amenity + config + locality. Don't split what Indians search for as one idea.

14. YEAR-TAGGED PHRASING. Evergreen content underperforms year-tagged content in AI search. Use "launched in ${new Date().getFullYear()}", "possession expected 2027", "new launches in ${location} this year" liberally when the data supports a year. ${status === "Ready to Move" ? `For this ready-to-move project, include "ready to move in ${new Date().getFullYear()}" phrasing.` : ""}${status === "Under Construction" ? `This project is under construction — reference the expected possession year if available.` : ""}

15. RERA + STATE-PORTAL AUTHORITY. ${reraNumber ? `This project's RERA number is ${reraNumber}. Mention the RERA number TWICE — once in the body near the project overview, once in the FAQs. Frame as "RERA No. ${reraNumber}, filed with the state RERA authority." This pulls state-portal authority without fabricating a URL.` : `If RERA is not supplied, reference "RERA-registered with the state authority" generically — do not invent a number. Never cite a state RERA portal URL directly unless you know it's correct.`}

16. LANDMARK-PROXIMITY BANDS. Where the data supplies named landmarks or amenities near the project, structure proximity as bands: "0–2 km (walking distance)" · "2–5 km (10–15 minute drive)" · "5+ km". NEVER invent landmarks or distances. If no landmark data is supplied, use the locality's reputation in generic terms ("established residential pocket in ${location}").

17. SUB-LOCALITY DISAMBIGUATION. Indian localities often have multiple micro-markets ("Gachibowli near Wipro Circle" vs "Gachibowli near Financial District"). If the project's locality is commonly ambiguous, include a one-phrase disambiguation alongside the locality name in the opening paragraph and one FAQ — only if the data clearly supports which micro-market the project sits in.

18. PRICE-PER-SQFT BANDS (only if price_range is supplied). Convert the supplied price_range into a per-sq-ft band IF — and only if — the data also includes carpet area ranges. Otherwise skip. Never fabricate a ₹/sqft figure.

19. COMPARISON HOOKS. Every article should carry one H2 that answers "how does ${projectName} compare to other ${configurations || "projects"} in ${location}?" — AI loves comparison content, and it's where the developer's project gets differentiated. Stay generic about competitors (no fabricated competitor project names) unless supplied in the data.

20. LOCAL-INTENT CTAs. Close each major section with a micro-CTA tied to the query intent: "Schedule a site visit to see the ${configurations || "apartments"} at ${projectName}", "Request the current price sheet for ${location} inventory", "Speak to an NRI specialist about buying in ${city}". CTAs are AI-friendly action extraction points.

21. THREE-LAYER ANSWER ARCHITECTURE (per Foundation Inc research on ChatGPT citation patterns). Every major H2 answer follows this exact shape:
    Layer 1 — DIRECT ANSWER (first 50 words): a self-contained paragraph that answers the question with a concrete fact. This is what AI quotes.
    Layer 2 — WHY IT MATTERS (next 100-150 words): context, implications, one quotable comparison or number.
    Layer 3 — DEEP ANALYSIS (1000+ words across the article): the rest of the article that proves you actually know the topic and earns the citation in the first place.
    Don't start with background. Don't bury the answer. AI cites Layer 1, humans scroll through Layer 3.

22. SINGLE H1 ONLY. 87% of AI-cited pages use exactly one H1. The markdown output must have exactly one top-level "# " heading (the title). All other section headings are H2 ("## ") or lower. Do not emit "# " multiple times.

23. FAQ-SCHEMA READY. The FAQs section you return must be safe to serialize as FAQPage schema: each question is a standalone, short natural-language question; each answer is self-contained and does not reference sections ("as mentioned above") that wouldn't make sense in a stripped-out schema context. FAQ schema appears in 10.5% of cited pages — high-leverage signal.

24. COMPARATIVE LISTICLE BIAS. Comparative / alternative / best-of formats account for ~32.5% of all LLM citations. Where the article type is best_of_list, alternatives_to, or comparison: include ≥5 clearly-numbered entries, a comparison table, and an "how do I choose?" section. Where the article type is locality_guide / project_showcase / landing_page: include at least one comparative block ("How does ${projectName} compare to other ${configurations || "projects"} in ${location}?") so the article still participates in comparative-query retrieval.

25. LIBRARY DIFFERENTIATION. If the user prompt lists this brand's existing library, the new article MUST have a distinctly different framing — different opening hook, different H2 question structure, different middle-section emphasis. Same brand + same project + slightly different query is NOT a license to recycle the previous article. Buyers searching the new query expect a new angle. AI search engines de-rank near-duplicate corpus pages. If you can't find a genuinely different angle, lean into what makes THIS query specifically different (a different config, a different price band, a different intent — investor vs end-user, NRI vs local, ready-to-move vs under-construction, single-bedroom vs family-sized).

Return valid JSON (no markdown fences):
{
  "title": "Question-format title including target keyword (50-60 chars)",
  "metaDescription": "Direct answer to the title question (150-160 chars, starts with a fact)",
  "content": "Full article in markdown. 1500-2000 words. Opens with the answer. Every H2 is a question. Every H2 is followed by a 40-60 word direct answer. Ends with an E-E-A-T block then the Last updated line.",
  "faqs": [
    { "question": "Specific buyer question", "answer": "40-60 word direct answer starting with a fact, including a number" }
  ],
  "quotableStatements": [
    "A 1-2 sentence standalone quote with a number, citable by AI without context"
  ],
  "imageSuggestions": [
    { "alt": "descriptive alt text AI can parse", "placement": "where in the article this image slots (e.g. 'under the What is ... H2')" }
  ],
  "eeatBlock": "One paragraph about the developer — experience, project count, state presence, trust signals. Goes at the end of the article.",
  "suggestedInternalLinks": ["related topics the site should also cover"]
}`;

    const userPrompt = `Write a full SEO-optimized article using ONLY the data below. Do not invent facts not present here.

**Article Type:** ${articleType}
**Type-Specific Instructions:** ${typeInstruction}

**Project Details (the only facts you can assert):**
- Project Name: ${projectName}
- Developer: ${developerName || "Not specified"}
- Location: ${location}
- City: ${city}
- Configurations: ${configurations || "Not specified"}
- Price Range: ${priceRange || "Not specified"}
- USPs: ${usps || "Not specified"}
${reraNumber ? `- RERA: ${reraNumber}` : ""}
${amenities ? `- Amenities: ${amenities}` : ""}
${status ? `- Status: ${status}` : ""}

${brandVoice || productInfo ? `**Brand Context (write in this brand's voice):**
${brandVoice ? `- Voice & Positioning: ${brandVoice.substring(0, 600)}` : ""}
${productInfo ? `- Product Info: ${productInfo.substring(0, 600)}` : ""}` : ""}
${allProjects?.length > 1 ? `\n**Other projects by ${developerName}:** ${allProjects.filter((p: any) => p.name !== projectName).map((p: any) => `${p.name} (${p.location})`).join(", ")}` : ""}
${competitors?.length ? `**Competitors:** ${competitors.join(", ")}` : ""}

${(writingInstructions?.articles || writingInstructions?.general) ? `**Writing Instructions (from Settings → Personalization — follow EXACTLY):**
${writingInstructions?.general ? `General: ${String(writingInstructions.general).substring(0, 2000)}` : ""}
${writingInstructions?.articles ? `Article-specific: ${String(writingInstructions.articles).substring(0, 2000)}` : ""}
These override any generic tone — match the voice, phrasing rules, dos/donts listed above.` : ""}

${recentLibrary.length > 0 ? `**Existing library — DIFFERENTIATE from these.** This brand already has ${recentLibrary.length} article${recentLibrary.length === 1 ? "" : "s"} in their corpus. Read the titles below; the new article must have a distinctly different angle, H2 structure, or hook. Do not repeat the framing of any existing piece. The point of generating more content is differentiated coverage, not the same article retold.

${recentLibrary.map((r, i) => `${i + 1}. "${r.title}" (target: "${r.query}")`).join("\n")}` : ""}

**SEO Details:**
- Topic: ${topic || articleType.replace(/_/g, " ")}
- Target Keyword: ${targetKeyword}

**Requirements:**
1. Write 1500-2000 words
2. EVERY H2 heading MUST be a question (e.g., "## What is the price of ${configurations || "homes"} in ${location}?" not "## Pricing")
3. After EVERY H2, the FIRST paragraph must be a 40-60 word direct answer starting with a fact or definition — grounded in the data above, not invented
4. Key paragraphs should be 134-167 words, self-contained, zero pronouns (use full names)
5. Use specific numbers ONLY when they're in the data above (price range, configurations, RERA number). Do NOT fabricate prices per sq ft, specific distances, or dated stats.
6. When referencing infrastructure/neighbourhood, use generic phrasing tied to "${location}"/"${city}" rather than invented school/hospital/metro names
7. Target keyword "${targetKeyword}" should appear 8-12 times naturally
8. Add 2-3 CTA sections (Schedule a Site Visit, Download Brochure, Talk to Our Experts)
9. End with 5-8 FAQ questions — answers grounded in the data block only
10. Suggest 4-6 internal link topics
11. NO filler phrases like "In today's fast-paced world", "Let's dive in", "Looking for your dream home?"
12. When unsure about a specific fact, write a more general sentence rather than inventing a number

Return ONLY valid JSON. No markdown code blocks around the JSON.`;

    const raw = await aiComplete(systemPrompt, userPrompt, 4000);

    let parsed;
    try {
      // Strip markdown code fences if the model wraps the JSON
      const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON" },
        { status: 502 }
      );
    }

    const content: string = parsed.content || "";
    const wordCount = content
      .replace(/[#*_\[\]()]/g, "")
      .split(/\s+/)
      .filter((w: string) => w.length > 0).length;

    // -----------------------------------------------------------------
    // GEO readiness score — measures how citable this article is to
    // AI search engines on the signals Foundation / Princeton / Georgia
    // Tech research consistently identify as high-impact.
    //
    //   Q&A structure           20pts  (3+ question H2s)
    //   Answer-first paragraphs 15pts  (first sentence after H2 has a number)
    //   FAQ section             15pts  (5+ FAQs)
    //   Quotable statements     10pts  (2+ quotables returned)
    //   E-E-A-T block            10pts  (developer authority paragraph)
    //   Freshness timestamp     10pts  (Last updated line in content)
    //   Image suggestions       10pts  (3+ with alt text)
    //   Entity density          10pts  (project name cited 8+ times)
    // -----------------------------------------------------------------
    const h2Questions = (content.match(/^##\s+.+\?$/gm) || []).length;
    // Look for the pattern "## Question?\n\n<text with a digit>" —
    // no `s` flag because older TS targets reject it; we fake dotall
    // with [\s\S].
    const firstAnswersLookLikeFacts = /^##\s+.+\?\s*\n+[\s\S]*?\d+/m.test(content);
    const faqCount = Array.isArray(parsed.faqs) ? parsed.faqs.length : 0;
    const quotableCount = Array.isArray(parsed.quotableStatements) ? parsed.quotableStatements.length : 0;
    const imageCount = Array.isArray(parsed.imageSuggestions) ? parsed.imageSuggestions.length : 0;
    const hasEeat = typeof parsed.eeatBlock === "string" && parsed.eeatBlock.trim().length > 60;
    const hasFreshness = /last updated[:\s]+20\d{2}/i.test(content) || /updated[:\s]+20\d{2}/i.test(content);
    const nameCount = projectName
      ? (content.match(new RegExp(projectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length
      : 0;

    const geoScore = Math.min(
      100,
      (h2Questions >= 3 ? 20 : h2Questions >= 1 ? 10 : 0) +
        (firstAnswersLookLikeFacts ? 15 : 0) +
        (faqCount >= 5 ? 15 : faqCount >= 3 ? 8 : 0) +
        (quotableCount >= 2 ? 10 : quotableCount >= 1 ? 5 : 0) +
        (hasEeat ? 10 : 0) +
        (hasFreshness ? 10 : 0) +
        (imageCount >= 3 ? 10 : imageCount >= 1 ? 5 : 0) +
        (nameCount >= 8 ? 10 : nameCount >= 4 ? 5 : 0)
    );

    // Short-form "what's missing" hints the UI can show alongside the score.
    const missingGeoSignals: string[] = [];
    if (h2Questions < 3) missingGeoSignals.push("question-format H2 headings");
    if (faqCount < 5) missingGeoSignals.push("5+ FAQs");
    if (quotableCount < 2) missingGeoSignals.push("2+ quotable statements");
    if (!hasEeat) missingGeoSignals.push("E-E-A-T / About block");
    if (!hasFreshness) missingGeoSignals.push("Last-updated timestamp");
    if (imageCount < 3) missingGeoSignals.push("3+ image suggestions");
    if (nameCount < 8) missingGeoSignals.push("higher project-name density");

    // If the model forgot to write the closing E-E-A-T + timestamp into
    // `content`, append them deterministically so every published piece
    // carries the GEO-critical signals even when the LLM slips.
    let finalContent = content;
    const todayIso = new Date().toISOString().slice(0, 10);

    // Prepend a deterministic author byline so every article carries an
    // author signal AI overviews can extract. First-party byline (the
    // brand's editorial team) is the right framing — this is the
    // developer's own content, not third-party reporting. Skips if the
    // LLM already wrote a byline at the top.
    if (!/^\s*\*By\s|^\s*\*Posted/i.test(finalContent.slice(0, 80))) {
      finalContent = `*By the ${developerName || projectName} editorial team · Published ${todayIso}*\n\n${finalContent}`;
    }

    if (!hasEeat && parsed.eeatBlock) {
      finalContent += `\n\n## About ${developerName || projectName}\n\n${parsed.eeatBlock}`;
    }
    if (!hasFreshness) {
      finalContent += `\n\n---\n*Last updated: ${todayIso}*`;
    }

    // Internal linking — pull up to 4 topically-related articles from
    // this company's existing library and append a "Related reading"
    // block before the freshness line. At 80-200 articles a month this
    // is how we keep the topic graph dense — every new article links
    // backward into the existing corpus, every existing article gets
    // mentioned by a relevant new one, and AI crawlers see a real
    // cluster instead of orphan pages.
    let relatedArticles: Awaited<ReturnType<typeof findRelatedArticles>> = [];
    if (companyId && targetKeyword) {
      try {
        relatedArticles = await findRelatedArticles(
          companyId,
          targetKeyword,
          parsed.title || "",
          { limit: 4 },
        );
        if (relatedArticles.length > 0) {
          const block = renderRelatedReadingMarkdown(relatedArticles);
          // Insert before any trailing freshness footer so the freshness
          // line stays at the very end of the article.
          if (/\n\n---\n\*Last updated:/.test(finalContent)) {
            finalContent = finalContent.replace(
              /(\n\n---\n\*Last updated:)/,
              `${block}$1`,
            );
          } else {
            finalContent += block;
          }
        }
      } catch (err) {
        console.warn("related articles lookup failed:", err instanceof Error ? err.message : err);
      }
    }

    // -----------------------------------------------------------------
    // QA pass — second-pass LLM review catches what rule-based scoring
    // can't: fabricated landmarks, made-up RERA numbers, off-brand voice,
    // ungrounded claims. Cheap call (~$0.01), runs after the main draft
    // so it costs nothing on rejected drafts. We don't auto-reject the
    // article — surface the warnings so the customer can decide to
    // regenerate or edit. Hidden auto-rejects produce mysterious
    // failures that are worse than a flagged-but-saved draft.
    // -----------------------------------------------------------------
    let qa: {
      passed: boolean;
      voiceMatch: number;
      factualGroundedness: number;
      flags: string[];
      reraSuspect: boolean;
    } = {
      passed: true,
      voiceMatch: 100,
      factualGroundedness: 100,
      flags: [],
      reraSuspect: false,
    };
    try {
      const qaSystem = `You are a senior editor reviewing an AI-generated real estate article for two specific failure modes: factual fabrication and brand-voice drift. Be strict. Return ONLY valid JSON, no commentary.`;
      const qaUser = `Review this draft and flag specific problems.

GROUND TRUTH supplied by the brand (everything else is fabrication if asserted as fact):
- Project name: ${projectName}
- Developer: ${developerName || "(not supplied)"}
- Location: ${location}, ${city}
- Configurations: ${configurations || "(not supplied)"}
- Price range: ${priceRange || "(not supplied)"}
- RERA: ${reraNumber || "(not supplied)"}
- Status: ${status || "(not supplied)"}
- Brand voice description: ${brandVoice ? brandVoice.substring(0, 600) : "(not supplied — flag any voice issues as 'no baseline supplied')"}

DRAFT:
"""
${finalContent.substring(0, 8000)}
"""

Check for:
1. Named landmarks / schools / hospitals / metro stations not in the ground truth.
2. RERA numbers in the draft that don't match the supplied RERA (or any RERA number when none was supplied).
3. Specific distance / km / minute claims with no source.
4. Voice drift from the supplied brand voice (if voice was supplied).
5. Fabricated quoted reviews / testimonials.

Return JSON:
{
  "voiceMatch": <0-100, how well the draft matches the supplied brand voice. 80+ = good, 50–79 = drift, <50 = off-brand>,
  "factualGroundedness": <0-100, share of factual claims that are supported by the ground truth>,
  "reraSuspect": <true|false — true if a RERA number appears that isn't the supplied one or is invented>,
  "flags": ["<specific quote from draft>: <why it's a problem>", ... up to 5 most serious]
}`;
      const qaRaw = await aiComplete(qaSystem, qaUser, 800);
      const cleaned = qaRaw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      const qaParsed = JSON.parse(cleaned);
      const voiceMatch = typeof qaParsed.voiceMatch === "number" ? Math.max(0, Math.min(100, qaParsed.voiceMatch)) : 80;
      const factualGroundedness = typeof qaParsed.factualGroundedness === "number" ? Math.max(0, Math.min(100, qaParsed.factualGroundedness)) : 80;
      const flags = Array.isArray(qaParsed.flags) ? qaParsed.flags.filter((f: unknown): f is string => typeof f === "string").slice(0, 5) : [];
      qa = {
        voiceMatch,
        factualGroundedness,
        reraSuspect: qaParsed.reraSuspect === true,
        flags,
        // Pass if both axes are decent and no RERA fabrication
        passed: voiceMatch >= 60 && factualGroundedness >= 70 && !(qaParsed.reraSuspect === true),
      };
    } catch (err) {
      // QA failure is non-fatal — log it and proceed with the draft.
      console.warn("article QA pass failed:", err instanceof Error ? err.message : err);
    }

    // JSON-LD schema bundle. Generated and validated server-side so the
    // customer can copy the schemas straight into their CMS without
    // hand-writing JSON-LD. Article + FAQPage (when faqs are present)
    // schemas are emitted; both pass our validator before we ship them
    // (missing required fields, malformed FAQ shape, non-serialisable
    // values all get caught here, not at customer-deploy time when AI
    // crawlers would silently downgrade the page).
    const company = developerName || projectName;
    const fakePublishUrl = `https://example.com/${(parsed.title || targetKeyword).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
    const schemaBundle = buildAndValidateArticleSchemas({
      article: {
        title: parsed.title || targetKeyword,
        metaDescription: parsed.metaDescription || "",
        publishUrl: fakePublishUrl,
        authorName: `${company} editorial team`,
        publisherName: company,
        publishedDate: todayIso,
        modifiedDate: todayIso,
      },
      faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
    });

    return NextResponse.json({
      title: parsed.title || "",
      metaDescription: parsed.metaDescription || "",
      targetKeyword,
      content: finalContent,
      wordCount,
      faqs: parsed.faqs || [],
      quotableStatements: parsed.quotableStatements || [],
      imageSuggestions: parsed.imageSuggestions || [],
      eeatBlock: parsed.eeatBlock || "",
      suggestedInternalLinks: parsed.suggestedInternalLinks || [],
      geoScore,
      missingGeoSignals,
      qa,
      cannibalization: cannibal,
      relatedArticles,
      schema: schemaBundle.schemas,
      schemaValidation: schemaBundle.validation,
    });
  } catch (error) {
    console.error("Article writer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Article generation failed" },
      { status: 500 }
    );
  }
}
