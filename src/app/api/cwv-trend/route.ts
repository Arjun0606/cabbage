import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";

/**
 * GET /api/cwv-trend?companyId=...&limit=20
 *
 * Returns the last N audit scans from scan_history, projected down to
 * the Core Web Vitals trend points the dashboard surfaces. We track:
 *   - performance score (0..100)
 *   - LCP / FCP / TBT / CLS
 *
 * Lets the customer see whether their pages are getting faster or
 * slower over time — a real CWV regression signal, not just a one-shot
 * snapshot. AI overviews and Google search both downrank slow pages,
 * so a slow-drift trend is worth surfacing as a per-row alert before
 * it becomes a full ranking hit.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const companyId = req.nextUrl.searchParams.get("companyId");
  const limit = Math.max(2, Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") || "20", 10)));

  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const svc = getServiceClient();

  // Verify the caller actually owns this company before reading its scans.
  const { data: company } = await svc
    .from("companies")
    .select("id, owner_id")
    .eq("id", companyId)
    .maybeSingle();
  if (!company || company.owner_id !== user.id) {
    return NextResponse.json({ error: "Not authorized for this company" }, { status: 403 });
  }

  const { data, error } = await svc
    .from("scan_history")
    .select("id, scan_type, url, score, results, created_at")
    .eq("company_id", companyId)
    .eq("scan_type", "audit")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Point = {
    scannedAt: string | null;
    url: string | null;
    performance: number | null;
    lcp: number | null;
    fcp: number | null;
    tbt: number | null;
    cls: number | null;
  };

  const points: Point[] = (data || []).map((row) => {
    const r = row.results as Record<string, unknown> | null;
    const cwv = (r as any)?.coreWebVitals || (r as any)?.scores?.webVitals || {};
    const scores = (r as any)?.scores || {};
    return {
      scannedAt: row.created_at || null,
      url: row.url,
      performance: typeof scores.performance === "number" ? scores.performance : null,
      lcp: typeof cwv.lcp === "number" ? cwv.lcp : null,
      fcp: typeof cwv.fcp === "number" ? cwv.fcp : null,
      tbt: typeof cwv.tbt === "number" ? cwv.tbt : null,
      cls: typeof cwv.cls === "number" ? cwv.cls : null,
    };
  });

  // Reverse into chronological order so the UI plots oldest-to-newest.
  points.reverse();

  // Per-metric deltas — first vs last scan so the panel can render an
  // explicit "performance dropped 12 points over the last 14 days" line.
  const first = points.find((p) => p.performance !== null);
  const last = [...points].reverse().find((p) => p.performance !== null);
  const deltaPerformance =
    first && last && first.performance !== null && last.performance !== null
      ? last.performance - first.performance
      : null;

  const lcpFirst = points.find((p) => p.lcp !== null)?.lcp ?? null;
  const lcpLast = [...points].reverse().find((p) => p.lcp !== null)?.lcp ?? null;
  const deltaLcpMs = lcpFirst !== null && lcpLast !== null ? lcpLast - lcpFirst : null;

  const clsFirst = points.find((p) => p.cls !== null)?.cls ?? null;
  const clsLast = [...points].reverse().find((p) => p.cls !== null)?.cls ?? null;
  const deltaCls = clsFirst !== null && clsLast !== null ? clsLast - clsFirst : null;

  return NextResponse.json({
    points,
    deltas: {
      performance: deltaPerformance,
      lcpMs: deltaLcpMs,
      cls: deltaCls,
    },
    sampleCount: points.length,
  });
}
