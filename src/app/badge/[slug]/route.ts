import { lookupGrade } from "@/lib/agents/grader";

export const runtime = "nodejs";

/**
 * GET /badge/[slug].svg
 *
 * SVG score badge. Heavy CDN caching since the underlying grade is
 * already cached 7 days; no need to re-render per request. Goes
 * wherever customers paste the embed code; every embed = a backlink
 * + a brand impression.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug
    .replace(/\.svg$/i, "")
    .replace(/^www\./, "")
    .toLowerCase();

  const grade = await lookupGrade(slug).catch(() => null);
  const score = grade?.scores.overall ?? null;
  const brand = grade?.brand ?? slug;
  const barColor =
    score == null
      ? "#52525b"
      : score >= 70
        ? "#10b981"
        : score >= 40
          ? "#f59e0b"
          : "#ef4444";
  const scoreLabel = score == null ? "—" : String(score);
  const brandShort =
    brand.length > 14 ? brand.slice(0, 13) + "…" : brand;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="40" viewBox="0 0 240 40" role="img" aria-label="AI visibility ${scoreLabel} for ${brand} by cabbge">
  <title>${escapeXml(brand)} · AI visibility ${scoreLabel}/100 by cabbge</title>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#18181b"/>
      <stop offset="1" stop-color="#09090b"/>
    </linearGradient>
  </defs>
  <rect width="240" height="40" rx="6" fill="url(#g)"/>
  <rect x="160" width="80" height="40" rx="0" fill="${barColor}"/>
  <rect x="160" width="80" height="40" fill="#000" opacity="0.18"/>
  <path d="M160 0 L160 40" stroke="#000" stroke-opacity="0.35"/>
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#fafafa">
    <text x="14" y="17" font-weight="600" letter-spacing="0.5">AI VISIBILITY</text>
    <text x="14" y="32" fill="#a1a1aa" font-size="10">${escapeXml(brandShort)} · cabbge</text>
  </g>
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill="#0a0a0b" text-anchor="middle">
    <text x="200" y="26" font-size="20" font-weight="700">${scoreLabel}</text>
  </g>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
