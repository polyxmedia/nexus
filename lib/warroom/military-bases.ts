/**
 * Military Base Registry
 *
 * Stores military installation locations from OpenStreetMap.
 * Used to cross-reference NASA FIRMS fire detections against known military sites.
 * A fire within 2km of a base center is flagged as a military fire.
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface MilitaryBase {
  id: number;
  name: string;
  type: string; // airfield, barracks, base, naval_base, training_area, range
  lat: number;
  lng: number;
  country: string;
  osmId: number;
}

// ── Table Creation (run once) ──

export async function ensureMilitaryBasesTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS military_bases (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'unnamed',
      type TEXT NOT NULL,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      country TEXT NOT NULL DEFAULT '',
      osm_id BIGINT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT NOW()
    )
  `);
  // Spatial index for fast distance queries
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_military_bases_lat_lng ON military_bases (lat, lng)
  `);
}

// ── Ingest from OpenStreetMap Overpass API ──

interface OverpassElement {
  type: string;
  id: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const MILITARY_TYPES = ["airfield", "barracks", "base", "naval_base", "training_area", "range", "checkpoint"];
const OVERPASS_API = "https://overpass-api.de/api/interpreter";

/**
 * Fetch military installations from OSM Overpass API by region bounding box.
 * Returns center coordinates for each installation.
 */
async function fetchRegion(south: number, west: number, north: number, east: number): Promise<OverpassElement[]> {
  const typeFilter = MILITARY_TYPES.map((t) => `way["military"="${t}"](${south},${west},${north},${east});`).join("");
  const query = `[out:json][timeout:60];(${typeFilter});out center tags;`;

  const res = await fetch(OVERPASS_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
  const json = await res.json();
  return (json.elements || []) as OverpassElement[];
}

// Split the world into regional bounding boxes to avoid Overpass timeouts
const REGIONS: Array<{ name: string; bbox: [number, number, number, number] }> = [
  { name: "Middle East", bbox: [12, 25, 45, 65] },
  { name: "Europe", bbox: [35, -12, 72, 45] },
  { name: "East Asia", bbox: [15, 95, 55, 150] },
  { name: "South Asia", bbox: [5, 60, 40, 100] },
  { name: "Africa", bbox: [-35, -20, 38, 55] },
  { name: "North America", bbox: [15, -170, 72, -50] },
  { name: "South America", bbox: [-56, -82, 15, -34] },
  { name: "Oceania", bbox: [-50, 110, 0, 180] },
  { name: "Central Asia", bbox: [35, 45, 55, 95] },
];

/**
 * Full ingest: fetch all regions from OSM and upsert into military_bases table.
 * Takes ~2-3 minutes due to Overpass rate limits (1 request at a time, 5s between).
 */
export async function ingestMilitaryBases(): Promise<{ total: number; regions: Record<string, number> }> {
  await ensureMilitaryBasesTable();

  const regionCounts: Record<string, number> = {};
  let total = 0;

  for (const region of REGIONS) {
    try {
      const elements = await fetchRegion(...region.bbox);
      let inserted = 0;

      for (const el of elements) {
        if (!el.center || !el.tags?.military) continue;

        const name = el.tags.name || el.tags["name:en"] || "unnamed";
        const type = el.tags.military;
        const lat = el.center.lat;
        const lng = el.center.lon;
        const country = el.tags["addr:country"] || el.tags["is_in:country"] || "";

        await db.execute(sql`
          INSERT INTO military_bases (name, type, lat, lng, country, osm_id)
          VALUES (${name}, ${type}, ${lat}, ${lng}, ${country}, ${el.id})
          ON CONFLICT (osm_id) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            country = EXCLUDED.country
        `);
        inserted++;
      }

      regionCounts[region.name] = inserted;
      total += inserted;
      console.log(`[Military Bases] ${region.name}: ${inserted} bases ingested`);

      // Respect Overpass rate limits
      await new Promise((r) => setTimeout(r, 5000));
    } catch (err) {
      console.error(`[Military Bases] ${region.name} failed:`, err);
      regionCounts[region.name] = 0;
    }
  }

  return { total, regions: regionCounts };
}

// ── Query ──

/** Get all military base coordinates for fire cross-referencing. */
export async function getAllBaseCoordinates(): Promise<Array<{ lat: number; lng: number; name: string; type: string }>> {
  const rows = await db.execute(sql`
    SELECT lat, lng, name, type FROM military_bases
  `);
  return (rows.rows || []) as Array<{ lat: number; lng: number; name: string; type: string }>;
}

/** Get base count. */
export async function getBaseCount(): Promise<number> {
  const rows = await db.execute(sql`SELECT COUNT(*) as count FROM military_bases`);
  return Number((rows.rows?.[0] as { count: string })?.count || 0);
}
