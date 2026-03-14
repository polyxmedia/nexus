import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { snapshotAndStore, getOrderBook, computeMicrostructure } from "@/lib/market-data/orderbook";

export async function GET(request: Request) {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const book = await getOrderBook(symbol);
    const metrics = computeMicrostructure(book);
    return NextResponse.json({ book: { bids: book.bids.slice(0, 20), asks: book.asks.slice(0, 20) }, metrics });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to fetch order book" }, { status: 500 });
  }
}
