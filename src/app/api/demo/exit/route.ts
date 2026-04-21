import { NextRequest, NextResponse } from "next/server";

/**
 * Exit demo mode — clears cookies. The dashboard also wipes
 * localStorage client-side when exiting so no prospect data lingers.
 */
export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/demo", req.url), { status: 303 });
  res.cookies.set("cabbge_demo", "", { path: "/", maxAge: 0 });
  // Keep cabbge_demo_auth so salesperson doesn't re-enter password for next prospect
  return res;
}

export async function GET(req: NextRequest) {
  return POST(req);
}
