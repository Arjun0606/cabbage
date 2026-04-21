import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/db/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/signin", req.url), { status: 303 });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
