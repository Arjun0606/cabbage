import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";
import { sanitizeUrl, sanitizeText } from "@/lib/security";

// ---------- Types ----------

interface DimensionResult {
  score: number;
  [key: string]: unknown;
}

interface CitabilityResult {
  url: string;
  overallScore: number;
  dimensions: {
    answerTargets: DimensionResult;
    passageQuality: DimensionResult;
    statisticalDensity: DimensionResult;
    contentStructure: DimensionResult;
    realEstateSignals: DimensionResult;
  };
  topIssues: { issue: string; impact: "high" | "medium" | "low"; fix: string }[];
  quickWins: string[];
}

// ---------- Helpers ----------

async function safeFetch(
  url: string,
  options?: { timeout?: number }
): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options?.timeout ?? 10000
    );
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    clearTimeout(timeout);
    return res;
  } catch {
    return null;
  }
}

/**
 * Strip HTML tags and normalize whitespace.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract heading-paragraph pairs from HTML.
 */
function extractHeadingParagraphs(
  html: string
): { heading: string; level: number; text: string; wordCount: number }[] {
  const results: { heading: string; level: number; text: string; wordCount: number }[] = [];

  // Match H2 and H3 headings followed by content until the next heading
  const headingPattern =
    /<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  const headings: { level: number; heading: string; index: number }[] = [];

  while ((match = headingPattern.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1]),
      heading: stripHtml(match[2]),
      index: match.index + match[0].length,
    });
  }

  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].index;
    const end = i + 1 < headings.length ? headings[i + 1].index - 100 : html.length;
    const content = html.substring(start, end);

    // Extract first paragraph after heading
    const paraMatch = content.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const text = paraMatch ? stripHtml(paraMatch[1]) : "";
    const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;

    results.push({
      heading: headings[i].heading,
      level: headings[i].level,
      text,
      wordCount,
    });
  }

  return results;
}

/**
 * Check if a heading is phrased as a question.
 */
function isQuestion(heading: string): boolean {
  const trimmed = heading.trim().toLowerCase();
  return (
    trimmed.endsWith("?") ||
    trimmed.startsWith("what ") ||
    trimmed.startsWith("how ") ||
    trimmed.startsWith("why ") ||
    trimmed.startsWith("when ") ||
    trimmed.startsWith("where ") ||
    trimmed.startsWith("who ") ||
    trimmed.startsWith("which ") ||
    trimmed.startsWith("is ") ||
    trimmed.startsWith("are ") ||
    trimmed.startsWith("can ") ||
    trimmed.startsWith("does ") ||
    trimmed.startsWith("do ") ||
    trimmed.startsWith("should ")
  );
}

/**
 * Extract paragraphs from HTML and sample up to N.
 */
function extractParagraphs(html: string, maxSamples: number = 5): string[] {
  const paragraphs: string[] = [];
  const paraPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;

  while ((match = paraPattern.exec(html)) !== null) {
    const text = stripHtml(match[1]);
    const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
    if (wordCount >= 20) {
      paragraphs.push(text);
    }
  }

  if (paragraphs.length <= maxSamples) return paragraphs;

  // Sample evenly across the content
  const step = Math.floor(paragraphs.length / maxSamples);
  const sampled: string[] = [];
  for (let i = 0; i < maxSamples; i++) {
    sampled.push(paragraphs[i * step]);
  }
  return sampled;
}

/**
 * Count pronouns in text and return ratio.
 */
function pronounDensity(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 0;

  const pronouns = [
    "it",
    "its",
    "they",
    "them",
    "their",
    "theirs",
    "this",
    "that",
    "these",
    "those",
    "he",
    "she",
    "his",
    "her",
    "we",
    "our",
    "ours",
  ];

  let count = 0;
  for (const word of words) {
    if (pronouns.includes(word.toLowerCase().replace(/[.,;:!?]/g, ""))) {
      count++;
    }
  }

  return (count / words.length) * 100;
}

/**
 * Count named entities (proper nouns — capitalized words not at sentence start).
 */
function countNamedEntities(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  let entityCount = 0;

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);
    // Skip first word of each sentence
    for (let i = 1; i < words.length; i++) {
      const word = words[i].replace(/[.,;:!?"']/g, "");
      if (word.length > 1 && word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
        entityCount++;
      }
    }
  }

  return entityCount;
}

/**
 * Check if passage starts with a definition pattern.
 */
function hasDefinitionPattern(text: string): boolean {
  const firstSentence = text.split(/[.!?]/)[0]?.toLowerCase() || "";
  return (
    firstSentence.includes(" is a ") ||
    firstSentence.includes(" is an ") ||
    firstSentence.includes(" is the ") ||
    firstSentence.includes(" are a ") ||
    firstSentence.includes(" refers to ") ||
    firstSentence.includes(" means ")
  );
}

// ---------- Analysis functions ----------

function analyzeAnswerTargets(
  headingParagraphs: { heading: string; level: number; text: string; wordCount: number }[]
): DimensionResult {
  const questionHeadings = headingParagraphs.filter((hp) => isQuestion(hp.heading));
  const found = questionHeadings.length;
  const optimal = 8;

  // Check how many have optimal answer block length (40-60 words)
  const optimalLength = questionHeadings.filter(
    (hp) => hp.wordCount >= 40 && hp.wordCount <= 60
  ).length;

  let score = Math.min(100, (found / optimal) * 100);

  // Bonus for optimal-length answer blocks
  if (found > 0) {
    const optimalRatio = optimalLength / found;
    score = score * 0.7 + optimalRatio * 100 * 0.3;
  }

  let details = `${found} question-based heading(s) found`;
  if (found === 0) {
    details = "No question-based headings found — add FAQ-style H2s to become citable";
  } else if (found < 5) {
    details += ` (need ${optimal} for optimal AI citation)`;
  }
  if (optimalLength > 0) {
    details += `. ${optimalLength} have optimal 40-60 word answer blocks`;
  }

  return {
    score: Math.round(score),
    found,
    optimal,
    optimalAnswerBlocks: optimalLength,
    details,
  };
}

function analyzePassageQuality(paragraphs: string[]): DimensionResult {
  if (paragraphs.length === 0) {
    return {
      score: 0,
      avgLength: 0,
      pronounRatio: 0,
      avgEntities: 0,
      definitionPatterns: 0,
      details: "No substantial paragraphs found on the page",
    };
  }

  const lengths = paragraphs.map(
    (p) => p.split(/\s+/).filter((w) => w.length > 0).length
  );
  const avgLength = Math.round(
    lengths.reduce((a, b) => a + b, 0) / lengths.length
  );

  const pronounRatios = paragraphs.map((p) => pronounDensity(p));
  const avgPronounRatio =
    pronounRatios.reduce((a, b) => a + b, 0) / pronounRatios.length;

  const entityCounts = paragraphs.map((p) => countNamedEntities(p));
  const avgEntities =
    entityCounts.reduce((a, b) => a + b, 0) / entityCounts.length;

  const definitionPatterns = paragraphs.filter((p) =>
    hasDefinitionPattern(p)
  ).length;

  // Score: length (optimal 134-167), pronoun density (< 2% ideal), entities, definitions
  let score = 0;

  // Length score (0-40 points)
  if (avgLength >= 134 && avgLength <= 167) {
    score += 40;
  } else if (avgLength >= 100 && avgLength <= 200) {
    score += 30;
  } else if (avgLength >= 60) {
    score += 15;
  } else {
    score += 5;
  }

  // Pronoun density score (0-30 points)
  if (avgPronounRatio <= 2) {
    score += 30;
  } else if (avgPronounRatio <= 4) {
    score += 20;
  } else if (avgPronounRatio <= 6) {
    score += 10;
  }

  // Entity score (0-15 points)
  if (avgEntities >= 5) {
    score += 15;
  } else if (avgEntities >= 3) {
    score += 10;
  } else if (avgEntities >= 1) {
    score += 5;
  }

  // Definition patterns (0-15 points)
  score += Math.min(15, definitionPatterns * 5);

  const details: string[] = [];
  if (avgLength < 100)
    details.push("Passages too short for optimal AI citation");
  if (avgLength > 200) details.push("Passages are longer than optimal");
  if (avgPronounRatio > 4)
    details.push("High pronoun density — replace pronouns with explicit nouns");
  if (avgEntities < 3)
    details.push("Low named entity count — use specific names, brands, and locations");
  if (definitionPatterns === 0)
    details.push("No definition patterns found — start key paragraphs with 'X is a...'");

  return {
    score: Math.round(score),
    avgLength,
    pronounRatio: Math.round(avgPronounRatio * 10) / 10,
    avgEntities: Math.round(avgEntities * 10) / 10,
    definitionPatterns,
    details: details.length > 0 ? details.join(". ") : "Passage quality is good",
  };
}

function analyzeStatisticalDensity(plainText: string): DimensionResult {
  const wordCount = plainText.split(/\s+/).filter((w) => w.length > 0).length;
  if (wordCount === 0) {
    return { score: 0, stats: 0, details: "No text content found" };
  }

  // Count different types of data points
  const percentages = (plainText.match(/%|\bpercent\b/gi) || []).length;
  const prices = (
    plainText.match(
      /₹[\d,.]+|Rs\.?\s*[\d,.]+|\bCr\b|\bcrore\b|\bLakh\b|\blac\b|\$[\d,.]+/gi
    ) || []
  ).length;
  const years = (plainText.match(/\b(19|20)\d{2}\b/g) || []).length;
  const namedSources = (
    plainText.match(
      /according to|as per|reported by|data from|survey by|study by|research by|Knight Frank|JLL|CBRE|Anarock|PropTiger|RERA|NHB|RBI|CREDAI/gi
    ) || []
  ).length;
  const sqft = (
    plainText.match(/sq\.?\s*ft|square\s*feet|sqft|carpet\s*area|built.?up\s*area/gi) || []
  ).length;
  const distances = (
    plainText.match(/\d+\s*(km|mins?|minutes?|meters?|kms?)\b/gi) || []
  ).length;

  const totalStats = percentages + prices + years + namedSources + sqft + distances;

  // Score based on density (stats per 1000 words)
  const density = (totalStats / wordCount) * 1000;
  let score: number;

  if (density >= 15) score = 100;
  else if (density >= 10) score = 80;
  else if (density >= 6) score = 60;
  else if (density >= 3) score = 40;
  else if (density >= 1) score = 20;
  else score = 5;

  return {
    score,
    stats: totalStats,
    breakdown: { percentages, prices, years, namedSources, sqft, distances },
    details: `${totalStats} data points found (${prices} prices, ${sqft} area mentions, ${years} year references, ${namedSources} source citations, ${percentages} percentages, ${distances} distance mentions)`,
  };
}

function analyzeContentStructure(html: string, plainText: string): DimensionResult {
  const wordCount = plainText.split(/\s+/).filter((w) => w.length > 0).length;

  const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
  const h3Count = (html.match(/<h3[^>]*>/gi) || []).length;

  // Check for FAQ section
  const hasFAQ =
    /faq|frequently\s*asked\s*questions/i.test(html) ||
    (html.match(/<h[23][^>]*>.*?\?.*?<\/h[23]>/gi) || []).length >= 3;

  // Check for tables
  const hasTables = /<table[^>]*>/i.test(html);
  const tableCount = (html.match(/<table[^>]*>/gi) || []).length;

  // Check for lists
  const hasLists = /<[uo]l[^>]*>/i.test(html);
  const listCount = (html.match(/<[uo]l[^>]*>/gi) || []).length;

  let score = 0;

  // Word count (0-25 points)
  if (wordCount >= 2000) score += 25;
  else if (wordCount >= 1500) score += 20;
  else if (wordCount >= 1000) score += 15;
  else if (wordCount >= 500) score += 8;
  else score += 3;

  // H2 count (0-25 points)
  if (h2Count >= 8) score += 25;
  else if (h2Count >= 5) score += 20;
  else if (h2Count >= 3) score += 12;
  else score += 5;

  // FAQ section (0-20 points)
  if (hasFAQ) score += 20;

  // Tables (0-15 points)
  if (hasTables) score += 15;

  // Lists (0-15 points)
  if (hasLists) score += 15;

  const details: string[] = [];
  if (wordCount < 2000)
    details.push(`Word count is ${wordCount} — aim for 2000+ for AI citation`);
  if (h2Count < 5)
    details.push(`Only ${h2Count} H2 headings — add more to structure content`);
  if (!hasFAQ) details.push("No FAQ section found");
  if (!hasTables) details.push("No comparison tables found");
  if (!hasLists) details.push("No bullet point lists found");

  return {
    score,
    wordCount,
    h2Count,
    h3Count,
    hasFAQ,
    hasTables: tableCount > 0,
    tableCount,
    hasLists: listCount > 0,
    listCount,
    details:
      details.length > 0
        ? details.join(". ")
        : "Content structure is well-organized",
  };
}

function analyzeRealEstateSignals(
  html: string,
  plainText: string
): DimensionResult {
  // RERA number detection
  const reraPattern =
    /RERA|rera\s*(?:no|number|reg|registration|id)?\.?\s*[:.]?\s*[A-Z0-9/-]+/i;
  const hasRera = reraPattern.test(plainText);

  // Price information in structured format
  const hasPricing = /₹|Rs\.?|price|starting\s*(?:at|from)|per\s*sq\.?\s*ft/i.test(
    plainText
  );
  const hasStructuredPricing =
    /<table[^>]*>[\s\S]*?(price|₹|Rs)[\s\S]*?<\/table>/i.test(html) ||
    /price\s*(?:list|range|per|starting)/i.test(plainText);

  // Location/connectivity
  const hasLocation =
    /connectivity|located\s*(at|in|near)|proximity|distance|km\s*(from|to)|metro|airport|highway|expressway|station/i.test(
      plainText
    );

  // Builder track record
  const hasTrackRecord =
    /track\s*record|delivered|completed|years?\s*of\s*experience|established\s*in|since\s*\d{4}|heritage|legacy|past\s*projects/i.test(
      plainText
    );

  // Amenities
  const hasAmenities =
    /amenities|swimming\s*pool|gym|club\s*house|garden|parking|security|play\s*area|sports/i.test(
      plainText
    );

  // Specifications
  const hasSpecs =
    /carpet\s*area|built.?up\s*area|super\s*built.?up|floor\s*plan|configuration|bhk|bedroom/i.test(
      plainText
    );

  let score = 0;
  if (hasRera) score += 20;
  if (hasPricing) score += 10;
  if (hasStructuredPricing) score += 10;
  if (hasLocation) score += 20;
  if (hasTrackRecord) score += 15;
  if (hasAmenities) score += 10;
  if (hasSpecs) score += 15;

  return {
    score: Math.min(100, score),
    rera: hasRera,
    pricing: hasPricing,
    structuredPricing: hasStructuredPricing,
    location: hasLocation,
    trackRecord: hasTrackRecord,
    amenities: hasAmenities,
    specifications: hasSpecs,
    details: [
      hasRera ? "RERA number found" : "No RERA number visible",
      hasPricing ? "Price information present" : "No pricing information",
      hasLocation ? "Location/connectivity mentioned" : "No location details",
      hasTrackRecord ? "Builder track record mentioned" : "No track record info",
    ].join(". "),
  };
}

// ---------- Route Handler ----------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectName = sanitizeText(body.projectName || "", 200);

    const { valid, url: safeUrl, error } = sanitizeUrl(body.url);
    if (!valid) return NextResponse.json({ error }, { status: 400 });

    // Fetch the page
    const res = await safeFetch(safeUrl, { timeout: 15000 });
    if (!res || !res.ok) {
      return NextResponse.json(
        {
          error: `Could not fetch ${safeUrl} — received ${res?.status || "no response"}`,
        },
        { status: 400 }
      );
    }

    const html = await res.text();
    const plainText = stripHtml(html);

    // ---------- Run all analyses ----------

    const headingParagraphs = extractHeadingParagraphs(html);
    const paragraphs = extractParagraphs(html);

    const answerTargets = analyzeAnswerTargets(headingParagraphs);
    const passageQuality = analyzePassageQuality(paragraphs);
    const statisticalDensity = analyzeStatisticalDensity(plainText);
    const contentStructure = analyzeContentStructure(html, plainText);
    const realEstateSignals = analyzeRealEstateSignals(html, plainText);

    // ---------- Overall score (weighted average) ----------

    const overallScore = Math.round(
      (answerTargets.score as number) * 0.25 +
        (passageQuality.score as number) * 0.25 +
        (statisticalDensity.score as number) * 0.15 +
        (contentStructure.score as number) * 0.2 +
        (realEstateSignals.score as number) * 0.15
    );

    // ---------- Generate AI recommendations ----------

    const findings = {
      answerTargets: {
        score: answerTargets.score,
        found: answerTargets.found,
        details: answerTargets.details,
      },
      passageQuality: {
        score: passageQuality.score,
        avgLength: passageQuality.avgLength,
        pronounRatio: passageQuality.pronounRatio,
        details: passageQuality.details,
      },
      statisticalDensity: {
        score: statisticalDensity.score,
        stats: statisticalDensity.stats,
        details: statisticalDensity.details,
      },
      contentStructure: {
        score: contentStructure.score,
        wordCount: contentStructure.wordCount,
        h2Count: contentStructure.h2Count,
        hasFAQ: contentStructure.hasFAQ,
        details: contentStructure.details,
      },
      realEstateSignals: {
        score: realEstateSignals.score,
        rera: realEstateSignals.rera,
        pricing: realEstateSignals.pricing,
        location: realEstateSignals.location,
        trackRecord: realEstateSignals.trackRecord,
        details: realEstateSignals.details,
      },
    };

    const systemPrompt = `You are an expert in AI SEO citability for Indian real estate developer websites. Given analysis findings, generate actionable recommendations.

Respond ONLY with valid JSON — no markdown fences, no extra text. Use this exact structure:
{
  "topIssues": [
    { "issue": "description of the problem", "impact": "high" | "medium" | "low", "fix": "specific actionable fix" }
  ],
  "quickWins": ["Quick actionable item 1", "Quick actionable item 2"]
}

Focus on the lowest-scoring dimensions first. Be specific — mention exact numbers and targets. Max 5 top issues and 6 quick wins.`;

    const userPrompt = `Analyze these citability audit findings for ${safeUrl}${projectName ? ` (project: ${projectName})` : ""}:

Overall score: ${overallScore}/100

${JSON.stringify(findings, null, 2)}

The key insight from AI SEO research: AI systems cite passages that follow specific patterns — question-based headings with 40-60 word answer blocks, self-contained passages of 134-167 words with low pronoun density, and high statistical density with named sources.

Generate the top issues (sorted by impact) and quick wins for this real estate developer page.`;

    const aiResponse = await aiComplete(systemPrompt, userPrompt, 1500);

    let topIssues: { issue: string; impact: "high" | "medium" | "low"; fix: string }[] = [];
    let quickWins: string[] = [];

    try {
      const parsed = JSON.parse(aiResponse);
      topIssues = parsed.topIssues || [];
      quickWins = parsed.quickWins || [];
    } catch {
      // Fallback: generate issues from findings
      topIssues = [];
      if ((answerTargets.score as number) < 50) {
        topIssues.push({
          issue: `Only ${answerTargets.found} question-based headings found — add FAQ-style H2s`,
          impact: "high",
          fix: "Rewrite H2s as questions buyers actually ask, like 'What is the price of [Project]?'",
        });
      }
      if ((passageQuality.score as number) < 50) {
        topIssues.push({
          issue: `Passages average ${passageQuality.avgLength} words — optimal is 134-167 for AI citation`,
          impact: "high",
          fix: "Expand key paragraphs with specific details, data points, and named entities",
        });
      }
      if ((contentStructure.score as number) < 50) {
        topIssues.push({
          issue: `Content structure needs improvement (${contentStructure.wordCount} words, ${contentStructure.h2Count} H2s)`,
          impact: "medium",
          fix: "Add more H2 headings, an FAQ section, and comparison tables",
        });
      }

      quickWins = [
        "Add 5-8 question-based H2 headings (FAQ style)",
        "Add an FAQ section with common buyer questions",
        "Include specific price per sq ft figures",
        "Add a comparison table with key project specs",
        "Replace pronouns with explicit nouns in key passages",
      ];
    }

    const result: CitabilityResult = {
      url: safeUrl,
      overallScore,
      dimensions: {
        answerTargets,
        passageQuality,
        statisticalDensity,
        contentStructure,
        realEstateSignals,
      },
      topIssues,
      quickWins,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Citability audit error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Citability audit failed",
      },
      { status: 500 }
    );
  }
}
