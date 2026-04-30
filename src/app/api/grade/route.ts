import { NextResponse } from "next/server";
import { gradeUrl } from "@/lib/agents/grader";
import { sanitizeUrl } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * POST /api/grade { url }
 *
 * Public funnel endpoint. No auth. Returns a real 5-engine
 * visibility grade in ~60s on cache miss, instant on cache hit.
 * Cache lives in public_grades, 7-day TTL per origin.
 *
 * Rate-limited at the proxy layer (free-tier bucket alongside
 * /api/grader and /api/free-report — see src/proxy.ts).
 */
export async function POST(req: Request) {
  let body: { url?: string; fresh?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { valid, url, error } = sanitizeUrl(body.url || "");
  if (!valid) {
    return NextResponse.json(
      { error: error || "Invalid URL" },
      { status: 400 },
    );
  }

  // ?fresh=1 query param OR { fresh: true } body field skips the
  // 7-day cache. Useful for QA + for the Re-scan button. Counts the
  // same against credits as a fresh scan.
  const reqUrl = new URL(req.url);
  const fresh =
    body.fresh === true || reqUrl.searchParams.get("fresh") === "1";

  try {
    const grade = await gradeUrl(url, { fresh });
    return NextResponse.json({ grade });
  } catch (err) {
    console.error("/api/grade failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Grader failed" },
      { status: 500 },
    );
  }
}
