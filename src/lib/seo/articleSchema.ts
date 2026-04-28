/**
 * Article schema generation + validation.
 *
 * Generates JSON-LD schemas for a published article:
 *   - Article schema (the main page content)
 *   - FAQPage schema (the FAQs section, when present)
 *   - BreadcrumbList schema (for navigability)
 *
 * Validates each schema before returning so a malformed payload never
 * leaves the API. AI overviews preferentially cite pages with valid
 * structured data — invalid schema is worse than no schema because it
 * gets parsed, fails, and the engine downgrades the page.
 *
 * No external dependency on schema.org parsers — we lint for the
 * required fields per type and fail loudly when something's missing.
 */

export interface ArticleSchemaInput {
  title: string;
  metaDescription: string;
  publishUrl: string;          // canonical URL where the article will live
  authorName: string;          // typically "${developerName} editorial team"
  publisherName: string;       // e.g. developer name
  publisherUrl?: string;       // developer website
  publishedDate?: string;      // ISO date; defaults to today
  modifiedDate?: string;       // ISO date; defaults to publishedDate
  imageUrl?: string;           // optional hero image URL
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface BreadcrumbInput {
  name: string;
  url: string;
}

export interface SchemaBundle {
  schemas: Array<Record<string, unknown>>;
  validation: SchemaValidation;
}

export interface SchemaValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  perSchema: Array<{ type: string; valid: boolean; errors: string[]; warnings: string[] }>;
}

const KNOWN_SCHEMA_TYPES = new Set([
  "Article",
  "NewsArticle",
  "BlogPosting",
  "FAQPage",
  "BreadcrumbList",
  "Organization",
  "Person",
  "ImageObject",
  "WebPage",
  "Question",
  "Answer",
  "ListItem",
]);

export function buildArticleSchema(input: ArticleSchemaInput): Record<string, unknown> {
  const today = new Date().toISOString().slice(0, 10);
  const published = input.publishedDate || today;
  const modified = input.modifiedDate || published;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.metaDescription,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": input.publishUrl,
    },
    author: {
      "@type": "Organization",
      name: input.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: input.publisherName,
      ...(input.publisherUrl ? { url: input.publisherUrl } : {}),
    },
    datePublished: published,
    dateModified: modified,
  };
  if (input.imageUrl) {
    schema.image = {
      "@type": "ImageObject",
      url: input.imageUrl,
    };
  }
  return schema;
}

export function buildFaqSchema(faqs: FaqEntry[]): Record<string, unknown> | null {
  const valid = faqs.filter((f) => f && typeof f.question === "string" && typeof f.answer === "string" && f.question.trim() && f.answer.trim());
  if (valid.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: valid.map((f) => ({
      "@type": "Question",
      name: f.question.trim(),
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer.trim(),
      },
    })),
  };
}

export function buildBreadcrumbSchema(items: BreadcrumbInput[]): Record<string, unknown> | null {
  const valid = items.filter((b) => b && typeof b.name === "string" && typeof b.url === "string" && b.name.trim() && b.url.trim());
  if (valid.length < 2) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: valid.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name.trim(),
      item: b.url.trim(),
    })),
  };
}

export function validateSchema(schema: Record<string, unknown>): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!schema || typeof schema !== "object") {
    return { valid: false, errors: ["Schema is not an object"], warnings: [] };
  }
  // 1. Roundtrip JSON serialisation — anything that can't survive
  // JSON.stringify will fail at injection time anyway, so reject here.
  try {
    JSON.parse(JSON.stringify(schema));
  } catch (err) {
    return {
      valid: false,
      errors: [`Schema is not JSON-serialisable: ${err instanceof Error ? err.message : "unknown"}`],
      warnings: [],
    };
  }

  // 2. @context must be schema.org (string or array containing it).
  const ctx = (schema as { "@context"?: unknown })["@context"];
  if (!ctx) {
    errors.push("Missing @context");
  } else {
    const ctxStr = Array.isArray(ctx) ? ctx.join(",") : String(ctx);
    if (!/schema\.org/i.test(ctxStr)) {
      errors.push(`@context does not reference schema.org (got "${ctxStr}")`);
    }
  }

  // 3. @type must be present and recognised.
  const t = (schema as { "@type"?: unknown })["@type"];
  if (!t || typeof t !== "string") {
    errors.push("Missing or non-string @type");
  } else if (!KNOWN_SCHEMA_TYPES.has(t)) {
    warnings.push(`@type "${t}" is not in our known-good list — verify it parses on schema.org/${t}`);
  }

  // 4. Per-type required fields.
  if (t === "Article" || t === "NewsArticle" || t === "BlogPosting") {
    const required = ["headline", "datePublished", "author", "publisher"];
    for (const field of required) {
      if (!(field in schema)) errors.push(`Article schema missing required field: ${field}`);
    }
    const headline = (schema as { headline?: unknown }).headline;
    if (typeof headline === "string" && headline.length > 110) {
      warnings.push(`Article headline is ${headline.length} chars — Google clips at 110`);
    }
  }
  if (t === "FAQPage") {
    const me = (schema as { mainEntity?: unknown }).mainEntity;
    if (!Array.isArray(me) || me.length === 0) {
      errors.push("FAQPage requires mainEntity array with at least 1 Question");
    } else {
      me.forEach((q: any, i) => {
        if (!q || q["@type"] !== "Question") errors.push(`FAQPage mainEntity[${i}] must be @type Question`);
        if (!q?.name || typeof q.name !== "string") errors.push(`FAQPage mainEntity[${i}].name missing`);
        const ans = q?.acceptedAnswer;
        if (!ans || ans["@type"] !== "Answer" || typeof ans.text !== "string" || !ans.text.trim()) {
          errors.push(`FAQPage mainEntity[${i}].acceptedAnswer.text missing`);
        }
      });
    }
  }
  if (t === "BreadcrumbList") {
    const items = (schema as { itemListElement?: unknown }).itemListElement;
    if (!Array.isArray(items) || items.length < 2) {
      errors.push("BreadcrumbList requires itemListElement with ≥2 items");
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export interface BuildBundleInput {
  article: ArticleSchemaInput;
  faqs?: FaqEntry[];
  breadcrumbs?: BreadcrumbInput[];
}

/**
 * Build the full schema bundle for an article and validate every piece.
 * Returns the array of valid schemas + an aggregated validation report.
 */
export function buildAndValidateArticleSchemas(input: BuildBundleInput): SchemaBundle {
  const built: Array<{ type: string; schema: Record<string, unknown> }> = [];

  built.push({ type: "Article", schema: buildArticleSchema(input.article) });

  if (input.faqs && input.faqs.length > 0) {
    const faq = buildFaqSchema(input.faqs);
    if (faq) built.push({ type: "FAQPage", schema: faq });
  }

  if (input.breadcrumbs && input.breadcrumbs.length >= 2) {
    const bc = buildBreadcrumbSchema(input.breadcrumbs);
    if (bc) built.push({ type: "BreadcrumbList", schema: bc });
  }

  const perSchema = built.map(({ type, schema }) => {
    const v = validateSchema(schema);
    return { type, valid: v.valid, errors: v.errors, warnings: v.warnings };
  });

  const aggregateErrors = perSchema.flatMap((p) => p.errors.map((e) => `[${p.type}] ${e}`));
  const aggregateWarnings = perSchema.flatMap((p) => p.warnings.map((w) => `[${p.type}] ${w}`));
  const validSchemas = built.filter((_, i) => perSchema[i].valid).map((b) => b.schema);

  return {
    schemas: validSchemas,
    validation: {
      valid: aggregateErrors.length === 0,
      errors: aggregateErrors,
      warnings: aggregateWarnings,
      perSchema,
    },
  };
}
