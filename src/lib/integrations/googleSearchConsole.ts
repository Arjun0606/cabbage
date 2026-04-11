/**
 * Google Search Console Integration
 *
 * OAuth flow: user connects their GSC account → we pull real keyword
 * rankings, impressions, clicks, CTR, and average position.
 *
 * This gives us REAL data for:
 * - Which queries the site ranks for
 * - What position for each query
 * - How many impressions and clicks
 * - Which pages get the most organic traffic
 * - Trends over time (comparing date ranges)
 */

// ---------- Types ----------

export interface GSCCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface GSCQueryResult {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCPageResult {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCOverview {
  siteUrl: string;
  dateRange: { start: string; end: string };
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  topQueries: GSCQueryResult[];
  topPages: GSCPageResult[];
  queryTrends: { date: string; clicks: number; impressions: number }[];
}

// ---------- OAuth ----------

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GSC_API = "https://www.googleapis.com/webmasters/v3";
const SEARCH_ANALYTICS_API = "https://searchconsole.googleapis.com/webmasters/v3";

export function getGoogleAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    access_type: "offline",
    prompt: "consent",
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GSCCredentials> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Google OAuth error: ${data.error_description || data.error}`);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<GSCCredentials> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Token refresh error: ${data.error_description || data.error}`);

  return {
    accessToken: data.access_token,
    refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

async function getValidToken(credentials: GSCCredentials): Promise<string> {
  if (Date.now() < credentials.expiresAt - 60000) {
    return credentials.accessToken;
  }
  const refreshed = await refreshAccessToken(credentials.refreshToken);
  return refreshed.accessToken;
}

// ---------- API Calls ----------

export async function listSites(credentials: GSCCredentials): Promise<string[]> {
  const token = await getValidToken(credentials);
  const res = await fetch(`${GSC_API}/sites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return (data.siteEntry || []).map((s: any) => s.siteUrl);
}

export async function fetchSearchAnalytics(
  credentials: GSCCredentials,
  siteUrl: string,
  options: {
    startDate?: string;
    endDate?: string;
    dimensions?: string[];
    rowLimit?: number;
  } = {}
): Promise<any> {
  const token = await getValidToken(credentials);

  const now = new Date();
  const endDate = options.endDate || new Date(now.getTime() - 3 * 86400000).toISOString().split("T")[0]; // 3 days ago (GSC delay)
  const startDate = options.startDate || new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0]; // 30 days ago

  const body = {
    startDate,
    endDate,
    dimensions: options.dimensions || ["query"],
    rowLimit: options.rowLimit || 100,
    dataState: "final",
  };

  const encodedSiteUrl = encodeURIComponent(siteUrl);
  const res = await fetch(
    `${SEARCH_ANALYTICS_API}/sites/${encodedSiteUrl}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  if (data.error) throw new Error(`GSC API error: ${data.error.message}`);
  return data;
}

// ---------- High-Level Functions ----------

export async function getGSCOverview(
  credentials: GSCCredentials,
  siteUrl: string
): Promise<GSCOverview> {
  const now = new Date();
  const endDate = new Date(now.getTime() - 3 * 86400000).toISOString().split("T")[0];
  const startDate = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];

  // Fetch queries, pages, and daily trends in parallel
  const [queryData, pageData, trendData] = await Promise.all([
    fetchSearchAnalytics(credentials, siteUrl, {
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit: 50,
    }),
    fetchSearchAnalytics(credentials, siteUrl, {
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: 20,
    }),
    fetchSearchAnalytics(credentials, siteUrl, {
      startDate,
      endDate,
      dimensions: ["date"],
      rowLimit: 30,
    }),
  ]);

  const topQueries: GSCQueryResult[] = (queryData.rows || []).map((row: any) => ({
    query: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: Math.round(row.ctr * 1000) / 10,
    position: Math.round(row.position * 10) / 10,
  }));

  const topPages: GSCPageResult[] = (pageData.rows || []).map((row: any) => ({
    page: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: Math.round(row.ctr * 1000) / 10,
    position: Math.round(row.position * 10) / 10,
  }));

  const queryTrends = (trendData.rows || []).map((row: any) => ({
    date: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
  }));

  // Calculate totals
  const totalClicks = topQueries.reduce((sum, q) => sum + q.clicks, 0);
  const totalImpressions = topQueries.reduce((sum, q) => sum + q.impressions, 0);
  const averageCtr = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 1000) / 10 : 0;
  const averagePosition = topQueries.length > 0
    ? Math.round((topQueries.reduce((sum, q) => sum + q.position, 0) / topQueries.length) * 10) / 10
    : 0;

  return {
    siteUrl,
    dateRange: { start: startDate, end: endDate },
    totalClicks,
    totalImpressions,
    averageCtr,
    averagePosition,
    topQueries,
    topPages,
    queryTrends,
  };
}
