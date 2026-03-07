import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Trading212Client, checkDuplicate, type Environment } from "@/lib/trading212/client";
import { createDedupeHash } from "@/lib/utils";

async function getT212Client() {
  const apiKeySetting = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "t212_api_key"));

  const apiSecretSetting = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "t212_api_secret"));

  const apiKey = apiKeySetting[0]?.value || process.env.TRADING212_API_KEY;
  const apiSecret = apiSecretSetting[0]?.value || process.env.TRADING212_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("Trading212 API key and secret not configured");
  }

  const envSetting = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "trading_environment"));

  const environment = (envSetting[0]?.value || "live") as Environment;
  return { client: new Trading212Client(apiKey, apiSecret, environment), environment };
}

export async function GET(request: NextRequest) {
  try {
    const { client } = await getT212Client();
    const orders = await client.getOrders();
    return NextResponse.json(orders);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    // Risk controls
    const maxOrderSizeSetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "max_order_size"))
      ;

    if (maxOrderSizeSetting.length > 0) {
      const maxSize = parseFloat(maxOrderSizeSetting[0].value);
      if (quantity > maxSize) {
        return NextResponse.json(
          { error: `Order quantity ${quantity} exceeds max order size of ${maxSize}` },
          { status: 400 }
        );
      }
    }

    const dailyLimitSetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "daily_trade_limit"))
      ;

    if (dailyLimitSetting.length > 0) {
      const dailyLimit = parseInt(dailyLimitSetting[0].value, 10);
      const today = new Date().toISOString().split("T")[0];
      const allTrades = await db
        .select()
        .from(schema.trades);
      const todayTrades = allTrades.filter((t: { createdAt: string }) => t.createdAt.startsWith(today));

      if (todayTrades.length >= dailyLimit) {
        return NextResponse.json(
          { error: `Daily trade limit of ${dailyLimit} reached` },
          { status: 400 }
        );
      }
    }

    const { client, environment } = getT212Client();

    // Adjust quantity for direction
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
        orderResult = await client.placeLimitOrder({
          quantity: signedQuantity,
          ticker,
          limitPrice,
          timeValidity: "DAY",
        });
        break;
      case "STOP":
        if (!stopPrice) {
          return NextResponse.json({ error: "stopPrice is required for STOP orders" }, { status: 400 });
        }
        orderResult = await client.placeStopOrder({
          quantity: signedQuantity,
          ticker,
          stopPrice,
          timeValidity: "DAY",
        });
        break;
      case "STOP_LIMIT":
        if (!limitPrice || !stopPrice) {
          return NextResponse.json(
            { error: "limitPrice and stopPrice are required for STOP_LIMIT orders" },
            { status: 400 }
          );
        }
        orderResult = await client.placeStopLimitOrder({
          quantity: signedQuantity,
          ticker,
          limitPrice,
          stopPrice,
          timeValidity: "DAY",
        });
        break;
      default:
        return NextResponse.json(
          { error: `Invalid orderType: ${orderType}. Must be MARKET, LIMIT, STOP, or STOP_LIMIT` },
          { status: 400 }
        );
    }

    // Save trade to DB
    const trade = await db
      .insert(schema.trades)
      .values({
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
      .returning()
      ;

    return NextResponse.json(trade);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId query parameter is required" },
        { status: 400 }
      );
    }

    const { client } = await getT212Client();
    await client.cancelOrder(orderId);

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
