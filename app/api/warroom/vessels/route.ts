import { NextResponse } from "next/server";
import type { VesselResponse } from "@/lib/warroom/types";
import { requireTier } from "@/lib/auth/require-tier";
import { generateVessels } from "@/lib/warroom/vessels";

export async function GET() {
  const tierCheck = await requireTier("free");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const vessels = generateVessels();
    const militaryCount = vessels.filter((v) => v.vesselType === "military").length;

    const response: VesselResponse = {
      vessels,
      timestamp: Date.now(),
      totalCount: vessels.length,
      militaryCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Vessel API error:", error);
    return NextResponse.json(
      { vessels: [], timestamp: Date.now(), totalCount: 0, militaryCount: 0 } as VesselResponse,
      { status: 200 }
    );
  }
}
