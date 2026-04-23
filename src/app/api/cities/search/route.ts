import { NextRequest, NextResponse } from "next/server";
import { aiLight } from "@/lib/ai";

/**
 * Dynamic Indian city search for autocomplete UIs.
 *
 * Backed by a live LLM call (gpt-5.4-nano) so the suggestion set isn't
 * a frozen list. For a given query prefix, returns up to 8 real Indian
 * cities with the state / UT they belong to. Caches in-process for 10
 * minutes per prefix to keep latency + cost down on rapid typing.
 *
 * GET /api/cities/search?q=bang
 *   → { cities: [{ name: "Bengaluru", state: "Karnataka" }, ...] }
 */

interface CityHit {
  name: string;
  state: string;
}

const cache = new Map<string, { value: CityHit[]; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function readCache(key: string): CityHit[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key: string, value: CityHit[]) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  if (!q || q.length < 2) {
    return NextResponse.json({ cities: [] });
  }
  if (q.length > 60) {
    return NextResponse.json({ error: "query too long" }, { status: 400 });
  }

  const cached = readCache(q);
  if (cached) {
    return NextResponse.json({ cities: cached, cached: true });
  }

  const system = "You autocomplete Indian city names. Return ONLY valid JSON, no prose, no markdown fences.";
  const prompt = `User is typing "${q}" into a city search. Return the top 1-8 real Indian cities whose name starts with or contains that fragment. Include smaller tier-2/tier-3 cities too — not just metros.

Respond ONLY as JSON:

{"cities": [{"name": "Bengaluru", "state": "Karnataka"}, ...]}

Rules:
- Use the official current name ("Bengaluru" not "Bangalore" unless the user explicitly typed "Bangalore" — then return BOTH Bengaluru AND Bangalore as separate hits pointing at the same place isn't needed; just return the one closest to what they typed).
- "state" is the Indian state or union territory name.
- Skip fabricated / non-existent places.
- If the query doesn't match any real Indian city, return an empty array.`;

  try {
    const raw = await aiLight(system, prompt, 400);
    const match = raw.match(/\{[\s\S]*"cities"[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ cities: [] });
    }
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.cities)) {
      return NextResponse.json({ cities: [] });
    }

    const out: CityHit[] = [];
    const seen = new Set<string>();
    for (const raw of parsed.cities) {
      const name = typeof raw?.name === "string" ? raw.name.trim() : "";
      const state = typeof raw?.state === "string" ? raw.state.trim() : "";
      if (!name || name.length > 80) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      out.push({ name, state });
      seen.add(key);
      if (out.length >= 8) break;
    }

    writeCache(q, out);
    return NextResponse.json({ cities: out });
  } catch (err) {
    console.error("cities/search error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ cities: [] });
  }
}
