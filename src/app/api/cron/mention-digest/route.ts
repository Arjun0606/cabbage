import { NextResponse, type NextRequest } from "next/server";
import {
  buildDigests,
  renderDigestSubject,
  renderDigestHtml,
  renderDigestText,
} from "@/lib/email/digest";
import { sendEmail } from "@/lib/email/resend";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET /api/cron/mention-digest
 *
 * Scheduled Mondays 14:00 UTC (one hour after the refresh-mentions
 * cron at 09:00 UTC, so the digest reads from the freshly-populated
 * brand_mentions table).
 *
 * Auth via the global CRON_SECRET. If RESEND_API_KEY/RESEND_FROM
 * aren't set, sendEmail() returns { skipped: true } so the cron is
 * safe to schedule before the email vendor is wired up — useful for
 * confirming the digest builder works in prod before flipping the
 * switch.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const digests = await buildDigests();
  if (digests.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ email: string; error: string }> = [];

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

  return NextResponse.json({
    ok: true,
    digestsBuilt: digests.length,
    sent,
    skipped,
    failed,
    errors,
  });
}
