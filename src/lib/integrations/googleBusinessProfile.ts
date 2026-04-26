/**
 * Google Business Profile (GBP) helpers.
 *
 * Mirrors the GSC integration pattern (token exchange + refresh stored
 * in `integrations` table, provider="google_business_profile"). Real
 * production deployment needs:
 *
 *   1. Google Cloud project with Business Profile API enabled.
 *   2. OAuth 2.0 client (Web application) with redirect URI
 *      https://cabbge.com/api/integrations/gbp/callback.
 *   3. Env vars:
 *        GBP_OAUTH_CLIENT_ID
 *        GBP_OAUTH_CLIENT_SECRET
 *      (separate from GSC creds — different scopes / consent screens
 *      need separate OAuth clients in practice).
 *   4. Customer-side: each customer connects their own GBP account
 *      via the consent flow; tokens persist in `integrations` rows
 *      keyed to their company_id.
 *
 * The /api/gbp-deploy endpoint reads the stored tokens, refreshes them
 * if expired, and POSTs a Local Post to the customer's GBP location.
 */

const GBP_OAUTH_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const GBP_OAUTH_TOKEN = "https://oauth2.googleapis.com/token";
const GBP_LOCAL_POSTS_BASE = "https://mybusiness.googleapis.com/v4";
const GBP_SCOPE = "https://www.googleapis.com/auth/business.manage";

export interface GBPCredentials {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // unix ms
  token_type?: string;
  scope?: string;
}

export interface GBPLocalPost {
  /** Free-text post body, typically 100-300 chars. */
  summary: string;
  /** Optional image URL (must be HTTPS). */
  imageUrl?: string;
  /** Optional CTA — Google supports BOOK / ORDER / SHOP / LEARN_MORE / SIGN_UP / CALL. */
  cta?: { actionType: "LEARN_MORE" | "BOOK" | "CALL" | "SIGN_UP" | "ORDER" | "SHOP"; url?: string };
  /** Topic type — STANDARD | EVENT | OFFER. We default STANDARD. */
  topicType?: "STANDARD" | "EVENT" | "OFFER";
}

export function buildAuthorizeUrl(redirectUri: string, state?: string): string {
  const clientId = process.env.GBP_OAUTH_CLIENT_ID;
  if (!clientId) throw new Error("GBP_OAUTH_CLIENT_ID is not configured");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GBP_SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  if (state) params.set("state", state);
  return `${GBP_OAUTH_AUTHORIZE}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<GBPCredentials> {
  const clientId = process.env.GBP_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GBP_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("GBP OAuth credentials not configured");

  const res = await fetch(GBP_OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GBP token exchange failed: ${res.status} ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + ((json.expires_in ?? 3600) - 60) * 1000,
    token_type: json.token_type,
    scope: json.scope,
  };
}

export async function refreshIfNeeded(creds: GBPCredentials): Promise<GBPCredentials> {
  if (creds.expires_at > Date.now()) return creds;
  if (!creds.refresh_token) throw new Error("GBP token expired and no refresh_token available");

  const clientId = process.env.GBP_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GBP_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("GBP OAuth credentials not configured");

  const res = await fetch(GBP_OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: creds.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GBP token refresh failed: ${res.status} ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  return {
    ...creds,
    access_token: json.access_token,
    expires_at: Date.now() + ((json.expires_in ?? 3600) - 60) * 1000,
  };
}

/**
 * Publish a single Local Post to a GBP location.
 *
 * accountName: "accounts/{accountId}"
 * locationName: "accounts/{accountId}/locations/{locationId}"
 * Both come from the GBP listAccounts / listLocations endpoints — we
 * persist them in the `integrations.metadata` blob at OAuth time so the
 * customer doesn't have to re-pick their location on every publish.
 */
export async function publishLocalPost(
  creds: GBPCredentials,
  locationName: string,
  post: GBPLocalPost
): Promise<{ name: string; createTime: string }> {
  const fresh = await refreshIfNeeded(creds);
  const body: Record<string, unknown> = {
    languageCode: "en",
    summary: post.summary.slice(0, 1500),
    topicType: post.topicType ?? "STANDARD",
  };
  if (post.imageUrl) {
    body.media = [{ mediaFormat: "PHOTO", sourceUrl: post.imageUrl }];
  }
  if (post.cta) {
    body.callToAction = post.cta.url
      ? { actionType: post.cta.actionType, url: post.cta.url }
      : { actionType: post.cta.actionType };
  }

  const res = await fetch(`${GBP_LOCAL_POSTS_BASE}/${locationName}/localPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${fresh.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GBP publish failed: ${res.status} ${txt.slice(0, 300)}`);
  }
  const json = await res.json();
  return { name: json.name, createTime: json.createTime };
}
