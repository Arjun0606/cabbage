/**
 * Google Places API integration — used to get REAL geographic data
 * rather than letting an LLM guess which neighbourhoods are near each
 * other (Kokapet and Banjara Hills are in the same city but ~15 km apart,
 * and the model happily called them "nearby").
 *
 * Uses the Places API (New) v1:
 *   - Text Search / Geocode → lat,lng for "Kokapet, Hyderabad"
 *   - Nearby Search → localities within a radius
 *
 * Requires GOOGLE_PLACES_API_KEY. When unset, all helpers return null
 * so callers can gracefully skip the data rather than fabricate.
 */

const PLACES_TEXT = "https://places.googleapis.com/v1/places:searchText";
const PLACES_NEARBY = "https://places.googleapis.com/v1/places:searchNearby";

function apiKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY || null;
}

export interface PlaceCoords {
  lat: number;
  lng: number;
  formattedAddress: string;
}

/**
 * Geocode a "locality, city" query into lat/lng coordinates.
 * Returns null if the Places API key isn't configured or the place
 * isn't found.
 */
export async function geocodeLocality(locality: string, city: string): Promise<PlaceCoords | null> {
  const key = apiKey();
  if (!key) return null;
  try {
    const res = await fetch(PLACES_TEXT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.location,places.formattedAddress,places.displayName",
      },
      body: JSON.stringify({
        textQuery: `${locality}, ${city}`,
        maxResultCount: 1,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place?.location) return null;
    return {
      lat: place.location.latitude,
      lng: place.location.longitude,
      formattedAddress: place.formattedAddress || "",
    };
  } catch {
    return null;
  }
}

/**
 * Real nearby localities within `radiusMeters`, sorted by distance.
 * Returns an empty array when the key is missing or the call fails —
 * callers should treat that as "we couldn't verify" rather than falling
 * through to an AI guess.
 */
export async function findNearbyLocalities(
  center: PlaceCoords,
  radiusMeters = 6000,
  maxResults = 10
): Promise<Array<{ name: string; type: string; distanceKm: number }>> {
  const key = apiKey();
  if (!key) return [];
  try {
    const res = await fetch(PLACES_NEARBY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.location,places.types,places.formattedAddress",
      },
      body: JSON.stringify({
        includedTypes: ["sublocality", "sublocality_level_1", "neighborhood", "locality"],
        maxResultCount: maxResults,
        locationRestriction: {
          circle: {
            center: { latitude: center.lat, longitude: center.lng },
            radius: radiusMeters,
          },
        },
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const out: Array<{ name: string; type: string; distanceKm: number }> = [];
    for (const p of data.places || []) {
      if (!p.location) continue;
      const distanceKm = haversineKm(
        center.lat,
        center.lng,
        p.location.latitude,
        p.location.longitude
      );
      out.push({
        name: p.displayName?.text || "",
        type: p.types?.[0] || "locality",
        distanceKm: Math.round(distanceKm * 10) / 10,
      });
    }
    return out
      .filter((p) => p.name && p.distanceKm > 0)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  } catch {
    return [];
  }
}

/**
 * Real nearby POIs (schools, hospitals, metro stations, IT parks) for a
 * given locality. Used by the Neighborhood panel to stop fabricating
 * named entities.
 */
export async function findNearbyPOIs(
  center: PlaceCoords,
  includedTypes: string[],
  radiusMeters = 5000,
  maxResults = 10
): Promise<Array<{ name: string; type: string; address: string; distanceKm: number }>> {
  const key = apiKey();
  if (!key) return [];
  try {
    const res = await fetch(PLACES_NEARBY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.location,places.types,places.formattedAddress",
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount: maxResults,
        locationRestriction: {
          circle: {
            center: { latitude: center.lat, longitude: center.lng },
            radius: radiusMeters,
          },
        },
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const out: Array<{ name: string; type: string; address: string; distanceKm: number }> = [];
    for (const p of data.places || []) {
      if (!p.location) continue;
      const distanceKm = haversineKm(
        center.lat,
        center.lng,
        p.location.latitude,
        p.location.longitude
      );
      out.push({
        name: p.displayName?.text || "",
        type: p.types?.[0] || "poi",
        address: p.formattedAddress || "",
        distanceKm: Math.round(distanceKm * 10) / 10,
      });
    }
    return out.filter((p) => p.name).sort((a, b) => a.distanceKm - b.distanceKm);
  } catch {
    return [];
  }
}

export function isPlacesConfigured(): boolean {
  return apiKey() !== null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
