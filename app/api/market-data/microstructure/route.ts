import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { snapshotAndStore } from "@/lib/market-data/orderbook";

export async function GET(request: Request) {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const metrics = await snapshotAndStore(symbol);
    return NextResponse.json(metrics);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
