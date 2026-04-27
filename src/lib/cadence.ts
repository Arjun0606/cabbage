import { getServiceClient } from "@/lib/db/supabase";

/**
 * Server-side scan-cadence enforcement.
 *
 * Pricing claims "Weekly full scan" vs "Daily full scan" — those are
 * tier guarantees, not just marketing copy. This helper checks the most
 * recent scan of a given type for a company and rejects re-scans within
 * the tier's window.
 *
 * Demo mode and unbilled callers bypass — pricing pages, sales calls,
 * and CI must always succeed.
 */

const WINDOW_MS: Record<"weekly" | "daily", number> = {
  weekly: 7 * 24 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
};

/**
 * Returns ok=true when a scan can run, or ok=false with the next-allowed
 * timestamp + a hint string the API can pass to the client. Cron-driven
 * scans that arrive on schedule never trip this gate (they fire at the
 * boundary, not within it).
 */
export async function canRunScan(
  companyId: string | null | undefined,
  scanType: "audit" | "technical" | "ai_visibility" | "backlinks" | "review_monitor",
  cadence: "weekly" | "daily",
): Promise<{ ok: true } | { ok: false; nextAllowedAt: string; hint: string }> {
  if (!companyId) return { ok: true };

  try {
    const db = getServiceClient();
    const { data, error } = await db
      .from("scan_history")
      .select("created_at")
      .eq("company_id", companyId)
      .eq("scan_type", scanType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data?.created_at) return { ok: true };

    const last = new Date(data.created_at).getTime();
    const elapsed = Date.now() - last;
    const window = WINDOW_MS[cadence];
    if (elapsed >= window) return { ok: true };

    const nextAllowed = new Date(last + window);
    const hoursLeft = Math.ceil((window - elapsed) / (60 * 60 * 1000));
    return {
      ok: false,
      nextAllowedAt: nextAllowed.toISOString(),
      hint:
        cadence === "weekly"
          ? `Your plan includes weekly ${scanType.replace(/_/g, " ")} scans. Next scan available in ${hoursLeft > 24 ? Math.ceil(hoursLeft / 24) + " day(s)" : hoursLeft + " hour(s)"}. Upgrade to Growth for daily scans.`
          : `${scanType.replace(/_/g, " ")} ran in the last ${cadence === "daily" ? "24 hours" : "window"}. Next scan available in ${hoursLeft} hour(s).`,
    };
  } catch {
    // On any infra error, allow — never block a customer because of our DB.
    return { ok: true };
  }
}
