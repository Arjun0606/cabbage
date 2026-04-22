import { NextRequest, NextResponse } from "next/server";

/**
 * Demo mode password auth. Sets a cookie so the sales user doesn't
 * have to re-enter the password every time.
 *
 * Set DEMO_PASSWORD in Vercel env vars.
 */
export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.DEMO_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { error: "Demo mode not configured. Set DEMO_PASSWORD env var." },
      { status: 503 }
    );
  }

  if (!password || password !== expected) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  // 24-hour auth cookie. httpOnly — a single XSS anywhere would otherwise
  // exfiltrate a password-equivalent. Client reads demo state via
  // GET /api/demo/status instead of reading the cookie directly.
  res.cookies.set("cabbge_demo_auth", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  return res;
}

export async function GET(req: NextRequest) {
  // Status endpoint: lets the /demo page know whether the user has
  // already entered the password, without exposing the cookie to JS.
  const authed = req.cookies.get("cabbge_demo_auth")?.value === "1";
  return NextResponse.json({ authenticated: authed });
}
