/**
 * Thin Resend wrapper. We hit the HTTP API directly with fetch
 * instead of pulling in the @resend/node SDK — one fewer dep, the
 * surface is small enough that the SDK doesn't pull its weight.
 *
 * Set RESEND_API_KEY + RESEND_FROM in env to enable. When unset, send()
 * returns { skipped: true } so the cron is safe to schedule before the
 * email vendor is wired up.
 */

export interface SendOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendResult {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
}

const ENDPOINT = "https://api.resend.com/emails";

export async function sendEmail(opts: SendOptions): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) {
    return { ok: true, skipped: true };
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        reply_to: opts.replyTo,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Resend ${res.status}: ${body.slice(0, 200)}`,
      };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
