import { NextRequest, NextResponse } from "next/server";
import { runSiteAudit } from "@/lib/agents/siteAudit";
import { sanitizeUrl } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const { valid, url: safeUrl, error } = sanitizeUrl(url);

    if (!valid) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const result = await runSiteAudit(safeUrl);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Audit error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Audit failed" },
      { status: 500 }
    );
  }
}
