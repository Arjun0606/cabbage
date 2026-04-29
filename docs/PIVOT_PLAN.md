# Pivot Plan — cabbge_RE → cabbge (the global GEO engine)

*Drafted on the `pivot-global` branch. Source of truth for the
revamp. Do not merge to main until this plan is fully executed and
production is verified.*

---

## Why we're pivoting

Cabbge_RE was built for premium Indian + ME real estate developers.
6+ months of engineering produced a genuinely deep AI visibility +
content engine. The ICP rejected the product:

- Sub-Tier-1 Indian developers don't pay for SaaS
- Premium Indian developers see Wix and a paid PR agency as
  "sufficient" — they don't allocate marketing budget to AI search
  tools yet
- ME developers exist as a market but require sales motion,
  in-region reps, and warm introductions we don't have
- The customers we *can* reach (real estate brokers, agents, single
  builders) buy Magicbricks and 99acres ads, not GEO tools

The engine is excellent. It's pointed at the wrong buyers. We're
re-pointing it.

## Why we're keeping this repo (not moving to cabbge_global)

cabbge_RE has:
- Production deployment at cabbge.com (Vercel)
- Live Supabase project with auth, RLS, 14 migrations
- DodoPayments wired
- 50+ dashboard components
- Rich content engine (article writer, GEO score, QA pass,
  cannibalization, related articles, schema bundle)
- More git history, more polish

cabbge_global has additions cabbge_RE doesn't:
- 5 engines (cabbge_RE has 2)
- Off-domain coverage audit (Wikipedia / Wikidata / G2 / Trustpilot
  / Reddit)
- JS-render audit, AI bot access audit, entity grounding audit
- Per-engine playbook (concrete actions per engine)
- /vs/[competitor] comparison pages
- /best/[category] listicles
- /press kit
- Free public grader with permanent shareable permalinks
- /badge/[slug] embeddable score badges
- /og/[slug] social card OG images
- Cold outreach kit with CSV export
- Email lead capture
- 30-day distribution playbook (docs)

Strategy: **port cabbge_global's additions into this codebase**,
**strip the RE layer**, **add new mention-tracking surfaces**.
Net result: the depth of cabbge_RE × the breadth of cabbge_global.

## What changes (positioning)

| Before | After |
|---|---|
| AI visibility for premium Indian + ME real-estate developers | A nifty AI visibility + brand-mention tool individuals use to win in AI search |
| ₹49,999 / ₹99,999 / ₹2,49,999 INR | $49 / $199 / $599 USD, all self-serve |
| 30 named outbound targets, sales-led | Self-serve, free public grader as the wedge |
| Custom Enterprise tier ($5–25k USD) | **No enterprise tier.** Scale ($599) is for agencies + high-volume power users. Even folks at large corporates pay $49 on a personal card and use the tool unofficially. |
| Buyer language: "CAC reduction for premium developers" | Buyer language: "Be the brand AI recommends" |
| Comparable to Profound (enterprise) | Comparable to Otterly + Knowatoa at the SMB tier, deeper than both |

## Who actually buys this

Three concrete personas. Everything we ship is judged against
whether one of these buys it on a credit card without asking
anyone's permission.

1. **Indie SaaS founder** ($5k–$200k MRR, 1–10 people). Often
   technical. Cares about every channel because there's no team
   behind any of them. Pays $49 personally, treats it as a tool
   like Linear / Vercel / Tally. **Primary ICP.**

2. **Shopify or independent ecom store owner** ($10k–$500k/mo GMV).
   Watching paid-ad costs rise, hearing "AI shopping is coming",
   nervous about being invisible to ChatGPT shoppers. **Primary ICP.**

3. **Marketing person at a 50–500-person SaaS** who uses cabbge
   personally on a $49 plan to do their own AI-search audit work.
   No procurement involved. They show colleagues, the team
   eventually upgrades to Growth. **Bottom-up adoption.** This is
   the lever that gets us into bigger orgs without a sales team.

Explicitly NOT our buyer:
- Enterprise marketing teams with $5k+/mo SaaS budgets — that's
  Profound's market, not ours
- Real estate developers (the original cabbge_RE pivot)
- Anyone whose primary marketing channel is paid ads + billboards
- Anyone who needs SOC 2 / SSO / dedicated CSM to sign up

The product feels like Linear / Tally / Vercel, not Salesforce /
Hubspot. Polish > breadth. Speed > depth. Self-serve > sales call.
Embed + share-link > big-ticket pitch deck.

## What we keep from cabbge_RE

- **The article-writer pipeline** — 9 steps, GEO score, QA pass,
  cannibalization, related articles, schema bundle. Already lifted
  to cabbge_global; this codebase has the original.
- **Dashboard structure** — 50+ components, tab navigation, the
  Cabbge Terminal log line, the right-rail ActionsFeed.
- **Supabase schema + auth + DodoPayments wiring**.
- **Crawl chunking** (1500 pages per chunk, cron worker).
- **Cron jobs** (audit / benchmark / freshness / article worker).
- **Site audit** with PSI + Core Web Vitals + 8 SEO checks.
- **Technical SEO panel**.
- **Backlinks panel**.
- **Internal linking** (token-overlap suggestions).
- **Keyword research**.
- **GSC integration**.
- **GBP integration** (Google Business Profile — useful for
  local-services ICP, keep it).
- **Schema generator + deploy + loader**.
- **Knowledge graph builder**.
- **Broken-link monitoring**.
- **Hallucination check** + outreach.
- **Content deploy** mechanism (universal `<script>` loader +
  `<div data-cabbge-slot>` embed).

## What we strip (real-estate-specific)

- `lib/agents/reraVerify.ts` + `/api/rera-verify`
- `lib/agents/portalCoverage.ts` + `/api/portal-coverage`
- `lib/agents/portalTracker.ts`
- `lib/agents/projectParse.ts`
- `lib/agents/localityEngine.ts` (replace with vertical-agnostic
  query generator from cabbge_global)
- `lib/agents/infraNews.ts` (RE-infra news, replace with generic
  news monitoring later or skip)
- `lib/cities.ts` (Indian cities)
- `lib/marketKnowledge.ts` (RE market data)
- `/api/portal-optimizer`, `/api/rera-verify`, `/api/sitemap-import`
  (RE microsite import — keep the generic sitemap reader, drop the
  RE-specific microsite-detection layer)
- Onboarding multi-city + projects + RERA fields (replace with
  one-step URL paste like cabbge_global)
- Dashboard panels: ProjectScorecard, ProjectRollup, LocalityRollup,
  PendingProjectsBanner, ProjectCompare, DelayRiskPanel,
  GEOProgressPanel (RE narrative). Keep their generic siblings.
- Article-writer 12 RE article types → replace with cabbge_global's
  8 horizontal types
- Article-writer system prompt RE rules (RERA, sub-locality
  disambiguation, price-per-sqft bands, NRI guides) → replace with
  horizontal GEO rules from cabbge_global
- Marketing site: `/about`, `/`, `/pricing`, `/compare`, `/benchmark`,
  `/methodology` — all need RE language stripped and replaced with
  the horizontal "Be the brand AI recommends" positioning

## What we port from cabbge_global

In rough order of execution:

1. **5-engine support** — add Perplexity, Claude (via web_search
   tool), Grok runners to `lib/ai.ts`. Re-normalize scoring blend
   to ChatGPT 0.30 / Gemini 0.20 / Perplexity 0.20 / Claude 0.15 /
   Grok 0.15.
2. **Off-domain coverage audit** — `lib/engines/offDomain.ts` runs
   Wikipedia / Wikidata / Trustpilot / G2 / Reddit checks per scan.
3. **JS-render audit, AI bot access audit, entity grounding audit**
   — three new checks added to `checkAIReadiness()`.
4. **Per-engine playbook** — `lib/engines/playbook.ts` emits engine-
   specific actions. New "Action playbook" section on dashboard.
5. **Mention verification + host-match validation** — already in
   cabbge_RE's article writer, also wire into `analyzeMention()` so
   AI visibility scores aren't inflated by analyzer hallucinations.
6. **Public grader on /** — paste URL, real scan in 60s, redirect
   to permanent /visibility/[slug]. New cron-seeded brand catalog.
7. **`/visibility/[slug]`** — permanent public result page,
   shareable, score badge embed code, OG card.
8. **`/best/[category]`** + **`/best`** index — programmatic
   listicle pages.
9. **`/vs/[competitor]`** + **`/vs`** index — comparison-page SEO
   surface for Profound, Otterly, AthenaHQ, Knowatoa, Goodie.
10. **`/press` kit** — reporter-ready Visibility Index snapshot.
11. **`/methodology`** — replace cabbge_RE's RE-specific methodology
    page with the horizontal one.
12. **`/badge/[slug]`** SVG badge endpoint.
13. **`/og/[slug]`** OG image generator (next/og).
14. **Cold-outreach generator** at `/dashboard/outreach` — paste 100
    URLs, get back drafted emails + CSV export.
15. **Email lead capture** + `/api/subscribe` + `global_subscribers`
    table. Inline EmailCapture on every public grade page.
16. **Sitemap.ts** dynamic regeneration including all public_grades
    + listicle pages + comparison pages.
17. **robots.ts** with explicit allow for 12 AI crawlers.
18. **`/llms.txt`** — keep cabbge_RE's; rewrite content for new
    positioning.
19. **30-day distribution playbook** — `docs/DISTRIBUTION.md`.

## What we add new (not in either codebase)

The "best pure GEO + mention tracking" claim demands tracking
mentions across the rest of the web, not just AI engines. Tools
that combine *AI visibility* + *brand mention monitoring* don't
exist at SMB pricing. Brand24 / Mention.com cost $99–$249/mo and
don't touch AI engines. GEO tools don't track human-internet
mentions. Combining = real differentiation.

1. **Reddit mention tracker** — daily cron searches reddit for the
   brand, persists every thread + comment match to `mention_log`,
   surfaces new mentions in the dashboard. Sentiment per mention.
   Free via reddit.com/search.json.

2. **X / Twitter mention tracker** — same shape, X API v2 free
   tier (1,500 posts/month read). Cap to brand-name searches only.
   Upgrade to paid tier for Growth+ customers.

3. **YouTube mention tracker** — search YouTube Data API for brand
   mentions in video titles + descriptions. Free quota. Comment
   crawling deferred.

4. **LinkedIn** — defer. Public API doesn't allow mention search;
   scraping risks legal action. Add later via partner if needed.

5. **Hacker News mention tracker** — Algolia HN search API is free
   and instant. Surfaces story + comment mentions. Day-one feature.

6. **Mention digest email** — weekly cron emails the customer "5
   new mentions this week" with sentiment + link. Re-engages the
   passive customer.

## Migration sequence (commit-by-commit)

To keep production cabbge.com healthy while we work, the migration
ships as a sequence of small commits on the `pivot-global` branch.
Each commit leaves the code in a runnable state. No big-bang
rewrite.

| # | Commit | What ships |
|---|---|---|
| 1 | `pivot.1: write plan` | this doc |
| 2 | `pivot.2: 5 engines` | port cabbge_global's ai.ts (Perplexity / Claude / Grok branches) into this codebase |
| 3 | `pivot.3: off-domain audit` | port lib/engines/offDomain.ts + wire into scans |
| 4 | `pivot.4: JS-render + AI bot + entity grounding audits` | new checks in siteAudit |
| 5 | `pivot.5: per-engine playbook` | port lib/engines/playbook.ts + UI panel |
| 6 | `pivot.6: drop RE layer` | delete RERA / portal / locality / cities / marketKnowledge / projectParse / infraNews + their routes + their panels. Update onboarding to one-step URL paste. |
| 7 | `pivot.7: USD pricing + tier rewrite` | rewrite lib/tiers.ts to USD $49/$199/$599. Update Dodo product env vars. Strip Indian-RE positioning from /pricing copy. |
| 8 | `pivot.8: marketing site rewrite` | new home, new /about, new /pricing copy, new /methodology copy. Drop /benchmark RE-specific content. |
| 9 | `pivot.9: free public grader` | port grader.ts + /api/grade + /visibility/[slug] + /badge + /og + email capture |
| 10 | `pivot.10: programmatic SEO` | /best, /best/[category], /brands, /vs, /vs/[slug], /press |
| 11 | `pivot.11: cold-outreach kit` | port /dashboard/outreach |
| 12 | `pivot.12: cron-seed brand catalog` | port /api/cron/seed + lib/seedBrands.ts (rewritten for SaaS / ecom / app brands, not Indian developers) |
| 13 | `pivot.13: cold-outreach kit` | /dashboard/outreach (already shipped) |
| 14 | `pivot.14: 4 mention trackers + weekly cron` | Reddit + HN + YouTube + X (via Grok); /dashboard/mentions; /api/cron/refresh-mentions |
| 15 | `pivot.15: pricing/about/methodology rewrites` | strip RE copy from marketing surfaces |
| 16 | `pivot.16: weekly digest email` | Resend integration on top of the brand_mentions table |
| 17 | `pivot.17: reserved` | (folded into 14) |
| 18.1 | `pivot.18 (slice 1): nav for /mentions + /outreach` | shipped (b912246) |
| 18.2 | `pivot.18 (slice 2): minimalist post-pivot /dashboard` | shipped (bd6317a) |
| 18.3a | `pivot.18 (slice 3a): layout metadata + signup redirect` | shipped (c889023) |
| 18.3b | `pivot.18 (slice 3b): delete legacy + onboarding + RE libs` | shipped (0aabe08) — 11,915 LOC removed |
| 18.4 | `pivot.18 (slice 4): unified /dashboard layout + Sidebar` | shipped (c332626) |
| 18.5 | `pivot.18 (slice 5): wire per-engine playbook into /dashboard` | shipped (7af04a1) |
| 18.6 | `pivot.18 (slice 6): sweep 39 orphan dashboard components + projects/pending` | shipped (f5e8efb) — 9,795 LOC removed |
| 19 | `pivot.19: distribution playbook + press` | shipped (b30b345) |
| 20 | `pivot.20: production cutover` | DRAFT READY — runbook in `docs/CUTOVER.md`, PR body in `docs/PR_BODY.md`. Operator opens PR + merges + deploys. |
| 21.0 | `pivot.21 (proposals): migrations 017 + 018 + 019 + 020` | shipped as DRAFT files (d34851d, 254b3ed) |
| 21.1 | `pivot.21 (apply 017)`: sites + backfill from companies | NEEDS OPERATOR — apply on Supabase staging first |
| 21.2 | `pivot.21 (apply 018-020)`: drop projects, drop article-pipeline tables, drop companies | NEEDS OPERATOR — sequence preconditions in each file's header |

## pivot.21 — supabase revamp (post-cutover)

Once the code pivot is shipped, the schema needs the same surgery
the codebase got. Today's schema carries RE assumptions throughout:

- `companies` is the tenant boundary, with sites + projects nested
  inside as JSONB columns. Post-pivot the right shape is sites at
  the top with no projects layer.
- `projects` table is RE-specific (configurations, rera_number,
  possession_date). Drop entirely.
- `gsc_snapshots`, `scan_history.results` jsonb shapes carry RE
  query metadata (city, config, priceTier). Post-pivot these are
  generic AI visibility scans without locality scaffolding.
- `golden_prompts` is fine. Per-customer pinned queries are
  vertical-agnostic.
- `tracked_articles` carries RE query column. Generalize to
  target_keyword + article_type + content + meta jsonb.
- `competitor_snapshots` + `competitor_alerts` — keep, slightly
  generalize. Already work for any vertical.
- `deployed_content` + `deployed_schemas` — generic, keep.
- `integrations` — generic, keep.
- `crawl_jobs` + `broken_links` — generic, keep.

New tables for the post-pivot product:

- `sites` — replaces companies+projects. (id, owner_id, url, brand,
  brand_aliases, brand_exclusions, vertical, category, classification,
  created_at). Onboarding writes one row per tracked site.
- `mentions` — Reddit + HN + X + YouTube mention tracker output. One
  row per (site_id, source, source_url) with sentiment, content,
  detected_at, last_seen_at.
- `subscribers` (already shipped as global_subscribers) — keep.
- `public_grades` (already shipped) — keep.

Migration sequence:
- 016: introduce sites table; backfill from companies (1:1)
- 017: rewrite api routes to read sites instead of companies
- 018: drop projects, RE-specific columns from scan_history.results
- 019: drop companies once cutover is verified
- 020: trim subscriptions table to the SMB plan shape

This is a real ~3-day project, so it sits behind the codebase
cutover (pivot.20). Doing it before would block the pivot on
schema work; doing it after lets the pivot ship and validate
before we touch persistent data.

Estimated work: ~5–10 days of solid focus depending on customer-
support load.

## Production cutover plan

When the branch is feature-complete:

1. Run a full local smoke-test of the new home, signup, paid scan,
   article generation, mention tracking.
2. Take a Supabase backup before any schema changes are applied.
3. Apply new migrations to a Supabase staging branch first.
4. Merge `pivot-global` to `main` with a single squash commit so
   git history stays scannable.
5. Push. Vercel auto-deploys.
6. Watch error rate + auth flow + first scan completion for 30
   minutes. Roll back the deploy if anything red.
7. Update the Supabase site URL config + redirect URLs (if not
   already done).
8. Tweet the public pivot announcement. Cross-post to LinkedIn,
   Indie Hackers, r/SaaS.

## What happens to cabbge_global the repo

Archive on GitHub once the migration is verified live. Keep public
read access so the cron-seeded brand catalog research and other
isolated work stays referenceable. No active development.

## Decisions deliberately deferred

- **Multi-language content generation** — English only for v1.
- **Multi-currency pricing** — USD only for v1. INR-equivalent
  shown as fyi but charged USD via Dodo.
- **Team / RBAC** — single user per workspace.
- **Enterprise tier (custom pricing, SOC 2, SSO, dedicated CSM)**
  — not on the roadmap. The premise of the company is "you don't
  need to talk to sales to buy this." Scale at $599 is the ceiling.
- **White-label agency tier** — defer until 50+ paying customers
  validate the demand exists. Could become a Scale add-on later.
- **iOS / Android companion apps** — defer. Web-first.
- **AppSumo lifetime deal** — defer. Monthly economics first.

## Design north stars

When in doubt about a UX call, optimize for these in order:

1. **Five-minute first win.** Paste URL → see your real AI
   visibility score in under five minutes, on a desktop or phone,
   without an account. Anything that delays this loses.
2. **Shareable everything.** Every score, every artifact, every
   comparison should ship with a public-link / copy / embed
   affordance by default.
3. **Self-serve all the way.** No "talk to sales" CTAs anywhere.
   No demo calls required. No procurement gates.
4. **Polish over breadth.** Four features that feel like Linear
   beats twelve that feel like Hubspot.
5. **Founder taste.** The product should feel like one thoughtful
   person made it for one specific user — not like a committee of
   PMs scoped it for a market segment.

---

*Living doc. Update as commits ship.*
