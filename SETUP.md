# Cabbge Setup — Path to Paywall

Complete these 4 steps to go from "built" to "selling".

---

## 1. Run the Supabase migration

Open [your Supabase project → SQL Editor](https://supabase.com/dashboard) and paste the contents of:

- `supabase/migrations/001_auth_and_billing.sql`

Run it once. This creates:
- `profiles` (linked to `auth.users`)
- `subscriptions` (with auto-created 14-day trial per signup)
- `gsc_snapshots`, `deployed_schemas`, `tracked_articles`
- Row-level security policies on all tables
- Triggers: auto-create profile on signup, auto-create trial subscription on profile creation

Safe to run multiple times (idempotent). The original `supabase/schema.sql` should already be run — the migration adds on top.

---

## 2. Razorpay setup (payments)

### 2a. Create a Razorpay account
- Go to [razorpay.com](https://razorpay.com) → Sign up → Complete KYC (usually 2-3 business days for live mode).
- While KYC is pending, use **Test Mode** for development.

### 2b. Create ONE subscription plan
Dashboard → Subscriptions → Plans → Create Plan:

| Plan name | Billing cycle | Amount | Currency |
|-----------|---------------|--------|----------|
| Cabbge Base | Monthly | ₹50,000 | INR |

Copy the plan's ID (looks like `plan_XXXXXXXXXXXXXX`).

Credit top-ups (1,000 / 5,000 / 10,000 credit packs) are one-off Razorpay
**orders** created dynamically by `/api/billing/topup` — you do NOT need
to create separate Razorpay plans for them.

### 2c. Add env vars to Vercel

Vercel → Project → Settings → Environment Variables → add:

```
RAZORPAY_KEY_ID             = rzp_test_xxxxx (or rzp_live_xxxxx in production)
RAZORPAY_KEY_SECRET         = <your secret>
RAZORPAY_WEBHOOK_SECRET     = <generate a random string, 32+ chars>
RAZORPAY_PLAN_BASE          = plan_xxx  (from step 2b — Cabbge Base ₹50,000/mo)
```

### 2d. Configure the webhook

Razorpay dashboard → Settings → Webhooks → Add Webhook:

- **URL**: `https://cabbge.com/api/billing/webhook`
- **Secret**: use the same value as `RAZORPAY_WEBHOOK_SECRET`
- **Active events** (enable all):
  - `subscription.activated`
  - `subscription.authenticated`
  - `subscription.charged`
  - `subscription.pending`
  - `subscription.halted`
  - `subscription.cancelled`
  - `subscription.completed`
  - `subscription.paused`
  - `subscription.resumed`

Click "Create Webhook". Razorpay will POST to this URL every time a subscription changes state.

---

## 3. Supabase Auth settings

Supabase dashboard → Authentication → Providers:

- **Email**: enable. Turn **ON** "Confirm email" if you want email verification before sign-in (recommended). Turn **OFF** for frictionless trial (users can start immediately).
- **Site URL**: `https://cabbge.com`
- **Redirect URLs**: add `https://cabbge.com/auth/callback`

Authentication → Email Templates → Customize as needed.

---

## 4. Publish Google OAuth consent screen

Currently the OAuth app is in "Testing" mode, so only your Google account can connect GSC. To let customers connect:

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → OAuth consent screen
2. Click **"Publish app"** (if in Testing mode)
3. If warned about verification, submit for verification (takes 2-7 days). For now "unverified" still works — customers just see a warning screen they can dismiss.

---

## Smoke test checklist

Once env vars are set and migration run:

- [ ] Visit `https://cabbge.com/signup` — should load
- [ ] Create a test account → redirects to `/onboarding`
- [ ] Onboarding completes → redirects to `/dashboard`
- [ ] Top of dashboard shows "X days left in your free trial"
- [ ] Click "Upgrade" in the banner → pricing page opens
- [ ] Click "Start Free Trial" on Starter → Razorpay checkout opens (test mode)
- [ ] Complete test payment → redirects to dashboard with `?upgraded=true`
- [ ] Webhook fires → check Supabase `subscriptions` table: `status` should be `active`
- [ ] Banner disappears (paid plan)
- [ ] Go to `/auth/signout` → redirects to signin
- [ ] Visit `/dashboard` while signed out → redirects to `/signin?next=/dashboard`

---

## Production launch checklist

- [ ] Supabase migration run
- [ ] Razorpay in **Live Mode** (KYC approved)
- [ ] All Razorpay env vars use live keys (`rzp_live_*`)
- [ ] Webhook pointed at production URL
- [ ] OAuth consent screen published (or at least "Published with warning")
- [ ] Test signup → trial → upgrade → cancel → resubscribe end-to-end
- [ ] Price point confirmed (₹7,500 Starter / ₹24,000 Growth) — these are editable in Razorpay any time

## Pricing rationale

**Cabbge Base: ₹50,000/mo (~$600)** — one plan, everything included.
- ~₹6L/year. In-house SEO manager: ₹15-40L/year. Agency retainer: ₹3-10L/month.
- Replaces both at a fraction of the cost.
- Includes generous monthly credit allowance.
- Overage handled via credit top-ups (like Claude: pay-as-you-go, no tier jumping):
  - 1,000 credits = ₹5,000 (₹5/credit)
  - 5,000 credits = ₹20,000 (₹4/credit)
  - 10,000 credits = ₹35,000 (₹3.50/credit)

**Why flat + credits:** customers don't have to re-negotiate when they grow.
No "you've outgrown Starter, please upgrade to Growth" churn moment. They just buy more credits when they need to.
