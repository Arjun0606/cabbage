/**
 * Curated list of India's top residential real estate developers.
 * Used by the /benchmark cron to produce a monthly GEO ranking.
 *
 * Keep this stable — it's the universe of the public leaderboard.
 * Each entry maps to a brand + primary city. We run 3 queries on
 * ChatGPT + Gemini per (brand, city) and store the mention rate.
 *
 * New entries require:
 *  - An actual residential presence in the city
 *  - A recognizable brand name (not just one subsidiary)
 */

export interface BenchmarkDeveloper {
  slug: string;
  brand: string;
  city: string;
  tier: "national" | "regional";
}

export const BENCHMARK_DEVELOPERS: BenchmarkDeveloper[] = [
  // Bangalore
  { slug: "prestige-bangalore", brand: "Prestige Group", city: "Bangalore", tier: "national" },
  { slug: "sobha-bangalore", brand: "Sobha Limited", city: "Bangalore", tier: "national" },
  { slug: "brigade-bangalore", brand: "Brigade Group", city: "Bangalore", tier: "national" },
  { slug: "godrej-bangalore", brand: "Godrej Properties", city: "Bangalore", tier: "national" },
  { slug: "embassy-bangalore", brand: "Embassy Group", city: "Bangalore", tier: "national" },
  { slug: "puravankara-bangalore", brand: "Puravankara", city: "Bangalore", tier: "regional" },

  // Mumbai
  { slug: "lodha-mumbai", brand: "Lodha Group", city: "Mumbai", tier: "national" },
  { slug: "oberoi-mumbai", brand: "Oberoi Realty", city: "Mumbai", tier: "national" },
  { slug: "hiranandani-mumbai", brand: "Hiranandani", city: "Mumbai", tier: "national" },
  { slug: "kalpataru-mumbai", brand: "Kalpataru Limited", city: "Mumbai", tier: "regional" },
  { slug: "godrej-mumbai", brand: "Godrej Properties", city: "Mumbai", tier: "national" },
  { slug: "rustomjee-mumbai", brand: "Rustomjee", city: "Mumbai", tier: "regional" },

  // Delhi NCR (Gurgaon / Noida)
  { slug: "dlf-gurgaon", brand: "DLF", city: "Gurgaon", tier: "national" },
  { slug: "m3m-gurgaon", brand: "M3M", city: "Gurgaon", tier: "national" },
  { slug: "godrej-gurgaon", brand: "Godrej Properties", city: "Gurgaon", tier: "national" },
  { slug: "signature-gurgaon", brand: "Signature Global", city: "Gurgaon", tier: "regional" },
  { slug: "atsz-noida", brand: "ATS Group", city: "Noida", tier: "regional" },
  { slug: "godrej-noida", brand: "Godrej Properties", city: "Noida", tier: "national" },

  // Hyderabad
  { slug: "mypras-hyderabad", brand: "My Home Constructions", city: "Hyderabad", tier: "regional" },
  { slug: "aparna-hyderabad", brand: "Aparna Constructions", city: "Hyderabad", tier: "regional" },
  { slug: "prestige-hyderabad", brand: "Prestige Group", city: "Hyderabad", tier: "national" },
  { slug: "rajapushpa-hyderabad", brand: "Rajapushpa Properties", city: "Hyderabad", tier: "regional" },
  { slug: "urbanrise-hyderabad", brand: "Urbanrise", city: "Hyderabad", tier: "regional" },

  // Chennai
  { slug: "casagrand-chennai", brand: "Casagrand", city: "Chennai", tier: "regional" },
  { slug: "urbanrise-chennai", brand: "Urbanrise", city: "Chennai", tier: "regional" },
  { slug: "arun-chennai", brand: "Arun Excello", city: "Chennai", tier: "regional" },
  { slug: "tvs-chennai", brand: "TVS Emerald", city: "Chennai", tier: "regional" },

  // Pune
  { slug: "kolte-pune", brand: "Kolte-Patil Developers", city: "Pune", tier: "regional" },
  { slug: "gera-pune", brand: "Gera Developments", city: "Pune", tier: "regional" },
  { slug: "goel-pune", brand: "Goel Ganga Group", city: "Pune", tier: "regional" },
  { slug: "kalpataru-pune", brand: "Kalpataru Limited", city: "Pune", tier: "regional" },

  // Ahmedabad
  { slug: "savvy-ahmedabad", brand: "Savvy Group", city: "Ahmedabad", tier: "regional" },
  { slug: "godrej-ahmedabad", brand: "Godrej Properties", city: "Ahmedabad", tier: "national" },

  // Kolkata
  { slug: "merlin-kolkata", brand: "Merlin Group", city: "Kolkata", tier: "regional" },
  { slug: "pride-kolkata", brand: "PS Group", city: "Kolkata", tier: "regional" },
];

export function getBenchmarkCities(): string[] {
  return Array.from(new Set(BENCHMARK_DEVELOPERS.map((d) => d.city))).sort();
}
