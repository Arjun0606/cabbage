import { NextRequest, NextResponse } from "next/server";
import { runTechnicalSeo } from "@/lib/agents/technicalSeo";
import { sanitizeUrl } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const { valid, url: safeUrl, error } = sanitizeUrl(url);
    if (!valid) return NextResponse.json({ error }, { status: 400 });

    const result = await runTechnicalSeo(safeUrl);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Technical SEO error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Technical SEO analysis failed" },
      { status: 500 }
    );
  }
}
