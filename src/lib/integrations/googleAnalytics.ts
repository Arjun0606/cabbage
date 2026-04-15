/**
 * Google Analytics 4 Integration
 *
 * Uses the same Google OAuth as GSC — one connection gets both.
 * Pulls real traffic data: sessions, users, page views, bounce rate,
 * top pages, traffic sources, device breakdown.
 */

// ---------- Types ----------

export interface GACredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface GAOverview {
  propertyId: string;
  dateRange: { start: string; end: string };
  metrics: {
    sessions: number;
    users: number;
    pageViews: number;
    bounceRate: number;
    avgSessionDuration: number;
    newUsers: number;
  };
  previousPeriod?: {
    sessions: number;
    users: number;
    pageViews: number;
    bounceRate: number;
  };
  topPages: { path: string; views: number; avgTime: number }[];
  trafficSources: { source: string; medium: string; sessions: number }[];
  deviceBreakdown: { device: string; sessions: number; percentage: number }[];
}

// ---------- GA4 Data API ----------

export async function getGAOverview(
  credentials: GACredentials,
  propertyId: string,
  days: number = 28
): Promise<GAOverview> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const prevEndDate = new Date(startDate);
  prevEndDate.setDate(prevEndDate.getDate() - 1);
  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevStartDate.getDate() - days);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  // Current period metrics
  const metricsRes = await fetchGA4Report(credentials, propertyId, {
    dateRanges: [
      { startDate: formatDate(startDate), endDate: formatDate(endDate) },
      { startDate: formatDate(prevStartDate), endDate: formatDate(prevEndDate) },
    ],
    metrics: [
      { name: "sessions" },
      { name: "activeUsers" },
      { name: "screenPageViews" },
      { name: "bounceRate" },
      { name: "averageSessionDuration" },
      { name: "newUsers" },
    ],
  });

  const current = metricsRes?.rows?.[0]?.metricValues || [];
  const previous = metricsRes?.rows?.[1]?.metricValues || [];

  // Top pages
  const pagesRes = await fetchGA4Report(credentials, propertyId, {
    dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }, { name: "averageSessionDuration" }],
    limit: 10,
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
  });

  // Traffic sources
  const sourcesRes = await fetchGA4Report(credentials, propertyId, {
    dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
    dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
    metrics: [{ name: "sessions" }],
    limit: 10,
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });

  // Device breakdown
  const deviceRes = await fetchGA4Report(credentials, propertyId, {
    dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
    dimensions: [{ name: "deviceCategory" }],
    metrics: [{ name: "sessions" }],
  });

  const totalSessions = Number(current[0]?.value || 0);

  return {
    propertyId,
    dateRange: { start: formatDate(startDate), end: formatDate(endDate) },
    metrics: {
      sessions: Number(current[0]?.value || 0),
      users: Number(current[1]?.value || 0),
      pageViews: Number(current[2]?.value || 0),
      bounceRate: Math.round(Number(current[3]?.value || 0) * 100) / 100,
      avgSessionDuration: Math.round(Number(current[4]?.value || 0)),
      newUsers: Number(current[5]?.value || 0),
    },
    previousPeriod: previous.length > 0 ? {
      sessions: Number(previous[0]?.value || 0),
      users: Number(previous[1]?.value || 0),
      pageViews: Number(previous[2]?.value || 0),
      bounceRate: Math.round(Number(previous[3]?.value || 0) * 100) / 100,
    } : undefined,
    topPages: (pagesRes?.rows || []).map((row: any) => ({
      path: row.dimensionValues?.[0]?.value || "/",
      views: Number(row.metricValues?.[0]?.value || 0),
      avgTime: Math.round(Number(row.metricValues?.[1]?.value || 0)),
    })),
    trafficSources: (sourcesRes?.rows || []).map((row: any) => ({
      source: row.dimensionValues?.[0]?.value || "direct",
      medium: row.dimensionValues?.[1]?.value || "none",
      sessions: Number(row.metricValues?.[0]?.value || 0),
    })),
    deviceBreakdown: (deviceRes?.rows || []).map((row: any) => ({
      device: row.dimensionValues?.[0]?.value || "unknown",
      sessions: Number(row.metricValues?.[0]?.value || 0),
      percentage: totalSessions > 0
        ? Math.round((Number(row.metricValues?.[0]?.value || 0) / totalSessions) * 100)
        : 0,
    })),
  };
}

// ---------- GA4 Reporting API call ----------

async function fetchGA4Report(
  credentials: GACredentials,
  propertyId: string,
  body: any
): Promise<any> {
  try {
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      console.error("GA4 API error:", error);
      return { rows: [] };
    }

    return await res.json();
  } catch (error) {
    console.error("GA4 fetch error:", error);
    return { rows: [] };
  }
}

// ---------- List GA4 Properties ----------

export async function listGA4Properties(credentials: GACredentials): Promise<{ id: string; name: string }[]> {
  try {
    const res = await fetch(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
      {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      }
    );

    if (!res.ok) return [];
    const data = await res.json();

    const properties: { id: string; name: string }[] = [];
    for (const account of data.accountSummaries || []) {
      for (const prop of account.propertySummaries || []) {
        properties.push({
          id: prop.property?.replace("properties/", "") || "",
          name: prop.displayName || prop.property || "Unknown",
        });
      }
    }
    return properties;
  } catch {
    return [];
  }
}
