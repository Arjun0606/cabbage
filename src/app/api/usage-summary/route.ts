import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser, requireActiveSubscription } from "@/lib/db/supabase-server";
import { TIERS, type PlanTier } from "@/lib/tiers";
import { isDemoRequest } from "@/lib/demo";

/**
 * Usage Summary.
 *
 * Returns this calendar month's article usage vs the active plan's cap,
 * plus a forecast: "at current pace you hit the cap by Tuesday". Drives
 * the upgrade nudge — Starter customers running hot should feel it.
 *
 * Forecast math: linear extrapolation from articles-so-far over
 * days-elapsed. Naive but honest; if the actual pace is bursty the
 * forecast is conservative.
 */

interface UsageResponse {
  plan: PlanTier | "trial" | "demo";
  planLabel: string;
  articlesUsed: number;
  articlesCap: number;
  daysElapsed: number;
  daysInMonth: number;
  paceForecast: number;
  forecastExceedsCap: boolean;
  daysUntilCapHit: number | null;
  nextTier: PlanTier | null;
  nextTierLabel: string | null;
  nextTierCap: number | null;
  nextTierPriceInr: number | null;
}

const TIER_ORDER: PlanTier[] = ["starter", "pro", "scale"];

function nextTier(current: PlanTier | "trial" | "demo"): PlanTier | null {
  if (current === "demo" || current === "trial") return "pro";
  const idx = TIER_ORDER.indexOf(current);
  if (idx < 0 || idx === TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysInCurrentMonth(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function buildResponse(plan: PlanTier | "trial" | "demo", articlesUsed: number, articlesCap: number): UsageResponse {
  const dayNum = new Date().getDate();
  const totalDays = daysInCurrentMonth();
  const daysElapsed = Math.max(1, dayNum);

  const pace = articlesUsed / daysElapsed;
  const paceForecast = Math.round(pace * totalDays);
  const forecastExceedsCap = articlesCap > 0 && paceForecast > articlesCap;
  const daysUntilCapHit =
    articlesCap > 0 && pace > 0 && articlesUsed < articlesCap
      ? Math.max(0, Math.ceil((articlesCap - articlesUsed) / pace))
      : null;

  const nt = nextTier(plan);
  return {
    plan,
    planLabel:
      plan === "trial" ? "Trial" : plan === "demo" ? "Demo" : TIERS[plan].label,
    articlesUsed,
    articlesCap,
    daysElapsed,
    daysInMonth: totalDays,
    paceForecast,
    forecastExceedsCap,
    daysUntilCapHit,
    nextTier: nt,
    nextTierLabel: nt ? TIERS[nt].label : null,
    nextTierCap: nt ? TIERS[nt].limits.articlesPerMonth : null,
    nextTierPriceInr: nt ? TIERS[nt].inr : null,
  };
}

async function userOwnsCompany(userId: string, companyId: string): Promise<boolean> {
  const db = getServiceClient();
  const { data } = await db
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_id", userId)
    .maybeSingle();
  return !!data;
}

export async function GET(req: NextRequest) {
  if (isDemoRequest(req)) {
    // Demo: show a Starter customer running hot — 24/30 articles by
    // mid-month, projected to hit cap by day 22. Sales dashboard reads
    // as "you'd hit cap on Starter, Growth gives 80 articles".
    return NextResponse.json(buildResponse("starter", 24, 30));
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  if (!(await userOwnsCompany(user.id, companyId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Pull plan from subscription gate (mirrors article-writer's read).
  const gate = await requireActiveSubscription(req);
  if (!gate.ok) return gate.response;

  const db = getServiceClient();
  const { count } = await db
    .from("tracked_articles")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("generated_at", startOfMonth().toISOString());

  const plan = (gate.plan as PlanTier | "trial" | "demo") ?? "trial";
  const cap = gate.limits.articlesPerMonth;

  return NextResponse.json(buildResponse(plan, count ?? 0, cap));
}
