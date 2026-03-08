import { NextRequest, NextResponse } from "next/server";
import {
  getOnChainSnapshot,
  getWhaleAlerts,
  getExchangeFlows,
  getDeFiTVL,
  getStablecoinFlows,
} from "@/lib/on-chain";
import { requireTier } from "@/lib/auth/require-tier";

export async function GET(req: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  try {
    const section = req.nextUrl.searchParams.get("section");

    if (section) {
      let data: unknown = null;

      switch (section) {
        case "whales":
          data = await getWhaleAlerts();
          break;
        case "flows":
          data = await getExchangeFlows();
          break;
        case "defi":
          data = await getDeFiTVL();
          break;
        case "stablecoins":
          data = await getStablecoinFlows();
          break;
        default:
          return NextResponse.json(
            { error: "Invalid section. Use: whales, flows, defi, stablecoins" },
            { status: 400 }
          );
      }

      return NextResponse.json({ section, data, timestamp: Date.now() });
    }

    const snapshot = await getOnChainSnapshot();
    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch on-chain data", timestamp: Date.now(), whales: null, exchanges: null, defi: null, stablecoins: null },
      { status: 500 }
    );
  }
}
