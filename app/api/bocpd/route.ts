import { NextRequest, NextResponse } from "next/server";
import { getBOCPDSnapshot } from "@/lib/bocpd";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const { searchParams } = new URL(request.url);
    const stream = searchParams.get("stream") || undefined;

    const validStreams = ["vix", "gold", "oil", "yield", "dxy", "signals"];
    if (stream && !validStreams.includes(stream)) {
      return NextResponse.json(
        { error: `Invalid stream. Valid: ${validStreams.join(", ")}` },
        { status: 400 }
      );
    }

    const snapshot = await getBOCPDSnapshot(stream);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("[BOCPD] Error:", error);
    return NextResponse.json(
      {
        streams: [],
        recentChangePoints: [],
        activeRegimes: 0,
        generatedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
