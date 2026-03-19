import { NextResponse } from "next/server";
import type { FireResponse } from "@/lib/warroom/types";
import { requireTier } from "@/lib/auth/require-tier";
import { fetchFirmsData, SEED_FIRES } from "@/lib/warroom/fires";

export async function GET() {
  const tierCheck = await requireTier("free");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const fires = await fetchFirmsData();
    const data = fires.length > 0 ? fires : SEED_FIRES;
    const highConfidenceCount = data.filter((f) => f.confidence === "high").length;

    const response: FireResponse = {
      fires: data,
      timestamp: Date.now(),
      totalCount: data.length,
      highConfidenceCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Fire API error:", error);
    return NextResponse.json({
      fires: SEED_FIRES,
      timestamp: Date.now(),
      totalCount: SEED_FIRES.length,
      highConfidenceCount: SEED_FIRES.filter((f) => f.confidence === "high").length,
    } as FireResponse);
  }
}
