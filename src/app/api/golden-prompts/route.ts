import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { isDemoRequest } from "@/lib/demo";
import { loadVolatilityFromDb } from "@/lib/agents/volatility";

/**
 * Golden prompts — user-locked buyer queries tracked on every scan.
 *
 * Universal cap of 100 across every paid tier. Per the volume-only
 * pricing model, golden prompts aren't a feature gate — saving a query
 * to a list has no per-tier COGS. The actual scan cost (running each
 * prompt through ChatGPT/Gemini) is metered via the credit pool, which
 * is what naturally varies between tiers.
 *
 * Demo mode returns a stub response so the UI still renders; demo-mode
 * pinning lives client-side in localStorage.
 */

const MAX_GOLDEN_PROMPTS = 100;

export async function GET(req: NextRequest) {
  if (isDemoRequest(req)) {
    return NextResponse.json({ prompts: [], volatility: [], demo: true });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const db = getServiceClient();

  // Confirm the company belongs to this user.
  const { data: company } = await db
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const [{ data: prompts }, volatility] = await Promise.all([
    db
      .from("golden_prompts")
      .select("query, pinned_at")
      .eq("company_id", companyId)
      .order("pinned_at", { ascending: true }),
    loadVolatilityFromDb(db, companyId, { limit: 10 }),
  ]);

  return NextResponse.json({
    prompts: prompts || [],
    volatility,
  });
}

export async function POST(req: NextRequest) {
  if (isDemoRequest(req)) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { companyId, query } = await req.json();
  if (!companyId || !query) {
    return NextResponse.json({ error: "companyId and query are required" }, { status: 400 });
  }
  const cleaned = String(query).trim();
  if (cleaned.length < 4 || cleaned.length > 300) {
    return NextResponse.json({ error: "Query must be 4-300 characters" }, { status: 400 });
  }

  const db = getServiceClient();

  const { data: company } = await db
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const { count } = await db
    .from("golden_prompts")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if ((count ?? 0) >= MAX_GOLDEN_PROMPTS) {
    return NextResponse.json(
      { error: `At most ${MAX_GOLDEN_PROMPTS} golden prompts per company. Unpin one first.` },
      { status: 400 }
    );
  }

  const { error } = await db
    .from("golden_prompts")
    .upsert(
      { company_id: companyId, query: cleaned, pinned_at: new Date().toISOString() },
      { onConflict: "company_id,query", ignoreDuplicates: true }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (isDemoRequest(req)) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const companyId = req.nextUrl.searchParams.get("companyId");
  const query = req.nextUrl.searchParams.get("query");
  if (!companyId || !query) {
    return NextResponse.json({ error: "companyId and query are required" }, { status: 400 });
  }

  const db = getServiceClient();

  const { data: company } = await db
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const { error } = await db
    .from("golden_prompts")
    .delete()
    .eq("company_id", companyId)
    .eq("query", query);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
