import { NextRequest, NextResponse } from "next/server";
import type { FireResponse } from "@/lib/warroom/types";
import { requireTier } from "@/lib/auth/require-tier";
import { fetchFirmsData, SEED_FIRES } from "@/lib/warroom/fires";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("free");
  if ("response" in tierCheck) return tierCheck.response;

  const { searchParams } = new URL(request.url);
  const days = Math.min(10, Math.max(1, parseInt(searchParams.get("days") || "10", 10)));

  try {
    const fires = await fetchFirmsData(days);
    const data = fires.length > 0 ? fires : SEED_FIRES;
    const highConfidenceCount = data.filter((f) => f.confidence === "high").length;
    const militaryCount = data.filter((f) => f.military).length;

    const response: FireResponse = {
      fires: data,
      timestamp: Date.now(),
      totalCount: data.length,
      highConfidenceCount,
      militaryCount,
      days,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Fire API error:", error);
    return NextResponse.json({
      fires: SEED_FIRES,
      timestamp: Date.now(),
      totalCount: SEED_FIRES.length,
      highConfidenceCount: SEED_FIRES.filter((f) => f.confidence === "high").length,
      militaryCount: 0,
      days: 1,
    } as FireResponse);
  }
}
