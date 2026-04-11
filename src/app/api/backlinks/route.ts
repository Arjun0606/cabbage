import { NextRequest, NextResponse } from "next/server";
import { runBacklinkAnalysis } from "@/lib/agents/backlinks";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const result = await runBacklinkAnalysis(url);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Backlink analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backlink analysis failed" },
      { status: 500 }
    );
  }
}
