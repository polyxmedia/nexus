import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { getVipDatabase, getVipLabel, getVipPriority } from "@/lib/vip-aircraft/database";
import type { VipAircraftState, VipAircraftResponse } from "@/lib/warroom/types";

export async function GET() {
  const tierCheck = await requireTier("analyst");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const db = await getVipDatabase();
    if (db.size === 0) {
      return NextResponse.json({
        aircraft: [],
        timestamp: Date.now(),
        totalCount: 0,
      } satisfies VipAircraftResponse);
    }

    // Query adsb.lol for all currently airborne VIP aircraft
    // Batch by querying the full military + PIA + LADD endpoints,
    // then cross-reference against our VIP database
    const [milRes, piaRes, laddRes] = await Promise.allSettled([
      fetch("https://api.adsb.lol/v2/mil", { next: { revalidate: 30 } }),
      fetch("https://api.adsb.lol/v2/pia", { next: { revalidate: 30 } }),
      fetch("https://api.adsb.lol/v2/ladd", { next: { revalidate: 30 } }),
    ]);

    const allAircraft: Record<string, unknown>[] = [];

    for (const result of [milRes, piaRes, laddRes]) {
      if (result.status === "fulfilled" && result.value.ok) {
        try {
          const data = await result.value.json();
          if (data.ac && Array.isArray(data.ac)) {
            allAircraft.push(...data.ac);
          }
        } catch {
          // Skip malformed responses
        }
      }
    }

    // Also query adsb.lol for specific high-priority hex codes not in mil/pia/ladd
    // (government civilian aircraft, oligarch jets)
    // Take top 100 highest priority entries to stay within reasonable request sizes
    const highPriority = Array.from(db.values())
      .sort((a, b) => getVipPriority(a.category) - getVipPriority(b.category))
      .slice(0, 200);

    // Batch hex lookups in groups of 50
    const hexBatches: string[][] = [];
    const seenHex = new Set(allAircraft.map((ac) => String(ac.hex || "").toLowerCase()));
    const unseen = highPriority.filter((e) => !seenHex.has(e.icao24));

    for (let i = 0; i < unseen.length; i += 50) {
      hexBatches.push(unseen.slice(i, i + 50).map((e) => e.icao24));
    }

    const hexResults = await Promise.allSettled(
      hexBatches.map((batch) =>
        fetch(`https://api.adsb.lol/v2/hex/${batch.join(",")}`, {
          next: { revalidate: 30 },
        }).then((r) => (r.ok ? r.json() : null))
      )
    );

    for (const result of hexResults) {
      if (result.status === "fulfilled" && result.value?.ac) {
        allAircraft.push(...result.value.ac);
      }
    }

    // Cross-reference against VIP database
    const vipAircraft: VipAircraftState[] = [];
    const addedHex = new Set<string>();

    for (const ac of allAircraft) {
      const hex = String(ac.hex || "").toLowerCase().trim();
      if (!hex || addedHex.has(hex)) continue;

      const entry = db.get(hex);
      if (!entry) continue;

      const lat = ac.lat as number | undefined;
      const lon = ac.lon as number | undefined;
      if (lat == null || lon == null) continue;

      addedHex.add(hex);
      vipAircraft.push({
        icao24: hex,
        callsign: String(ac.flight || "").trim(),
        registration: entry.registration || String(ac.reg || ""),
        lat,
        lng: lon,
        altitude: (ac.alt_baro as number) || (ac.alt_geom as number) || 0,
        velocity: (ac.gs as number) || 0,
        heading: (ac.track as number) || 0,
        onGround: (ac.alt_baro as string) === "ground",
        owner: getVipLabel(entry),
        operator: entry.operator,
        category: entry.category,
        aircraftType: entry.type,
        icaoType: entry.icaoType,
        cmpg: entry.cmpg,
        tag1: entry.tag1,
        tag2: entry.tag2,
        priority: getVipPriority(entry.category),
      });
    }

    // Sort by priority (heads of state first)
    vipAircraft.sort((a, b) => a.priority - b.priority);

    return NextResponse.json({
      aircraft: vipAircraft,
      timestamp: Date.now(),
      totalCount: vipAircraft.length,
    } satisfies VipAircraftResponse);
  } catch (error) {
    console.error("[VIP Aircraft] API error:", error);
    return NextResponse.json({
      aircraft: [],
      timestamp: Date.now(),
      totalCount: 0,
    } satisfies VipAircraftResponse);
  }
}
