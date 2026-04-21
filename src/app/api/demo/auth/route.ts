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
  // 24-hour auth cookie so the salesperson doesn't re-enter between demos
  res.cookies.set("cabbge_demo_auth", "1", {
    httpOnly: false, // readable by client so it knows auth state
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  return res;
}
