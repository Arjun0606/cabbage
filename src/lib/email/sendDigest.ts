/**
 * Weekly digest email — body builder + send wrapper.
 *
 * Built around Resend because it's the cleanest serverless email option
 * and ships transactional volume on a paid Indian SaaS without surprises.
 * If RESEND_API_KEY isn't set, sendDigest() returns ok=false with a
 * skipped flag so the cron can no-op gracefully — useful during
 * pre-launch when we want the digest infra in place but no actual
 * sends going out.
 */

interface DigestPayload {
  toEmail: string;
  toName?: string;
  brandName: string;
  weekStart: string;
  weekEnd: string;
  // Headline metrics for the week
  mentionRate: { current: number | null; deltaWoW: number | null };
  citations: { week: number; cumulative: number };
  articlesPublished: number;
  scansRun: number;
  // Three things to celebrate, three things to action
  wins: string[];
  actions: Array<{ label: string; url: string }>;
  // Single CTA at the bottom
  dashboardUrl: string;
  reportUrl?: string;
}

export interface SendResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  id?: string;
}

function html(payload: DigestPayload): string {
  const fmtPct = (n: number | null | undefined) => (n == null ? "—" : `${n}%`);
  const arrow = (n: number | null | undefined) => {
    if (n == null) return "";
    if (n > 0) return `<span style="color:#5a8a26;">▲ +${n}pp</span>`;
    if (n < 0) return `<span style="color:#dc2626;">▼ ${n}pp</span>`;
    return `<span style="color:#737373;">flat</span>`;
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width" />
<title>Cabbge weekly digest — ${payload.brandName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#27272a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
<tr><td style="padding:20px 24px;border-bottom:1px solid #f4f4f5;background:#fafafa;">
  <table role="presentation" width="100%"><tr>
    <td style="font-weight:700;letter-spacing:0.04em;color:#7CB342;font-size:13px;">CABBGE WEEKLY DIGEST</td>
    <td align="right" style="font-size:11px;color:#737373;">${payload.weekStart} → ${payload.weekEnd}</td>
  </tr></table>
</td></tr>
<tr><td style="padding:24px;">
  <h1 style="margin:0 0 4px;font-size:22px;color:#0a0a0b;">${payload.brandName}</h1>
  <div style="font-size:13px;color:#737373;margin-bottom:18px;">${payload.toName ? `Hi ${payload.toName} — ` : ""}here&apos;s how the week went.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
    <tr>
      <td width="50%" style="padding:14px;background:#fafafa;border-radius:8px;border:1px solid #e4e4e7;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#737373;font-weight:600;">AI Mention Rate</div>
        <div style="font-size:28px;font-weight:700;color:#0a0a0b;margin-top:4px;">${fmtPct(payload.mentionRate.current)}</div>
        <div style="font-size:11px;color:#737373;margin-top:2px;">${arrow(payload.mentionRate.deltaWoW)} <span style="color:#737373;">vs last week</span></div>
      </td>
      <td width="6"></td>
      <td width="50%" style="padding:14px;background:#fafafa;border-radius:8px;border:1px solid #e4e4e7;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#737373;font-weight:600;">AI Citations</div>
        <div style="font-size:28px;font-weight:700;color:#0a0a0b;margin-top:4px;">${payload.citations.week}</div>
        <div style="font-size:11px;color:#737373;margin-top:2px;">${payload.citations.cumulative.toLocaleString("en-IN")} cumulative</div>
      </td>
    </tr>
    <tr><td colspan="3" style="height:8px;"></td></tr>
    <tr>
      <td width="50%" style="padding:14px;background:#fafafa;border-radius:8px;border:1px solid #e4e4e7;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#737373;font-weight:600;">Articles Published</div>
        <div style="font-size:28px;font-weight:700;color:#0a0a0b;margin-top:4px;">${payload.articlesPublished}</div>
        <div style="font-size:11px;color:#737373;margin-top:2px;">this week</div>
      </td>
      <td width="6"></td>
      <td width="50%" style="padding:14px;background:#fafafa;border-radius:8px;border:1px solid #e4e4e7;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#737373;font-weight:600;">Scans Run</div>
        <div style="font-size:28px;font-weight:700;color:#0a0a0b;margin-top:4px;">${payload.scansRun}</div>
        <div style="font-size:11px;color:#737373;margin-top:2px;">this week</div>
      </td>
    </tr>
  </table>

  ${payload.wins.length > 0 ? `
  <div style="margin-bottom:20px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#737373;font-weight:600;margin-bottom:8px;">3 wins this week</div>
    <ul style="margin:0;padding:0;list-style:none;">
      ${payload.wins.slice(0, 3).map((w) => `<li style="padding:6px 0;border-bottom:1px solid #f4f4f5;font-size:13px;color:#0a0a0b;">✓ ${w}</li>`).join("")}
    </ul>
  </div>` : ""}

  ${payload.actions.length > 0 ? `
  <div style="margin-bottom:20px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#737373;font-weight:600;margin-bottom:8px;">Do this week</div>
    <ul style="margin:0;padding:0;list-style:none;">
      ${payload.actions.slice(0, 3).map((a) => `<li style="padding:6px 0;border-bottom:1px solid #f4f4f5;font-size:13px;"><a href="${a.url}" style="color:#5a8a26;text-decoration:none;">→ ${a.label}</a></li>`).join("")}
    </ul>
  </div>` : ""}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
    <tr>
      <td><a href="${payload.dashboardUrl}" style="display:inline-block;padding:11px 18px;background:#7CB342;color:#0a0a0b;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;">Open dashboard</a></td>
      ${payload.reportUrl ? `<td style="padding-left:8px;"><a href="${payload.reportUrl}" style="display:inline-block;padding:11px 18px;background:#fafafa;color:#27272a;border:1px solid #e4e4e7;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">CEO report</a></td>` : ""}
    </tr>
  </table>
</td></tr>
<tr><td style="padding:14px 24px;background:#fafafa;border-top:1px solid #f4f4f5;font-size:11px;color:#737373;">
  Cabbge — AI marketing platform for Indian residential real estate. <a href="${payload.dashboardUrl}/settings" style="color:#737373;">Manage email preferences</a>.
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export async function sendDigest(payload: DigestPayload): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Cabbge <digest@cabbge.com>";
  if (!apiKey) {
    return { ok: false, skipped: true, reason: "RESEND_API_KEY not set" };
  }
  if (!payload.toEmail || !payload.toEmail.includes("@")) {
    return { ok: false, skipped: true, reason: "no recipient email" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: payload.toEmail,
        subject: `${payload.brandName} — your Cabbge weekly digest (${payload.weekStart})`,
        html: html(payload),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, reason: `Resend ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = await res.json();
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "send failed" };
  }
}
