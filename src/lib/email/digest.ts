/**
 * Weekly mention digest builder.
 *
 * For every user with notify_weekly = true, walk their tracked
 * brands, pull mentions surfaced in the past 7 days, and render a
 * single email summarising activity per brand.
 *
 * The digest deliberately surfaces just the headline counts + the
 * top 3 mentions per brand, with a CTA back to /dashboard/mentions
 * for the full list. That keeps the email scannable in a phone
 * preview pane (the only place most users will read it).
 */
import { getServiceClient } from "@/lib/db/supabase";
import type { Mention, MentionSource } from "@/lib/agents/mentions";

export interface BrandDigest {
  brandSlug: string;
  displayName: string;
  total: number;
  bySource: Record<MentionSource, number>;
  top: Mention[];
}

export interface UserDigest {
  userId: string;
  email: string;
  brands: BrandDigest[];
  totalMentions: number;
}

const SOURCE_LABEL: Record<MentionSource, string> = {
  reddit: "Reddit",
  hackernews: "HN",
  youtube: "YouTube",
  x: "X",
};

/**
 * Aggregate the past 7 days of mentions per user. Only users with
 * notify_weekly = true on at least one tracked brand are returned.
 */
export async function buildDigests(): Promise<UserDigest[]> {
  const svc = getServiceClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: tracked } = await svc
    .from("tracked_brands")
    .select("user_id, brand_slug, display_name, notify_weekly")
    .eq("notify_weekly", true);

  const trackedRows = (tracked || []) as Array<{
    user_id: string;
    brand_slug: string;
    display_name: string | null;
    notify_weekly: boolean;
  }>;
  if (trackedRows.length === 0) return [];

  // Resolve user emails. auth.users isn't directly readable through
  // the JS client; the service role can though.
  const userIds = Array.from(new Set(trackedRows.map((r) => r.user_id)));
  const emails = new Map<string, string>();
  for (const uid of userIds) {
    const { data } = await svc.auth.admin.getUserById(uid);
    if (data?.user?.email) emails.set(uid, data.user.email);
  }

  // Pull recent mentions for every distinct brand_slug we care about.
  const slugs = Array.from(new Set(trackedRows.map((r) => r.brand_slug)));
  const { data: rawMentions } = await svc
    .from("brand_mentions")
    .select(
      "brand_slug, source, source_id, url, title, excerpt, author, score, comments, posted_at",
    )
    .in("brand_slug", slugs)
    .gte("posted_at", since)
    .order("posted_at", { ascending: false });

  const mentionsBySlug = new Map<string, Mention[]>();
  for (const r of (rawMentions || []) as Array<{
    brand_slug: string;
    source: string;
    source_id: string;
    url: string;
    title: string | null;
    excerpt: string | null;
    author: string | null;
    score: number | null;
    comments: number | null;
    posted_at: string | null;
  }>) {
    const m: Mention = {
      source: r.source as MentionSource,
      sourceId: r.source_id,
      url: r.url,
      title: r.title ?? undefined,
      excerpt: r.excerpt ?? undefined,
      author: r.author ?? undefined,
      score: r.score ?? 0,
      comments: r.comments ?? 0,
      postedAt: r.posted_at ?? undefined,
    };
    const list = mentionsBySlug.get(r.brand_slug) || [];
    list.push(m);
    mentionsBySlug.set(r.brand_slug, list);
  }

  // Group tracked rows by user; build a per-user digest.
  const byUser = new Map<string, BrandDigest[]>();
  for (const row of trackedRows) {
    const all = mentionsBySlug.get(row.brand_slug) || [];
    if (all.length === 0) continue;
    const counts: Record<MentionSource, number> = {
      reddit: 0,
      hackernews: 0,
      youtube: 0,
      x: 0,
    };
    for (const m of all) counts[m.source] = (counts[m.source] || 0) + 1;

    const brand: BrandDigest = {
      brandSlug: row.brand_slug,
      displayName: row.display_name || row.brand_slug.split(".")[0],
      total: all.length,
      bySource: counts,
      top: all.slice(0, 3),
    };
    const list = byUser.get(row.user_id) || [];
    list.push(brand);
    byUser.set(row.user_id, list);
  }

  const digests: UserDigest[] = [];
  for (const [uid, brands] of byUser.entries()) {
    const email = emails.get(uid);
    if (!email) continue;
    const total = brands.reduce((s, b) => s + b.total, 0);
    if (total === 0) continue;
    digests.push({ userId: uid, email, brands, totalMentions: total });
  }
  return digests;
}

const baseUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://cabbge.com";

export function renderDigestSubject(digest: UserDigest): string {
  if (digest.brands.length === 1) {
    const b = digest.brands[0];
    return `${b.total} new mention${b.total === 1 ? "" : "s"} of ${b.displayName} this week`;
  }
  return `${digest.totalMentions} new brand mentions across ${digest.brands.length} brands`;
}

export function renderDigestHtml(digest: UserDigest): string {
  const url = baseUrl();

  const brandBlocks = digest.brands
    .map((b) => {
      const counts = (
        Object.entries(b.bySource) as Array<[MentionSource, number]>
      )
        .filter(([, n]) => n > 0)
        .map(([s, n]) => `${SOURCE_LABEL[s]} ${n}`)
        .join(" · ");

      const items = b.top
        .map(
          (m) => `
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #1f1f22;">
              <div style="font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">
                ${SOURCE_LABEL[m.source]}${m.author ? ` · ${escapeHtml(m.author)}` : ""}
              </div>
              <a href="${escapeAttr(m.url)}" style="color:#e4e4e7;text-decoration:none;font-size:14px;font-weight:500;">
                ${escapeHtml(m.title || m.url)}
              </a>
              ${m.excerpt ? `<div style="color:#a1a1aa;font-size:12px;margin-top:4px;line-height:1.5;">${escapeHtml(m.excerpt.slice(0, 200))}</div>` : ""}
            </td>
          </tr>`,
        )
        .join("");

      return `
        <div style="margin:24px 0;padding:16px;background:#0e0e10;border:1px solid #27272a;border-radius:10px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <h2 style="font-size:16px;color:#fafafa;margin:0;font-weight:600;">${escapeHtml(b.displayName)}</h2>
            <span style="font-size:12px;color:#7CB342;font-variant-numeric:tabular-nums;">${b.total} new</span>
          </div>
          <div style="font-size:11px;color:#71717a;margin-top:4px;">${counts}</div>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;">
            ${items}
          </table>
          <a href="${url}/dashboard/mentions" style="display:inline-block;margin-top:8px;font-size:12px;color:#7CB342;text-decoration:none;">View all → </a>
        </div>`;
    })
    .join("");

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Cabbge weekly digest</title></head>
<body style="margin:0;padding:24px;background:#09090b;color:#e4e4e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="padding:16px 0;border-bottom:1px solid #27272a;">
      <a href="${url}" style="color:#fafafa;text-decoration:none;font-weight:600;font-size:18px;">Cabbge</a>
      <span style="color:#71717a;margin-left:8px;font-size:13px;">Weekly mention digest</span>
    </div>
    <p style="color:#a1a1aa;font-size:14px;margin-top:24px;line-height:1.6;">
      ${digest.totalMentions} new mention${digest.totalMentions === 1 ? "" : "s"} surfaced this week across ${digest.brands.length} tracked brand${digest.brands.length === 1 ? "" : "s"}.
    </p>
    ${brandBlocks}
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #27272a;font-size:11px;color:#52525b;">
      Sent because you have weekly notifications enabled on at least one tracked brand.
      <a href="${url}/dashboard/mentions" style="color:#7CB342;text-decoration:none;">Manage notifications</a>.
    </div>
  </div>
</body>
</html>`;
}

export function renderDigestText(digest: UserDigest): string {
  const url = baseUrl();
  const lines: string[] = [];
  lines.push(`Cabbge weekly digest — ${digest.totalMentions} new mentions across ${digest.brands.length} brands.`);
  lines.push("");
  for (const b of digest.brands) {
    lines.push(`## ${b.displayName} — ${b.total} new`);
    for (const m of b.top) {
      lines.push(`  [${SOURCE_LABEL[m.source]}] ${m.title || m.url}`);
      lines.push(`    ${m.url}`);
    }
    lines.push("");
  }
  lines.push(`View all: ${url}/dashboard/mentions`);
  return lines.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
