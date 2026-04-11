import { NextRequest, NextResponse } from "next/server";
import { runBacklinkAnalysis } from "@/lib/agents/backlinks";
import { sanitizeUrl } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const { valid, url: safeUrl, error } = sanitizeUrl(url);
    if (!valid) return NextResponse.json({ error }, { status: 400 });

    const result = await runBacklinkAnalysis(safeUrl);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Backlink analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backlink analysis failed" },
      { status: 500 }
    );
  }
}
