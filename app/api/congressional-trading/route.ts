import { NextRequest, NextResponse } from "next/server";
import { getTradingSnapshot, getTradesForTicker } from "@/lib/congressional-trading";

export async function GET(req: NextRequest) {
  try {
    const ticker = req.nextUrl.searchParams.get("ticker");

    if (ticker) {
      const trades = await getTradesForTicker(ticker);
      return NextResponse.json(trades);
    }

    const snapshot = await getTradingSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Congressional trading API error:", error);
    return NextResponse.json({
      congressional: { recent: [], topBuys: [], topSells: [], byParty: {}, byChamber: {} },
      insider: { recent: [], clusterBuys: [], buyRatio: 0.5, topSectors: [] },
    });
  }
}
