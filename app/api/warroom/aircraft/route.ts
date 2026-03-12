import { NextResponse } from "next/server";
import type { AircraftState, AircraftResponse } from "@/lib/warroom/types";
import { requireTier } from "@/lib/auth/require-tier";

const MILITARY_CALLSIGN_PREFIXES = [
  "RCH",    // USAF Air Mobility Command
  "RRR",    // RAF
  "CNV",    // US Navy
  "FORTE",  // RQ-4 Global Hawk
  "JAKE",   // RC-135 Rivet Joint
  "NATO",   // NATO
  "DUKE",   // USAF Special Ops
  "EVAC",   // Medical Evacuation
  "CASA",   // Spanish Air Force
  "IAM",    // Italian Air Force
  "GAF",    // German Air Force
  "FAF",    // French Air Force
  "PLF",    // Polish Air Force
  "TUAF",   // Turkish Air Force
  "SHF",    // Swedish Air Force
  "HRZ",    // Croatian Air Force
  "BAF",    // Belgian Air Force
  "HAF",    // Hellenic Air Force
  "RFR",    // French Air Force (alt)
  "LAGR",   // USAF tanker
  "NCHO",   // NATO AWACS
  "HOMER",  // P-8 Poseidon
  "TOPCAT", // E-6B Mercury
];

function isMilitaryCallsign(callsign: string): boolean {
  const cs = callsign.trim().toUpperCase();
  return MILITARY_CALLSIGN_PREFIXES.some((prefix) => cs.startsWith(prefix));
}

export async function GET() {
  const tierCheck = await requireTier("free");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const res = await fetch("https://opensky-network.org/api/states/all", {
      next: { revalidate: 15 },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      // Return 200 with empty data so SWR can consume it (SWR throws on non-2xx)
      return NextResponse.json(
        { aircraft: [], timestamp: Date.now(), totalCount: 0, militaryCount: 0, error: "upstream_unavailable" }
      );
    }

    const data = await res.json();
    const states: unknown[][] = data.states || [];

    const aircraft: AircraftState[] = [];
    let militaryCount = 0;

    for (const s of states) {
      const lat = s[6] as number | null;
      const lng = s[5] as number | null;
      const onGround = s[8] as boolean;
      const callsign = ((s[1] as string) || "").trim();

      // Filter: must have position, must be airborne
      if (lat == null || lng == null || onGround) continue;

      const mil = isMilitaryCallsign(callsign);
      if (mil) militaryCount++;

      aircraft.push({
        icao24: s[0] as string,
        callsign,
        originCountry: (s[2] as string) || "",
        lat,
        lng,
        altitude: (s[7] as number) || 0,
        velocity: (s[9] as number) || 0,
        heading: (s[10] as number) || 0,
        onGround: false,
        isMilitary: mil,
      });
    }

    const response: AircraftResponse = {
      aircraft,
      timestamp: (data.time || Math.floor(Date.now() / 1000)) * 1000,
      totalCount: aircraft.length,
      militaryCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Aircraft API error:", error);
    // Return 200 with empty data so SWR can consume it (SWR throws on non-2xx)
    return NextResponse.json(
      { aircraft: [], timestamp: Date.now(), totalCount: 0, militaryCount: 0, error: "fetch_failed" }
    );
  }
}
