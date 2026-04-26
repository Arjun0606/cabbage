import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { isAdminEmail } from "@/lib/admin";

/**
 * Admin customer list.
 *
 * Founder/CSM view of every paying customer with the health metrics
 * that signal churn or upsell. Single query joins companies + their
 * owner + their subscription + counts of projects / articles this
 * month / latest scan / brand-context completeness.
 *
 * Strict: 401 for unauthenticated, 403 for authenticated-but-not-admin.
 */

interface CustomerRow {
  companyId: string;
  companyName: string | null;
  website: string | null;
  city: string | null;
  ownerEmail: string | null;
  plan: string | null;
  status: string | null;
  trialEndsAt: string | null;
  projectCount: number;
  competitorCount: number;
  articlesThisMonth: number;
  lastScanAt: string | null;
  daysSinceLastScan: number | null;
  latestMentionRate: number | null;
  brandContextScore: number;
  /** Synthesised: red, yellow, green based on the signals above. */
  health: "red" | "yellow" | "green";
  /** Short label so the founder can scan the column at a glance. */
  healthReason: string;
}

function startOfMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

interface CompanyRow {
  id: string;
  name?: string | null;
  website?: string | null;
  city?: string | null;
  owner_id?: string | null;
  product_info?: string | null;
  brand_voice?: string | null;
  vision?: string | null;
  values?: string | null;
  target_audience?: string | null;
  competitor_analysis?: string | null;
}

function brandContextPctFor(c: CompanyRow): number {
  // Five required fields, each weighted equally. Mirrors the gate in
  // lib/brandContext.ts but uses the row's column shape directly.
  const fields = [
    (c.product_info || "").length >= 80,
    (c.brand_voice || "").length >= 60,
    (c.vision || "").length >= 40,
    (c.target_audience || "").length >= 40,
    (c.competitor_analysis || "").length >= 40,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

function classifyHealth(row: Omit<CustomerRow, "health" | "healthReason">): {
  health: CustomerRow["health"];
  healthReason: string;
} {
  // Trial expired without subscribing → red
  if (row.status === "expired" || row.status === "canceled") {
    return { health: "red", healthReason: "Subscription " + row.status };
  }
  if (row.status === "past_due") {
    return { health: "red", healthReason: "Payment past due" };
  }
  // Brand context too low → red (won't generate articles, will churn)
  if (row.brandContextScore < 40) {
    return { health: "red", healthReason: `Brand context ${row.brandContextScore}% — articles blocked` };
  }
  // No scan in 14+ days on a paid plan → yellow (engagement dropping)
  if (row.daysSinceLastScan !== null && row.daysSinceLastScan > 14) {
    return { health: "yellow", healthReason: `${row.daysSinceLastScan}d since last scan` };
  }
  // Trial about to end, no upgrade signal → yellow (act soon)
  if (row.status === "trialing" && row.trialEndsAt) {
    const daysToTrialEnd = Math.round((new Date(row.trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysToTrialEnd <= 3 && daysToTrialEnd >= 0) {
      return { health: "yellow", healthReason: `Trial ends in ${daysToTrialEnd}d` };
    }
  }
  // Brand context patchy but not blocking → yellow
  if (row.brandContextScore < 70) {
    return { health: "yellow", healthReason: `Brand context ${row.brandContextScore}% — needs polish` };
  }
  // Otherwise → green
  return { health: "green", healthReason: "Healthy" };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getServiceClient();

  // Pull every company the system knows about. Multi-step because we
  // need cross-table aggregates and Supabase's JS client doesn't do
  // SQL joins inline as cleanly.
  const { data: companies, error: cErr } = await db
    .from("companies")
    .select("id, name, website, city, owner_id, product_info, brand_voice, vision, values, target_audience, competitor_analysis, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (cErr) {
    console.error("admin: companies fetch failed", cErr);
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }

  if (!companies || companies.length === 0) {
    return NextResponse.json({ customers: [], total: 0 });
  }

  const ownerIds = Array.from(new Set(companies.map((c) => c.owner_id).filter(Boolean) as string[]));
  const companyIds = companies.map((c) => c.id as string);

  const [
    { data: profiles },
    { data: subscriptions },
    { data: projectCounts },
    { data: competitorCounts },
    { data: articleCounts },
    { data: latestScans },
  ] = await Promise.all([
    db.from("profiles").select("id, email").in("id", ownerIds.length > 0 ? ownerIds : ["__none__"]),
    db.from("subscriptions").select("user_id, plan, status, trial_ends_at").in("user_id", ownerIds.length > 0 ? ownerIds : ["__none__"]),
    db.from("projects").select("company_id").in("company_id", companyIds),
    db.from("competitors").select("company_id").in("company_id", companyIds),
    db.from("tracked_articles").select("company_id, generated_at").in("company_id", companyIds).gte("generated_at", startOfMonthIso()),
    db.from("scan_history").select("company_id, scan_type, score, created_at, results").in("company_id", companyIds).eq("scan_type", "ai_visibility").order("created_at", { ascending: false }),
  ]);

  const profileByOwner = new Map<string, string>();
  for (const p of profiles || []) {
    if (p.id && p.email) profileByOwner.set(p.id as string, p.email as string);
  }

  const subByOwner = new Map<string, { plan: string | null; status: string | null; trial_ends_at: string | null }>();
  for (const s of subscriptions || []) {
    if (s.user_id) {
      subByOwner.set(s.user_id as string, {
        plan: (s.plan as string) || null,
        status: (s.status as string) || null,
        trial_ends_at: (s.trial_ends_at as string) || null,
      });
    }
  }

  const projectCountByCompany = new Map<string, number>();
  for (const p of projectCounts || []) {
    const id = p.company_id as string;
    projectCountByCompany.set(id, (projectCountByCompany.get(id) || 0) + 1);
  }
  const competitorCountByCompany = new Map<string, number>();
  for (const c of competitorCounts || []) {
    const id = c.company_id as string;
    competitorCountByCompany.set(id, (competitorCountByCompany.get(id) || 0) + 1);
  }
  const articleCountByCompany = new Map<string, number>();
  for (const a of articleCounts || []) {
    const id = a.company_id as string;
    articleCountByCompany.set(id, (articleCountByCompany.get(id) || 0) + 1);
  }

  // Latest scan per company (we ordered desc, so first hit per company is latest)
  const latestScanByCompany = new Map<string, { created_at: string; score: number; results: unknown }>();
  for (const s of latestScans || []) {
    const id = s.company_id as string;
    if (!latestScanByCompany.has(id)) {
      latestScanByCompany.set(id, { created_at: s.created_at as string, score: (s.score as number) ?? 0, results: s.results });
    }
  }

  const customers: CustomerRow[] = (companies as unknown as CompanyRow[]).map((c) => {
    const ownerId = c.owner_id || "";
    const sub = subByOwner.get(ownerId);
    const latestScan = latestScanByCompany.get(c.id);
    const daysSinceLastScan = latestScan
      ? Math.round((Date.now() - new Date(latestScan.created_at).getTime()) / (24 * 60 * 60 * 1000))
      : null;

    // Mention rate from latest scan = % queries where brand was mentioned
    let latestMentionRate: number | null = null;
    if (latestScan?.results) {
      const r = latestScan.results as { queryResults?: Array<{ chatgpt?: { mentioned?: boolean }; gemini?: { mentioned?: boolean } }> };
      if (Array.isArray(r.queryResults) && r.queryResults.length > 0) {
        const hits = r.queryResults.filter(
          (q) => q.chatgpt?.mentioned === true || q.gemini?.mentioned === true
        ).length;
        latestMentionRate = Math.round((hits / r.queryResults.length) * 100);
      }
    }

    const baseRow: Omit<CustomerRow, "health" | "healthReason"> = {
      companyId: c.id as string,
      companyName: (c.name as string) || null,
      website: (c.website as string) || null,
      city: (c.city as string) || null,
      ownerEmail: profileByOwner.get(ownerId) || null,
      plan: sub?.plan || null,
      status: sub?.status || null,
      trialEndsAt: sub?.trial_ends_at || null,
      projectCount: projectCountByCompany.get(c.id) || 0,
      competitorCount: competitorCountByCompany.get(c.id) || 0,
      articlesThisMonth: articleCountByCompany.get(c.id) || 0,
      lastScanAt: latestScan?.created_at || null,
      daysSinceLastScan,
      latestMentionRate,
      brandContextScore: brandContextPctFor(c),
    };
    const { health, healthReason } = classifyHealth(baseRow);
    return { ...baseRow, health, healthReason };
  });

  // Sort: red first (most urgent), then yellow, then green. Within each
  // bucket, latest signups first.
  const healthRank: Record<CustomerRow["health"], number> = { red: 0, yellow: 1, green: 2 };
  customers.sort((a, b) => {
    if (healthRank[a.health] !== healthRank[b.health]) return healthRank[a.health] - healthRank[b.health];
    return (b.lastScanAt || "").localeCompare(a.lastScanAt || "");
  });

  const summary = {
    total: customers.length,
    red: customers.filter((c) => c.health === "red").length,
    yellow: customers.filter((c) => c.health === "yellow").length,
    green: customers.filter((c) => c.health === "green").length,
    activePaying: customers.filter((c) => c.status === "active").length,
    trialing: customers.filter((c) => c.status === "trialing").length,
  };

  return NextResponse.json({ customers, summary });
}
