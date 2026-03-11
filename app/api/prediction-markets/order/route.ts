import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { requireTier } from "@/lib/auth/require-tier";
import { rateLimit } from "@/lib/rate-limit";
import { validateOrigin, safeError } from "@/lib/security/csrf";
import {
  placeKalshiOrder,
  cancelKalshiOrder,
  getKalshiOrders,
  isKalshiConfigured,
} from "@/lib/prediction-markets/kalshi-trading";
import {
  isPolymarketConfigured,
} from "@/lib/prediction-markets/polymarket-trading";

// GET: list open orders (both platforms)
export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const username = session.user.name;

  try {
    const kalshiOk = await isKalshiConfigured(username);

    const results: { kalshi: unknown; polymarket: unknown } = { kalshi: null, polymarket: null };

    if (kalshiOk) {
      try { results.kalshi = await getKalshiOrders(username); } catch { /* skip */ }
    }
    // Polymarket orders are now fetched client-side via wallet connection

    return NextResponse.json(results);
  } catch (error) {
    return safeError("PredictionMarkets", error);
  }
}

// POST: place a new order
export async function POST(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const username = session.user.name;

  // Rate limit: 20 bets per hour
  const rl = await rateLimit(`predmarket:${username}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 20 orders per hour." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const { platform } = body;

    // ── Kalshi ──
    if (platform === "kalshi") {
      const configured = await isKalshiConfigured(username);
      if (!configured) {
        return NextResponse.json({ error: "Kalshi API keys not configured. Add them in Settings." }, { status: 400 });
      }

      const { ticker, action, side, count, price } = body;

      if (!ticker || typeof ticker !== "string") {
        return NextResponse.json({ error: "ticker is required" }, { status: 400 });
      }
      if (!["buy", "sell"].includes(action)) {
        return NextResponse.json({ error: "action must be 'buy' or 'sell'" }, { status: 400 });
      }
      if (!["yes", "no"].includes(side)) {
        return NextResponse.json({ error: "side must be 'yes' or 'no'" }, { status: 400 });
      }
      if (!count || typeof count !== "number" || count < 1 || !Number.isInteger(count)) {
        return NextResponse.json({ error: "count must be a positive integer" }, { status: 400 });
      }
      if (count > 1000) {
        return NextResponse.json({ error: "Max 1000 contracts per order" }, { status: 400 });
      }
      if (!price || typeof price !== "number" || price < 1 || price > 99 || !Number.isInteger(price)) {
        return NextResponse.json({ error: "price must be an integer between 1-99 (cents)" }, { status: 400 });
      }

      const result = await placeKalshiOrder(username, {
        ticker,
        action: action as "buy" | "sell",
        side: side as "yes" | "no",
        count,
        type: "limit",
        ...(side === "yes" ? { yes_price: price } : { no_price: price }),
      });

      return NextResponse.json(result);
    }

    // ── Polymarket ──
    if (platform === "polymarket") {
      // Polymarket orders are now signed client-side via WalletConnect
      return NextResponse.json(
        { error: "Polymarket orders are placed directly from your browser wallet. Use the bet modal." },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "platform must be 'kalshi' or 'polymarket'" }, { status: 400 });
  } catch (error) {
    return safeError("PredictionMarkets", error);
  }
}

// DELETE: cancel an order
export async function DELETE(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const username = session.user.name;

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const platform = searchParams.get("platform") || "kalshi";

    if (!orderId) {
      return NextResponse.json({ error: "orderId query parameter required" }, { status: 400 });
    }

    if (platform === "polymarket") {
      return NextResponse.json({ error: "Polymarket order cancellation is handled client-side via wallet." }, { status: 400 });
    } else {
      await cancelKalshiOrder(username, orderId);
    }

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    return safeError("PredictionMarkets", error);
  }
}
