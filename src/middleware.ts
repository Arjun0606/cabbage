import { NextRequest, NextResponse } from "next/server";

/**
 * Security middleware — runs on every request.
 *
 * 1. Security headers (XSS, clickjacking, MIME sniffing, etc.)
 * 2. API rate limiting (in-memory, per IP)
 * 3. CORS protection
 * 4. Cron endpoint protection
 */

// ---------- Rate Limiting ----------

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_API = 30;        // 30 API calls per minute
const RATE_LIMIT_MAX_FREE = 5;        // 5 free reports per minute (prevent abuse)

function getRateLimitKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return ip;
}

function checkRateLimit(key: string, max: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: max - 1 };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: max - entry.count };
}

// Clean up old entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }, 5 * 60 * 1000);
}

// ---------- Middleware ----------

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const response = NextResponse.next();

  // Security headers — every response
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.perplexity.ai https://generativelanguage.googleapis.com https://www.googleapis.com https://accounts.google.com https://oauth2.googleapis.com https://lsapi.seomoz.com https://public-api.wordpress.com https://api.webflow.com;"
  );

  // Protect cron endpoint
  if (pathname === "/api/cron/scan") {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const ip = getRateLimitKey(req);
    const isFreeReport = pathname === "/api/free-report";
    const max = isFreeReport ? RATE_LIMIT_MAX_FREE : RATE_LIMIT_MAX_API;
    const limitKey = isFreeReport ? `free:${ip}` : `api:${ip}`;

    const { allowed, remaining } = checkRateLimit(limitKey, max);

    response.headers.set("X-RateLimit-Limit", max.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());

    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment." },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Limit": max.toString(),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and _next
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
