/**
 * Comprehensive Indian real estate microlocation database.
 * This is CabbageSEO's vertical moat — no horizontal tool has this data.
 *
 * Structure: city → locality → nearby areas
 * Used for: programmatic SEO pages, local content generation,
 * keyword targeting, competitor analysis, buyer intent mapping.
 */

export const LOCALITIES: Record<string, Record<string, string[]>> = {
  // ============================================================
  // HYDERABAD
  // ============================================================
  hyderabad: {
    "Gachibowli": ["Financial District", "Nanakramguda", "Kondapur", "Madhapur", "Raidurgam"],
    "Kondapur": ["Gachibowli", "Madhapur", "Kothaguda", "Botanical Garden"],
    "Madhapur": ["HITEC City", "Kondapur", "Jubilee Hills", "Durgam Cheruvu"],
    "Kukatpally": ["KPHB Colony", "Miyapur", "Nizampet", "Pragathi Nagar", "Allwyn Colony"],
    "Miyapur": ["Chandanagar", "Hafeezpet", "JNTU", "Kukatpally", "Nizampet"],
    "Kompally": ["Bachupally", "Medchal", "Alwal", "Bowenpally", "Shamirpet"],
    "Bachupally": ["Kompally", "Nizampet", "Pragathi Nagar", "Miyapur"],
    "Kokapet": ["Narsingi", "Gandipet", "Puppalaguda", "Manikonda", "Financial District"],
    "Narsingi": ["Kokapet", "Gandipet", "Puppalaguda", "Rajendra Nagar"],
    "Shamshabad": ["Shadnagar", "Adibatla", "Maheshwaram", "Shamshabad Airport"],
    "Banjara Hills": ["Jubilee Hills", "Somajiguda", "Raj Bhavan", "Film Nagar"],
    "Jubilee Hills": ["Banjara Hills", "Madhapur", "Film Nagar", "Yousufguda"],
    "Uppal": ["LB Nagar", "Nacharam", "Habsiguda", "Tarnaka", "Ramanthapur"],
    "LB Nagar": ["Uppal", "Dilsukhnagar", "Saroornagar", "Nagole", "Kothapet"],
    "Beeramguda": ["Patancheru", "Miyapur", "Ameenpur", "Ramachandrapuram"],
    "Tellapur": ["Nallagandla", "Gachibowli", "Kollur", "Gopanpally"],
    "Kollur": ["Tellapur", "Nallagandla", "Gopanpally", "Mokila"],
    "Patancheru": ["Beeramguda", "Ameenpur", "Sangareddy", "Isnapur"],
    "Pocharam": ["Ghatkesar", "Uppal", "Keesara", "Boduppal"],
    "Adibatla": ["Shamshabad", "Maheshwaram", "Ibrahimpatnam", "Balapur"],
  },

  // ============================================================
  // BANGALORE
  // ============================================================
  bangalore: {
    "Whitefield": ["ITPL", "Varthur", "Kadugodi", "Brookefield", "Marathahalli"],
    "Sarjapur Road": ["Bellandur", "Marathahalli", "HSR Layout", "Kodathi", "Dommasandra"],
    "Electronic City": ["Bommasandra", "Hosur Road", "Chandapura", "Huskur"],
    "Kanakapura Road": ["JP Nagar", "Banashankari", "Gangasandra", "Talaghattapura"],
    "Hebbal": ["Yelahanka", "Sahakara Nagar", "Thanisandra", "Kogilu"],
    "Devanahalli": ["Airport Road", "Yelahanka", "Bagalur", "Chikkajala"],
    "HSR Layout": ["Bommanahalli", "Koramangala", "BTM Layout", "Sarjapur Road"],
    "Koramangala": ["HSR Layout", "Indiranagar", "BTM Layout", "Ejipura"],
    "Indiranagar": ["Koramangala", "CV Raman Nagar", "Old Airport Road", "Domlur"],
    "Bannerghatta Road": ["JP Nagar", "Arekere", "Gottigere", "Hulimavu"],
    "Thanisandra": ["Hebbal", "Nagavara", "Rachenahalli", "Jakkur"],
    "Hennur": ["Kalyan Nagar", "Banaswadi", "Ramamurthy Nagar", "Horamavu"],
    "Yelahanka": ["Devanahalli", "Hebbal", "Jakkur", "Sahakara Nagar"],
    "Rajajinagar": ["Malleswaram", "Basaveshwara Nagar", "Vijayanagar", "Mahalakshmi Layout"],
    "Tumkur Road": ["Yeshwanthpur", "Peenya", "Jalahalli", "Nagasandra"],
    "Old Madras Road": ["KR Puram", "Mahadevapura", "Budigere", "Hoskote"],
    "Hoskote": ["Budigere", "Narsapura", "Old Madras Road", "Chintamani Road"],
    "Attibele": ["Electronic City", "Chandapura", "Hosur Road", "Anekal"],
    "Mysore Road": ["Rajarajeshwari Nagar", "Kengeri", "Bidadi", "Jnanabharathi"],
    "Bellahalli": ["Thanisandra", "Jakkur", "Yelahanka", "Kogilu"],
  },

  // ============================================================
  // CHENNAI
  // ============================================================
  chennai: {
    "OMR": ["Sholinganallur", "Siruseri", "Padur", "Kelambakkam", "Thoraipakkam"],
    "Tambaram": ["Chromepet", "Pallavaram", "Guduvanchery", "Perungalathur"],
    "Porur": ["Ramapuram", "Mogappair", "Valasaravakkam", "Manapakkam"],
    "Thirumazhisai": ["Poonamallee", "Avadi", "Kundrathur", "Chembarambakkam"],
    "Madhavaram": ["Kolathur", "Villivakkam", "Perambur", "Manali"],
    "Anna Nagar": ["Kilpauk", "Aminjikarai", "Shenoy Nagar", "Arumbakkam"],
    "Velachery": ["Medavakkam", "Pallikaranai", "Nanganallur", "Adambakkam"],
    "Sholinganallur": ["OMR", "Karapakkam", "Perungudi", "Navalur"],
    "Perumbakkam": ["Medavakkam", "Kelambakkam", "Sholinganallur", "Pallikaranai"],
    "Siruseri": ["OMR", "Padur", "Kelambakkam", "Navallur", "SIPCOT IT Park"],
    "Poonamallee": ["Avadi", "Thirumazhisai", "Mangadu", "Kundrathur"],
    "Guduvanchery": ["Tambaram", "Urapakkam", "Vandalur", "Maraimalai Nagar"],
    "Medavakkam": ["Perumbakkam", "Velachery", "Sholinganallur", "Kovilambakkam"],
    "ECR": ["Neelankarai", "Injambakkam", "Kovalam", "Thiruvanmiyur"],
    "Pallavaram": ["Chromepet", "Tambaram", "Pammal", "Anakaputhur"],
    "Ambattur": ["Anna Nagar", "Mogappair", "Avadi", "Padi"],
    "Chromepet": ["Tambaram", "Pallavaram", "Pammal", "Hasthinapuram"],
    "Kelambakkam": ["OMR", "Padur", "Siruseri", "Perumbakkam"],
    "Maraimalai Nagar": ["Guduvanchery", "Singaperumal Koil", "Chengalpattu"],
    "Mahindra World City": ["Chengalpattu", "Guduvanchery", "Oragadam"],
  },

  // ============================================================
  // MUMBAI
  // ============================================================
  mumbai: {
    "Thane": ["Ghodbunder Road", "Majiwada", "Pokhran Road", "Manpada", "Kolshet"],
    "Navi Mumbai": ["Kharghar", "Panvel", "Vashi", "Airoli", "Belapur"],
    "Kharghar": ["Panvel", "Kamothe", "Ulwe", "Taloja"],
    "Panvel": ["Kharghar", "Kamothe", "New Panvel", "Kalamboli"],
    "Goregaon": ["Malad", "Kandivali", "Jogeshwari", "Oshiwara"],
    "Andheri": ["Jogeshwari", "Vile Parle", "Lokhandwala", "Oshiwara", "Versova"],
    "Borivali": ["Kandivali", "Dahisar", "Mira Road", "IC Colony"],
    "Worli": ["Lower Parel", "Prabhadevi", "Dadar", "Mahalaxmi"],
    "BKC": ["Bandra", "Kurla", "Kalina", "Santacruz"],
    "Powai": ["Chandivali", "Hiranandani", "IIT Bombay", "Vikhroli"],
    "Mulund": ["Thane", "Bhandup", "Nahur", "Kanjurmarg"],
    "Chembur": ["Ghatkopar", "Wadala", "Govandi", "Mankhurd"],
    "Mira Road": ["Bhayandar", "Dahisar", "Borivali"],
    "Vasai-Virar": ["Nalasopara", "Boisar", "Palghar"],
    "Dombivli": ["Kalyan", "Thane", "Ambernath", "Badlapur"],
    "Ulwe": ["Kharghar", "Navi Mumbai Airport", "Dronagiri"],
    "Kalyan": ["Dombivli", "Ambernath", "Shahad", "Titwala"],
    "Lower Parel": ["Worli", "Prabhadevi", "Elphinstone", "Mahalaxmi"],
    "Bandra": ["Khar", "Santacruz", "BKC", "Reclamation"],
    "Malad": ["Goregaon", "Kandivali", "Marve Road", "Aksa"],
  },

  // ============================================================
  // PUNE
  // ============================================================
  pune: {
    "Hinjewadi": ["Wakad", "Balewadi", "Mahalunge", "Rajiv Gandhi IT Park"],
    "Wakad": ["Hinjewadi", "Baner", "Pimple Saudagar", "Pimple Nilakh"],
    "Baner": ["Balewadi", "Pashan", "Aundh", "Sus Road"],
    "Kharadi": ["Viman Nagar", "Wagholi", "Chandan Nagar", "EON IT Park"],
    "Hadapsar": ["Magarpatta", "Fursungi", "Mundhwa", "NIBM"],
    "Wagholi": ["Kharadi", "Nagar Road", "Lonikand", "Bakori"],
    "NIBM": ["Kondhwa", "Undri", "Pisoli", "Hadapsar"],
    "Undri": ["NIBM", "Pisoli", "Handewadi", "Mohammed Wadi"],
    "Pimple Saudagar": ["Wakad", "Pimple Nilakh", "Pimple Gurav", "Rahatani"],
    "Aundh": ["Baner", "Pashan", "University Road", "Khadki"],
    "Koregaon Park": ["Mundhwa", "Kalyani Nagar", "Boat Club Road", "North Main Road"],
    "Viman Nagar": ["Kharadi", "Nagar Road", "Dhanori", "Lohegaon Airport"],
    "Tathawade": ["Hinjewadi", "Wakad", "Ravet", "Punawale"],
    "Bavdhan": ["Pashan", "NDA Road", "Lavale", "Pirangut"],
    "Talegaon": ["Lonavala", "Maval", "Hinjewadi (extended)"],
    "Ravet": ["Tathawade", "Akurdi", "Punawale", "Pcmc"],
    "Kondhwa": ["NIBM", "Wanowrie", "Katraj", "Bibwewadi"],
    "Ambegaon": ["Katraj", "Narhe", "Dhayari", "Sinhagad Road"],
    "Kothrud": ["Karve Nagar", "Warje", "Bavdhan", "Paud Road"],
    "Chakan": ["Rajgurunagar", "Talegaon", "Alandi", "MIDC"],
  },

  // ============================================================
  // DELHI NCR
  // ============================================================
  delhi_ncr: {
    "Gurgaon": ["Golf Course Road", "Sohna Road", "MG Road", "Dwarka Expressway"],
    "Noida": ["Sector 150", "Sector 137", "Sector 75", "Greater Noida West"],
    "Greater Noida": ["Noida Extension", "Yamuna Expressway", "Knowledge Park", "Pari Chowk"],
    "Dwarka Expressway": ["Gurgaon", "New Gurgaon", "Sector 99-115", "Pataudi Road"],
    "Golf Course Road": ["DLF Phase 5", "Sector 54", "Sector 56", "South City"],
    "Sohna Road": ["Sector 49", "South of Gurgaon", "Badshahpur", "Vatika"],
    "Sector 150 Noida": ["Sector 137", "Expressway", "Botanical Garden Metro"],
    "Greater Noida West": ["Noida Extension", "Gaur City", "Crossing Republik"],
    "Yamuna Expressway": ["Greater Noida", "Jewar Airport", "Sector Omega"],
    "New Gurgaon": ["Sectors 76-95", "SPR Road", "Dwarka Expressway"],
    "Faridabad": ["Sector 79-89", "Ballabgarh", "SRS Residency", "Neharpar"],
    "Ghaziabad": ["Indirapuram", "Vaishali", "Raj Nagar Extension", "Crossing Republik"],
    "Indirapuram": ["Vaishali", "Ghaziabad", "Noida Sector 62"],
    "Raj Nagar Extension": ["Ghaziabad", "NH-58", "Meerut Road"],
    "Bhiwadi": ["Alwar", "Dharuhera", "Neemrana", "SNB"],
  },

  // ============================================================
  // KOLKATA
  // ============================================================
  kolkata: {
    "Rajarhat": ["New Town", "Action Area I-III", "City Centre 2", "Eco Park"],
    "New Town": ["Rajarhat", "Action Area", "Eco Park", "Biswa Bangla"],
    "EM Bypass": ["Ruby", "Science City", "Anandapur", "Mukundapur"],
    "Garia": ["Narendrapur", "Baruipur", "Sonarpur", "Naktala"],
    "Salt Lake": ["Sector V", "Karunamoyee", "Bidhannagar", "City Centre"],
    "Howrah": ["Shibpur", "Liluah", "Belur", "Santragachi"],
    "Behala": ["Joka", "Thakurpukur", "Sakherbazar", "Silpara"],
    "Joka": ["Behala", "Diamond Harbour Road", "Thakurpukur"],
    "Barasat": ["Madhyamgram", "Airport Area", "Barrackpore"],
    "Madhyamgram": ["Barasat", "New Barrackpore", "Baranagar"],
  },

  // ============================================================
  // AHMEDABAD
  // ============================================================
  ahmedabad: {
    "SG Highway": ["Prahlad Nagar", "Bodakdev", "Thaltej", "Shilaj"],
    "Prahlad Nagar": ["SG Highway", "Satellite", "Bodakdev", "South Bopal"],
    "South Bopal": ["Ghuma", "Shela", "Ambli", "SG Highway"],
    "Shela": ["South Bopal", "Ghuma", "Sanand", "Bopal"],
    "Gota": ["Tragad", "Ognaj", "Sola", "Science City"],
    "Chandkheda": ["Motera", "New CG Road", "Tragad", "Gota"],
    "Motera": ["Chandkheda", "Sabarmati", "Adalaj", "Stadium"],
    "Tragad": ["Gota", "Chandkheda", "Sola", "Science City Road"],
    "Ambli": ["South Bopal", "Shilaj", "SG Highway", "Thaltej"],
    "Maninagar": ["Isanpur", "CTM", "Danilimda", "Kankaria"],
  },

  // ============================================================
  // KOCHI
  // ============================================================
  kochi: {
    "Kakkanad": ["Infopark", "SmartCity", "Thrikkakara", "Vazhakkala"],
    "Edappally": ["Lulu Mall", "Palarivattom", "Changampuzha Park"],
    "Marine Drive": ["MG Road", "Ernakulam Town", "Shanmugham Road"],
    "Aluva": ["Angamaly", "Perumbavoor", "Kalamassery"],
    "Thrissur Road": ["Angamaly", "Chalakudy", "Kodungallur"],
    "Tripunithura": ["Hill Palace", "Eroor", "Udayamperoor"],
    "Kalamassery": ["CUSAT", "HMT Colony", "Eloor"],
    "Maradu": ["Kundannoor", "Nettoor", "Aroor"],
  },

  // ============================================================
  // GOA
  // ============================================================
  goa: {
    "North Goa": ["Anjuna", "Vagator", "Assagao", "Siolim", "Calangute"],
    "Panaji": ["Dona Paula", "Bambolim", "Ribandar", "Miramar"],
    "Porvorim": ["Alto Porvorim", "Socorro", "Sangolda", "Pilerne"],
    "Mapusa": ["Assagao", "Moira", "Aldona", "Pomburpa"],
    "South Goa": ["Benaulim", "Colva", "Margao", "Varca", "Cavelossim"],
    "Margao": ["Fatorda", "Navelim", "Colva", "Benaulim"],
  },
};

/**
 * Get localities for a city. Falls back to empty object if city not found.
 */
export function getLocalities(city: string): Record<string, string[]> {
  const normalized = city.toLowerCase().replace(/[^a-z]/g, "_").replace(/_+/g, "_");
  return LOCALITIES[normalized] || LOCALITIES[city.toLowerCase()] || {};
}

/**
 * Get all nearby areas for a given location in a city.
 */
export function getNearbyAreas(city: string, location: string): string[] {
  const cityData = getLocalities(city);
  // Direct match
  if (cityData[location]) return cityData[location];

  // Fuzzy match — check if location is contained in any key
  for (const [key, nearby] of Object.entries(cityData)) {
    if (
      key.toLowerCase().includes(location.toLowerCase()) ||
      location.toLowerCase().includes(key.toLowerCase())
    ) {
      return nearby;
    }
  }

  return [];
}

/**
 * Get all cities we support.
 */
export function getSupportedCities(): string[] {
  return Object.keys(LOCALITIES);
}

/**
 * Real estate search query templates.
 * These get filled with city + locality + config + budget.
 */
export const QUERY_TEMPLATES = [
  "best {config} apartments in {locality} {city}",
  "top builders in {locality} {city} 2026",
  "{config} flats in {locality} under {budget}",
  "new launch projects {locality} {city}",
  "RERA approved {config} in {locality} {city}",
  "gated community apartments {locality}",
  "luxury apartments {locality} {city}",
  "affordable flats near {locality} {city}",
  "best residential projects in {city} 2026",
  "property prices in {locality} {city} 2026",
] as const;

/**
 * Generate city-specific search queries for AI Visibility.
 */
export function generateQueries(
  city: string,
  localities?: string[],
  configs?: string[],
  budgets?: string[]
): string[] {
  const cityLocalities = getLocalities(city);
  const locs = localities?.length ? localities : Object.keys(cityLocalities).slice(0, 5);
  const cfgs = configs?.length ? configs : ["2BHK", "3BHK"];
  const bdgs = budgets?.length ? budgets : ["80 lakhs", "1 crore", "1.5 crore"];

  const queries: string[] = [];

  for (const template of QUERY_TEMPLATES) {
    for (const loc of locs.slice(0, 3)) {
      const q = template
        .replace("{locality}", loc)
        .replace("{city}", city)
        .replace("{config}", cfgs[0])
        .replace("{budget}", bdgs[0]);
      queries.push(q);
    }
  }

  return [...new Set(queries)].slice(0, 30); // Dedupe, cap at 30
}
