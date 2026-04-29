# 30-day distribution plan

The product is built. This document is the execution plan to drive
revenue. It's a working doc — update with what's working and what's
not as the month progresses.

Goal: **maximize paying customers in the first 30 days.** Aspirational
$100k MRR target informs the *intensity* of the plan, not the timing
realism. If we hit half of that we're a real business. If we hit a
fifth of that we have validated PMF. If we hit a tenth, we still have
something to build on. Don't dilute the plan to be "realistic."

The hard truth: distribution from zero with no audience compounds
slowly. The first week sets the trajectory.

---

## The maths to plan against

Tier mix assumption: 70% Starter / 25% Growth / 5% Scale →
ARPU = $114. So:

| Customers | MRR     |
|-----------|---------|
| 100       | $11.4k  |
| 250       | $28.5k  |
| 500       | $57k    |
| 877       | $100k   |

At a 2% trial→paid conversion, 877 customers = ~44k qualified visits.
At 0.5%, 175k visits. The rest of the plan back-solves this.

---

## Channel allocation by week

### Week 1 — launch volley (Mon–Sun)

**One single goal: get attention from cold strangers.**

Day 1 (Mon):
- [ ] Final polish pass: home, pricing, /visibility for top 5 brands look perfect
- [ ] Run the cron seed at `/api/cron/seed?batch=50` until all ~270 seed brands are graded → 270 indexable visibility pages
- [ ] Pre-write 30 tweets, 10 LinkedIn posts, and 5 Reddit comments
- [ ] Email 30 friends who'd realistically support → ask them to upvote on Tuesday

Day 2 (Tue):
- [ ] **Product Hunt launch** at 12:01 AM PT.
  - Tagline: "Free AI visibility grader. See if ChatGPT, Gemini & Perplexity recommend you."
  - First comment: 3 surprising findings from grading 270 brands
  - Reach out to 50 PH hunters who launched recently in SaaS/AI categories
- [ ] **Hacker News post** at 8:00 AM ET.
  - Title: "Show HN: We graded 270 brands' AI visibility. Here's what we found."
  - Lead with data, not the product. PHbots tank these. Upvote rings get penalized.
- [ ] **Twitter thread** with the 10 most surprising findings, embed grade screenshots
- [ ] **Reply to 30 SEO/AI people** with a quote-share of one of their tweets + the relevant grade

Day 3 (Wed):
- [ ] **LinkedIn long-form** about the methodology + findings
- [ ] **Indie Hackers post** about the build journey
- [ ] **Cold-email batch 1**: 200 personalized emails to indie SaaS founders with their grade URL pre-loaded
  - Subject: "[Your brand] scored 47 on AI visibility (vs Stripe's 84)"
  - Body: 4 sentences, no pitch, just the link

Day 4 (Thu):
- [ ] **Reddit posts** in r/SaaS, r/Entrepreneur, r/SEO with category-specific findings
  - "Best CRMs in ChatGPT in 2026" (links to /best/crm-software)
  - Don't pitch the tool. Lead with the data.
- [ ] **Twitter Spaces or X Post Thread** answering questions
- [ ] **Cold-email batch 2**: 200 more

Day 5 (Fri):
- [ ] Recap the week — what worked, what didn't
- [ ] Send last batch of personalized emails before weekend (200)
- [ ] Reach out to 20 newsletter authors / SEO substackers

Weekend (Sat–Sun):
- [ ] Catch up on signups, manual onboarding for anyone who paid
- [ ] Pre-write next week's content

**Week 1 success markers:**
- ≥3,000 unique visits to homepage
- ≥500 free grades run
- ≥50 paid signups
- ≥1 piece of organic press / mention

---

### Week 2 — outbound at volume

**Goal: turn the launch attention into a list and a customer base.**

Daily:
- [ ] **300 cold emails/day** with pre-loaded scan links (~2,100 by week's end)
- [ ] **100 LinkedIn DMs/day** with same pattern
- [ ] **2 substantive Reddit comments/day** in r/SEO, r/SaaS, r/marketing — only when there's a thread asking for tools/help
- [ ] **3 Twitter posts/day** — 1 finding from the data, 1 product update, 1 reply to someone in the space

Outreach formula (works because it's specific, not pitchy):
```
Subject: [Brand] scored {SCORE} for "{TOP_CATEGORY_QUERY}"

Hey {first_name},

Ran an AI visibility scan on {brand}: {SCORE}/100 across ChatGPT,
Gemini, Perplexity. Two things stood out:

1. {SPECIFIC_FINDING_1, e.g. "GPTBot can't render your homepage —
   you're shipping a React SPA shell to it"}
2. {SPECIFIC_FINDING_2, e.g. "Wikidata has no entry for {brand} —
   that's worth ~2.8x more citations on Gemini"}

Full breakdown here: https://cabbge.com/visibility/{slug}

If it's useful, the paid scan runs 40 prompts and ships the schema
+ FAQ pages to fix what's broken. $49/mo, no demo call.

— {first_name from your side}
```

Tools to use:
- Personalization at scale: Instantly.ai or Lemlist, $97/mo, do it yourself
- Lead source: Apollo free tier for SMB SaaS founders, then export
- Tracking: every outreach email links to a unique cabbge URL with `?ref=outbound-{batch}` so attribution works

**Week 2 success markers:**
- ≥150 paid signups (cumulative ~200)
- ≥15% reply rate on cold emails
- ≥5,000 unique visits to homepage
- Email list ≥1,500

---

### Week 3 — partnerships + content compound

**Goal: stop being the only one selling for us.**

- [ ] **Affiliate program live**: /affiliates page, 40% recurring for 12 months. Targets:
  - SEO consultants and agencies
  - SaaS-focused newsletters
  - Indie SaaS founders with audiences
  - Reach 100 of them by EOD Friday
- [ ] **Partnership outreach**: SEO tools, SaaS directories, indie newsletters
  - Offer: free Pro-tier accounts for their team in exchange for a one-time mention
- [ ] **Programmatic SEO push**: 100 new /best/[category] pages by Friday (need more seed brands graded)
- [ ] **First weekly report**: "AI Visibility Index — Week 1" — leaderboards in 5 categories, posted everywhere
- [ ] **Continue outbound** at 200 emails/day, 75 DMs/day

If budget allows: $1k-3k Google Ads on "Profound alternatives", "AI
visibility tool", "Otterly alternatives". Track ROAS hourly. Cut
campaigns spending >$50 with no signups.

**Week 3 success markers:**
- ≥250 cumulative paid signups
- ≥20 active affiliates
- ≥1 paid partnership / cross-promotion
- First newsletter or blog mention from someone who isn't us

---

### Week 4 — compound + close + retention

**Goal: stop the leaks, double down on what's working.**

- [ ] **Re-engage every grader** who didn't convert: weekly visibility update email with their score change since last scan. Big delta = "your AI visibility score dropped 8 points this week. Here's what changed."
- [ ] **Annual upgrade campaign**: 20% off annual for the first 100 customers. Email everyone on Starter/Growth.
- [ ] **Top of funnel doubled**: 500 emails/day, 150 DMs/day. The data from weeks 1–3 tells us which channels worked; lean into those, kill the rest.
- [ ] **Second weekly report** — broader, fancier, with charts. Send to every press contact found in week 1.
- [ ] **Affiliates push**: top affiliates get a public shoutout
- [ ] **Twitter founder content**: 4-5 posts/day, all data-led

**Week 4 success markers:**
- ≥500 cumulative paid signups
- $50k+ MRR
- One or more "Wow, you grew fast" posts about us from outsiders

---

## What we are NOT doing in month 1

These would be valuable but compete with weeks of focused work
elsewhere. Defer to month 2:

- AppSumo lifetime deal (decimates monthly economics, hurts runway calc)
- Heavy paid ad spend (need data before committing meaningful budget)
- Conference / event sponsorship (slow ROI)
- Custom integrations / white-label deals (one-off engineering)
- Refactor pricing tiers based on early signal (wait 30 days, then act)

---

## The brutal honesty checklist

Re-read this every Friday and answer truthfully.

1. Did I send 1,400+ personalized cold emails this week?
2. Did I DM 500+ people on LinkedIn this week?
3. Did I post 25+ times on Twitter / LinkedIn this week?
4. Did I get 3+ replies / shares from people I don't know personally?
5. Did at least one paid customer say "I found you because…"?

If 4 of 5 = no, the bottleneck is *founder distribution time*, not
the product. No feature build will fix it. Spend the next week on the
list above before opening a code editor.

---

## Infrastructure required to execute (build status)

| Surface | Status | Notes |
|---|---|---|
| Public grader on /  | shipped (phase 4) | works |
| /visibility/[slug] permanent shareable | shipped (phase 4) | works |
| /badge/[slug] embeddable | shipped (phase 4) | works |
| /og/[slug] social card | shipped (phase 5) | works |
| Sitemap + robots + llms.txt | shipped (phase 5) | works |
| /best/[category] listicles | shipped (phase 5) | needs ≥3 grades per category to populate |
| /vs/[competitor] comparison pages | shipped (phase 6) | 5 competitors covered |
| /methodology transparency page | shipped (phase 8) | works |
| Per-engine playbook on results | shipped (phase 8) | works |
| Off-domain coverage audit | shipped (phase 7) | works |
| **Email capture on grader** | **needs build** | every visitor becomes a lead |
| **Cold-outreach generator** | **needs build** | dashboard tool that bulk-grades URLs and exports email-ready content |
| **Affiliate program** | **needs build** | /affiliates page + cookie tracking + Dodo affiliate code metadata |
| **Weekly digest engine** | **needs build** | re-engage non-converters with score deltas |
| **Press kit / media page** | **needs build** | reporter-ready data for AI Visibility Index reports |

Build the missing five before week 2 starts.

---

## Founder time allocation (the only thing that matters)

8-hour day, weekdays. Adjust as needed but the ratios stay.

| Task | Hours/day |
|---|---|
| Cold outreach (writing + sending) | 3 |
| Public content (Twitter, LinkedIn, Reddit) | 2 |
| Customer support + onboarding | 1.5 |
| Product fixes responding to user feedback | 1 |
| Strategy / planning / reflection | 0.5 |

If you spend more than 1 hour/day on product code in week 1–2, you
are working against the goal.

---

## Last updated
April 2026 — initial draft.
