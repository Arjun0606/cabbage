/**
 * Real estate search queries for AI Visibility (GEO) monitoring.
 * These are the queries Indian home buyers actually type into Google and LLMs.
 * Grouped by city. Expand as we add more cities.
 */

export const REAL_ESTATE_QUERIES = {
  hyderabad: [
    "best 2BHK apartments in Hyderabad under 80 lakhs",
    "best 3BHK apartments in Kompally Hyderabad",
    "top builders in Hyderabad 2026",
    "luxury apartments Banjara Hills Hyderabad",
    "affordable flats in Kukatpally Hyderabad",
    "RERA approved projects Hyderabad",
    "new launch apartments Hyderabad 2026",
    "gated community villas Hyderabad",
    "best residential projects near financial district Hyderabad",
    "apartments near Hitech City under 1 crore",
  ],
  bangalore: [
    "best 3BHK apartments in Whitefield Bangalore",
    "top builders in Bangalore 2026",
    "luxury apartments Sarjapur Road",
    "affordable flats in Electronic City Bangalore",
    "new launch projects Bangalore 2026",
    "apartments near Bellandur under 1.5 crore",
    "gated community apartments Hebbal Bangalore",
    "RERA approved projects Bangalore",
    "best residential projects near ORR Bangalore",
    "premium apartments HSR Layout",
  ],
  chennai: [
    "best apartments in OMR Chennai",
    "top builders in Chennai 2026",
    "luxury flats in Anna Nagar Chennai",
    "affordable apartments Porur Chennai",
    "new launch residential projects Chennai 2026",
    "RERA approved projects Chennai",
    "gated community villas ECR Chennai",
    "apartments near IT corridor Chennai",
    "3BHK flats Velachery under 1 crore",
    "premium apartments Adyar Chennai",
  ],
} as const;

export const ALL_QUERIES = Object.values(REAL_ESTATE_QUERIES).flat();

/**
 * Real-estate-specific SEO checks beyond standard Lighthouse.
 * These are what make CabbageSEO vertical, not horizontal.
 */
export const REAL_ESTATE_SEO_CHECKS = [
  { id: "rera_visible", label: "RERA number visible on page", category: "Compliance", weight: "critical" },
  { id: "price_band_clear", label: "Price range clearly displayed", category: "Conversion", weight: "high" },
  { id: "floor_plan_present", label: "Floor plans present and optimized", category: "Content", weight: "high" },
  { id: "location_map", label: "Location map / proximity to landmarks", category: "Content", weight: "medium" },
  { id: "emi_calculator", label: "EMI calculator or loan info present", category: "Conversion", weight: "medium" },
  { id: "schema_realestate", label: "RealEstateListing schema markup", category: "Technical", weight: "high" },
  { id: "project_status", label: "Project status (under construction / ready)", category: "Content", weight: "medium" },
  { id: "builder_info", label: "Builder credibility section (past projects, awards)", category: "Trust", weight: "medium" },
  { id: "virtual_tour", label: "360 tour or video walkthrough", category: "Content", weight: "low" },
  { id: "contact_cta", label: "Contact/enquiry CTA above the fold", category: "Conversion", weight: "critical" },
  { id: "whatsapp_link", label: "WhatsApp quick-connect link", category: "Conversion", weight: "high" },
  { id: "testimonials", label: "Buyer testimonials present", category: "Trust", weight: "medium" },
] as const;
