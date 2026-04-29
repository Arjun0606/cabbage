<!--
Paste this into the body when opening the PR on GitHub:
  pivot-global → main
  Title: pivot: cabbge_RE → SMB GEO + mention tracker
-->

## Summary

The full pivot from cabbge_RE (Indian residential real estate) to a horizontal GEO + mention-tracking SaaS for indie SaaS founders, Shopify operators, and small marketing teams. 31 commits, +10,233 / −23,625 LOC.

The product:

- **5-engine GEO scan** (ChatGPT, Gemini, Perplexity, Claude, Grok) with web grounding on each. Same prompt set across all five.
- **Mention tracking** (Reddit, Hacker News, YouTube, X via Grok) — refreshed weekly, with a Resend-powered digest email.
- **Per-engine playbook** — engine-specific fixes ranked by impact, surfaced on `/dashboard` and `/visibility/[slug]`.
- **Free public grader** at the home page (no signup, ~60s per scan, cached 7 days).
- **Programmatic SEO surfaces**: `/best`, `/best/[category]`, `/brands`, `/vs`, `/vs/[slug]`, `/press`.
- **Cold-outreach kit** at `/dashboard/outreach`: paste up to 100 URLs, get personalized email + LinkedIn DM drafts referencing each prospect's actual scan findings.
- **Cron-seeded brand catalog** (~270 brands across 27 SMB categories) populating the SEO surfaces.
- **USD pricing**: $49 / $199 / $599. Self-serve only, no enterprise tier.

## What ships

| Layer | Change |
|---|---|
| Engine wiring | `lib/ai.ts` Perplexity + Claude + Grok branches; 5-engine fan-out in `aiVisibility.ts`; off-domain audit; 3 readiness audits (JS render, AI crawler access, entity grounding); per-engine playbook lib |
| Public funnel | `/api/grade`, `/visibility/[slug]`, `/badge/[slug]`, `/og/[slug]`, `/api/subscribe` |
| Programmatic SEO | `/best`, `/brands`, `/vs`, `/press`, sitemap regen, robots.txt for 14 AI bots, llms.txt rewrite |
| Mention tracking | `lib/agents/mentions.ts` + per-source adapters; `/dashboard/mentions`; weekly cron + digest email via Resend |
| Cold outreach | `/dashboard/outreach` + `/api/outreach/batch`; CSV export |
| Dashboard | New minimalist `/dashboard` with shared layout + Sidebar; per-brand score grid + playbook + 7-day mention rollup |
| Marketing copy | `/pricing`, `/about`, `/methodology`, root `<metadata>` rewritten for the SMB pivot |
| Distribution | `docs/DISTRIBUTION.md` 30-day playbook + press kit polish |
| Schema (drafts) | Migrations 017→020 sketched; not yet applied |
| Cleanup | Deleted legacy dashboard, onboarding, 3 RE-only API routes, 50 RE-coupled components, 7 RE-coupled libs |

## Migration sequence

1. `016_brand_mentions.sql` — apply if not already
2. `017_pivot_schema_revamp_proposal.sql` — sites table + backfill from companies (DRAFT)
3. `018_drop_projects_re_columns.sql` — drop projects + RE-only support tables (DRAFT)
4. `019_rewire_routes_to_sites.sql` — drop article-pipeline / competitor-watch / content-deploy tables; coerce legacy plan rows (DRAFT)
5. `020_drop_companies.sql` — drop companies, repoint credit_usage to user_id, remove orphaned subscriptions.company_id (DRAFT)

Each file's header documents preconditions for safe application. Apply against a Supabase staging branch first; the 017 backfill `do$$` block has assumptions about `company.name` / `company.website` / `company.industry` columns that should be verified against actual prod schema.

Full operator runbook in [`docs/CUTOVER.md`](docs/CUTOVER.md).

## Test plan

- [ ] Local smoke-test: home page → paste a real URL → 5-engine grade returns in ~60s
- [ ] Sign up a new user → land on `/dashboard` (not `/onboarding`)
- [ ] Track a brand → mention scan completes with at least Reddit + HN populated
- [ ] Run a fresh re-scan from the dashboard → score updates, scanned_at advances
- [ ] `/dashboard/outreach` accepts a 5-URL test batch → returns drafts within 60s, CSV export downloads
- [ ] `/visibility/<slug>` for a seeded brand renders the score grid + playbook + share/embed widgets
- [ ] `/api/cron/seed-brands?batch=2` populates two new brands
- [ ] `/api/cron/refresh-mentions?batch=5` walks tracked_brands ordered by oldest
- [ ] `/api/cron/mention-digest` — without `RESEND_API_KEY`, returns `{ skipped: true }`; with it set, real email
- [ ] `/robots.txt` includes all 14 AI bots
- [ ] `/sitemap.xml` includes `/visibility/[slug]` entries for every public_grades row

## Cutover

1. Take a Supabase backup
2. Apply 017 against a Supabase staging branch
3. Verify the backfill row count
4. Squash and merge this PR
5. Push triggers Vercel auto-deploy
6. Watch error rate + auth flow + first-scan completion for 30 minutes
7. If green, apply 017 against prod; otherwise roll back the deploy
8. 018→020 stay queued for at least 7 days while live traffic validates the new shape

🤖 Generated with [Claude Code](https://claude.com/claude-code)
