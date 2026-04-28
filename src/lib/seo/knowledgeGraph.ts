/**
 * Brand knowledge graph builder.
 *
 * Emits a single connected JSON-LD graph linking the developer
 * (Organization) → the cities they serve (Place) → each project
 * (Residence + RealEstateListing) → amenities (LocationFeatureSpecification).
 *
 * AI overviews and search engines parse @id-linked graphs more reliably
 * than disconnected per-page schema. This is the GEO frontier most
 * tools haven't attempted — a structured, traversable representation of
 * the brand the AI can use to answer "which Lodha projects in
 * Bengaluru offer 3 BHK under ₹4 cr" in a single hop instead of
 * stitching across separate pages.
 *
 * Everything is built from data the customer already provided
 * (companies / projects / cities) and validated before emission. No
 * synthetic enrichment.
 */

import { validateSchema } from "./articleSchema";

export interface KGCompany {
  id: string;
  name: string;
  website: string;
  description?: string | null;
  cities?: string[] | null;
  founded?: number | null;
}

export interface KGProject {
  id: string;
  name: string;
  location: string | null;
  configurations: string | null;
  price_range: string | null;
  rera_number: string | null;
  amenities: string | null;
  status: string | null;
  website?: string | null;
}

export interface KGBundle {
  graph: Record<string, unknown>;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    nodeCount: number;
  };
}

const BASE_ID = "https://cabbge.com/kg";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "x";
}

function organizationNode(company: KGCompany): Record<string, unknown> {
  return {
    "@type": "Organization",
    "@id": `${BASE_ID}/${slugify(company.name)}#org`,
    name: company.name,
    ...(company.website ? { url: company.website } : {}),
    ...(company.description ? { description: company.description.slice(0, 500) } : {}),
    ...(company.founded ? { foundingDate: `${company.founded}` } : {}),
  };
}

function cityNode(cityName: string, companySlug: string): Record<string, unknown> {
  return {
    "@type": "City",
    "@id": `${BASE_ID}/${companySlug}/city/${slugify(cityName)}`,
    name: cityName,
    addressCountry: "IN",
  };
}

function residenceNode(
  project: KGProject,
  companySlug: string,
  companyOrgId: string,
  cityNodes: Map<string, string>,
): Record<string, unknown> {
  const projSlug = slugify(project.name);
  const node: Record<string, unknown> = {
    "@type": "Residence",
    "@id": `${BASE_ID}/${companySlug}/project/${projSlug}`,
    name: project.name,
    builder: { "@id": companyOrgId },
  };

  if (project.location) {
    node.address = {
      "@type": "PostalAddress",
      addressLocality: project.location,
      addressCountry: "IN",
    };
    // Link to a city node when we recognise the locality's city.
    for (const [city, id] of cityNodes) {
      if (project.location.toLowerCase().includes(city.toLowerCase())) {
        node.containedInPlace = { "@id": id };
        break;
      }
    }
  }
  if (project.configurations) node.numberOfRooms = project.configurations;
  if (project.amenities) {
    const list = project.amenities
      .split(/[,;]/)
      .map((a) => a.trim())
      .filter((a) => a.length >= 2)
      .slice(0, 25);
    if (list.length > 0) {
      node.amenityFeature = list.map((a) => ({
        "@type": "LocationFeatureSpecification",
        name: a,
        value: true,
      }));
    }
  }
  if (project.rera_number) {
    node.identifier = {
      "@type": "PropertyValue",
      propertyID: "RERA",
      value: project.rera_number,
    };
  }

  return node;
}

function realEstateListingNode(
  project: KGProject,
  companySlug: string,
  companyOrgId: string,
  residenceId: string,
): Record<string, unknown> | null {
  const node: Record<string, unknown> = {
    "@type": "RealEstateListing",
    "@id": `${BASE_ID}/${companySlug}/listing/${slugify(project.name)}`,
    name: `${project.name} — ${project.configurations || "homes"}`,
    about: { "@id": residenceId },
    seller: { "@id": companyOrgId },
  };
  if (project.price_range) {
    const m = project.price_range.match(/([\d,.]+)\s*(cr|l|lac|lakh)/i);
    if (m) {
      let price = parseFloat(m[1].replace(/,/g, ""));
      const unit = m[2].toLowerCase();
      if (unit === "cr") price *= 1e7;
      else if (unit === "l" || unit === "lac" || unit === "lakh") price *= 1e5;
      if (Number.isFinite(price) && price > 0) {
        node.offers = {
          "@type": "Offer",
          priceCurrency: "INR",
          price,
        };
      }
    }
  }
  if (project.status) node.availability = project.status;
  // Skip listing nodes that don't carry any listing-grade fields beyond
  // their about + seller refs — they're noise.
  const hasOffers = !!node.offers;
  const hasStatus = !!node.availability;
  if (!hasOffers && !hasStatus) return null;
  return node;
}

export function buildKnowledgeGraph(company: KGCompany, projects: KGProject[]): KGBundle {
  const companySlug = slugify(company.name);
  const org = organizationNode(company);
  const orgId = org["@id"] as string;

  const cityList = (company.cities || []).filter((c): c is string => typeof c === "string" && c.trim().length > 0);
  const cityNodes = new Map<string, string>(); // city name → @id
  const cityNodesArr: Array<Record<string, unknown>> = [];
  for (const c of cityList) {
    const node = cityNode(c, companySlug);
    cityNodes.set(c, node["@id"] as string);
    cityNodesArr.push(node);
  }
  if (cityNodesArr.length > 0) {
    org.areaServed = cityNodesArr.map((c) => ({ "@id": c["@id"] }));
  }

  const projectNodes: Array<Record<string, unknown>> = [];
  const listingNodes: Array<Record<string, unknown>> = [];
  for (const p of projects) {
    if (!p.name) continue;
    const residence = residenceNode(p, companySlug, orgId, cityNodes);
    projectNodes.push(residence);
    const listing = realEstateListingNode(p, companySlug, orgId, residence["@id"] as string);
    if (listing) listingNodes.push(listing);
  }

  if (projectNodes.length > 0) {
    org.subOrganization = undefined; // not the right shape; keep relations on residences
  }

  const graph: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@graph": [org, ...cityNodesArr, ...projectNodes, ...listingNodes],
  };

  // Validate every node — collect aggregate errors / warnings.
  const errors: string[] = [];
  const warnings: string[] = [];
  let nodeCount = 1; // @graph wrapper itself isn't counted; nodes inside are.
  const allNodes = [org, ...cityNodesArr, ...projectNodes, ...listingNodes];
  for (const node of allNodes) {
    nodeCount += 1;
    // Wrap each node with a @context so validateSchema can verify it
    // standalone — KG entries don't carry their own @context.
    const v = validateSchema({ "@context": "https://schema.org", ...node });
    for (const e of v.errors) errors.push(`[${node["@type"]}] ${e}`);
    for (const w of v.warnings) warnings.push(`[${node["@type"]}] ${w}`);
  }

  return {
    graph,
    validation: {
      valid: errors.length === 0,
      errors,
      warnings,
      nodeCount,
    },
  };
}
