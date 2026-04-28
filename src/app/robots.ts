import type { MetadataRoute } from "next";

/**
 * robots.txt — explicitly invites the AI crawlers we want to be cited by.
 *
 * Default Next.js policy is to allow everything, but explicit > implicit
 * for AI crawlers since some operators check for an explicit allow before
 * indexing for training. Disallowed: dashboard / settings / API routes —
 * customer-data surfaces that should never be indexed.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cabbge.com";

  const aiCrawlers = [
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "Google-Extended",
    "GoogleOther",
    "anthropic-ai",
    "ClaudeBot",
    "Claude-Web",
    "PerplexityBot",
    "CCBot",
    "Applebot-Extended",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/settings", "/api/", "/auth/", "/onboarding"],
      },
      ...aiCrawlers.map((agent) => ({
        userAgent: agent,
        allow: ["/", "/about", "/pricing", "/compare", "/benchmark", "/methodology", "/llms.txt"],
        disallow: ["/dashboard", "/settings", "/api/", "/auth/", "/onboarding"],
      })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
