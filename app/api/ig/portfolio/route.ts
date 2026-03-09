import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { getIGClient } from "@/lib/ig/client";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ig = await getIGClient();
    if (!ig) {
      return NextResponse.json({ error: "IG Markets not configured." }, { status: 400 });
    }

    const data = await ig.client.getPositions();

    const positions = data.positions.map(p => ({
      dealId: p.position.dealId,
      epic: p.market.epic,
      instrumentName: p.market.instrumentName,
      direction: p.position.direction,
      size: p.position.size,
      level: p.position.level,
      currency: p.position.currency,
      bid: p.market.bid,
      offer: p.market.offer,
      high: p.market.high,
      low: p.market.low,
      percentageChange: p.market.percentageChange,
      netChange: p.market.netChange,
      stopLevel: p.position.stopLevel,
      limitLevel: p.position.limitLevel,
      marketStatus: p.market.marketStatus,
      createdDate: p.position.createdDateUTC,
    }));

    return NextResponse.json({ positions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
