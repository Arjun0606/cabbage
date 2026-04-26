/**
 * Demo fixtures.
 *
 * Synthetic trend / attribution / freshness data for sales-pitch demos.
 * Every real-user code path skips this — the trend writer in /api/ai-visibility
 * already declines to write for demo cookies, and the read endpoints branch
 * here only when isDemoRequest is true. This keeps the demo dashboard
 * impressive without a single fake row touching production data.
 *
 * Curves are seeded to look like a believable 90-day customer journey:
 * a flat baseline for the first ~3 weeks, an inflection when articles
 * "ship", then steady growth with realistic noise.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

interface ScanPoint {
  at: string;
  chatgpt: number;
  gemini: number;
  combined: number;
  totalQueries: number;
}

interface QueryTrend {
  query: string;
  history: { at: string; mentioned: boolean }[];
  rate: number;
  currentlyMentioned: boolean;
  initiallyMentioned: boolean;
  movement: "gained" | "lost" | "stable";
}

const DEMO_QUERIES: { query: string; gainedAt: number | null }[] = [
  // gainedAt = scan index where this query started getting mentioned;
  // null = never mentioned (kept absent the whole window for realism)
  { query: "best 3 BHK apartments in Gachibowli under 2 crore", gainedAt: 4 },
  { query: "luxury villa projects in Whitefield Bangalore", gainedAt: 5 },
  { query: "RERA approved builders in Hyderabad with possession 2026", gainedAt: 4 },
  { query: "developers near Outer Ring Road Bangalore with amenities", gainedAt: 6 },
  { query: "ready to move flats Kondapur 2 BHK", gainedAt: 5 },
  { query: "premium gated community Sarjapur Road price per sqft", gainedAt: 7 },
  { query: "best builders for under construction projects HITEC City", gainedAt: 7 },
  { query: "investment property near Bangalore airport ROI", gainedAt: 6 },
  { query: "3 BHK price comparison Gachibowli vs Kondapur", gainedAt: 1 },
  { query: "top developers by customer reviews Hyderabad 2026", gainedAt: 1 },
  { query: "high rise apartments with rooftop pool Bangalore", gainedAt: null },
  { query: "Vastu compliant 4 BHK Whitefield east facing", gainedAt: null },
  { query: "compare amenities Aparna vs Prestige projects", gainedAt: 2 },
  { query: "new launches in Kollur Hyderabad price under 1.5 cr", gainedAt: 3 },
  { query: "weekend home plots Devanahalli Bangalore investment", gainedAt: null },
  { query: "fastest selling projects Financial District Hyderabad", gainedAt: 5 },
  { query: "property within 5 km of L&T Metro Bangalore", gainedAt: null },
  { query: "best schools near upcoming residential projects Sarjapur", gainedAt: 4 },
  { query: "RERA Telangana verification process new project", gainedAt: 2 },
  { query: "premium apartments with co-working space Hyderabad", gainedAt: 6 },
];

const SCAN_COUNT = 8;
const WINDOW_DAYS = 70;

function buildTimeline(): string[] {
  const now = Date.now();
  const stride = WINDOW_DAYS / (SCAN_COUNT - 1);
  return Array.from({ length: SCAN_COUNT }, (_, i) => {
    const ms = now - (WINDOW_DAYS - i * stride) * DAY_MS;
    return new Date(ms).toISOString();
  });
}

function mentionedAtScan(query: { gainedAt: number | null }, scanIdx: number): boolean {
  if (query.gainedAt === null) return false;
  return scanIdx >= query.gainedAt;
}

export function demoTrends(): {
  summary: {
    scans: number;
    days: number;
    current: { chatgpt: number; gemini: number; combined: number };
    delta: { chatgpt: number; gemini: number; combined: number };
    queriesGained: number;
    queriesLost: number;
  };
  series: ScanPoint[];
  queryTrends: QueryTrend[];
} {
  const timeline = buildTimeline();
  const total = DEMO_QUERIES.length;

  const series: ScanPoint[] = timeline.map((at, scanIdx) => {
    const chatgptHits = DEMO_QUERIES.filter((q) => mentionedAtScan(q, scanIdx)).length;
    // Gemini lags ChatGPT by one scan to look realistic
    const geminiHits = DEMO_QUERIES.filter(
      (q) => q.gainedAt !== null && scanIdx >= q.gainedAt + 1
    ).length;
    const chatgpt = Math.round((chatgptHits / total) * 100);
    const gemini = Math.round((geminiHits / total) * 100);
    // Combined is "mentioned anywhere" — same as max of the two for our seed
    const combined = Math.max(chatgpt, gemini);
    return { at, chatgpt, gemini, combined, totalQueries: total };
  });

  const queryTrends: QueryTrend[] = DEMO_QUERIES.map((q) => {
    const history = timeline.map((at, i) => ({ at, mentioned: mentionedAtScan(q, i) }));
    const hits = history.filter((h) => h.mentioned).length;
    const initiallyMentioned = history[0].mentioned;
    const currentlyMentioned = history[history.length - 1].mentioned;
    const movement: QueryTrend["movement"] =
      initiallyMentioned === currentlyMentioned ? "stable" : currentlyMentioned ? "gained" : "lost";
    return {
      query: q.query,
      history,
      rate: Math.round((hits / history.length) * 100),
      currentlyMentioned,
      initiallyMentioned,
      movement,
    };
  });

  const first = series[0];
  const last = series[series.length - 1];
  return {
    summary: {
      scans: series.length,
      days: WINDOW_DAYS,
      current: { chatgpt: last.chatgpt, gemini: last.gemini, combined: last.combined },
      delta: {
        chatgpt: last.chatgpt - first.chatgpt,
        gemini: last.gemini - first.gemini,
        combined: last.combined - first.combined,
      },
      queriesGained: queryTrends.filter((q) => q.movement === "gained").length,
      queriesLost: queryTrends.filter((q) => q.movement === "lost").length,
    },
    series,
    queryTrends,
  };
}

const DEMO_ARTICLES = [
  {
    articleId: "demo-art-1",
    query: "best 3 BHK apartments in Gachibowli under 2 crore",
    title: "The Honest Guide to 3 BHK Apartments in Gachibowli Under ₹2 Cr",
    daysAgo: 32,
    publishUrl: "https://example.com/gachibowli-3bhk-guide",
    pre: false,
    post: true,
    recentClicks: 412,
    baselineClicks: 90,
  },
  {
    articleId: "demo-art-2",
    query: "RERA approved builders in Hyderabad with possession 2026",
    title: "RERA-Verified Hyderabad Builders Delivering in 2026",
    daysAgo: 28,
    publishUrl: "https://example.com/rera-hyderabad-2026",
    pre: false,
    post: true,
    recentClicks: 287,
    baselineClicks: 41,
  },
  {
    articleId: "demo-art-3",
    query: "luxury villa projects in Whitefield Bangalore",
    title: "Whitefield Luxury Villa Projects: A Buyer's Walk-Through",
    daysAgo: 22,
    publishUrl: "https://example.com/whitefield-villas",
    pre: false,
    post: true,
    recentClicks: 198,
    baselineClicks: 22,
  },
  {
    articleId: "demo-art-4",
    query: "ready to move flats Kondapur 2 BHK",
    title: "Move-In Ready 2 BHK Apartments in Kondapur",
    daysAgo: 18,
    publishUrl: "https://example.com/kondapur-2bhk",
    pre: false,
    post: true,
    recentClicks: 145,
    baselineClicks: 18,
  },
  {
    articleId: "demo-art-5",
    query: "premium gated community Sarjapur Road price per sqft",
    title: "Sarjapur Road Premium Communities: 2026 Price Benchmark",
    daysAgo: 12,
    publishUrl: "https://example.com/sarjapur-pricing",
    pre: false,
    post: true,
    recentClicks: 89,
    baselineClicks: 12,
  },
  {
    articleId: "demo-art-6",
    query: "investment property near Bangalore airport ROI",
    title: "Bangalore Airport Belt: ROI Math for 2026 Buyers",
    daysAgo: 110,
    publishUrl: "https://example.com/blr-airport-roi",
    pre: true,
    post: true,
    recentClicks: 41,
    baselineClicks: 188,
  },
];

export function demoAttributions(): {
  attributions: Array<{
    articleId: string;
    query: string;
    title: string | null;
    publishedAt: string;
    daysSincePublish: number;
    pre: { chatgpt: boolean; gemini: boolean; combined: boolean; capturedAt: string } | null;
    post: { chatgpt: boolean; gemini: boolean; combined: boolean; capturedAt: string } | null;
    outcome: "lifted" | "stable_mentioned" | "stable_absent" | "regressed" | "no_data";
  }>;
  summary: {
    total: number;
    lifted: number;
    regressed: number;
    stableMentioned: number;
    stableAbsent: number;
    noData: number;
  };
} {
  const now = Date.now();
  const attributions = DEMO_ARTICLES.map((a) => {
    const publishedAt = new Date(now - a.daysAgo * DAY_MS).toISOString();
    const preCaptured = new Date(now - (a.daysAgo + 7) * DAY_MS).toISOString();
    const postCaptured = new Date(now - 2 * DAY_MS).toISOString();
    const outcome: "lifted" | "stable_mentioned" | "stable_absent" | "regressed" =
      !a.pre && a.post ? "lifted" : a.pre && !a.post ? "regressed" : a.post ? "stable_mentioned" : "stable_absent";
    return {
      articleId: a.articleId,
      query: a.query,
      title: a.title,
      publishedAt,
      daysSincePublish: a.daysAgo,
      pre: { chatgpt: a.pre, gemini: a.pre, combined: a.pre, capturedAt: preCaptured },
      post: { chatgpt: a.post, gemini: a.post, combined: a.post, capturedAt: postCaptured },
      outcome,
    };
  });

  // Add one regressed item to show the negative case in the demo
  attributions[attributions.length - 1].outcome = "regressed";
  attributions[attributions.length - 1].pre = {
    chatgpt: true,
    gemini: true,
    combined: true,
    capturedAt: new Date(now - 117 * DAY_MS).toISOString(),
  };
  attributions[attributions.length - 1].post = {
    chatgpt: false,
    gemini: false,
    combined: false,
    capturedAt: new Date(now - 2 * DAY_MS).toISOString(),
  };

  return {
    attributions,
    summary: {
      total: attributions.length,
      lifted: attributions.filter((a) => a.outcome === "lifted").length,
      regressed: attributions.filter((a) => a.outcome === "regressed").length,
      stableMentioned: attributions.filter((a) => a.outcome === "stable_mentioned").length,
      stableAbsent: attributions.filter((a) => a.outcome === "stable_absent").length,
      noData: 0,
    },
  };
}

export function demoFreshness(): {
  articles: Array<{
    articleId: string;
    query: string;
    title: string | null;
    publishedAt: string;
    publishUrl: string | null;
    daysSincePublish: number;
    ageScore: number;
    decayScore: number | null;
    clickDecayPct: number | null;
    recentClicks: number | null;
    baselineClicks: number | null;
    freshness: number;
    needsRefresh: boolean;
    reason: string;
  }>;
  summary: {
    total: number;
    refreshNeeded: number;
    avgFreshness: number;
    gscConnected: boolean;
  };
} {
  const now = Date.now();
  const articles = DEMO_ARTICLES.map((a) => {
    const publishedAt = new Date(now - a.daysAgo * DAY_MS).toISOString();
    const ageScore = Math.max(0, Math.min(100, Math.round(100 - a.daysAgo * 0.5)));
    const clickDecayPct =
      a.baselineClicks > 0
        ? Math.max(0, Math.round(((a.baselineClicks - a.recentClicks) / a.baselineClicks) * 100))
        : 0;
    const decayScore = Math.max(0, Math.min(100, Math.round(100 - clickDecayPct * 1.5)));
    const freshness = Math.round((ageScore + decayScore) / 2);
    const needsRefresh = freshness < 40;
    const reason =
      freshness >= 70
        ? "Fresh — no action needed"
        : clickDecayPct >= 30
          ? `Clicks down ${clickDecayPct}% from baseline · ${a.daysAgo}d old`
          : a.daysAgo >= 90
            ? `${a.daysAgo}d since publish — content likely stale`
            : a.daysAgo >= 60
              ? `${a.daysAgo}d old — refresh to keep ranking`
              : `Score ${freshness} — refresh recommended`;
    return {
      articleId: a.articleId,
      query: a.query,
      title: a.title,
      publishedAt,
      publishUrl: a.publishUrl,
      daysSincePublish: a.daysAgo,
      ageScore,
      decayScore,
      clickDecayPct,
      recentClicks: a.recentClicks,
      baselineClicks: a.baselineClicks,
      freshness,
      needsRefresh,
      reason,
    };
  }).sort((a, b) => a.freshness - b.freshness);

  return {
    articles,
    summary: {
      total: articles.length,
      refreshNeeded: articles.filter((a) => a.needsRefresh).length,
      avgFreshness: articles.length
        ? Math.round(articles.reduce((acc, a) => acc + a.freshness, 0) / articles.length)
        : 0,
      gscConnected: true,
    },
  };
}
