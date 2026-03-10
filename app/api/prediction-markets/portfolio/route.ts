import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { safeError } from "@/lib/security/csrf";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import {
  getKalshiBalance,
  getKalshiPositions,
  isKalshiConfigured,
} from "@/lib/prediction-markets/kalshi-trading";
import {
  isPolymarketConfigured,
  getPolymarketPositions,
  getPolymarketAddress,
} from "@/lib/prediction-markets/polymarket-trading";

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const username = session.user.name;

  try {
    const [kalshiOk, polyOk] = await Promise.all([isKalshiConfigured(username), isPolymarketConfigured(username)]);

    const result: {
      kalshi: { configured: boolean; balance: unknown; positions: unknown[] };
      polymarket: { configured: boolean; address: string | null; positions: unknown[] };
    } = {
      kalshi: { configured: kalshiOk, balance: null, positions: [] },
      polymarket: { configured: polyOk, address: null, positions: [] },
    };

    if (kalshiOk) {
      const [balance, positions] = await Promise.allSettled([getKalshiBalance(username), getKalshiPositions(username)]);
      result.kalshi.balance = balance.status === "fulfilled" ? balance.value : null;
      result.kalshi.positions = positions.status === "fulfilled" ? positions.value.market_positions || [] : [];
    }

    if (polyOk) {
      const [address, positions] = await Promise.allSettled([getPolymarketAddress(username), getPolymarketPositions(username)]);
      result.polymarket.address = address.status === "fulfilled" ? address.value : null;
      result.polymarket.positions = positions.status === "fulfilled" ? (positions.value as unknown[]) : [];
    }

    return NextResponse.json(result);
  } catch (error) {
    return safeError("PredictionMarkets", error);
  }
}
