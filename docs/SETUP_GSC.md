# Google Search Console Setup (5 minutes)

## What this gives you
Real keyword rankings, impressions, clicks, CTR, and average position
for your customers' websites. This is the "Connect Google Services →
Search Console" button in Settings → Integrations.

## Steps

### 1. Create a Google Cloud Project
- Go to https://console.cloud.google.com/
- Click "Select a project" → "New Project"
- Name: "CabbageSEO" → Create

### 2. Enable Search Console API
- Go to https://console.cloud.google.com/apis/library
- Search "Search Console API"
- Click it → "Enable"

### 3. Configure OAuth Consent Screen
- Go to https://console.cloud.google.com/apis/credentials/consent
- Select "External" → Create
- App name: "CabbageSEO"
- User support email: your email
- Developer contact: your email
- Click "Save and Continue"
- Scopes: Add `https://www.googleapis.com/auth/webmasters.readonly`
- Click "Save and Continue"
- Test users: Add your own email
- Click "Save and Continue"

### 4. Create OAuth Credentials
- Go to https://console.cloud.google.com/apis/credentials
- Click "Create Credentials" → "OAuth client ID"
- Application type: "Web application"
- Name: "CabbageSEO"
- Authorized redirect URIs: Add your Vercel URL + callback path:
  `https://YOUR-VERCEL-URL.vercel.app/api/integrations/gsc/callback`
  (also add `http://localhost:3001/api/integrations/gsc/callback` for local dev)
- Click "Create"
- Copy the **Client ID** and **Client Secret**

### 5. Set Environment Variables
```bash
cd /Users/arjun/cabbage

# On Vercel
npx vercel env add GOOGLE_CLIENT_ID production
npx vercel env add GOOGLE_CLIENT_SECRET production

# Locally
# Add to .env.local:
# GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

# Redeploy
npx vercel --prod
```

### 6. Test
- Go to Settings → Integrations → Google Search Console → Connect
- You'll be redirected to Google's consent screen
- Authorize → redirected back to dashboard with GSC data

## Cost
Free. Google Search Console API has no usage charges.

## Notes
- The app will be in "Testing" mode initially (only test users can authorize)
- To allow any user: submit for Google OAuth verification (takes 1-2 weeks)
- For your first 5 customers, add their Google accounts as test users
