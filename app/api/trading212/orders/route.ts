import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Trading212Client, checkDuplicate, type Environment } from "@/lib/trading212/client";
import { createDedupeHash } from "@/lib/utils";

function getT212Client() {
  const apiKeySetting = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "t212_api_key"))
    ;

  const apiSecretSetting = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "t212_api_secret"))
    ;

  const apiKey = apiKeySetting?.value || process.env.TRADING212_API_KEY;
  const apiSecret = apiSecretSetting?.value || process.env.TRADING212_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("Trading212 API key and secret not configured");
  }

  const envSetting = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "trading_environment"))
    ;

  const environment = (envSetting?.value || "live") as Environment;
  return { client: new Trading212Client(apiKey, apiSecret, environment), environment };
}

export async function GET(request: NextRequest) {
  try {
    const { client } = getT212Client();
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
    const maxOrderSizeSetting = db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "max_order_size"))
      ;

    if (maxOrderSizeSetting) {
      const maxSize = parseFloat(maxOrderSizeSetting.value);
      if (quantity > maxSize) {
        return NextResponse.json(
          { error: `Order quantity ${quantity} exceeds max order size of ${maxSize}` },
          { status: 400 }
        );
      }
    }

    const dailyLimitSetting = db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "daily_trade_limit"))
      ;

    if (dailyLimitSetting) {
      const dailyLimit = parseInt(dailyLimitSetting.value, 10);
      const today = new Date().toISOString().split("T");
      const todayTrades = db
        .select()
        .from(schema.trades)
        
        .filter((t: { createdAt: string }) => t.createdAt.startsWith(today));

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
    const trade = db
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

    const { client } = getT212Client();
    await client.cancelOrder(orderId);

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
