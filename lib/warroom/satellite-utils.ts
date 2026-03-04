import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLat,
  degreesLong,
} from "satellite.js";
import type { SatelliteCategory } from "./types";

export interface TleRecord {
  name: string;
  line1: string;
  line2: string;
}

/**
 * Parse raw 3-line TLE text into structured records.
 * Format: name line, TLE line 1, TLE line 2, repeated.
 */
export function parseTleData(rawTle: string): TleRecord[] {
  const lines = rawTle.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  const records: TleRecord[] = [];

  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    if (line1?.startsWith("1 ") && line2?.startsWith("2 ")) {
      records.push({ name, line1, line2 });
    }
  }

  return records;
}

/**
 * Propagate a TLE record to get lat/lng/alt at a given time.
 */
export function propagatePosition(
  tle: TleRecord,
  date: Date
): { lat: number; lng: number; alt: number; velocity: number } | null {
  try {
    const satrec = twoline2satrec(tle.line1, tle.line2);
    const result = propagate(satrec, date) as {
      position: { x: number; y: number; z: number } | false;
      velocity: { x: number; y: number; z: number } | false;
    } | null;

    if (!result || !result.position || !result.velocity) {
      return null;
    }

    const pos = result.position;
    const vel = result.velocity;
    if (typeof pos === "boolean" || typeof vel === "boolean") return null;

    const gmst = gstime(date);
    const geo = eciToGeodetic(pos, gmst);

    const velocity = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);

    return {
      lat: degreesLat(geo.latitude),
      lng: degreesLong(geo.longitude),
      alt: geo.height, // km
      velocity, // km/s
    };
  } catch {
    return null;
  }
}

/**
 * Generate orbit ground track points over one orbital period.
 */
export function computeOrbitPath(
  tle: TleRecord,
  steps = 120
): [number, number, number][] {
  try {
    const satrec = twoline2satrec(tle.line1, tle.line2);
    // Mean motion is in revolutions per day, orbital period in minutes
    const meanMotion = satrec.no * (1440 / (2 * Math.PI)); // rev/day
    const periodMinutes = meanMotion > 0 ? 1440 / meanMotion : 90;

    const now = new Date();
    const points: [number, number, number][] = [];

    for (let i = 0; i <= steps; i++) {
      const t = new Date(now.getTime() + (i / steps) * periodMinutes * 60_000);
      const result = propagate(satrec, t) as {
        position: { x: number; y: number; z: number } | false;
      } | null;

      if (!result || !result.position || typeof result.position === "boolean") continue;

      const gmst = gstime(t);
      const geo = eciToGeodetic(result.position, gmst);

      points.push([
        degreesLat(geo.latitude),
        degreesLong(geo.longitude),
        geo.height,
      ]);
    }

    return points;
  } catch {
    return [];
  }
}

// Extract NORAD catalog ID from TLE line 1
export function extractNoradId(line1: string): string {
  return line1.substring(2, 7).trim();
}

// Classify satellite by name/category group
export function classifySatellite(
  name: string,
  category: string
): { satCategory: SatelliteCategory; country: string } {
  const upper = name.toUpperCase();

  // Country detection
  let country = "Unknown";
  if (upper.includes("USA") || upper.includes("NOSS") || upper.includes("GSSAP")) country = "USA";
  else if (upper.includes("COSMOS") || upper.includes("GLONASS")) country = "Russia";
  else if (upper.includes("BEIDOU") || upper.includes("YAOGAN") || upper.includes("CZ-")) country = "China";
  else if (upper.includes("GALILEO")) country = "EU";
  else if (upper.includes("NAVSTAR") || upper.includes("GPS")) country = "USA";
  else if (upper.includes("STARLINK")) country = "USA";
  else if (upper.includes("INTELSAT") || upper.includes("SES")) country = "Intl";

  // Category classification
  let satCategory: SatelliteCategory = "other";
  if (category === "military") {
    satCategory = "military";
  } else if (category === "gnss" || category === "gps-ops" || category === "glo-ops" || category === "galileo" || category === "beidou") {
    satCategory = "navigation";
  } else if (category === "weather" || category === "noaa" || category === "goes") {
    satCategory = "weather";
  } else if (category === "geo" || category === "starlink" || category === "iridium") {
    satCategory = "comms";
  } else if (category === "stations" || category === "science") {
    satCategory = "science";
  } else if (
    upper.includes("NOSS") || upper.includes("USA ") ||
    upper.includes("GSSAP") || upper.includes("SBIRS") ||
    upper.includes("WGS") || upper.includes("AEHF") ||
    upper.includes("MUOS") || upper.includes("MILSTAR")
  ) {
    satCategory = "military";
  } else if (upper.includes("GPS") || upper.includes("NAVSTAR") || upper.includes("GLONASS") || upper.includes("GALILEO") || upper.includes("BEIDOU")) {
    satCategory = "navigation";
  } else if (upper.includes("NOAA") || upper.includes("GOES") || upper.includes("METEOSAT") || upper.includes("FENGYUN")) {
    satCategory = "weather";
  }

  return { satCategory, country };
}
