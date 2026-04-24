"use client";

/**
 * Platform mentions — specific YouTube videos and Reddit threads that
 * AI pulled from when answering buyer queries about the brand.
 *
 * ThirdPartyAuthority tells you "YouTube is 13% of your citations"; this
 * panel tells you WHICH videos and WHICH subreddits. That's the thing a
 * CMO can actually action: reach out to a specific channel that already
 * covers you to commission a deeper walkthrough, or reply to a specific
 * Reddit thread that mentioned you without context.
 *
 * YouTube is 13.4% of all AI citations and 75% of citations on
 * educational/how-to queries. Reddit is 22.9% — the single biggest
 * source AI engines trust. Surfacing these individually is where GEO
 * execution lives.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, MessageCircle, ExternalLink, Mic } from "lucide-react";

interface Citation {
  url: string;
  type?: string;
}
interface LLMResult {
  citationSources?: Citation[];
}
interface QueryResult {
  query: string;
  chatgpt?: LLMResult;
  gemini?: LLMResult;
}
interface Props {
  aiVisResult: { queryResults?: QueryResult[] } | null;
}

interface MentionHit {
  url: string;
  host: string;
  /** Stable identifier we show in the UI — channel or subreddit. */
  primary: string;
  /** Secondary snippet — video title slug, thread title slug, etc. */
  secondary?: string;
  queries: Set<string>;
  llms: Set<"ChatGPT" | "Google AI">;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

// Extract the most meaningful identifier for a YouTube URL:
//   /@channelname → channel
//   /watch?v=XXXX with preceding /channel/... → video with channel
//   /user/foo → channel
//   anything else → video id
function parseYouTube(url: string): { channel?: string; videoId?: string; videoSlug?: string } {
  try {
    const u = new URL(url);
    const path = u.pathname;
    const atMatch = /\/@([A-Za-z0-9._-]+)/.exec(path);
    if (atMatch) return { channel: `@${atMatch[1]}` };
    if (u.hostname === "youtu.be") {
      return { videoId: path.replace(/^\//, "").slice(0, 11) };
    }
    if (path === "/watch") {
      const v = u.searchParams.get("v") || "";
      return { videoId: v.slice(0, 11) };
    }
    const channelMatch = /\/channel\/([A-Za-z0-9_-]+)/.exec(path);
    if (channelMatch) return { channel: channelMatch[1] };
    const userMatch = /\/user\/([A-Za-z0-9_-]+)/.exec(path);
    if (userMatch) return { channel: userMatch[1] };
    return {};
  } catch {
    return {};
  }
}

// Reddit URL shapes:
//   /r/bangalore/comments/<id>/<slug>/  → subreddit + thread slug
//   /r/bangalore/                        → subreddit
function parseReddit(url: string): { subreddit?: string; threadSlug?: string } {
  try {
    const u = new URL(url);
    const m = /^\/r\/([A-Za-z0-9_]+)(?:\/comments\/[A-Za-z0-9]+\/([A-Za-z0-9_-]+))?/.exec(u.pathname);
    if (!m) return {};
    return {
      subreddit: `r/${m[1]}`,
      threadSlug: m[2] ? m[2].replace(/_/g, " ").slice(0, 80) : undefined,
    };
  } catch {
    return {};
  }
}

function isYouTube(host: string): boolean {
  return host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com");
}
function isReddit(host: string): boolean {
  return host === "reddit.com" || host.endsWith(".reddit.com") || host === "old.reddit.com";
}
function isPodcast(host: string): boolean {
  return /(spotify|apple\.com\/podcast|podcasts\.google|podbean|soundcloud|anchor\.fm)/.test(host);
}

export function PlatformMentions({ aiVisResult }: Props) {
  const { youtube, reddit, podcast } = useMemo(() => {
    const yt = new Map<string, MentionHit>();
    const rd = new Map<string, MentionHit>();
    const pc = new Map<string, MentionHit>();

    const results = aiVisResult?.queryResults || [];
    for (const q of results) {
      const llmPairs: Array<["ChatGPT" | "Google AI", LLMResult | undefined]> = [
        ["ChatGPT", q.chatgpt],
        ["Google AI", q.gemini],
      ];
      for (const [label, llm] of llmPairs) {
        for (const c of llm?.citationSources || []) {
          if (!c?.url) continue;
          const h = hostOf(c.url);
          if (!h) continue;

          if (isYouTube(h)) {
            const parsed = parseYouTube(c.url);
            const key = parsed.channel || parsed.videoId || c.url;
            const existing = yt.get(key) || {
              url: c.url,
              host: h,
              primary: parsed.channel || (parsed.videoId ? `video ${parsed.videoId}` : h),
              secondary: parsed.channel && parsed.videoId ? `video ${parsed.videoId}` : undefined,
              queries: new Set<string>(),
              llms: new Set<"ChatGPT" | "Google AI">(),
            };
            existing.queries.add(q.query);
            existing.llms.add(label);
            yt.set(key, existing);
          } else if (isReddit(h)) {
            const parsed = parseReddit(c.url);
            const key = parsed.subreddit && parsed.threadSlug
              ? `${parsed.subreddit}/${parsed.threadSlug}`
              : parsed.subreddit || c.url;
            const existing = rd.get(key) || {
              url: c.url,
              host: h,
              primary: parsed.subreddit || h,
              secondary: parsed.threadSlug,
              queries: new Set<string>(),
              llms: new Set<"ChatGPT" | "Google AI">(),
            };
            existing.queries.add(q.query);
            existing.llms.add(label);
            rd.set(key, existing);
          } else if (isPodcast(h)) {
            const existing = pc.get(c.url) || {
              url: c.url,
              host: h,
              primary: h,
              secondary: undefined,
              queries: new Set<string>(),
              llms: new Set<"ChatGPT" | "Google AI">(),
            };
            existing.queries.add(q.query);
            existing.llms.add(label);
            pc.set(c.url, existing);
          }
        }
      }
    }

    const sortHits = (m: Map<string, MentionHit>) =>
      Array.from(m.values()).sort((a, b) => b.queries.size - a.queries.size);

    return {
      youtube: sortHits(yt),
      reddit: sortHits(rd),
      podcast: sortHits(pc),
    };
  }, [aiVisResult]);

  // Render nothing if the scan has no YT/Reddit/podcast citations at all.
  // Quiet is better than a "0 YouTube mentions" empty card.
  if (youtube.length === 0 && reddit.length === 0 && podcast.length === 0) return null;

  const Row = ({ hit }: { hit: MentionHit }) => (
    <div className="flex items-start gap-3 px-3.5 py-2.5 hover:bg-white/[0.02] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] text-zinc-200 font-medium truncate" title={hit.primary}>
            {hit.primary}
          </span>
          {hit.secondary && (
            <span className="text-[11px] text-zinc-500 truncate" title={hit.secondary}>
              · {hit.secondary}
            </span>
          )}
          <Badge className="text-[9px] bg-zinc-800 text-zinc-400 border-0 rounded h-4 px-1 font-normal ml-auto">
            {hit.queries.size}× {hit.queries.size === 1 ? "query" : "queries"}
          </Badge>
        </div>
        <div className="text-[10px] text-zinc-500 mt-1 truncate" title={Array.from(hit.queries).join(" · ")}>
          triggered by: {Array.from(hit.queries)
            .slice(0, 2)
            .map((q) => `"${q.length > 50 ? q.slice(0, 47) + "…" : q}"`)
            .join(", ")}
          {hit.queries.size > 2 ? ` +${hit.queries.size - 2}` : ""}
        </div>
        <div className="flex items-center gap-1 mt-1">
          {Array.from(hit.llms).map((l) => (
            <Badge key={l} className="text-[9px] bg-zinc-800/80 text-zinc-500 border-0 rounded h-4 px-1 font-normal">
              {l}
            </Badge>
          ))}
        </div>
      </div>
      <a
        href={hit.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] text-[#7CB342] hover:underline flex items-center gap-1 flex-shrink-0 mt-0.5"
      >
        Open <ExternalLink size={10} />
      </a>
    </div>
  );

  return (
    <Card className="bg-zinc-900/60 border-white/[0.06] rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
          <Video size={15} className="text-zinc-400" />
          Platform-specific mentions
          <Badge className="text-[10px] bg-zinc-800 text-zinc-500 border-0 rounded-md h-5 px-1.5 ml-auto">
            {youtube.length + reddit.length + podcast.length} sources
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Specific channels, subreddits, and threads AI cited when answering buyer queries about your brand. YouTube is cited on 75% of educational queries; Reddit is the single biggest source AI engines trust (22.9% of citations). These are the outreach targets that compound fastest.
        </p>

        {youtube.length > 0 && (
          <div className="rounded-lg border border-white/[0.04] overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-zinc-800/40">
              <Video size={13} className="text-red-400" />
              <span className="text-[12px] font-semibold text-zinc-200">YouTube</span>
              <Badge className="text-[10px] bg-red-500/10 text-red-400 border-0 rounded-md h-5 px-1.5 ml-auto">
                {youtube.length} {youtube.length === 1 ? "channel" : "channels/videos"}
              </Badge>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {youtube.slice(0, 10).map((hit, i) => <Row key={i} hit={hit} />)}
            </div>
          </div>
        )}

        {reddit.length > 0 && (
          <div className="rounded-lg border border-white/[0.04] overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-zinc-800/40">
              <MessageCircle size={13} className="text-orange-400" />
              <span className="text-[12px] font-semibold text-zinc-200">Reddit</span>
              <Badge className="text-[10px] bg-orange-500/10 text-orange-400 border-0 rounded-md h-5 px-1.5 ml-auto">
                {reddit.length} {reddit.length === 1 ? "thread" : "threads"}
              </Badge>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {reddit.slice(0, 10).map((hit, i) => <Row key={i} hit={hit} />)}
            </div>
          </div>
        )}

        {podcast.length > 0 && (
          <div className="rounded-lg border border-white/[0.04] overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-zinc-800/40">
              <Mic size={13} className="text-purple-400" />
              <span className="text-[12px] font-semibold text-zinc-200">Podcasts</span>
              <Badge className="text-[10px] bg-purple-500/10 text-purple-400 border-0 rounded-md h-5 px-1.5 ml-auto">
                {podcast.length} {podcast.length === 1 ? "episode" : "episodes"}
              </Badge>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {podcast.slice(0, 6).map((hit, i) => <Row key={i} hit={hit} />)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
