# Cabbge — Product State Report

*Generated 2026-04-29 · Source-of-truth snapshot of what's built, deployed, and selling.*

---

## 1. Executive Summary

**What it is.** Cabbge is a vertical-real-estate AI search visibility + content production platform. The engine measures how often a developer's brand and projects are cited by ChatGPT and Gemini for buyer-intent queries, generates citation-grade content to fix gaps, and surfaces SEO + technical health alongside.

**Who buys it (post-Makuta pivot).** Premium / NRI-heavy Indian developers (Sobha, Brigade, Prestige, DLF, Lodha, Godrej, Casagrand) and Middle East developers (Emaar, Damac, Aldar, Sobha Realty, Danube, Azizi, Binghatti). Sub-Tier-1 Indian developers are no longer pursued — they don't buy AI search tools and consider Wix sufficient.

**Unit-of-value sold.** CAC reduction. Premium developers spend ₹2-5 lakh per booked buyer. Cabbge adds an organic + AI search lead channel that costs ₹0 incremental once subscription is paid. The marketing surface emphasises lead delivery and CAC math; the underlying engine is the same vertical-RE GEO platform.

**Production URL.** https://cabbge.com (Vercel deployment, latest commit at time of writing: `e0c71d7`).

**Repo.** /Users/arjun/cabbage

**Stack.** Next.js 16.2.3 · React 19.2.4 · Supabase (auth + Postgres + RLS) · OpenAI (gpt-5.4 + gpt-5.4-nano + Responses API web_search) · Google Gemini · Tailwind 4 · Vercel.

---

## 2. ICP & Positioning

**Effective ICP (2026-04-29):**

| Segment | Examples | Why they fit | Pricing entry |
|---|---|---|---|
| Indian premium / NRI-heavy | Sobha, Brigade, Prestige luxury, DLF, Lodha, Casagrand | NRI buyers research extensively on AI search before flying back. CAC ₹3-8L. SaaS budgets exist. | $5-10K/mo |
| Indian Tier-1 national | Godrej, Tata Housing, Mahindra Lifespaces, Adani, Shapoorji, Oberoi, Kalpataru, Piramal | Big marketing budgets, value vertical-RE depth, willing to pilot. | $10-15K/mo |
| ME giants | Emaar, Damac, Aldar, Sobha Realty, Danube | English-default, USD-denominated SaaS spend normal, AI search relevance highest. | $5-15K/mo USD |
| ME mid-tier | Azizi, Binghatti, Imtiaz, Object 1, Reportage, Bloom, Diamond, Meraas, Nakheel, Wasl | Less crowded sales market, hungry for differentiation. | $3-8K/mo USD |

**Buyers no longer pursued:** sub-Tier-1 Indian developers building <100 units a year, single-project local builders, anyone whose primary marketing channel is billboards + paid search (the Makuta profile).

**Headline pitch:** *"Premium real estate developers spend ₹2-5 lakh per booked buyer. Cabbge brings that down."*

**Outbound target list:** 30 specific developers documented in `cabbage_outbound_targets` memory entry, ranked by ICP fit.

---

## 3. Pricing

Three published tiers + Custom Enterprise.

| Tier | Price | Projects | Cities | Articles/mo | Scan cadence |
|---|---|---|---|---|---|
| Starter | ₹49,999/mo | 5-10 | 1 | 30 | Weekly full, daily AI vis |
| Growth | ₹99,999/mo | 10-40 | 3 | 80 | Daily full + CMO digest |
| Scale | ₹2,49,999/mo | 40-100 | 10 | 200 | Daily full + custom reports |
| Enterprise | Custom (typ. $5-25K USD/mo) | Unlimited | Unlimited | Per contract | Daily + bespoke |

- Annual plans get 20% off (10 months for the price of 12).
- GST extra as applicable. INR for Indian customers, USD-equivalent for ME.
- Enterprise tier added back 2026-04-29 as a "talk to sales" CTA on `/pricing#enterprise`. Anchored on outcomes (CAC delta dashboards, NRI-market query coverage, dedicated CSM, white-label exports), not feature counts.
- `DISABLE_PAYWALL=true` env var currently active for design-partner testing window. Every authenticated user gets full Pro-tier access until payments wire up.

---

## 4. Public Surfaces (Marketing + Onboarding)

**Marketing pages.**

| Path | Purpose |
|---|---|
| `/` | Homepage with CAC-anchored hero + 3 outcome cards |
| `/about` | What Cabbge is, who it's for, why CAC math wins |
| `/pricing` | Three tiers + Custom Enterprise CTA |
| `/methodology` | Full documentation of how AI vis is measured (closes ZipTie's #1 trust red flag) |
| `/compare` | Cabbge vs SEO agency math |
| `/benchmark` | Public benchmark of Indian developer AI visibility |
| `/legal`, `/privacy`, `/terms`, `/dpa` | Trust surfaces |

**SEO / discoverability.**

- `sitemap.xml` (auto-generated from `app/sitemap.ts`) — includes all marketing routes + `/methodology`
- `robots.txt` — explicit allow for GPTBot, ChatGPT-User, OAI-SearchBot, Google-Extended, anthropic-ai, ClaudeBot, PerplexityBot, CCBot, Applebot-Extended
- `/llms.txt` (in `public/`) — describes the product to AI crawlers per the emerging convention
- JSON-LD via `JsonLd` component (Organization, SoftwareApplication, FAQPage schemas on every marketing page)

**Auth.**

- Supabase Auth with email/password
- `/signup` → email confirmation → `/onboarding`
- `/signin`, `/forgot-password`, `/reset-password`
- Auth provider configuration: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (for GSC OAuth), Supabase URL + keys

**Onboarding wizard (`/onboarding`).**

3-step flow that captures everything the engine needs:

1. **URL paste** → `/api/auto-discover` extracts brand, description, cities (multi-city array), projects (with location, configurations, prices, RERA, amenities, status, possession), competitors. ~30s.
2. **Review structured data** → editable fields for company name, primary city, multi-city array, additional sites (microsites), projects with full per-project detail, competitors. Sitemap import for project microsites.
3. **Brand context** → 7 fields auto-prefilled and editable: productInfo, brandVoice, brandValues, brandVision, targetAudience, marketingStrategy, competitorAnalysis. Plus a prominent **Connect GSC now** CTA that triggers OAuth flow (with company state persisted first so the callback has a row to attach).

After Step 3 → `/onboarding/first-scan` (animated 4-wave scan UI) → `/dashboard?welcome=1`.

**Demo flow (`/demo`).**

- Password-gated (`DEMO_PASSWORD` env var) for sales team
- Auto-discovers prospect's URL, persists state to localStorage only (no DB writes)
- Drops into `/dashboard?demo=1` with full feature access
- Auto-discover wrapped in retry-on-failure (4s cooldown, retries once, surfaces clear error if persistent)
- Wipes 6 stale localStorage keys on entry to avoid prospect-A leaking into prospect-B
- "Exit Demo" wipes all demo state

---

## 5. Dashboard — Customer-Facing Surfaces

The customer experience has 50+ React components in `src/components/dashboard/`. Major panels by tab.

### 5.1 Overview tab

- **TerminalHeader** — Cabbge Terminal animated log line ticker showing scan activity in real-time
- **NextActionBanner** — Dynamic banner that always shows the most-impactful next thing the customer can do (run scan, fix RERA, generate articles, etc.)
- **ProgressDashboard** — Mention rate trend, articles published, scans run, milestones over time
- **PlanMatch** — Auto-recommends the right tier based on portfolio size + activity
- **UsageWarning** — Surfaces credit usage + monthly article count vs cap
- **BrandContextScore** — 0-100 score with checklist of which brand-context fields are filled
- **BrandContextRefreshNudge** — Prompts editing if context is stale

### 5.2 AI Search tab

- **PromptVolumes** — Per-query AI search panel. Renders: mention rate %, sentiment breakdown, blind-spot count, ChatGPT vs Google AI comparison, golden prompts (user-pinned queries tracked every scan), all-queries list with expand chevron showing actual ChatGPT and Gemini response text (evidence layer), platform-health banner when degraded, missing-queries fix-all flow with credit cost estimate, co-citations panel showing who AI recommends instead, fanout-expansion per query
- **AIVisibilityTrend** — Sparkline of overall AI vis score over time
- **PlatformMentions** — Per-platform breakdown
- **OwnPagesAICites** — Pages on the customer's site that AI engines actually cite (from `citationSources` data)
- **ThirdPartyAuthority** — Top external citation sources by frequency
- **HallucinationAudit** — AI claims about the brand verified against ground truth, with corrective-content suggestions
- **CitationDrift** — Sources that gained / lost mentions between scans
- **CompetitiveLandscape** — Co-citation matrix showing who's getting cited for what
- **ProjectScorecard / ProjectRollup** — Per-project visibility breakdown
- **LocalityRollup** — Per-locality visibility for multi-locality developers

### 5.3 Content tab

- **ContentQueue** — Auto-generated article suggestions tied to missing queries. UC stage-aware ("possession {year} {locality}"), config + locality + price-tier matrix, amenity-specific landing pages
- **BulkArticleWriter** — "Auto-write all" CTA with status pips per row (queued / writing / done / failed / capped / needs_brand_context). Brand-context unblock banner when score < 70%
- **RefreshQueue** — Articles flagged for refresh based on age, GSC decay, or competitor moves
- **ContentDecayPanel** — Pages losing rankings (GSC-driven)
- **ArticleAttribution** — Which articles moved which queries in mention rate

### 5.4 SEO + Technical tab

- **SiteCrawlPanel** — Full-site crawl with chunked progress (1500 pages per chunk, multi-tick completion for 3K+ page sites)
- **InternalLinkingPanel** — Orphan pages, hub pages, suggested link insertions, topical clusters
- **KeywordResearchPanel** — Keyword opportunities, difficulty, query volume estimates
- **TrendsPanel** — Audit / Technical / Backlinks scores over time with sparkline
- **CWVRegressionPanel** *(new 2026-04-29)* — LCP / CLS / Performance trended across the last 20 audit scans. Green-for-improving / red-for-regressing color coding. Hidden when fewer than 2 audits exist
- **BrokenLinksPanel** *(new 2026-04-29)* — Latest crawl batch's broken URLs grouped by status code (404, other 4xx, 5xx, network failure). Direct links with status pips. Hidden when nothing's broken
- **KnowledgeGraphPanel** *(new 2026-04-29)* — Connected JSON-LD `@graph` (Organization → Cities → Residence per project → optional RealEstateListing) with copy-paste script tag for the customer's homepage. AI overviews preferentially traverse @id-linked graphs

### 5.5 Authority + Reviews tab

- **GSCPanel** — Google Search Console integration showing impressions, clicks, queries, indexing
- **SchemaDeployPanel** — Generate + deploy schema.org structured data per page
- **ReviewMonitor** — Mentions across Housing / 99acres / Google / Reddit
- **CompetitorAlerts** *(competitor-watch)* — Diff alerts when competitor sites change

### 5.6 Real Estate Specific

- **CompanyPanel** — Brand metadata, multi-city editor with autocomplete, additional-sites list, brand-context fields
- **PendingProjectsBanner** — Backfilled projects (from portal scraping) that need URLs added
- **ProjectCompare** — Side-by-side project compare with name-only-projects warning
- **DelayRiskPanel** — Possession-date drift detection per project
- **GEOProgressPanel** — Headline narrative ("X queries get answered with a competitor instead of you") with celebration framing at 100% mention rate

### 5.7 Reporting + Export

- **ExecutionChecklist** — Daily improvement plan, day N of plan
- **ActionsFeed** — Right rail with critical issues ranked by priority
- `/api/export-md` — One-page CMO Brief markdown export
- `/api/cmo-digest` — CEO-ready monthly digest
- `/report/[companyId]` — Print-friendly report view

---

## 6. Engine — AI Visibility / GEO

Implemented in `lib/agents/aiVisibility.ts` (610 lines) + `lib/agents/localityEngine.ts` (700+ lines).

### 6.1 Query generation

- `generateSearchQueries()` produces the buyer-query matrix per scan
- Inputs: cities array, primary city, locality (per project), industry, project portfolio (configurations × locations × price ranges × stages × asset types), brand context (USPs, product info)
- Rules: NEVER include the brand name, queries scoped to where the brand operates, multi-city brands get queries per city, hyper-local × config × price-tier coverage matrix
- Output schema: `{ query, level: locality|city|country, city, config, priceTier, intent: research|comparison|shortlist|investment|rental }`
- LLM output extraction: brace-balanced walker that handles markdown fences, prose-prefixed JSON, truncated arrays — does NOT fall back to generic queries on parse hiccups (commit `231135f` fixed the dual-bug where the system prompt asked for strings but the user prompt asked for objects)

### 6.2 Per-query scan loop (parallel — commit `a29216e`)

For each query, fired in parallel via `Promise.all`:

1. **`queryForVisibility("openai", query)`** — OpenAI Responses API with `web_search` tool. 35s timeout, 2 retry attempts on 429/5xx with exponential backoff. Falls back to ungrounded chat if web_search persistently fails. Returns `{ text, source: "web_search"|"fallback_chat"|"failed", error? }`.
2. **`queryForVisibility("gemini", query)`** — Google Gemini `generateContent` with `google_search` grounding. 25s AbortController timeout. Multi-model fallback (gemini-2.5-flash → gemini-2.0-flash-lite → gemini-2.5-pro).
3. **`analyzeMention()` × 2** — gpt-5.4-nano structured analysis on each platform's response. Extracts: mentioned (bool), position (1=first, 2=second, ..., 0=not mentioned), context (300-char snippet), sentiment (positive/neutral/negative/absent), coCitations (other brands), citationSources (URLs classified as own_site/competitor/portal/youtube/ugc/news/government/unknown).
4. **Verification pass** — for every claimed positive mention, brand/alias/project name MUST actually appear in the original response text. Strips analyzer hallucinations, zeros position+sentiment when stripping (so a "mentioned: false" never reads as "ranked #2 with positive sentiment").
5. **`checkHallucinations()`** — when brand IS mentioned + ground-truth project data exists, runs an LLM audit comparing AI's factual claims against the scraped + onboarded data. Flags fabricated RERA numbers, wrong possession dates, made-up project counts, misattributed competitor projects.
6. **`rawResponse` capture** *(evidence layer, commit `a013355`)* — trimmed 2500-char raw response per platform persisted to `scan_history.results`. Surfaced as expand-chevron in PromptVolumes.

### 6.3 Scoring

```
positionScore = position 1 → 100, 2 → 85, 3 → 72, 4+ → 60..30 floor, 0 → 40 (unknown)
sentimentMultiplier = positive 1.15, neutral 0.85, negative 0.4, absent 1.0
score = mean(positionScore × sentimentMultiplier) across all queries (clamped 0-100)
```

Per-platform scores combined: 60% ChatGPT × 40% Gemini (when both configured). Overall score = 40% readiness × 60% mentions.

### 6.4 Platform health classification

`live` (web_search succeeded) / `degraded` (fell back to ungrounded) / `broken` (every query failed). Surfaced as a banner above the score (commit `a10e23a`) so 0% from a tool failure is distinguishable from 0% from real invisibility.

### 6.5 Brand disambiguation

Aliases (alternative spellings, acronyms) and exclusions (different companies sharing the brand name — e.g. Godrej Properties vs Godrej Consumer) configurable per company. Critical for multi-brand collisions.

### 6.6 Volatility + drift

`lib/agents/volatility.ts` computes per-query stddev across last 10 scans → labels each query stable / moderate / volatile / insufficient-data. `loadCitationDriftFromDb` tracks which sources gained or lost coverage between scans.

### 6.7 Golden prompts

User-locked queries (max 100 per company, 20 per scan rendered in PromptVolumes by default). Tracked every scan so volatility reads as signal vs noise. Persisted to `golden_prompts` table.

### 6.8 Query fanout

`lib/agents/queryFanout.ts` — for any anchor query, expand into 5 semantic variants ("3 BHK in Whitefield" → "3 BHK flats in Whitefield", "best 3 BHK Whitefield builders", etc.). Used to test query stability.

---

## 7. Engine — SEO + Technical

### 7.1 Site Audit (`/api/audit`, `lib/agents/siteAudit.ts`)

PageSpeed Insights integration (mobile + desktop). Captures:
- Performance / Accessibility / Best Practices / SEO scores
- Core Web Vitals (LCP, FCP, TBT, CLS) — now trended across scans via `CWVRegressionPanel`
- 8 SEO health checks (title, meta description, canonical, lang, viewport, image alt, link text, crawlable anchors)
- HTML-only fallback when PSI fails

### 7.2 Technical SEO (`/api/technical-seo`, `lib/agents/technicalSeo.ts`)

Server-timing + DOM analysis. Captures:
- TTFB, download time, page size, encoding, cacheable
- Render-blocking scripts and stylesheets
- Content relevance (title, description, keyword)
- Heading structure (H1/H2/H3/H4 counts)
- Open Graph + Twitter cards
- robots.txt, llms.txt, sitemap.xml presence + validation
- Resource issues (warnings + errors)

### 7.3 Backlinks (`/api/backlinks`, `lib/agents/backlinks.ts`)

Domain Authority, referring domains, total backlinks. Live high-value-domain list (replaces hardcoded fallback) with rising-portal detection.

### 7.4 Site Crawl (`/api/site-crawl`, `lib/agents/siteCrawler.ts`)

Tier-gated full-site crawler. Inline path for ≤1500 pages, chunked path for larger sites (1500 pages per chunk, persisted to `crawl_jobs.state` JSONB, drained by cron worker every 30 min). 8-min hard cap per invocation. Captures per-page: status code, title, meta, H1/H2/H3, word count, images (with/without alt), internal links, external link count, schema presence + types, canonical, indexable, lang, load time, fetch errors, derived issues.

### 7.5 Internal Linking (`/api/internal-linking`, `lib/agents/internalLinking.ts`)

Token-overlap-based internal link suggestions from crawl data. Identifies orphan pages, hub pages (link-dilution risk), topical clusters, and suggests cross-link insertions ranked by relevance.

### 7.6 Keyword Research (`/api/keyword-research`, `lib/agents/keywordResearch.ts`)

LLM-driven keyword opportunity discovery. Real estate locality-aware.

### 7.7 Broken-link monitoring *(new 2026-04-29)*

Persists broken pages from every crawl (status 4xx/5xx/0) to `broken_links` table. `/api/broken-links` returns the latest batch grouped by status family. `BrokenLinksPanel` renders for the customer.

### 7.8 Schema generation + validation

- `/api/schema-generator` (route) — RealEstateListing, FAQ, LocalBusiness schemas per project
- `lib/seo/articleSchema.ts` *(new 2026-04-29)* — Article + FAQPage + Breadcrumb schemas with brace-balanced JSON validation, schema.org-compliant required-field checks
- `/api/schema-deploy`, `/api/schema-loader` — deploy schemas to customer site via embed
- `KnowledgeGraphPanel` *(new 2026-04-29)* — connected `@graph` builder linking Organization → Cities → Residence → RealEstateListing nodes via `@id` references

### 7.9 llms.txt generation

- `/api/llms-txt` route generates customer-specific llms.txt content
- Cabbge's own llms.txt at `public/llms.txt` (rewritten 2026-04-29 with new positioning)

### 7.10 IndexNow

Was built then removed 2026-04-28 per user direction. `lib/seo/` directory still has `articleSchema.ts`, `cannibalization.ts`, `relatedArticles.ts`, `knowledgeGraph.ts`.

---

## 8. Engine — Content Generation

### 8.1 Article writer (`/api/article-writer`)

516+ lines. 12 article types: locality_guide, project_showcase, market_analysis, buyer_guide, comparison, investment, nri_guide, landing_page, construction_update, best_of_list, alternatives_to, migration_guide.

**Pipeline per generation:**

1. **Auth gate.** Subscription check OR cron-actor token (`Bearer ${CRON_SECRET}` + `x-cron-actor` header) for the bulk worker.
2. **Tier-gated monthly article cap.** Counts via `tracked_articles.generated_at >= start-of-month`. Returns 402 with upgrade hint when exhausted.
3. **Credit tracking.** Always allows (upsell model, not hard block).
4. **Brand-context score gate.** Demands ≥70% completeness on 7 brand fields (productInfo, brandVoice, vision, values, targetAudience, marketingStrategy, competitorAnalysis). Returns 412 with a `needsBrandContext: true` flag and the missing fields when below threshold.
5. **Cannibalization check** *(new)* — `lib/seo/cannibalization.ts` runs jaccard token-overlap against the company's last 500 tracked_articles. Returns 409 on exact match with the existing article id. Near-matches (≥0.6 similarity) returned as warnings, not blocks. Cron path bypasses (queue's own dedup handles it).
6. **Library differentiation context** *(new)* — fetches the company's last 10 articles by `generated_at` and injects titles into the user prompt as a "DIFFERENTIATE from these" block. New system rule 25 instructs the model to find a different angle.
7. **Generate via gpt-5.4** — 25-rule system prompt covering GEO citation rules (answer-first paragraphs, question-format H2s, 40-60 word answers, quotable statements, low pronoun density, frequent named entities, first-party data framing, FAQs, image suggestions, E-E-A-T closing, freshness timestamp), Indian-RE hyperlocal rules (compound-query targeting, year-tagged phrasing, RERA + state-portal authority, landmark-proximity bands, sub-locality disambiguation, price-per-sqft bands, comparison hooks, local-intent CTAs, three-layer answer architecture, single H1, FAQ-schema-ready, comparative-listicle bias), and library differentiation.
8. **Output JSON parsed** — fields: title, metaDescription, content (markdown), faqs[], quotableStatements[], imageSuggestions[], eeatBlock, suggestedInternalLinks[].
9. **GEO score** — 0-100 across 8 signals: 3+ question H2s (20pts), answer-first paragraphs with numbers (15pts), 5+ FAQs (15pts), 2+ quotables (10pts), E-E-A-T block (10pts), freshness timestamp (10pts), 3+ image suggestions (10pts), 8+ entity-density (10pts).
10. **Post-processing.** Prepends author byline, appends E-E-A-T block + freshness line if model forgot.
11. **Internal linking auto-injection** *(new)* — `lib/seo/relatedArticles.ts` finds 0.15-0.7 similarity articles, renders "Related reading" markdown block, injects before freshness footer.
12. **JSON-LD schema bundle generation** *(new)* — Article + FAQPage schemas built and validated. Returned in response.
13. **QA pass** — second-pass gpt-5.4 review for fabricated landmarks, made-up RERA numbers, voice drift, ungrounded claims. Returns voiceMatch, factualGroundedness, reraSuspect flag, up-to-5 specific flags. Non-blocking — surfaced to user, never auto-rejects.

**Response payload:** title, metaDescription, content, wordCount, faqs, quotableStatements, imageSuggestions, eeatBlock, suggestedInternalLinks, geoScore, missingGeoSignals[], qa, cannibalization, relatedArticles, schema, schemaValidation.

### 8.2 Bulk article worker (`/api/cron/article-worker`)

Hourly cron. Drains `article_jobs` queue.

- Stuck-job recovery: jobs in `writing` status >15 min get reset to `queued`
- Per-tick: claim up to 50 distinct companies, 3 jobs per company sequentially (respects per-call rate limits)
- Owner plan check: skip non-paid (or all bypass with `DISABLE_PAYWALL=true`)
- Monthly article cap enforcement before claiming
- Brand-context gate: when article-writer returns 412, marks remaining queued jobs `needs_brand_context` with reason
- Persists generated articles to `tracked_articles` so the queue UI can deep-link
- Status pipeline: queued → writing → done | failed | capped | needs_brand_context

### 8.3 Article freshness + decay (`/api/article-freshness`, `/api/cron/freshness-refresh`)

GSC-driven content decay detection. Articles whose impressions/clicks dropped below baseline get queued for refresh. Weekly cron.

### 8.4 Article queue (`/api/article-queue`, `lib/articleQueue.ts`)

Helpers: enqueueArticles, claimNext, markDone, markFailed, markCapped, markNeedsBrandContext, deriveArticleType, jobCounts, listJobs, deleteJob.

### 8.5 Article attribution (`/api/article-attribution`)

Maps which articles moved which queries' mention rate, surfaced in dashboard.

### 8.6 Content deploy (`/api/content-deploy`)

Universal publish mechanism. Customer pastes a `<script>` loader + `<div data-cabbge-slot>` tag onto their site, Cabbge serves the content. Owns the content via `deployed_content` table keyed by (site_url, slot).

---

## 9. Engine — Vertical RE Specific

### 9.1 RERA verification (`/api/rera-verify`, `lib/agents/reraVerify.ts`)

Cross-checks project RERA numbers against state authority listings. Status: verified / mismatch / pending / not_found. Indicative — state portals are inconsistent.

### 9.2 Portal coverage (`/api/portal-coverage`, `lib/agents/portalCoverage.ts`)

Estimated brand presence on 99acres, Housing.com, MagicBricks, NoBroker, CommonFloor. When portal listings are found and the customer has zero project URLs configured, backfills `company.projects` from portal-listed project names.

### 9.3 Portal optimizer (`/api/portal-optimizer`)

Per-portal listing-grade improvements (titles, descriptions, schema for each platform).

### 9.4 Review monitor (`/api/review-monitor`, `lib/agents/reviewMonitor.ts`)

Scans Housing / 99acres / Google / Reddit for brand mentions. Returns mention count + per-mention priority + source.

### 9.5 Hallucination check (`lib/agents/hallucinationCheck.ts`)

Compares AI's factual claims about the brand against ground-truth project data (name, location, configurations, priceRange, reraNumber, possession, status). Flags fabricated claims with severity.

### 9.6 Hallucination outreach (`/api/hallucination-outreach`)

Generates email drafts to contact AI engines (where possible) about correctable hallucinations.

### 9.7 Competitor watch (`/api/competitor-alerts`, `/api/competitors`, `lib/agents/competitorWatch.ts`, `lib/agents/competitors.ts`)

Daily snapshots of competitor homepages. Diff detection for new project launches, price updates, sitemap growth, hero rewrites. Persists to `competitor_snapshots` (with signals + signals_hash for change detection) and emits `competitor_alerts` rows for the dashboard.

### 9.8 Infrastructure news (`/api/infra-news`, `lib/agents/infraNews.ts`)

Tracks city-level infrastructure announcements (metro extensions, IT-corridor expansions, ring road approvals) that affect locality-specific buyer queries. Used to suggest timely "X is coming to {locality}" articles.

### 9.9 GBP integration (`/api/gbp-deploy`, `/api/gbp-posts`)

Google Business Profile — post automation, multi-location management, review reply.

### 9.10 Auto-discover (`/api/auto-discover`)

LLM-driven scraping of prospect's website. Returns: companyDescription, city, cities[], industry, inferredProjects (with location, configurations, priceRange, reraNumber, amenities, status, possession, microsite), inferredCompetitors, documents{} (productInfo, brandVoice, brandVision, brandValues, targetAudience, marketingStrategy, competitorAnalysis). Uses 8s AbortController timeouts on all customer-site fetches to prevent hangs.

### 9.11 Sitemap import (`/api/sitemap-import`)

Auto-detects project microsites from the corporate sitemap.xml, returns candidates for the user to confirm.

### 9.12 Cities (`/api/cities`)

LLM-powered city autocomplete with state metadata. Used in CompanyPanel multi-city editor.

---

## 10. Integrations

### 10.1 Google Search Console

- `/api/integrations/gsc` (GET = OAuth URL, POST = fetch GSC data)
- `/api/integrations/gsc/callback` — exchanges code for tokens, persists to `integrations` table keyed (company_id, provider)
- `lib/integrations/googleSearchConsole.ts` — token refresh, listSites, getGSCOverview
- Onboarding Step 3 has prominent "Connect GSC now" CTA that persists company state first then triggers OAuth (so callback has a row to attach)
- Dashboard renders `GSCPanel` once connected
- GSC data feeds `article-freshness` cron + decay detection

### 10.2 Google PageSpeed Insights

- `GOOGLE_PSI_API_KEY` env var
- Used in `siteAudit.ts` for both mobile + desktop strategies
- HTML-only fallback when API rate-limited

### 10.3 Google Business Profile

- Same `GOOGLE_CLIENT_ID/SECRET` as GSC
- `lib/integrations/googleBusinessProfile.ts`
- Posts automation, review reply, multi-location

### 10.4 OpenAI

- `OPENAI_API_KEY` env var
- gpt-5.4 (heavy: audits, content, analysis) + gpt-5.4-nano (light: chat, mention analysis, simple checks)
- Responses API with `web_search` tool for AI visibility scans
- Auto-retry layer (commit `956d366`) — 429/5xx exponential backoff (1s/2s/4s), honors Retry-After header, 3 attempts on aiComplete/aiLight/aiChat, 2 on web_search
- 35s per-call timeout on web_search Responses API

### 10.5 Google Gemini

- `GOOGLE_GEMINI_API_KEY` env var
- `generateContent` with `google_search` grounding tool
- Multi-model fallback: gemini-2.5-flash → gemini-2.0-flash-lite → gemini-2.5-pro
- 25s AbortController timeout per call

### 10.6 Supabase

- Auth (email/password, GSC OAuth via stored credentials)
- Postgres with RLS policies on every customer-data table
- JSONB-heavy schema (documents, sites, scan_history.results, crawl_jobs.state)
- Service-role client for cron + admin paths via `getServiceClient()`

### 10.7 DodoPayments

- `dodopayments` package in dependencies
- Webhook signature via `standardwebhooks`
- Currently dormant — `DISABLE_PAYWALL=true` bypass active

---

## 11. Cron Jobs (Vercel Cron)

| Path | Schedule (UTC) | Purpose |
|---|---|---|
| `/api/cron/scan` | `0 21 * * *` (02:30 IST daily) | Per-company audit + technical + backlinks + AI vis + competitor watch |
| `/api/cron/benchmark` | `0 2 1 * *` (monthly) | Public benchmark scans for `/benchmark` page |
| `/api/cron/project-sync` | `0 2 * * 0` (weekly Sunday) | Re-discover projects from customer sites |
| `/api/cron/freshness-refresh` | `0 3 * * 1` (weekly Monday) | GSC-driven content-decay refresh queue |
| `/api/cron/article-worker` | `0 * * * *` (hourly) | Drain article_jobs queue |
| `/api/cron/crawl-worker` | `*/30 * * * *` (every 30 min) | Drain crawl_jobs queue, append broken links |

All gated by `Authorization: Bearer ${CRON_SECRET}`.

---

## 12. Data Model (Supabase)

Core tables (per `supabase/schema.sql` + 14 migrations):

- `profiles` — user profiles
- `subscriptions` — plan, status, current_period_end, trial_ends_at, cancel_at_period_end
- `companies` — id, owner_id, name, website, city, description, sites JSONB, documents JSONB (brand context + cities array), product_info, brand_voice, brand_values, brand_vision, target_audience, marketing_strategy, competitor_analysis
- `projects` — id, company_id, name, location, configurations, price_range, rera_number, amenities, status, possession_date, website (microsite)
- `competitors` — id, company_id, name, website
- `scan_history` — id, company_id, scan_type (audit / technical / ai_visibility / backlinks / competitor), url, score, summary, results JSONB, triggered_by, created_at
- `gsc_snapshots` — id, company_id, site_url, captured_at, pages, queries, totals
- `tracked_articles` — id, company_id, query, title, content, status (draft / published), publish_url, generated_at, published_at, pre_score, post_score
- `golden_prompts` — id, company_id, query, pinned_at, UNIQUE (company_id, query)
- `article_jobs` — id, company_id, query, status (queued / writing / done / failed / capped / needs_brand_context), articleType, started_at, generated_article_id (→ tracked_articles)
- `crawl_jobs` — id, company_id, url, max_pages, state JSONB (visited, queue, pages), pages_done, status, last_tick_at, completed_at
- `broken_links` *(new 2026-04-29)* — id, company_id, url, status_code, fetch_error, source_url, crawled_at
- `competitor_snapshots` — id, company_id, competitor_name, competitor_url, signals JSONB, signals_hash, captured_at
- `competitor_alerts` — id, company_id, competitor_name, alert_type, title, description, details
- `deployed_content` — id, company_id, site_url, slot, content_type, html, meta, published_at, updated_at
- `deployed_schemas` — id, company_id, site_url, page_path, schema_type, schema_json, created_at, updated_at
- `integrations` — id, company_id, provider (google_search_console / wordpress_com / wordpress_self_hosted / webflow / moz), credentials JSONB, metadata JSONB, connected_at
- `credit_usage` — id, company_id, action_type, credits, occurred_at
- `chat_messages` — id, company_id, role, content
- `generated_content` — id, company_id, content_type, html, slot
- `refresh_queue` — article_id, refreshed_article_id, reason, queued_at

RLS policies on every customer-data table — owner-id based access.

---

## 13. Security & Compliance

- Supabase Auth with email confirmation
- RLS policies on every customer table (owner_id = auth.uid())
- HTTP-only cookies for demo session
- Service-role client only used in cron + admin paths
- CSP headers configured (default-src, script-src, frame-src, connect-src, etc.)
- Sanitized URL helper (`lib/security.ts`) for any user-supplied URL handling
- No secrets in code, all env-var driven
- DPA, Privacy, Terms pages live
- `/legal` security/trust surface
- Demo data wiped on Exit Demo (no DB writes from demo flow)
- IP-blocking + auth checks on cron routes
- Cron-actor pattern (Bearer + x-cron-actor header) for worker self-calls

**Not yet:** SOC 2 audit, SSO, role-based multi-user access, data residency controls.

---

## 14. What's NOT in the Product

Honest gap list.

### 14.1 Lead-attribution dashboard (the new headline value, not yet built)

The new positioning sells "lead delivery + CAC reduction." The product doesn't yet have:
- Form submission tracking on customer-deployed content
- CRM webhook out (Salesforce, Zoho, HubSpot)
- Source-tagged leads (which article drove this lead)
- Cost-per-lead math vs paid baseline
- CAC delta dashboard

This is the most important next build. Without it, the new pitch is an aspiration not a product.

### 14.2 Buyer-intent mining

Not built. Reddit, Quora, MagicBricks community Q&A, Housing forums, NoBroker forums, Twitter / X, LinkedIn (NRI segment), Facebook groups — none monitored. The "find real buyers actively asking about your segment" feature exists conceptually as a future build only.

### 14.3 Payments

`DISABLE_PAYWALL=true` is on. DodoPayments integration is wired but inactive. No customer has been charged.

### 14.4 Multi-platform AI search

ChatGPT + Gemini only. Perplexity, Claude, Copilot, You.com not scanned. Per the product-philosophy memory entry, this is a deliberate scope decision (those platforms have lower Indian buyer share in 2026).

### 14.5 Multi-language content

English-only generation per the english-only memory entry. Hindi, Telugu, Tamil, Arabic content generation not built.

### 14.6 Commercial / industrial RE

Residential focus only. Commercial, retail, hospitality, township, mixed-use are detected per project (`assetType` in projectDetails) but the prompts and scoring are residential-tuned.

### 14.7 ME-specific fields

Compliance is generic (customer pastes whatever they have). No first-class fields for DLD permit number, Trakheesi, ADREC, RERA Dubai. The customer can put any of these in the RERA field. Per the product-constraints memory, this is intentional — geo-neutral by design.

### 14.8 Team accounts / RBAC

Single user per company. No invite-team, no roles, no audit log.

### 14.9 Agency white-label

Not built. SearchAtlas's agency-white-label business model is proven; Cabbge could become the engine but doesn't have the white-label UI or seat-based pricing.

### 14.10 IndexNow

Built then removed 2026-04-28. Keys for IndexNow lib/route exist as deleted code in git history.

### 14.11 Notifications

No Slack, no email out, no SMS, no webhooks-out per the no-notifications memory entry. Customers check the dashboard daily.

### 14.12 Lead capture forms

No native form builder. Customer's existing form on their site is what receives leads. Cabbge can't currently embed a form via the content-deploy mechanism.

---

## 15. Recent Engineering Pass (Last 24 Hours)

Commit-by-commit context for what just shipped.

| Commit | Subject |
|---|---|
| `e0c71d7` | Pivot positioning post-Makuta: lead/CAC headline, premium India + ME ICP, custom Enterprise CTA |
| `a29216e` | AI vis: parallelize the query loop + add Gemini timeout — 5x speedup, no more 504s |
| `da75dc2` | AI vis: hard timeouts on every external call so one hang can't 504 the scan |
| `7271edd` | Dashboard AI vis: handle non-JSON timeouts, defend against non-array projects/cities |
| `a013355` | Fix misleading "Add Gemini key" message firing when brand is simply not cited |
| `956d366` | ai.ts: automatic exponential-backoff retry on 429 + 5xx for every OpenAI call |
| `d5722ea` | Demo: retry auto-discover on failure, surface errors instead of dropping into empty dashboard |
| `a10e23a` | AI Search Presence: surface platform-health when 0% is from a degraded scan, not real invisibility |
| `231135f` | Query generator: stop falling back to generic queries when LLM returns long output |
| `57c10e2` | Article-writer: differentiate every new piece from the customer's existing library |
| `3b85a88` | Audit: replace hardcoded Kukatpally in ContentQueue reason string with locality variable |
| `fd7da81` | Onboarding GSC ask: from buried deflection to first-class connect |
| `501c990` | SEO+GEO weapon pass · methodology, evidence, schema validation, KG, broken-link, CWV trend, cannibal, internal links |

---

## 16. Open Recommendations (post-pitch follow-up)

In priority order based on what the new positioning needs to deliver.

1. **Build lead-attribution layer.** The pitch sells CAC reduction. Without form-submission tracking, source tagging, and CRM-out webhooks, "leads delivered" is a claim not a product. ~2 week build.
2. **Tier-bucketed query caps in `localityEngine`.** A 56-query scan costs ~$15-20. Unsustainable at Starter pricing. Cap at 15 / 30 / 60 queries by tier. ~half day.
3. **Buyer-intent mining MVP.** Reddit + Quora + Housing community monitoring. Surfaces "leads in week one" which is what Makuta-style prospects ask for. ~1 week.
4. **Agency white-label.** Seat-based pricing, agency dashboard, brand customization. SearchAtlas's proven model. ~2 week build.
5. **One reference customer.** Land any single customer (NRI-focused mid-tier ideal) on a paid pilot, generate the case study, use it to open Tier-1 Indian + ME doors. Sales motion, not engineering.
6. **OpenAI tier upgrade.** Bump platform.openai.com tier from current to Tier 3+ to stop rate-limiting from biting during demos and customer scans. Account-side, not code.
7. **Supabase URL configuration.** Site URL → https://cabbge.com, redirect URLs configured for /auth/callback, /onboarding, /dashboard, /reset-password. Pending user action.
8. **Payments wiring.** Activate DodoPayments, replace `DISABLE_PAYWALL=true` with real subscription gating. Once first reference customer commits to paid pilot.
9. **CWV trend test data.** New panel hides until 2+ audits exist. Confirmed working but customer needs first scan + one re-scan to render.
10. **SOC 2 readiness statement.** Not full audit, but a self-attestation document for ME enterprise sales conversations. ~half day.

---

*End of report. Production deployment URL: https://cabbge.com · GitHub: Arjun0606/cabbage · Latest production commit at write time: e0c71d7.*
