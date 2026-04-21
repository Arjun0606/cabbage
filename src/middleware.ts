import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/db/supabase-middleware";

/**
 * Security + auth middleware.
 * 1. Security headers (XSS, clickjacking, MIME sniffing, etc.)
 * 2. API rate limiting (per company cookie, fallback IP)
 * 3. Cron endpoint protection
 * 4. Supabase session refresh on every request
 * 5. Auth guards for protected routes (/dashboard, /settings, /onboarding)
 */

// ---------- Rate Limiting ----------

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX_API = 30;
const RATE_LIMIT_MAX_FREE = 5;

function getRateLimitKey(req: NextRequest): string {
  const companyId = req.cookies.get("cabbge_company_id")?.value;
  if (companyId && companyId.length > 5) return `co:${companyId}`;
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
  if (entry.count >= max) return { allowed: false, remaining: 0 };
  entry.count++;
  return { allowed: true, remaining: max - entry.count };
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }, 5 * 60 * 1000);
}

// Protected routes that require authentication
const PROTECTED_PATHS = ["/dashboard", "/settings", "/onboarding"];
// Routes that signed-in users should not see (auto-redirect to dashboard)
const GUEST_ONLY_PATHS = ["/signin", "/signup"];
// When the demo cookie is set, protected routes are unlocked (sales team pitching)
const DEMO_COOKIE = "cabbge_demo";

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.perplexity.ai https://generativelanguage.googleapis.com https://www.googleapis.com https://accounts.google.com https://oauth2.googleapis.com https://lsapi.seomoz.com https://public-api.wordpress.com https://api.webflow.com https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://checkout.razorpay.com;"
  );
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip Supabase session refresh for static assets, auth callbacks, and the public loader
  const skipAuth = pathname.startsWith("/_next")
    || pathname.startsWith("/api/schema-loader")
    || pathname.startsWith("/api/schema-deploy")
    || pathname === "/favicon.ico";

  // Refresh Supabase session (writes updated cookies onto response)
  let response: NextResponse;
  let user: { id: string; email?: string } | null = null;
  if (!skipAuth) {
    try {
      const result = await updateSession(req);
      response = result.response;
      user = result.user;
    } catch {
      response = NextResponse.next({ request: req });
    }
  } else {
    response = NextResponse.next({ request: req });
  }

  // Demo mode — sales team pitching prospects. Cookie bypasses auth +
  // paywall checks so you can show the full product with a prospect's data.
  const inDemoMode = req.cookies.get(DEMO_COOKIE)?.value === "1";

  // Protected routes — redirect to signin if not authenticated (unless in demo)
  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isProtected && !user && !inDemoMode) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("next", pathname);
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  // Guest-only routes — redirect to dashboard if already signed in (demo mode is NOT a session)
  const isGuestOnly = GUEST_ONLY_PATHS.includes(pathname);
  if (isGuestOnly && user && !inDemoMode) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  // Cron endpoint protection
  if (pathname === "/api/cron/scan") {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // API rate limiting
  if (pathname.startsWith("/api/")) {
    const ip = getRateLimitKey(req);
    const isFreeReport = pathname === "/api/free-report" || pathname === "/api/grader";
    const max = isFreeReport ? RATE_LIMIT_MAX_FREE : RATE_LIMIT_MAX_API;
    const limitKey = isFreeReport ? `free:${ip}` : `api:${ip}`;

    const { allowed, remaining } = checkRateLimit(limitKey, max);

    response.headers.set("X-RateLimit-Limit", max.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());

    if (!allowed) {
      return applySecurityHeaders(NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment." },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Limit": max.toString(),
            "X-RateLimit-Remaining": "0",
          },
        }
      ));
    }
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
