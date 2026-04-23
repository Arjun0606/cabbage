import { NextRequest, NextResponse } from "next/server";
import { fetchInfraNewsForLocalities } from "@/lib/agents/infraNews";
import { requireActiveSubscription } from "@/lib/db/supabase-server";
import { enforceCredits } from "@/lib/credits";

/**
 * POST /api/infra-news
 *
 * Body: { localities: [{ city, locality }], companyId? }
 * Returns: { items: InfraItem[] }
 *
 * Surfaces metro / road / airport / IT-park / employer announcements
 * per locality via the ChatGPT web_search tool. Server-side cache is
 * 24h per (city, locality) pair. Used by the Content queue to seed
 * infrastructure-themed content opportunities.
 */
export async function POST(req: NextRequest) {
  try {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;

    const body = await req.json();
    const { localities, companyId } = body;

    if (!Array.isArray(localities) || localities.length === 0) {
      return NextResponse.json(
        { error: "localities[] is required (array of { city, locality })" },
        { status: 400 }
      );
    }

    await enforceCredits(companyId, "brand_presence");

    const clean = localities
      .map((l: any) => ({
        city: typeof l?.city === "string" ? l.city.trim() : "",
        locality: typeof l?.locality === "string" ? l.locality.trim() : "",
      }))
      .filter((l) => l.city && l.locality)
      .slice(0, 10);

    const items = await fetchInfraNewsForLocalities(clean);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("infra-news error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Infrastructure news lookup failed",
      },
      { status: 500 }
    );
  }
}
