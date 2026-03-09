import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { getIGClient } from "@/lib/ig/client";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json({ error: "q query parameter is required" }, { status: 400 });
    }

    const ig = await getIGClient();
    if (!ig) {
      return NextResponse.json({ error: "IG Markets not configured." }, { status: 400 });
    }

    const data = await ig.client.searchMarkets(query);

    return NextResponse.json(
      data.markets.map(m => ({
        epic: m.epic,
        instrumentName: m.instrumentName,
        instrumentType: m.instrumentType,
        expiry: m.expiry,
        bid: m.bid,
        offer: m.offer,
        high: m.high,
        low: m.low,
        percentageChange: m.percentageChange,
        marketStatus: m.marketStatus,
      }))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
