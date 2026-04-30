import { NextResponse, type NextRequest } from "next/server";
import {
  buildDigests,
  renderDigestSubject,
  renderDigestHtml,
  renderDigestText,
} from "@/lib/email/digest";
import { sendEmail } from "@/lib/email/resend";
import { getServiceClient } from "@/lib/db/supabase";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET /api/cron/digest-daily
 *
 * Daily push (08:00 UTC, one hour after daily-scan completes).
 * Sends a tight email ONLY to users where something notable
 * happened in the past 24 hours:
 *   - a brand's overall score moved by >= 2 points
 *   - any drift_alerts row was inserted (engine-level drop > 5)
 *   - new mentions surfaced on Reddit / HN / YouTube / X
 *
 * If none of those triggered, the user gets nothing. The Monday
 * weekly digest still goes out unconditionally so they always get
 * a recap once a week.
 *
 * After successful send we mark the drift_alerts as notified so
 * we don't re-send the same alert tomorrow.
 *
 * Auth: CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const digests = await buildDigests({
    windowMs: 24 * 60 * 60 * 1000,
    onlyIfChanged: true,
  });

  if (digests.length === 0) {
    return NextResponse.json({
      ok: true,
      eligible: 0,
      sent: 0,
      skipped: 0,
    });
  }

  const svc = getServiceClient();
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ email: string; error: string }> = [];
  const notifiedSlugs = new Set<string>();

  for (const d of digests) {
    const result = await sendEmail({
      to: d.email,
      subject: renderDigestSubject(d),
      html: renderDigestHtml(d),
      text: renderDigestText(d),
    });
    if (result.skipped) {
      skipped++;
      continue;
    }
    if (result.ok) {
      sent++;
      // Mark this user's brands' alerts as notified so they don't
      // keep firing every day until manually cleared.
      for (const b of d.brands) {
        if (b.alerts.length > 0) notifiedSlugs.add(b.brandSlug);
      }
    } else {
      failed++;
      if (errors.length < 10) {
        errors.push({
          email: d.email,
          error: result.error || "send failed",
        });
      }
    }
  }

  if (notifiedSlugs.size > 0) {
    await svc
      .from("drift_alerts")
      .update({ notified_at: new Date().toISOString() })
      .in("brand_slug", Array.from(notifiedSlugs))
      .is("notified_at", null);
  }

  return NextResponse.json({
    ok: true,
    eligible: digests.length,
    sent,
    skipped,
    failed,
    errors,
  });
}
