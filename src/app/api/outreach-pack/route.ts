export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { queryForVisibility, aiLight } from "@/lib/ai";
import { checkHallucinations, type Hallucination, type ProjectGroundTruth } from "@/lib/agents/hallucinationCheck";
import { getCurrentUser } from "@/lib/db/supabase-server";
import { isAdminEmail } from "@/lib/admin";

/**
 * Outreach Pack — the founder's "skip the cold pitch" weapon.
 *
 * Takes a prospect's website + recipient name. Returns a complete,
 * paste-and-send outreach kit:
 *   - Brand snapshot (verified from their own site, not made up)
 *   - 3 specific factual errors AI is making about them
 *   - 5 buyer queries where they're invisible (with the competitor that wins)
 *   - Email body, WhatsApp message, LinkedIn DM — all personalised
 *   - A public preview link they can click and see their dashboard
 *
 * Why this exists: a generic "we do AI SEO" cold email converts at 2-4%.
 * A cold email that quotes the prospect's actual hallucinations + their
 * specific blind-spot queries converts at 12-18% in B2B India. That's
 * a 4-6× lift on the same outreach time. Founder pastes URL, gets a
 * ready-to-send pack in 30s, sends 50 in an afternoon.
 *
 * No auth required for now — this is a founder-only tool. If we grow
 * past founder-led sales we'll gate it behind admin auth.
 */

interface OutreachInput {
  websiteUrl: string;
  /** Name on the email header. e.g. "Aparna Constructions and Estates Pvt. Ltd." */
  brand?: string;
  city?: string;
  /** Recipient name + title for personalised opening line. */
  recipientName?: string;
  recipientTitle?: string;
}

interface BlindSpotRow {
  query: string;
  competitor: string;
}

interface OutreachPack {
  brand: string;
  city: string;
  websiteUrl: string;
  scannedAt: string;
  snapshot: {
    projectsFound: number;
    sampleProjects: string[];
    reraNumbersFound: number;
  };
  mentionRate: { mentioned: number; total: number; pct: number };
  hallucinations: Hallucination[];
  blindSpots: BlindSpotRow[];
  copy: {
    emailSubject: string;
    emailBody: string;
    whatsapp: string;
    linkedin: string;
  };
  previewUrl: string;
}

async function quickAutoDiscover(websiteUrl: string): Promise<{
  brand: string;
  city: string;
  projects: ProjectGroundTruth[];
}> {
  // Reuse the same auto-discover route the demo flow uses, fully
  // server-side. The discover output is already structured.
  try {
    const origin = new URL(websiteUrl).origin;
    const hostname = origin.replace(/^https?:\/\//, "").replace(/^www\./, "");
    const inferredName = hostname.split(".")[0].charAt(0).toUpperCase() + hostname.split(".")[0].slice(1);

    // Direct call to auto-discover to avoid HTTP round trip
    const { POST: discover } = await import("@/app/api/auto-discover/route");
    const fakeReq = new Request("https://internal/api/auto-discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: websiteUrl, companyName: inferredName, industry: "real_estate" }),
    });
    const res = await discover(fakeReq as NextRequest);
    const data = await res.json();

    const brand = (() => {
      if (data.companyDescription) {
        const fromDesc = String(data.companyDescription).split(" is ")[0]?.trim();
        if (fromDesc && fromDesc.length > 2 && fromDesc.length < 80) return fromDesc;
      }
      return inferredName;
    })();

    const projects: ProjectGroundTruth[] = Array.isArray(data.inferredProjects)
      ? data.inferredProjects
          .filter((p: any) => p?.name)
          .slice(0, 30)
          .map((p: any) => ({
            name: String(p.name).trim(),
            location: typeof p.location === "string" ? p.location : "",
            configurations: typeof p.configurations === "string" ? p.configurations : "",
            priceRange: typeof p.priceRange === "string" ? p.priceRange : "",
            reraNumber: typeof p.reraNumber === "string" ? p.reraNumber : "",
          }))
      : [];

    return { brand, city: data.city || "", projects };
  } catch {
    return { brand: "", city: "", projects: [] };
  }
}

const QUERY_TEMPLATES = (city: string): string[] => {
  if (!city) {
    return [
      "best real estate developers to buy a flat from in India",
      "top builders for buying a 3BHK apartment",
      "which residential developer should I trust for my first home",
      "best builders for 3BHK apartments under 1.5 crore",
      "trusted real estate developers for NRI investment",
    ];
  }
  return [
    `best real estate developers in ${city}`,
    `top builders for 3BHK apartments in ${city}`,
    `which builder should I trust for buying a flat in ${city}`,
    `best 3BHK apartments in ${city} under 1.5 crore`,
    `most trusted residential developers in ${city} for NRI buyers`,
  ];
};

async function checkMention(text: string, brand: string): Promise<{ mentioned: boolean; competitors: string[] }> {
  if (!text) return { mentioned: false, competitors: [] };

  // Cheap literal first
  const lower = text.toLowerCase();
  const brandLower = brand.toLowerCase();
  const literal = lower.includes(brandLower);

  // Always extract competitors via the LLM — they're the punchline of
  // the outreach email ("Aparna wins this query, not you").
  try {
    const raw = await aiLight(
      "Extract structured data from text. Return only JSON.",
      `Brand to look for: "${brand}"

Text:
"""
${text.slice(0, 3000)}
"""

Return:
{
  "mentioned": <true if "${brand}" appears in any form, alias, or close spelling — false otherwise>,
  "competitors": ["other developer / builder brand names mentioned, max 5, exclude the target"]
}`,
      300
    );
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      return {
        mentioned: Boolean(parsed.mentioned ?? literal),
        competitors: Array.isArray(parsed.competitors) ? parsed.competitors.slice(0, 5) : [],
      };
    }
  } catch { /* fall through */ }
  return { mentioned: literal, competitors: [] };
}

function buildEmail(pack: Omit<OutreachPack, "copy">, recipientName?: string, recipientTitle?: string): {
  emailSubject: string;
  emailBody: string;
  whatsapp: string;
  linkedin: string;
} {
  const { brand, city, mentionRate, hallucinations, blindSpots, previewUrl } = pack;
  const greetName = recipientName ? recipientName.trim().split(" ")[0] : "team";
  const titleClause = recipientTitle ? ` (${recipientTitle})` : "";

  const topBlindSpot = blindSpots[0];
  const topHallucination = hallucinations[0];

  const subjectVariants = [
    topBlindSpot
      ? `ChatGPT cited ${topBlindSpot.competitor} for "${topBlindSpot.query}" — not ${brand}`
      : `${brand} appears in ${mentionRate.mentioned}/${mentionRate.total} buyer searches on ChatGPT`,
  ];

  const bulletLines: string[] = [];
  if (mentionRate.total > 0) {
    bulletLines.push(
      `- ChatGPT + Gemini mention you on **${mentionRate.mentioned}/${mentionRate.total}** of the buyer queries we tested${city ? ` in ${city}` : ""}.`
    );
  }
  if (topHallucination) {
    bulletLines.push(
      `- AI is currently making this factual error about you: *"${topHallucination.aiClaim.slice(0, 180)}"* (the actual fact: ${topHallucination.truth || "different from what AI is saying"}).`
    );
  }
  if (blindSpots.length > 0) {
    bulletLines.push(
      `- ${blindSpots.length} buyer queries you're invisible for — including "${blindSpots[0].query}" (AI sends buyers to ${blindSpots[0].competitor} instead).`
    );
  }

  const emailBody = `Hi ${greetName}${titleClause},

I run Cabbge — we built the only platform that measures how ChatGPT and Gemini actually answer buyer queries about Indian residential developers.

I scanned ${brand} this morning. Some of what we found:

${bulletLines.join("\n\n")}

Full dashboard with every finding: ${previewUrl}

15-min walkthrough next week? Happy to do it on WhatsApp or Google Meet — whatever works.

Best,
${process.env.FOUNDER_NAME || "Arjun"}
Founder, Cabbge`;

  const whatsapp = `Hi ${greetName} — I'm ${process.env.FOUNDER_NAME || "Arjun"}, founder of Cabbge.

We measure how ChatGPT/Gemini answer buyer queries about Indian developers. Scanned ${brand} today.

${blindSpots.length > 0
    ? `You're invisible on "${blindSpots[0].query}" — buyers asking that are sent to ${blindSpots[0].competitor}.`
    : `${mentionRate.mentioned}/${mentionRate.total} buyer queries cite you. Competitors win the rest.`}

${topHallucination ? `Bigger problem: AI is stating wrong facts about you (RERA / price / config). Open: ${previewUrl}` : `Live dashboard: ${previewUrl}`}

Worth a 10-min call?`;

  const linkedin = `Hi ${greetName}, ${process.env.FOUNDER_NAME || "Arjun"} from Cabbge.

We measure how AI search engines (ChatGPT, Gemini, Google AIO) answer buyer queries about residential developers in India. Most CMOs in your peer set haven't seen this data because nobody else builds it.

I scanned ${brand} this morning. ${blindSpots.length > 0
    ? `On "${blindSpots[0].query}", AI recommends ${blindSpots[0].competitor} instead of you. ${blindSpots.length - 1} similar gaps.`
    : `Mention rate ${mentionRate.pct}% — competitors win the rest of the buyer-intent funnel.`}

Live dashboard with everything: ${previewUrl}

Open to a 15-min call?`;

  return {
    emailSubject: subjectVariants[0],
    emailBody,
    whatsapp,
    linkedin,
  };
}

export async function POST(req: NextRequest) {
  try {
    // Admin gate — this endpoint generates founder-voice outreach packs
    // (used by Cabbge to pitch developers). Until/unless we productize
    // it for customer-facing outreach, only the founder/CSM should hit
    // it. Without this gate, anyone could mass-generate hallucination
    // reports on third-party sites.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const body: OutreachInput = await req.json();
    let { websiteUrl, brand, city, recipientName, recipientTitle } = body;
    if (!websiteUrl || typeof websiteUrl !== "string") {
      return NextResponse.json({ error: "websiteUrl is required" }, { status: 400 });
    }
    if (!websiteUrl.startsWith("http")) websiteUrl = `https://${websiteUrl}`;

    // 1. Discover the brand + scrape projects (this is the part that
    // proves we actually looked at their site)
    const discovered = await quickAutoDiscover(websiteUrl);
    const finalBrand = brand?.trim() || discovered.brand || new URL(websiteUrl).hostname.replace(/^www\./, "").split(".")[0];
    const finalCity = city?.trim() || discovered.city || "";

    // 2. Run 5 buyer queries through BOTH LLMs. We aggregate the worst
    // queries (where the brand is absent) into the blind-spot list.
    const queries = QUERY_TEMPLATES(finalCity);

    const queryResults = await Promise.all(
      queries.map(async (q) => {
        const [chatgpt, gemini] = await Promise.all([
          queryForVisibility("openai", q).catch(() => ({ text: "", source: "failed" as const })),
          queryForVisibility("gemini", q).catch(() => ({ text: "", source: "failed" as const })),
        ]);
        const [chatgptCheck, geminiCheck] = await Promise.all([
          checkMention(chatgpt.text, finalBrand),
          checkMention(gemini.text, finalBrand),
        ]);
        const mentioned = chatgptCheck.mentioned || geminiCheck.mentioned;
        const competitors = Array.from(new Set([...chatgptCheck.competitors, ...geminiCheck.competitors]));
        return {
          query: q,
          mentioned,
          competitors,
          // Combined response text so hallucination check can audit both
          combinedText: `${chatgpt.text}\n\n${gemini.text}`,
        };
      })
    );

    const mentionedCount = queryResults.filter((q) => q.mentioned).length;

    // 3. Pull the top 5 blind spots — queries where the brand is absent
    // AND we have a named competitor to point at. These are the most
    // persuasive lines in the email.
    const blindSpots: BlindSpotRow[] = queryResults
      .filter((q) => !q.mentioned && q.competitors.length > 0)
      .slice(0, 5)
      .map((q) => ({ query: q.query, competitor: q.competitors[0] }));

    // 4. Hallucination check — only meaningful if we have ground-truth
    // projects to compare against. Run against the combined response
    // text from queries where the brand WAS mentioned.
    let hallucinations: Hallucination[] = [];
    if (discovered.projects.length > 0) {
      const mentionedTexts = queryResults.filter((q) => q.mentioned).map((q) => q.combinedText);
      const allMentioned = mentionedTexts.join("\n\n").slice(0, 6000);
      if (allMentioned.trim().length > 100) {
        const result = await checkHallucinations(finalBrand, [], [], discovered.projects, allMentioned);
        hallucinations = result.hallucinations.slice(0, 3);
      }
    }

    // 5. Public preview URL — the standalone /grader page was retired
    // 2026-04-27 in favour of the signed-up scan flow. Outreach packs
    // now point recipients to /signup with a referral hint so they
    // land on a page that converts. The brand + city query params are
    // preserved so the signup form can pre-fill them.
    const previewUrl = `https://cabbge.com/signup?brand=${encodeURIComponent(finalBrand)}${finalCity ? `&city=${encodeURIComponent(finalCity)}` : ""}&ref=outreach`;

    const partialPack: Omit<OutreachPack, "copy"> = {
      brand: finalBrand,
      city: finalCity,
      websiteUrl,
      scannedAt: new Date().toISOString(),
      snapshot: {
        projectsFound: discovered.projects.length,
        sampleProjects: discovered.projects.slice(0, 6).map((p) => p.name),
        reraNumbersFound: discovered.projects.filter((p) => p.reraNumber).length,
      },
      mentionRate: {
        mentioned: mentionedCount,
        total: queryResults.length,
        pct: Math.round((mentionedCount / queryResults.length) * 100),
      },
      hallucinations,
      blindSpots,
      previewUrl,
    };

    const copy = buildEmail(partialPack, recipientName, recipientTitle);

    const pack: OutreachPack = { ...partialPack, copy };

    return NextResponse.json(pack);
  } catch (error) {
    console.error("Outreach pack error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Outreach pack failed" },
      { status: 500 }
    );
  }
}
