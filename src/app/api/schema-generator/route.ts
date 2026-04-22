import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

// ---------- Types ----------

interface SchemaInput {
  projectName: string;
  developerName: string;
  city: string;
  location: string;
  configurations: string;
  priceRange: string;
  reraNumber?: string;
  amenities?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
}

interface FAQ {
  question: string;
  answer: string;
}

// ---------- Schema Builders ----------

function buildRealEstateListingSchema(input: SchemaInput) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: `${input.projectName} - ${input.configurations} in ${input.location}, ${input.city}`,
    description: `${input.projectName} by ${input.developerName} offers ${input.configurations} in ${input.location}, ${input.city}. Price range: ${input.priceRange}.`,
    url: input.website || "",
    datePosted: new Date().toISOString().split("T")[0],
  };

  if (input.priceRange) {
    // Try to extract a numeric low price for the offer
    const priceMatch = input.priceRange.match(/([\d,.]+)\s*(Cr|L|Lac|Lakh)/i);
    if (priceMatch) {
      let price = parseFloat(priceMatch[1].replace(/,/g, ""));
      const unit = priceMatch[2].toLowerCase();
      if (unit === "cr") price *= 10000000;
      else if (unit === "l" || unit === "lac" || unit === "lakh") price *= 100000;

      schema.offers = {
        "@type": "Offer",
        priceCurrency: "INR",
        price: price,
        priceValidUntil: new Date(Date.now() + 90 * 86400000)
          .toISOString()
          .split("T")[0],
        availability: "https://schema.org/InStock",
      };
    }
  }

  schema.address = {
    "@type": "PostalAddress",
    addressLocality: input.location,
    addressRegion: input.city,
    addressCountry: "IN",
  };

  if (input.latitude && input.longitude) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: input.latitude,
      longitude: input.longitude,
    };
  }

  if (input.amenities) {
    schema.amenityFeature = input.amenities.split(",").map((a) => ({
      "@type": "LocationFeatureSpecification",
      name: a.trim(),
      value: true,
    }));
  }

  return schema;
}

function buildOrganizationSchema(input: SchemaInput) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["Organization", "RealEstateAgent"],
    name: input.developerName,
    description: `${input.developerName} is a real estate developer with residential projects in ${input.city}. ${input.configurations ? `Offerings include ${input.configurations}.` : ""}`,
    address: {
      "@type": "PostalAddress",
      addressRegion: input.city,
      addressCountry: "IN",
    },
    areaServed: {
      "@type": "City",
      name: input.city,
    },
    knowsAbout: [
      "Real Estate Development",
      "Residential Properties",
      `Real Estate in ${input.city}`,
      "Home Buying",
      "Property Investment",
    ],
  };

  if (input.website) {
    schema.url = input.website;
    // sameAs intentionally omitted — fabricated entity links hurt more than
    // they help. Users add real social/portal URLs manually in the UI.
  }

  return schema;
}

function buildFAQPageSchema(faqs: FAQ[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

async function buildBreadcrumbListSchema(input: SchemaInput) {
  if (!input.website) return null;
  const base = input.website.replace(/\/$/, "");
  const citySlug = input.city.toLowerCase().replace(/\s+/g, "-");
  const locationSlug = input.location.toLowerCase().replace(/\s+/g, "-");

  // Never ship breadcrumb items with URLs we haven't verified. Guessed
  // `${base}/${citySlug}` paths almost always 404 — Google then flags the
  // schema as broken. We HEAD-check each candidate and drop `item` for
  // positions whose URL doesn't resolve (schema.org allows items with
  // only a `name`, commonly used for the final crumb).
  async function verify(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
      clearTimeout(timeout);
      if (res.ok) return true;
      if (res.status === 405) {
        const c2 = new AbortController();
        const t2 = setTimeout(() => c2.abort(), 4000);
        const res2 = await fetch(url, { method: "GET", signal: c2.signal, redirect: "follow" });
        clearTimeout(t2);
        return res2.ok;
      }
      return false;
    } catch {
      return false;
    }
  }

  const cityUrl = `${base}/${citySlug}`;
  const locationUrl = `${base}/${citySlug}/${locationSlug}`;
  const [cityOk, locationOk] = await Promise.all([verify(cityUrl), verify(locationUrl)]);

  const items: Array<Record<string, unknown>> = [
    { "@type": "ListItem", position: 1, name: "Home", item: base },
  ];
  let position = 2;
  if (cityOk) {
    items.push({ "@type": "ListItem", position: position++, name: `Projects in ${input.city}`, item: cityUrl });
  }
  if (locationOk) {
    items.push({ "@type": "ListItem", position: position++, name: `Projects in ${input.location}`, item: locationUrl });
  }
  items.push({ "@type": "ListItem", position: position, name: input.projectName });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function buildLocalBusinessSchema(input: SchemaInput) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": input.website || "",
    name: `${input.projectName} by ${input.developerName}`,
    description: `${input.projectName} offers ${input.configurations} in ${input.location}, ${input.city}. ${input.priceRange ? `Starting from ${input.priceRange}.` : ""}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: input.location,
      addressLocality: input.city,
      addressCountry: "IN",
    },
    image: [],
  };

  if (input.latitude && input.longitude) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: input.latitude,
      longitude: input.longitude,
    };
  }

  if (input.website) {
    schema.url = input.website;
  }

  if (input.priceRange) {
    schema.priceRange = input.priceRange;
  }

  return schema;
}

function buildHTMLSnippet(schemas: Record<string, unknown>): string {
  const entries = Object.values(schemas);
  return entries
    .map(
      (schema) =>
        `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`
    )
    .join("\n\n");
}

// ---------- FAQ Generation (AI) ----------

async function generateFAQs(input: SchemaInput): Promise<FAQ[]> {
  const system = `You generate FAQ content for real estate project pages. Output valid JSON only, no markdown fences.`;

  const prompt = `Generate 5 frequently asked questions and answers for the project page of:
- Project: ${input.projectName} by ${input.developerName}
- Location: ${input.location}, ${input.city}
- Configurations: ${input.configurations}
- Price Range: ${input.priceRange || "On request"}
- RERA: ${input.reraNumber || "Applied"}
- Amenities: ${input.amenities || "Standard amenities"}

Questions should cover: pricing, location advantages, configurations available, possession/RERA status, and amenities.
Answers should be 2-3 sentences, factual, and helpful for home buyers.

Return JSON array:
[
  { "question": "...", "answer": "..." }
]`;

  const text = await aiComplete(system, prompt, 1500);
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    // Fallback: only return FAQs we can build from user-supplied facts.
    // Never fabricate a "Yes, RERA-registered" answer or invent amenities —
    // those end up in JSON-LD and become legal claims.
    const faqs: FAQ[] = [];
    if (input.priceRange) {
      faqs.push({
        question: `What is the price range of ${input.projectName}?`,
        answer: `${input.projectName} by ${input.developerName} is priced at ${input.priceRange}. Contact the sales team for the latest pricing and payment plans.`,
      });
    }
    faqs.push({
      question: `Where is ${input.projectName} located?`,
      answer: `${input.projectName} is located in ${input.location}, ${input.city}.`,
    });
    if (input.configurations) {
      faqs.push({
        question: `What configurations are available at ${input.projectName}?`,
        answer: `${input.projectName} offers ${input.configurations}.`,
      });
    }
    if (input.reraNumber) {
      faqs.push({
        question: `Is ${input.projectName} RERA registered?`,
        answer: `Yes, ${input.projectName} is RERA-registered. The RERA number is ${input.reraNumber}.`,
      });
    }
    if (input.amenities) {
      faqs.push({
        question: `What amenities does ${input.projectName} offer?`,
        answer: `${input.projectName} offers ${input.amenities}.`,
      });
    }
    return faqs;
  }

  try {
    const faqs: FAQ[] = JSON.parse(jsonMatch[0]);
    return faqs.slice(0, 5);
  } catch {
    return [];
  }
}

// ---------- Route Handler ----------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      projectName,
      developerName,
      city,
      location,
      configurations,
      priceRange,
    } = body;

    if (!projectName || !city || !location) {
      return NextResponse.json(
        { error: "projectName, city, and location are required" },
        { status: 400 }
      );
    }

    const input: SchemaInput = {
      projectName,
      developerName: developerName || "",
      city,
      location,
      configurations: configurations || "",
      priceRange: priceRange || "",
      reraNumber: body.reraNumber,
      amenities: body.amenities,
      website: body.website,
      latitude: body.latitude,
      longitude: body.longitude,
    };

    // Generate FAQs via AI (the only AI call — schemas are built programmatically)
    const faqs = await generateFAQs(input);

    // Build all schemas programmatically
    const breadcrumb = await buildBreadcrumbListSchema(input);
    const schemas: Record<string, unknown> = {
      realEstateListing: buildRealEstateListingSchema(input),
      organization: buildOrganizationSchema(input),
      faqPage: buildFAQPageSchema(faqs),
      localBusiness: buildLocalBusinessSchema(input),
    };
    if (breadcrumb) schemas.breadcrumbList = breadcrumb;

    const htmlSnippet = buildHTMLSnippet(schemas);

    return NextResponse.json({ schemas, htmlSnippet });
  } catch (error) {
    console.error("Schema generator error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Schema generation failed",
      },
      { status: 500 }
    );
  }
}
