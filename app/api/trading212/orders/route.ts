import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getT212Client, checkDuplicate } from "@/lib/trading212/client";
import { createDedupeHash } from "@/lib/utils";
import { requireTier } from "@/lib/auth/require-tier";
import { rateLimit } from "@/lib/rate-limit";
import { validateOrigin, safeError } from "@/lib/security/csrf";
import { preTradeCheckT212, riskBlockResponse } from "@/lib/trading/pre-trade-check";
import { getQuote } from "@/lib/market-data/alpha-vantage";

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const t212 = await getT212Client();
    if (!t212) {
      return NextResponse.json(
        { error: "Trading 212 API key not configured. Add TRADING212_API_KEY to .env.local or Settings." },
        { status: 400 }
      );
    }
    const orders = await t212.client.getOrders();
    return NextResponse.json(orders);
  } catch (error) {
    return safeError("Trading212", error);
  }
}

export async function POST(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  // CSRF check
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const username = session.user.name;

  // Rate limit: 30 orders per hour per user
  const rl = await rateLimit(`trading:${username}`, 30, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trading rate limit exceeded. Max 30 orders per hour." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const { ticker, quantity, direction, orderType, limitPrice, stopPrice, signalId, predictionId } = body;

    if (!ticker || !quantity || !direction || !orderType) {
      return NextResponse.json(
        { error: "ticker, quantity, direction, and orderType are required" },
        { status: 400 }
      );
    }

    if (!["BUY", "SELL"].includes(direction)) {
      return NextResponse.json(
        { error: "direction must be BUY or SELL" },
        { status: 400 }
      );
    }

    if (typeof quantity !== "number" || quantity <= 0 || !isFinite(quantity)) {
      return NextResponse.json(
        { error: "quantity must be a positive number" },
        { status: 400 }
      );
    }

    if (limitPrice !== undefined && limitPrice !== null && (typeof limitPrice !== "number" || limitPrice <= 0 || !isFinite(limitPrice))) {
      return NextResponse.json(
        { error: "limitPrice must be a positive number" },
        { status: 400 }
      );
    }

    if (stopPrice !== undefined && stopPrice !== null && (typeof stopPrice !== "number" || stopPrice <= 0 || !isFinite(stopPrice))) {
      return NextResponse.json(
        { error: "stopPrice must be a positive number" },
        { status: 400 }
      );
    }

    // Dedup check
    const hash = createDedupeHash(ticker, quantity, orderType, direction);
    if (checkDuplicate(hash)) {
      return NextResponse.json(
        { error: "Duplicate order detected, please wait before retrying" },
        { status: 409 }
      );
    }

    const t212 = await getT212Client();
    if (!t212) {
      return NextResponse.json(
        { error: "Trading 212 API key not configured." },
        { status: 400 }
      );
    }

    const { client, environment } = t212;

    // For market orders without a limit price, fetch current price for cost estimation
    let currentMarketPrice: number | null = null;
    if (!limitPrice && direction === "BUY") {
      try {
        const keyRows = await db.select().from(schema.settings)
          .where(eq(schema.settings.key, "alpha_vantage_api_key"));
        const apiKey = keyRows[0]?.value || process.env.ALPHA_VANTAGE_API_KEY;
        if (apiKey) {
          const quote = await getQuote(ticker, apiKey);
          currentMarketPrice = quote.price;
        }
      } catch {
        // Best-effort: risk check will proceed without price estimate
      }
    }

    // Pre-trade risk gate: check account cash, concentration, max order size
    const riskCheck = await preTradeCheckT212(client, ticker, quantity, direction, limitPrice, currentMarketPrice);
    if (!riskCheck.allowed) {
      return riskBlockResponse(riskCheck);
    }

    const signedQuantity = direction === "SELL" ? -Math.abs(quantity) : Math.abs(quantity);

    let orderResult;
    switch (orderType) {
      case "MARKET":
        orderResult = await client.placeMarketOrder({ quantity: signedQuantity, ticker });
        break;
      case "LIMIT":
        if (!limitPrice) {
          return NextResponse.json({ error: "limitPrice is required for LIMIT orders" }, { status: 400 });
        }
        orderResult = await client.placeLimitOrder({ quantity: signedQuantity, ticker, limitPrice, timeValidity: "DAY" });
        break;
      case "STOP":
        if (!stopPrice) {
          return NextResponse.json({ error: "stopPrice is required for STOP orders" }, { status: 400 });
        }
        orderResult = await client.placeStopOrder({ quantity: signedQuantity, ticker, stopPrice, timeValidity: "DAY" });
        break;
      case "STOP_LIMIT":
        if (!limitPrice || !stopPrice) {
          return NextResponse.json(
            { error: "limitPrice and stopPrice are required for STOP_LIMIT orders" },
            { status: 400 }
          );
        }
        orderResult = await client.placeStopLimitOrder({ quantity: signedQuantity, ticker, limitPrice, stopPrice, timeValidity: "DAY" });
        break;
      default:
        return NextResponse.json(
          { error: `Invalid orderType: ${orderType}. Must be MARKET, LIMIT, STOP, or STOP_LIMIT` },
          { status: 400 }
        );
    }

    const trade = await db
      .insert(schema.trades)
      .values({
        userId: username,
        signalId: signalId || null,
        predictionId: predictionId || null,
        ticker,
        direction,
        orderType,
        quantity,
        limitPrice: limitPrice || null,
        stopPrice: stopPrice || null,
        t212OrderId: (orderResult as Record<string, unknown>)?.id?.toString() || null,
        status: "pending",
        environment,
        dedupeHash: hash,
      })
      .returning();

    return NextResponse.json({
      trade,
      riskCheck: {
        warnings: riskCheck.warnings,
        accountCash: riskCheck.accountCash,
        estimatedCost: riskCheck.estimatedCost,
        positionPercent: riskCheck.positionPercent,
      },
    });
  } catch (error) {
    return safeError("Trading212", error);
  }
}

export async function DELETE(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "orderId query parameter is required" }, { status: 400 });
    }

    const t212 = await getT212Client();
    if (!t212) {
      return NextResponse.json({ error: "Trading 212 API key not configured." }, { status: 400 });
    }

    await t212.client.cancelOrder(orderId);
    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    return safeError("Trading212", error);
  }
}
