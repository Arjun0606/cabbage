/**
 * Admin gating.
 *
 * Founder/CSM-level access to the /admin dashboard. Configured via
 * ADMIN_EMAILS env var (comma-separated). Defaults to the founder's
 * email so the gate works without any env change in dev.
 */

const DEFAULT_ADMINS = ["karjunvarma2001@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  const fromEnv = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const list = fromEnv.length > 0 ? fromEnv : DEFAULT_ADMINS.map((e) => e.toLowerCase());
  return list.includes(normalized);
}
