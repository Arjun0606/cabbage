import { NextRequest, NextResponse } from "next/server";
import { requireActiveSubscription } from "@/lib/db/supabase-server";
import { enforceCredits } from "@/lib/credits";
import { runReraVerification } from "@/lib/agents/reraVerify";

/**
 * POST /api/rera-verify
 *
 * Body: { projects: Array<{name, reraNumber?, location?}>, companyId? }
 * Returns: ReraVerificationResult
 *
 * Cross-checks each project's RERA number against the relevant state
 * authority portal via grounded web search. This turns the Authority
 * card's "RERA Verified N/M" from a self-reported number into a
 * verified-by-state-portal audit with citation URLs on the state's
 * own domain.
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;

    const { projects, companyId } = await req.json();

    if (!Array.isArray(projects) || projects.length === 0) {
      return NextResponse.json(
        { error: "projects[] is required and must be non-empty" },
        { status: 400 }
      );
    }

    // Web-search heavy — up to 20 grounded lookups per run.
    await enforceCredits(companyId, "ai_visibility");

    const cleanProjects = projects
      .filter((p: any) => p && typeof p.name === "string" && p.name.trim())
      .map((p: any) => ({
        name: String(p.name).trim(),
        reraNumber: typeof p.reraNumber === "string" ? p.reraNumber.trim() : "",
        location: typeof p.location === "string" ? p.location.trim() : "",
      }));

    const result = await runReraVerification(cleanProjects);

    return NextResponse.json(result);
  } catch (error) {
    console.error("rera-verify error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "RERA verification failed" },
      { status: 500 }
    );
  }
}
