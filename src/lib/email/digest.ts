/**
 * Monday digest builder — the recurring value email.
 *
 * Every paid subscriber gets one of these every Monday. It's the
 * "what does $99/mo actually buy?" answer:
 *
 *   1. Score this week + delta vs last week (per engine).
 *   2. Last week's drift alerts (engine drops > 5).
 *   3. Top 3 fixes to ship this week, ranked by impact.
 *   4. New mentions across Reddit / HN / YouTube / X — top 3.
 *   5. Per-brand summary if user tracks multiple.
 *
 * Designed to read in 90 seconds in a phone preview pane. No charts.
 * No images. Plain inline-styled HTML that renders cleanly in iOS
 * Mail and Gmail without any build-time dep.
 */
import { getServiceClient } from "@/lib/db/supabase";
import type { Mention, MentionSource } from "@/lib/agents/mentions";
import { lookupGrade } from "@/lib/agents/grader";
import { buildPlaybook, type PlaybookAction } from "@/lib/agents/playbook";
import { gradeToScan } from "@/lib/outreach";

export interface BrandDigest {
  brandSlug: string;
  displayName: string;
  /** Latest overall score from public_grades. */
  scoreOverall: number | null;
  /** 7-day-prior overall score from score_history (null if first week). */
  scorePrev: number | null;
  /** Per-engine score breakdown. */
  scoresByEngine: Partial<Record<EngineKey, number>>;
  /** Top 3 fixes from the per-engine playbook. */
  topFixes: PlaybookAction[];
  /** Drift alerts surfaced in the past 7 days. */
  alerts: Array<{ engine: string; delta: number; prev: number; curr: number }>;
  /** New mentions in the past 7 days, top 3. */
  mentionTotal: number;
  mentionsBySource: Record<MentionSource, number>;
  topMentions: Mention[];
}

type EngineKey = "chatgpt" | "gemini" | "perplexity" | "claude" | "grok";

export interface UserDigest {
  userId: string;
  email: string;
  brands: BrandDigest[];
}

const SOURCE_LABEL: Record<MentionSource, string> = {
  reddit: "Reddit",
  hackernews: "HN",
  youtube: "YouTube",
  x: "X",
};

const ENGINE_LABEL: Record<EngineKey, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  perplexity: "Perplexity",
  claude: "Claude",
  grok: "Grok",
};

const baseUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://cabbge.com";

export interface BuildDigestsOptions {
  /** Lookback window. 7d for Monday recap, 24h for daily push. */
  windowMs?: number;
  /**
   * If true, skip users whose digests are completely empty
   * (no score delta, no alerts, no mentions). Used by the daily
   * cron — we don't email "nothing happened" every morning. The
   * Monday recap sends unconditionally so people still get the
   * weekly score even when it's flat.
   */
  onlyIfChanged?: boolean;
}

/**
 * Aggregate per-user digests over a configurable lookback window.
 *
 * Two callers today:
 *   - cron/digest-daily   → windowMs: 24h, onlyIfChanged: true
 *                           (alert-style; only fires on real moves)
 *   - cron/mention-digest → windowMs: 7d,  onlyIfChanged: false
 *                           (Monday recap; sends every week)
 */
export async function buildDigests(
  opts: BuildDigestsOptions = {},
): Promise<UserDigest[]> {
  const svc = getServiceClient();
  const windowMs = opts.windowMs ?? 7 * 24 * 60 * 60 * 1000;
  const sinceDate = new Date(Date.now() - windowMs);
  const since = sinceDate.toISOString();
  const onlyIfChanged = opts.onlyIfChanged ?? false;

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

  // user_id → email
  const userIds = Array.from(new Set(trackedRows.map((r) => r.user_id)));
  const emails = new Map<string, string>();
  for (const uid of userIds) {
    const { data } = await svc.auth.admin.getUserById(uid);
    if (data?.user?.email) emails.set(uid, data.user.email);
  }

  const slugs = Array.from(new Set(trackedRows.map((r) => r.brand_slug)));

  // 1. Mentions in past 7d.
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

  // 2. Drift alerts in past 7d.
  const { data: rawAlerts } = await svc
    .from("drift_alerts")
    .select("brand_slug, engine, prev_score, curr_score, delta, severity")
    .in("brand_slug", slugs)
    .gte("detected_at", since);
  const alertsBySlug = new Map<
    string,
    Array<{ engine: string; delta: number; prev: number; curr: number }>
  >();
  for (const a of (rawAlerts || []) as Array<{
    brand_slug: string;
    engine: string;
    prev_score: number;
    curr_score: number;
    delta: number;
  }>) {
    const list = alertsBySlug.get(a.brand_slug) || [];
    list.push({
      engine: a.engine,
      delta: a.delta,
      prev: a.prev_score,
      curr: a.curr_score,
    });
    alertsBySlug.set(a.brand_slug, list);
  }

  // 3. Score history — 7-day-prior overall for delta.
  const { data: rawHistory } = await svc
    .from("score_history")
    .select("brand_slug, scanned_at, scores")
    .in("brand_slug", slugs)
    .lte("scanned_at", since)
    .order("scanned_at", { ascending: false });
  const prevScoreBySlug = new Map<string, number>();
  for (const h of (rawHistory || []) as Array<{
    brand_slug: string;
    scores: { overall?: number };
  }>) {
    if (!prevScoreBySlug.has(h.brand_slug) && typeof h.scores?.overall === "number") {
      prevScoreBySlug.set(h.brand_slug, h.scores.overall);
    }
  }

  // 4. Per-brand assembly.
  const byUser = new Map<string, BrandDigest[]>();
  for (const row of trackedRows) {
    const grade = await lookupGrade(row.brand_slug).catch(() => null);
    const all = mentionsBySlug.get(row.brand_slug) || [];
    const counts: Record<MentionSource, number> = {
      reddit: 0,
      hackernews: 0,
      youtube: 0,
      x: 0,
    };
    for (const m of all) counts[m.source] = (counts[m.source] || 0) + 1;

    const scoresByEngine: Partial<Record<EngineKey, number>> = {};
    if (grade) {
      for (const k of [
        "chatgpt",
        "gemini",
        "perplexity",
        "claude",
        "grok",
      ] as const) {
        const v = grade.scores[k];
        if (typeof v === "number") scoresByEngine[k] = v;
      }
    }

    let topFixes: PlaybookAction[] = [];
    if (grade) {
      try {
        topFixes = buildPlaybook(gradeToScan(grade), grade.brand).slice(0, 3);
      } catch {
        topFixes = [];
      }
    }

    const brand: BrandDigest = {
      brandSlug: row.brand_slug,
      displayName: row.display_name || grade?.brand || row.brand_slug.split(".")[0],
      scoreOverall: grade?.scores.overall ?? null,
      scorePrev: prevScoreBySlug.get(row.brand_slug) ?? null,
      scoresByEngine,
      topFixes,
      alerts: alertsBySlug.get(row.brand_slug) || [],
      mentionTotal: all.length,
      mentionsBySource: counts,
      topMentions: all.slice(0, 3),
    };
    const list = byUser.get(row.user_id) || [];
    list.push(brand);
    byUser.set(row.user_id, list);
  }

  const digests: UserDigest[] = [];
  for (const [uid, brands] of byUser.entries()) {
    const email = emails.get(uid);
    if (!email) continue;
    if (brands.length === 0) continue;

    if (onlyIfChanged) {
      // Skip users where nothing notable happened in the window.
      // "Notable" = at least one brand has alerts, mentions, or a
      // delta >= 2. Keeps the daily cron quiet when it should be.
      const hasNews = brands.some((b) => {
        if (b.alerts.length > 0) return true;
        if (b.mentionTotal > 0) return true;
        if (
          b.scoreOverall !== null &&
          b.scorePrev !== null &&
          Math.abs(b.scoreOverall - b.scorePrev) >= 2
        )
          return true;
        return false;
      });
      if (!hasNews) continue;
    }

    digests.push({ userId: uid, email, brands });
  }
  return digests;
}

export function renderDigestSubject(digest: UserDigest): string {
  const b = digest.brands[0];
  if (digest.brands.length === 1 && b.scoreOverall !== null) {
    if (b.scorePrev !== null) {
      const delta = b.scoreOverall - b.scorePrev;
      const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "·";
      return `${b.displayName} · score ${b.scoreOverall} ${arrow}${Math.abs(delta)} this week`;
    }
    return `${b.displayName} · ${b.scoreOverall}/100 this week`;
  }
  const total = digest.brands.length;
  return `Cabbge · ${total} brand${total === 1 ? "" : "s"} this week`;
}

export function renderDigestHtml(digest: UserDigest): string {
  const url = baseUrl();
  const blocks = digest.brands.map((b) => renderBrandBlock(b, url)).join("");
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Cabbge Monday digest</title></head>
<body style="margin:0;padding:0;background:#000000;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 20px;">
    <div style="padding-bottom:16px;border-bottom:1px solid #2a2a2a;display:flex;justify-content:space-between;align-items:center;">
      <a href="${url}" style="color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:-0.02em;">CABBGE</a>
      <span style="color:#71717a;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;">Monday digest</span>
    </div>
    ${blocks}
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #2a2a2a;font-size:11px;color:#52525b;">
      Sent because you have weekly notifications on. <a href="${url}/dashboard" style="color:#7CB342;text-decoration:none;">Open dashboard</a> · <a href="${url}/dashboard/mentions" style="color:#7CB342;text-decoration:none;">manage notifications</a>.
    </div>
  </div>
</body>
</html>`;
}

function renderBrandBlock(b: BrandDigest, url: string): string {
  // ---------- score header ----------
  const scoreNow =
    b.scoreOverall !== null ? `<span style="color:${scoreColor(b.scoreOverall)};font-weight:700;font-size:42px;letter-spacing:-0.04em;line-height:1;">${b.scoreOverall}</span>` : "—";
  let delta = "";
  if (b.scoreOverall !== null && b.scorePrev !== null) {
    const d = b.scoreOverall - b.scorePrev;
    if (d !== 0) {
      const sign = d > 0 ? "+" : "";
      const col = d > 0 ? "#7CB342" : "#fb7185";
      delta = `<span style="color:${col};font-size:13px;margin-left:8px;font-variant-numeric:tabular-nums;">${sign}${d} from last week</span>`;
    } else {
      delta = `<span style="color:#71717a;font-size:13px;margin-left:8px;">flat from last week</span>`;
    }
  }

  // ---------- per-engine row ----------
  const engineCells = (
    Object.entries(b.scoresByEngine) as Array<[EngineKey, number]>
  )
    .map(
      ([k, v]) => `
    <td style="padding:8px 6px;border:1px solid #2a2a2a;text-align:center;">
      <div style="font-size:9px;letter-spacing:0.2em;color:#71717a;text-transform:uppercase;font-weight:600;">${ENGINE_LABEL[k]}</div>
      <div style="font-size:18px;font-weight:700;color:${scoreColor(v)};font-variant-numeric:tabular-nums;margin-top:4px;">${v}</div>
    </td>`,
    )
    .join("");
  const engineRow = engineCells
    ? `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:14px;border-collapse:collapse;"><tr>${engineCells}</tr></table>`
    : "";

  // ---------- alerts ----------
  let alertsBlock = "";
  if (b.alerts.length > 0) {
    const items = b.alerts
      .map(
        (a) =>
          `<li style="padding:6px 0;font-size:12px;color:#fb7185;">${a.engine.toUpperCase()} dropped ${a.prev} → ${a.curr} (${a.delta})</li>`,
      )
      .join("");
    alertsBlock = `<div style="margin-top:18px;padding:12px;border:1px solid #5b1f2a;background:#1a0a0e;">
      <div style="font-size:10px;letter-spacing:0.25em;color:#fb7185;text-transform:uppercase;font-weight:600;">⚠ Drift alerts</div>
      <ul style="margin:6px 0 0;padding-left:18px;color:#fb7185;">${items}</ul>
    </div>`;
  }

  // ---------- top 3 fixes ----------
  let fixesBlock = "";
  if (b.topFixes.length > 0) {
    const items = b.topFixes
      .map(
        (a, i) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #1f1f22;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
            <span style="font-size:9px;color:#71717a;font-family:Menlo,Monaco,monospace;">/0${i + 1}</span>
            <span style="font-size:9px;letter-spacing:0.2em;background:#7CB342;color:#000;padding:2px 6px;font-weight:700;text-transform:uppercase;">${a.engine}</span>
            <span style="font-size:9px;letter-spacing:0.2em;border:1px solid ${a.priority === "high" ? "#fb7185" : a.priority === "medium" ? "#fbbf24" : "#52525b"};color:${a.priority === "high" ? "#fb7185" : a.priority === "medium" ? "#fbbf24" : "#a1a1aa"};padding:2px 6px;font-weight:700;text-transform:uppercase;">${a.priority}</span>
          </div>
          <div style="font-size:14px;font-weight:600;color:#fafafa;line-height:1.3;">${escapeHtml(a.title)}</div>
          <div style="font-size:12px;color:#a1a1aa;line-height:1.5;margin-top:6px;">${escapeHtml(a.rationale.slice(0, 280))}</div>
          ${a.estimatedLift ? `<div style="font-size:10px;color:#7CB342;margin-top:6px;letter-spacing:0.15em;text-transform:uppercase;">▲ Lift: ${escapeHtml(a.estimatedLift)}</div>` : ""}
        </td>
      </tr>`,
      )
      .join("");
    fixesBlock = `<div style="margin-top:24px;">
      <div style="font-size:10px;letter-spacing:0.25em;color:#7CB342;text-transform:uppercase;font-weight:600;margin-bottom:6px;">§ Ship this week</div>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">${items}</table>
      <a href="${url}/visibility/${b.brandSlug}" style="display:inline-block;margin-top:14px;font-size:12px;color:#7CB342;text-decoration:none;letter-spacing:0.1em;">Open full playbook + paste-ready artifacts →</a>
    </div>`;
  }

  // ---------- mentions ----------
  let mentionsBlock = "";
  if (b.mentionTotal > 0) {
    const items = b.topMentions
      .map(
        (m) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1f1f22;">
            <div style="font-size:9px;color:#71717a;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;margin-bottom:2px;">${SOURCE_LABEL[m.source]}${m.author ? ` · ${escapeHtml(m.author)}` : ""}</div>
            <a href="${escapeAttr(m.url)}" style="color:#fafafa;text-decoration:none;font-size:13px;font-weight:500;line-height:1.4;">${escapeHtml((m.title || m.url).slice(0, 120))}</a>
          </td>
        </tr>`,
      )
      .join("");
    const counts = (
      Object.entries(b.mentionsBySource) as Array<[MentionSource, number]>
    )
      .filter(([, n]) => n > 0)
      .map(([s, n]) => `${SOURCE_LABEL[s]} ${n}`)
      .join(" · ");
    mentionsBlock = `<div style="margin-top:24px;">
      <div style="font-size:10px;letter-spacing:0.25em;color:#71717a;text-transform:uppercase;font-weight:600;margin-bottom:6px;">§ Mentions · ${b.mentionTotal} new · ${counts}</div>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">${items}</table>
      <a href="${url}/dashboard/mentions" style="display:inline-block;margin-top:10px;font-size:12px;color:#7CB342;text-decoration:none;">View all →</a>
    </div>`;
  }

  return `
  <div style="margin:24px 0;padding:18px;border:1px solid #2a2a2a;background:#0a0a0a;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
      <div>
        <div style="font-size:10px;color:#7CB342;letter-spacing:0.25em;text-transform:uppercase;font-weight:600;">Brand</div>
        <h2 style="font-size:22px;color:#ffffff;margin:4px 0 0;font-weight:700;letter-spacing:-0.02em;">${escapeHtml(b.displayName)}</h2>
        <div style="font-family:Menlo,Monaco,monospace;font-size:11px;color:#71717a;margin-top:4px;">${escapeHtml(b.brandSlug)}</div>
      </div>
      <div style="text-align:right;">${scoreNow}${delta}</div>
    </div>
    ${engineRow}
    ${alertsBlock}
    ${fixesBlock}
    ${mentionsBlock}
  </div>`;
}

function scoreColor(n: number): string {
  if (n >= 70) return "#34d399";
  if (n >= 40) return "#fbbf24";
  return "#fb7185";
}

export function renderDigestText(digest: UserDigest): string {
  const url = baseUrl();
  const lines: string[] = [];
  lines.push(`CABBGE — Monday digest`);
  lines.push("");
  for (const b of digest.brands) {
    const arrow =
      b.scoreOverall !== null && b.scorePrev !== null
        ? ` (${b.scoreOverall - b.scorePrev > 0 ? "+" : ""}${b.scoreOverall - b.scorePrev} from last week)`
        : "";
    lines.push(`## ${b.displayName} — ${b.scoreOverall ?? "—"}/100${arrow}`);
    lines.push("");
    if (b.alerts.length > 0) {
      lines.push(`⚠ Drift alerts:`);
      for (const a of b.alerts) {
        lines.push(`  · ${a.engine.toUpperCase()} ${a.prev} → ${a.curr} (${a.delta})`);
      }
      lines.push("");
    }
    if (b.topFixes.length > 0) {
      lines.push(`Ship this week:`);
      b.topFixes.forEach((a, i) => {
        lines.push(`  /0${i + 1} [${a.priority.toUpperCase()}] [${a.engine}] ${a.title}`);
        lines.push(`       ${a.rationale.slice(0, 200)}`);
      });
      lines.push(`  Open: ${url}/visibility/${b.brandSlug}`);
      lines.push("");
    }
    if (b.mentionTotal > 0) {
      lines.push(`Mentions (${b.mentionTotal} new):`);
      for (const m of b.topMentions) {
        lines.push(`  [${SOURCE_LABEL[m.source]}] ${m.title || m.url}`);
        lines.push(`     ${m.url}`);
      }
      lines.push("");
    }
  }
  lines.push(`Open dashboard: ${url}/dashboard`);
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
