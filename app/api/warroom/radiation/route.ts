import { NextResponse } from "next/server";
import type { RadiationResponse } from "@/lib/warroom/types";
import { requireTier } from "@/lib/auth/require-tier";
import { fetchSafecastData, SEED_READINGS, ELEVATED_THRESHOLD } from "@/lib/warroom/radiation";

export async function GET() {
  const tierCheck = await requireTier("free");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const readings = await fetchSafecastData();
    const data = readings.length > 0 ? readings : SEED_READINGS;
    const elevatedCount = data.filter((r) => r.value > ELEVATED_THRESHOLD).length;

    const response: RadiationResponse = {
      readings: data,
      timestamp: Date.now(),
      totalCount: data.length,
      elevatedCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Radiation API error:", error);
    return NextResponse.json({
      readings: SEED_READINGS,
      timestamp: Date.now(),
      totalCount: SEED_READINGS.length,
      elevatedCount: 0,
    } as RadiationResponse);
  }
}
