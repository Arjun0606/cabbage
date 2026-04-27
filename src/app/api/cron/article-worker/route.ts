export const runtime = "nodejs";
export const maxDuration = 300;
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import {
  claimNext,
  markDone,
  markFailed,
  markCapped,
  markNeedsBrandContext,
} from "@/lib/articleQueue";
import { TIERS, isPaidTier, type PlanTier } from "@/lib/tiers";

/**
 * Bulk article worker — runs autonomously off the article_jobs queue.
 *
 * The customer pumps queries into article_jobs from the dashboard
 * (ContentQueue's "Auto-write all" button or any per-row enqueue).
 * This cron drains the queue, generating each article via the same
 * /api/article-writer logic that the manual button uses.
 *
 * Scheduling: every 30 minutes (configured in vercel.json). Each tick
 * processes up to PER_COMPANY_PER_TICK queued items per active paid
 * customer, respecting their plan's articlesPerMonth cap. Failed
 * generations get marked 'failed' with the error reason; quota-blocked
 * ones get marked 'capped' so the UI can distinguish.
 *
 * Why per-customer fan-out instead of round-robin: at peak, three Scale
 * customers each need ~7 articles/day. PER_COMPANY_PER_TICK = 3 ×
 * 48 ticks/day = 144 articles/day/customer max — comfortably ahead of
 * the 200/month cap. The articlesPerMonth gate at the
 * /api/article-writer route is the hard ceiling.
 */

const PER_COMPANY_PER_TICK = 3;

interface CompanyContext {
  id: string;
  name: string;
  website: string;
  city: string;
  description: string;
  documents: any;
  ownerId: string;
}

async function fetchCompanyContext(companyId: string): Promise<CompanyContext | null> {
  const svc = getServiceClient();
  const { data } = await svc
    .from("companies")
    .select("id, owner_id, name, website, city, description, documents")
    .eq("id", companyId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name || "",
    website: data.website || "",
    city: data.city || "",
    description: data.description || "",
    documents: data.documents || {},
    ownerId: data.owner_id || "",
  };
}

async function fetchProjects(companyId: string) {
  const svc = getServiceClient();
  const { data } = await svc
    .from("projects")
    .select("name, location, configurations, price_range, rera_number, amenities, status")
    .eq("company_id", companyId);
  return data || [];
}

async function articlesUsedThisMonth(companyId: string): Promise<number> {
  const svc = getServiceClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { count } = await svc
    .from("tracked_articles")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("generated_at", startOfMonth.toISOString());
  return count ?? 0;
}

async function ownerPlan(ownerId: string): Promise<PlanTier | null> {
  const svc = getServiceClient();
  const { data } = await svc
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", ownerId)
    .maybeSingle();
  if (!data || data.status !== "active" || !isPaidTier(data.plan)) return null;
  return data.plan as PlanTier;
}

async function generateOne(
  origin: string,
  ctx: CompanyContext,
  projects: Array<{ name: string; location: string | null; configurations: string | null; price_range: string | null; rera_number: string | null; amenities: string | null; status: string | null }>,
  query: string,
  articleType: string,
): Promise<{ articleId: string | null; raw: any }> {
  // Self-call /api/article-writer with the same shape the dashboard
  // uses for runGeoFixForQuery. We don't have a session cookie in cron
  // context, so we authenticate via the cron-secret bearer token (the
  // article-writer route accepts it as an alt-auth path — see below).
  const docs = ctx.documents || {};

  // Pick the most relevant project for this query (locality match wins;
  // otherwise first project). Lets the article writer ground per-project
  // rather than always defaulting to the brand-level shape.
  let projectMatch = projects[0] || null;
  const qLower = query.toLowerCase();
  for (const p of projects) {
    const loc = (p.location || "").toLowerCase();
    const name = (p.name || "").toLowerCase();
    if (name && qLower.includes(name)) { projectMatch = p; break; }
    if (loc && qLower.includes(loc.split(",")[0]?.trim() || "")) { projectMatch = p; break; }
  }

  // Field names mirror what the dashboard's runGeoFixForQuery sends.
  // The article-writer route requires projectName / location / city.
  // When no specific project matched the query, fall back to brand-level
  // context (project name = developer name, location = primary city).
  const payload = {
    topic: query,
    targetKeyword: query,
    articleType,
    companyId: ctx.id,
    projectName: projectMatch?.name || ctx.name,
    developerName: ctx.name,
    city: ctx.city,
    location: projectMatch?.location || ctx.city,
    configurations: projectMatch?.configurations || "",
    priceRange: projectMatch?.price_range || "",
    usps: ctx.description || "",
    reraNumber: projectMatch?.rera_number || "",
    amenities: projectMatch?.amenities || "",
    status: projectMatch?.status || "",
    brandVoice: docs.brandVoice || "",
    productInfo: docs.productInfo || "",
    competitorAnalysis: docs.competitorAnalysis || "",
    brandContext: {
      vision: docs.brandVision || "",
      values: docs.brandValues || "",
      targetAudience: docs.targetAudience || "",
      marketingStrategy: docs.marketingStrategy || "",
      competitorAnalysis: docs.competitorAnalysis || "",
    },
    industry: "real_estate",
  };

  const res = await fetch(`${origin}/api/article-writer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
      "x-cron-actor": ctx.ownerId,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Brand-context rejection has a specific 412 status + flag from
    // the article-writer route. Re-throw with a marker so the caller
    // can route this job to needs_brand_context, not failed.
    if (res.status === 412 && data?.needsBrandContext) {
      const err: Error & { needsBrandContext?: boolean } = new Error(
        typeof data?.hint === "string" ? data.hint : "Brand context incomplete",
      );
      err.needsBrandContext = true;
      throw err;
    }
    const reason = typeof data?.error === "string" ? data.error : `HTTP ${res.status}`;
    throw new Error(reason);
  }

  // article-writer also writes to tracked_articles via the dashboard's
  // trackArticleGenerated helper, but that helper runs client-side. The
  // cron path needs to persist the draft itself so the queue UI can
  // deep-link to the generated draft.
  const svc = getServiceClient();
  const { data: tracked } = await svc
    .from("tracked_articles")
    .insert({
      company_id: ctx.id,
      query,
      title: data.title || query,
      content: data.content || "",
      status: "draft",
      generated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  return { articleId: tracked?.id ?? null, raw: data };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = req.nextUrl.origin;
  const svc = getServiceClient();

  // Stuck-job recovery. If a previous worker tick crashed mid-generate
  // (process killed, network blip mid-OpenAI-call, the function timed
  // out), the article ends up parked in 'writing' status forever
  // because claimNext only ever picks up 'queued'. Sweep any job that's
  // been 'writing' for more than 15 minutes back to 'queued' so the
  // current tick can retry. Article generation should never legitimately
  // take that long.
  const STUCK_WRITING_MS = 15 * 60_000;
  const stuckCutoff = new Date(Date.now() - STUCK_WRITING_MS).toISOString();
  await svc
    .from("article_jobs")
    .update({ status: "queued", started_at: null })
    .eq("status", "writing")
    .lt("started_at", stuckCutoff);

  // Find every company that has at least one queued job. Limit to 50
  // companies per tick — at PER_COMPANY_PER_TICK = 3 articles each,
  // that's 150 article generations per tick. With per-article cost in
  // the 30-90s range this fits the 5-min function timeout when run in
  // parallel (Promise.all per company).
  const { data: companiesWithJobs } = await svc
    .from("article_jobs")
    .select("company_id")
    .eq("status", "queued")
    .limit(500);
  const distinctCompanies = Array.from(new Set((companiesWithJobs || []).map((r) => r.company_id))).slice(0, 50);

  const summary: Array<{
    companyId: string;
    plan: string | null;
    monthlyCap: number | null;
    used: number;
    processed: number;
    failed: number;
    capped: number;
    blockedBrandContext?: number;
  }> = [];

  for (const companyId of distinctCompanies) {
    const ctx = await fetchCompanyContext(companyId);
    if (!ctx) continue;
    const plan = await ownerPlan(ctx.ownerId);
    if (!plan) {
      // Owner not on an active paid plan — leave their jobs in queue.
      // When they reactivate, the worker picks them up.
      summary.push({ companyId, plan: null, monthlyCap: null, used: 0, processed: 0, failed: 0, capped: 0 });
      continue;
    }

    const monthlyCap = TIERS[plan].limits.articlesPerMonth;
    const used = await articlesUsedThisMonth(companyId);
    const remaining = Math.max(0, monthlyCap - used);

    if (remaining === 0) {
      // Cap reached — claim what would have run and mark them
      // 'capped' so the UI shows quota-blocked rather than agent-down.
      const claimed = await claimNext(companyId, PER_COMPANY_PER_TICK);
      for (const job of claimed) await markCapped(job.id);
      summary.push({ companyId, plan, monthlyCap, used, processed: 0, failed: 0, capped: claimed.length });
      continue;
    }

    const claimed = await claimNext(companyId, Math.min(PER_COMPANY_PER_TICK, remaining));
    if (claimed.length === 0) {
      summary.push({ companyId, plan, monthlyCap, used, processed: 0, failed: 0, capped: 0 });
      continue;
    }

    const projects = await fetchProjects(companyId);

    let processed = 0;
    let failed = 0;
    let blockedBrandContext = 0;
    // Sequential per company to respect the article-writer's own
    // per-call rate limits (OpenAI gpt-4 + web_search). Fan-out across
    // companies is fine; fan-out within one company will fight the
    // /api/article-writer 4xx rate limit.
    for (let i = 0; i < claimed.length; i++) {
      const job = claimed[i];
      try {
        const articleType = job.articleType || "locality_guide";
        const { articleId } = await generateOne(origin, ctx, projects, job.query, articleType);
        await markDone(job.id, articleId);
        processed += 1;
      } catch (err) {
        const e = err as Error & { needsBrandContext?: boolean };
        if (e?.needsBrandContext) {
          // Brand-context gate rejected the article-writer call. Every
          // other claimed job for this company would hit the same gate
          // (brand context applies to the whole company, not per-job),
          // so mark THIS job AND the rest of the claimed batch as
          // needs_brand_context. Without this, the un-iterated jobs
          // would sit in 'writing' status forever — claimNext only
          // picks up 'queued'.
          const reason = e.message || "Brand context incomplete";
          await markNeedsBrandContext(job.id, reason);
          blockedBrandContext += 1;
          for (let j = i + 1; j < claimed.length; j++) {
            await markNeedsBrandContext(claimed[j].id, reason);
            blockedBrandContext += 1;
          }
          break;
        }
        await markFailed(job.id, e?.message || "unknown error");
        failed += 1;
      }
    }

    summary.push({ companyId, plan, monthlyCap, used, processed, failed, capped: 0, blockedBrandContext });
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), summary });
}
