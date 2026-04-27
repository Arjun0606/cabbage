export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { requireActiveSubscription } from "@/lib/db/supabase-server";
import { getServiceClient } from "@/lib/db/supabase";
import { enqueueArticles, listJobs, jobCounts, deleteJob } from "@/lib/articleQueue";

/**
 * Article job queue — bulk autonomous article generation.
 *
 *  POST   /api/article-queue           enqueue list of queries
 *  GET    /api/article-queue?companyId=...   list jobs + counts
 *  DELETE /api/article-queue?id=...&companyId=... drop a job
 *
 * Demo mode is rejected — bulk generation only makes sense for paid
 * customers writing to a real Supabase row. The /demo flow already
 * shows the per-article writer working on click.
 */

async function ownsCompany(userId: string, companyId: string): Promise<boolean> {
  const svc = getServiceClient();
  const { data } = await svc
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_id", userId)
    .maybeSingle();
  return !!data;
}

export async function POST(req: NextRequest) {
  try {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    if (gate.plan === "demo") {
      return NextResponse.json({ error: "Bulk article generation is not available in demo mode" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({} as any));
    const companyId = typeof body?.companyId === "string" ? body.companyId : null;
    const items = Array.isArray(body?.items) ? body.items : null;
    if (!companyId || !items) {
      return NextResponse.json({ error: "companyId and items[] are required" }, { status: 400 });
    }
    if (items.length > 200) {
      return NextResponse.json(
        { error: "Maximum 200 items per enqueue. Split into multiple calls if needed." },
        { status: 400 }
      );
    }
    if (!(await ownsCompany(gate.userId, companyId))) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Validate item shape — query is required, the rest is optional.
    const cleaned = items
      .filter((it: any) => it && typeof it === "object" && typeof it.query === "string")
      .map((it: any) => ({
        query: String(it.query).trim().slice(0, 300),
        articleType: typeof it.articleType === "string" ? it.articleType : null,
        priority: typeof it.priority === "number" ? Math.max(0, Math.min(100, it.priority)) : 0,
      }))
      .filter((it: { query: string }) => it.query.length >= 4);

    const { inserted } = await enqueueArticles(companyId, cleaned);
    const counts = await jobCounts(companyId);
    return NextResponse.json({ inserted, counts });
  } catch (error) {
    console.error("article-queue POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Enqueue failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    if (gate.plan === "demo") {
      return NextResponse.json({ jobs: [], counts: { queued: 0, writing: 0, done: 0, failed: 0, capped: 0 } });
    }

    const companyId = req.nextUrl.searchParams.get("companyId");
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }
    if (!(await ownsCompany(gate.userId, companyId))) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    const [jobs, counts] = await Promise.all([
      listJobs(companyId),
      jobCounts(companyId),
    ]);
    return NextResponse.json({ jobs, counts });
  } catch (error) {
    console.error("article-queue GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Read failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    if (gate.plan === "demo") {
      return NextResponse.json({ ok: true });
    }

    const id = req.nextUrl.searchParams.get("id");
    const companyId = req.nextUrl.searchParams.get("companyId");
    if (!id || !companyId) {
      return NextResponse.json({ error: "id and companyId are required" }, { status: 400 });
    }
    if (!(await ownsCompany(gate.userId, companyId))) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    const ok = await deleteJob(companyId, id);
    return NextResponse.json({ ok });
  } catch (error) {
    console.error("article-queue DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
