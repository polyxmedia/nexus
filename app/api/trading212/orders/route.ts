import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getT212Client, checkDuplicate } from "@/lib/trading212/client";
import { createDedupeHash } from "@/lib/utils";
import { requireTier } from "@/lib/auth/require-tier";

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
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const username = session.user.name;

  try {
    const body = await request.json();
    const { ticker, quantity, direction, orderType, limitPrice, stopPrice, signalId, predictionId } = body;

    if (!ticker || !quantity || !direction || !orderType) {
      return NextResponse.json(
        { error: "ticker, quantity, direction, and orderType are required" },
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

    // Risk controls — max order size
    const maxSizeRows = await db.select().from(schema.settings)
      .where(eq(schema.settings.key, "max_order_size"));
    if (maxSizeRows.length > 0) {
      const maxSize = parseFloat(maxSizeRows[0].value);
      if (quantity > maxSize) {
        return NextResponse.json(
          { error: `Order quantity ${quantity} exceeds max order size of ${maxSize}` },
          { status: 400 }
        );
      }
    }

    const t212 = await getT212Client();
    if (!t212) {
      return NextResponse.json(
        { error: "Trading 212 API key not configured." },
        { status: 400 }
      );
    }

    const { client, environment } = t212;
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

    return NextResponse.json(trade);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
