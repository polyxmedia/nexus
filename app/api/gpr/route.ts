import { NextRequest, NextResponse } from "next/server";
import { getGPRSnapshot } from "@/lib/gpr";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionFilter = searchParams.get("region");

    const snapshot = await getGPRSnapshot();

    if (regionFilter) {
      const filtered = snapshot.regional.filter(
        (r) => r.region.toLowerCase() === regionFilter.toLowerCase()
      );
      return NextResponse.json({
        ...snapshot,
        regional: filtered,
      });
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[GPR API] Error:", message);
    return NextResponse.json(
      {
        current: {
          date: new Date().toISOString().split("T")[0],
          composite: 0,
          threats: 0,
          acts: 0,
          threatsToActsRatio: 1,
        },
        history: [],
        regional: [],
        thresholdCrossings: [],
        lastUpdated: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
