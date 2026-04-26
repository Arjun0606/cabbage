import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { isDemoRequest } from "@/lib/demo";
import { scoreBrandContext } from "@/lib/brandContext";

/**
 * Brand context score.
 *
 * Reads the customer's stored brand context fields and returns a
 * completeness score + which fields are missing. The dashboard widget
 * surfaces this prominently because completion directly drives article
 * quality — empty context = generic articles = churn risk.
 */

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
    // Demo: pretend the prospect filled most fields so the widget shows
    // a believable "85% complete" state without polluting prod data.
    return NextResponse.json(
      scoreBrandContext({
        productInfo:
          "Premium real estate developer focused on Hyderabad and Bangalore. 14 active projects across 3 BHK apartments, luxury villas, and gated communities. Target buyer: 35–55 yr old families upgrading from 2BHK + NRI investors looking for ready-to-move stock.",
        brandVoice:
          "Confident, premium-but-grounded. Specific over generic. We say 'RERA registered with possession Q2 2027' not 'soon'. Avoid superlatives like 'world-class' and 'state-of-the-art'.",
        vision: "Build the most trusted brand in South India real estate by being radically transparent about timelines and price.",
        targetAudience: "First-time premium buyers (₹1.5–3 cr), NRI investors (US/UAE), upgrade buyers from 2 BHK to 3 BHK.",
        competitorAnalysis: "Aparna competes on locations + amenities. Prestige on prestige + luxury. We win on transparency and on-time delivery — both have been independently verified.",
        values: "Transparency, on-time delivery, customer-first.",
      })
    );
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

  const db = getServiceClient();
  const { data } = await db
    .from("companies")
    .select("product_info, brand_voice, vision, values, target_audience, marketing_strategy, competitor_analysis")
    .eq("id", companyId)
    .maybeSingle();

  const score = scoreBrandContext({
    productInfo: data?.product_info as string | undefined,
    brandVoice: data?.brand_voice as string | undefined,
    vision: data?.vision as string | undefined,
    values: data?.values as string | undefined,
    targetAudience: data?.target_audience as string | undefined,
    marketingStrategy: data?.marketing_strategy as string | undefined,
    competitorAnalysis: data?.competitor_analysis as string | undefined,
  });

  return NextResponse.json(score);
}
