/**
 * WhatsApp broker broadcast providers.
 *
 * Indian RE developers send broker packs via AiSensy or Interakt —
 * both WhatsApp Business API wrappers. This module hides the provider
 * differences behind a single `sendBroadcast` function.
 *
 * Important: outbound WhatsApp Business marketing requires a pre-approved
 * template on the provider. We support two modes:
 *  1. "campaign" (AiSensy): user has a campaign set up on AiSensy;
 *     we trigger it with recipient list + template variables.
 *  2. "template" (Interakt): user supplies the template name + language;
 *     we pass body variables.
 *
 * The generated Channel Partner WhatsApp text flows in as the single
 * `bodyText` variable — the customer's approved template must have
 * one body parameter to receive it.
 */

export type BroadcastProvider = "aisensy" | "interakt";

export interface BroadcastCredentials {
  provider: BroadcastProvider;
  apiKey: string;
  campaignName?: string; // AiSensy
  templateName?: string; // Interakt
  templateLanguage?: string; // Interakt (default: "en")
  sourceName?: string; // Optional label on AiSensy
}

export interface BroadcastResult {
  recipient: string;
  sent: boolean;
  error?: string;
}

function normalizePhone(p: string): string | null {
  // Expects a number that resolves to E.164 (countryCode + number).
  // Accepts "+91 98765 43210", "9198765...", "98765...". Defaults to +91
  // (India) when the country code looks absent.
  const digits = p.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

async function sendAiSensy(
  creds: BroadcastCredentials,
  recipient: string,
  bodyText: string
): Promise<BroadcastResult> {
  if (!creds.campaignName) {
    return { recipient, sent: false, error: "AiSensy campaignName missing" };
  }
  try {
    const res = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: creds.apiKey,
        campaignName: creds.campaignName,
        destination: recipient,
        userName: creds.sourceName || "Cabbge",
        templateParams: [bodyText.slice(0, 1024)],
        source: "cabbge",
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { recipient, sent: false, error: text.slice(0, 200) };
    }
    return { recipient, sent: true };
  } catch (err) {
    return { recipient, sent: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

async function sendInterakt(
  creds: BroadcastCredentials,
  recipient: string,
  bodyText: string
): Promise<BroadcastResult> {
  if (!creds.templateName) {
    return { recipient, sent: false, error: "Interakt templateName missing" };
  }
  try {
    // Interakt wants countryCode + phoneNumber separately.
    const countryCode = recipient.startsWith("91") ? "91" : recipient.slice(0, 2);
    const phoneNumber = recipient.slice(countryCode.length);
    const res = await fetch("https://api.interakt.ai/v1/public/message/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${creds.apiKey}`,
      },
      body: JSON.stringify({
        countryCode,
        phoneNumber,
        callbackData: "cabbge-broadcast",
        type: "Template",
        template: {
          name: creds.templateName,
          languageCode: creds.templateLanguage || "en",
          bodyValues: [bodyText.slice(0, 1024)],
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { recipient, sent: false, error: text.slice(0, 200) };
    }
    return { recipient, sent: true };
  } catch (err) {
    return { recipient, sent: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function sendBroadcast(
  creds: BroadcastCredentials,
  recipients: string[],
  bodyText: string
): Promise<{ sent: number; failed: number; results: BroadcastResult[] }> {
  const cleaned = recipients
    .map((r) => normalizePhone(r))
    .filter((r): r is string => !!r);

  // Cap batch size — providers rate-limit. 100 is comfortable.
  const batch = cleaned.slice(0, 100);

  const results: BroadcastResult[] = [];
  for (const r of batch) {
    const result =
      creds.provider === "aisensy"
        ? await sendAiSensy(creds, r, bodyText)
        : await sendInterakt(creds, r, bodyText);
    results.push(result);
  }

  return {
    sent: results.filter((r) => r.sent).length,
    failed: results.filter((r) => !r.sent).length,
    results,
  };
}

export function requiredFieldsFor(provider: BroadcastProvider): string[] {
  if (provider === "aisensy") return ["apiKey", "campaignName"];
  return ["apiKey", "templateName"];
}
