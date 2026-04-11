import { NextRequest, NextResponse } from "next/server";
import { runTechnicalSeo } from "@/lib/agents/technicalSeo";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const result = await runTechnicalSeo(url);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Technical SEO error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Technical SEO analysis failed" },
      { status: 500 }
    );
  }
}
