# Cutover guide — pivot-global → main

The pivot is feature-complete on `pivot-global`. This doc is the
operator's runbook for getting it live. Read top to bottom before
starting.

## What's in the branch

31 commits, +10,233 / −23,625 LOC. The full per-commit list is at
the end of this file.

The product:

- **5-engine GEO scan** (ChatGPT, Gemini, Perplexity, Claude, Grok)
  with web grounding on each. Same prompt set across all five.
- **Mention tracking** (Reddit, Hacker News, YouTube, X via Grok),
  refreshed weekly with a Resend-powered digest email.
- **Per-engine playbook** — engine-specific fixes ranked by impact,
  surfaced on `/dashboard` and `/visibility/[slug]`.
- **Free public grader** at the home page (no signup, ~60s per scan,
  cached 7 days).
- **Programmatic SEO surfaces**: `/best`, `/best/[category]`,
  `/brands`, `/vs`, `/vs/[slug]`, `/press`.
- **Cold-outreach kit** at `/dashboard/outreach`: paste up to 100
  URLs, get personalized email + LinkedIn DM drafts referencing each
  prospect's actual scan findings.
- **Cron-seeded brand catalog** (~270 brands across 27 SMB
  categories) populating the SEO surfaces.
- **USD pricing**: $49 / $199 / $599. Self-serve only, no enterprise
  tier.

## Pre-cutover checklist

Run all of these locally first; do not push until each is green.

- [ ] `bun install` (or `npm install`) clean
- [ ] `npx next build` clean
- [ ] `npx tsc --noEmit` — only the stale `.next/dev/types/validator.ts`
      noise should appear, no real errors
- [ ] All required env vars present — check `.env.example` for the
      additions this round (`PERPLEXITY_API_KEY`, `XAI_API_KEY`,
      `ANTHROPIC_API_KEY`, `YOUTUBE_API_KEY`, `RESEND_API_KEY`,
      `RESEND_FROM`)
- [ ] Local smoke test (see next section)

## Local smoke test

Run `bun dev`, then walk through:

- [ ] Home page → paste a real URL → 5-engine grade returns in ~60s
- [ ] Sign up a new user → land on `/dashboard` (not `/onboarding`)
- [ ] Empty `/dashboard` shows "track your first brand" input
- [ ] Track a brand → reload → score grid populates, mention rollup
      shows at least Reddit + HN counts
- [ ] Click into the brand → playbook actions render with engine +
      priority pills
- [ ] Run a fresh re-scan from the dashboard → score updates,
      scanned_at advances
- [ ] `/dashboard/mentions` shows all four sources, refresh works
- [ ] `/dashboard/outreach` accepts a 5-URL test batch → returns
      drafts within 60s, CSV export downloads
- [ ] `/visibility/<slug>` for a seeded brand renders the score grid
      + playbook + share/embed widgets
- [ ] `/api/cron/seed-brands?batch=2` populates two new brands
      (Authorization: Bearer $CRON_SECRET)
- [ ] `/api/cron/refresh-mentions?batch=5` walks tracked_brands
      ordered by oldest
- [ ] `/api/cron/mention-digest` — with `RESEND_API_KEY` unset,
      returns `{ skipped: true }` per recipient; with it set, sends
      a real email to a test address
- [ ] `/robots.txt` includes all 14 AI bots with explicit allow on
      the public surfaces
- [ ] `/sitemap.xml` includes `/visibility/[slug]` entries for every
      public_grades row

If any step fails, fix on the branch before continuing.

## Migration sequence

| # | File | Status | Apply when |
|---|---|---|---|
| 015 | `015_public_grades_and_subscribers.sql` | apply if not already | before any cutover |
| 016 | `016_brand_mentions.sql` | apply if not already | before any cutover |
| 017 | `017_pivot_schema_revamp_proposal.sql` | DRAFT | staging first; verify backfill row count |
| 018 | `018_drop_projects_re_columns.sql` | DRAFT | only after 017 is live and stable for 7+ days |
| 019 | `019_rewire_routes_to_sites.sql` | DRAFT | only after the in-code from(companies) → from(sites) rewrite ships |
| 020 | `020_drop_companies.sql` | DRAFT | only after 30 days of clean prod traffic on the new shape |

Each migration's header documents its preconditions in detail. The
017 backfill `do$$` block has assumptions about `company.name` /
`company.website` / `company.industry` columns — verify against
actual prod schema before running.

## Cutover sequence

1. Take a Supabase backup
2. Apply 015 + 016 to prod (these add new tables, don't touch
   existing — safe even if you don't merge the code yet)
3. Apply 017 to a Supabase **staging** branch
4. Verify the backfill row count looks sensible against the
   companies table
5. Open the PR on GitHub: `pivot-global` → `main`. The body for
   the PR is in [`PR_BODY.md`](./PR_BODY.md) — copy-paste it
6. Squash and merge (single squash commit keeps `main` history
   scannable)
7. Push triggers Vercel auto-deploy
8. Watch error rate + auth flow + first-scan completion for 30
   minutes via Vercel logs + Supabase logs
9. If green, apply 017 against prod
10. 018 → 020 stay queued for at least 7 days each while live
    traffic validates the new shape

## Rollback plan

If anything goes red in step 8:

- Vercel: redeploy the previous commit on `main` from the
  deployments dashboard. ~30 seconds.
- Supabase: 017 is non-destructive (only adds sites + adds a
  nullable site_id to tracked_brands). No rollback needed; the
  table can stay empty until next attempt.
- Avoid running 018-020 until the cutover is confirmed stable —
  these are the destructive ones.

## Branch / commit list

```
f5e8efb pivot.18 (slice 6): sweep 39 orphan dashboard components + projects/pending
254b3ed pivot.21 (proposal): migrations 018-020 complete the schema sequence
7af04a1 pivot.18 (slice 5): wire per-engine playbook into /dashboard
c332626 pivot.18 (slice 4): unified /dashboard layout + Sidebar
d34851d pivot.21 (proposal): migration 017 introduces sites table
0aabe08 pivot.18 (slice 3b): delete legacy + onboarding + RE libs
c889023 pivot.18 (slice 3a): layout metadata + signup redirect
bd6317a pivot.18 (slice 2): minimalist post-pivot /dashboard
b30b345 pivot.19: distribution playbook + press kit polish
b912246 pivot.18 (slice 1): surface Mentions + Outreach in dashboard nav
a422e68 pivot.16: weekly mention digest email via Resend
ef63de6 pivot.15: rewrite pricing / about / methodology
10972f3 pivot.14: brand mention tracking — Reddit + HN + YouTube + X
e9d6934 pivot.13: cold-outreach generator
20e973b pivot.12: sitemap regen + robots AI-bot allow + cron-seed
33d305f pivot.11: programmatic SEO surfaces
2b03dd1 pivot.10b: free public grader frontend
f325748 pivot.10a: free public grader backend
bf69f52 pivot.9a: home page rewrite
58ed48b pivot.8: USD pricing $49/$199/$599
639828a pivot.7a: delete RE-only API routes
6539f8e pivot.6: per-engine playbook lib
a2c7cc8 pivot.5: 3 new readiness audits
a7bbedf pivot.4: off-domain coverage audit
3ce883a pivot.3: 5-engine fan-out
192f5b3 pivot.2: Perplexity + Claude + Grok engines
ac97ff8 pivot.1.5: kill enterprise framing
7287ed4 pivot.1: write plan
```

## After cutover

- Tweet the public pivot announcement; cross-post to LinkedIn,
  Indie Hackers, r/SaaS. Materials in `docs/DISTRIBUTION.md`.
- Archive cabbge_global on GitHub once cutover is verified live.
- Update CLAUDE.md / AGENTS.md to drop any RE references.

## Last updated
April 2026 — initial draft.
