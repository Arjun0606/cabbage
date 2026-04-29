import type { MetadataRoute } from "next";

/**
 * robots.txt — explicitly invites the AI crawlers we want to be
 * cited by. The 12 must-handle bots split between retrieval bots
 * (cite live to answer questions) and training bots. Both get an
 * explicit allow for our marketing surface.
 *
 * Default policy disallows /dashboard /settings /api/ /auth/
 * /onboarding — customer-data surfaces that should never be indexed.
 */
function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "https://cabbge.com"
  );
}

const PUBLIC_ALLOW = [
  "/",
  "/about",
  "/pricing",
  "/best",
  "/brands",
  "/vs",
  "/press",
  "/methodology",
  "/visibility/",
  "/badge/",
  "/og/",
  "/llms.txt",
];

const PRIVATE_DISALLOW = [
  "/dashboard",
  "/settings",
  "/api/",
  "/auth/",
  "/onboarding",
];

const RETRIEVAL_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
];

const TRAINING_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "GoogleOther",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_DISALLOW,
      },
      ...[...RETRIEVAL_BOTS, ...TRAINING_BOTS].map((agent) => ({
        userAgent: agent,
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      })),
    ],
    sitemap: `${baseUrl()}/sitemap.xml`,
    host: baseUrl(),
  };
}
