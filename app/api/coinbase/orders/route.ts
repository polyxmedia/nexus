import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { CoinbaseClient } from "@/lib/coinbase/client";
import { checkDuplicate } from "@/lib/trading212/client";
import { createDedupeHash } from "@/lib/utils";
import { requireTier } from "@/lib/auth/require-tier";

async function getCoinbaseClient() {
  const apiKeySetting = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "coinbase_api_key"))
    ;

  const apiSecretSetting = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "coinbase_api_secret"))
    ;

  const apiKey = apiKeySetting[0]?.value || process.env.COINBASE_API_KEY;
  const apiSecret = apiSecretSetting[0]?.value || process.env.COINBASE_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("Coinbase API credentials not configured");
  }

  return new CoinbaseClient(apiKey, apiSecret);
}

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const client = await getCoinbaseClient();
    const orders = await client.getOrders({ productId, limit });
    return NextResponse.json(orders);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const body = await request.json();
    const { productId, side, amount, orderType, limitPrice } = body;

    if (!productId || !side || !amount) {
      return NextResponse.json(
        { error: "productId, side, and amount are required" },
        { status: 400 }
      );
    }

    if (!["BUY", "SELL"].includes(side)) {
      return NextResponse.json(
        { error: "side must be BUY or SELL" },
        { status: 400 }
      );
    }

    // Dedup check
    const hash = createDedupeHash(productId, amount, orderType || "MARKET", side);
    if (checkDuplicate(hash)) {
      return NextResponse.json(
        { error: "Duplicate order detected, please wait before retrying" },
        { status: 409 }
      );
    }

    const client = await getCoinbaseClient();
    let orderResult;

    if (orderType === "LIMIT" && limitPrice) {
      orderResult = await client.placeLimitOrder({
        productId,
        side,
        baseSize: amount,
        limitPrice: String(limitPrice),
      });
    } else {
      orderResult = await client.placeMarketOrder({
        productId,
        side,
        amount: String(amount),
      });
    }

    // Record in trades table
    const trade = await db
      .insert(schema.trades)
      .values({
        ticker: productId,
        direction: side,
        orderType: orderType || "MARKET",
        quantity: parseFloat(amount),
        limitPrice: limitPrice ? parseFloat(limitPrice) : null,
        status: "pending",
        environment: "live",
        dedupeHash: hash,
        notes: "Coinbase order",
      })
      .returning()
      ;

    return NextResponse.json({ order: orderResult, trade });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId query parameter is required" },
        { status: 400 }
      );
    }

    const client = await getCoinbaseClient();
    await client.cancelOrders([orderId]);

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
