import { NextRequest, NextResponse } from "next/server";
import { getGEXSnapshot } from "@/lib/gex";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker");

    const validTickers = ["SPY", "QQQ", "IWM"];
    if (ticker && !validTickers.includes(ticker.toUpperCase())) {
      return NextResponse.json(
        { error: `Invalid ticker. Supported: ${validTickers.join(", ")}` },
        { status: 400 }
      );
    }

    const snapshot = await getGEXSnapshot(ticker || undefined);
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message, summaries: [], aggregateRegime: "neutral", lastUpdated: new Date().toISOString() },
      { status: 500 }
    );
  }
}
