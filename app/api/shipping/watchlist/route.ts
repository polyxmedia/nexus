import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireTier } from "@/lib/auth/require-tier";
import { findVessels, getVesselsByMmsi } from "@/lib/warroom/vessels";

async function getWatchlist(username: string): Promise<string[]> {
  const rows = await db.select().from(schema.settings)
    .where(eq(schema.settings.key, `${username}:vessel_watchlist`));
  if (rows.length === 0) return [];
  try { return JSON.parse(rows[0].value); } catch { return []; }
}

async function saveWatchlist(username: string, mmsiList: string[]): Promise<void> {
  const key = `${username}:vessel_watchlist`;
  const value = JSON.stringify(mmsiList);
  await db.insert(schema.settings).values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value } });
}

// GET - return watched vessels, or search for vessels to add
export async function GET(req: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const search = req.nextUrl.searchParams.get("search");
  if (search && search.trim().length >= 2) {
    const results = findVessels(search.trim()).map((v) => ({
      mmsi: v.mmsi,
      name: v.name,
      type: v.vesselType,
      flag: v.flag,
    }));
    return NextResponse.json({ results });
  }

  const mmsiList = await getWatchlist(tierCheck.result.username);
  const vessels = mmsiList.length > 0 ? getVesselsByMmsi(mmsiList) : [];

  return NextResponse.json({ vessels, mmsiList });
}

// POST - add vessel to watchlist (by MMSI or search by name)
export async function POST(req: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const body = await req.json();
  const { query } = body as { query?: string };

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ error: "query (MMSI or vessel name) required" }, { status: 400 });
  }

  // Search for matching vessels
  const matches = findVessels(query.trim());
  if (matches.length === 0) {
    return NextResponse.json({ error: "No vessels found matching query" }, { status: 404 });
  }

  // If searching by name and multiple matches, return them for selection
  if (matches.length > 1 && !/^\d+$/.test(query.trim())) {
    return NextResponse.json({
      matches: matches.map((v) => ({ mmsi: v.mmsi, name: v.name, type: v.vesselType, flag: v.flag })),
    });
  }

  // Add the first match (or exact MMSI match)
  const vessel = matches[0];
  const username = tierCheck.result.username;
  const current = await getWatchlist(username);

  if (current.includes(vessel.mmsi)) {
    return NextResponse.json({ error: "Vessel already on watchlist" }, { status: 409 });
  }

  current.push(vessel.mmsi);
  await saveWatchlist(username, current);

  return NextResponse.json({ added: vessel.mmsi, name: vessel.name, vessels: getVesselsByMmsi(current) });
}

// DELETE - remove vessel from watchlist
export async function DELETE(req: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const body = await req.json();
  const { mmsi } = body as { mmsi?: string };

  if (!mmsi) {
    return NextResponse.json({ error: "mmsi required" }, { status: 400 });
  }

  const username = tierCheck.result.username;
  const current = await getWatchlist(username);
  const updated = current.filter((m) => m !== mmsi);
  await saveWatchlist(username, updated);

  return NextResponse.json({ removed: mmsi, vessels: getVesselsByMmsi(updated) });
}
