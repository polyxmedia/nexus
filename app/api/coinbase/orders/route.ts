import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { getCoinbaseClient } from "@/lib/coinbase/get-client";
import { checkDuplicate } from "@/lib/trading212/client";
import { createDedupeHash } from "@/lib/utils";
import { requireTier } from "@/lib/auth/require-tier";
import { rateLimit } from "@/lib/rate-limit";
import { validateOrigin, safeError } from "@/lib/security/csrf";
import { preTradeCheckCoinbase, riskBlockResponse } from "@/lib/trading/pre-trade-check";

export async function GET(request: NextRequest) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") || undefined;
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1), 500);

    const client = await getCoinbaseClient(tierCheck.result.username);
    const orders = await client.getOrders({ productId, limit });
    return NextResponse.json(orders);
  } catch (error) {
    return safeError("Coinbase", error);
  }
}

export async function POST(request: NextRequest) {
  // CSRF check
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 30 orders per hour per user
  const rl = await rateLimit(`coinbase:${session.user.name}`, 30, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trading rate limit exceeded. Max 30 orders per hour." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

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

    if (typeof amount !== "number" || amount <= 0 || !isFinite(amount)) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    if (limitPrice !== undefined && limitPrice !== null && (typeof limitPrice !== "number" || limitPrice <= 0 || !isFinite(limitPrice))) {
      return NextResponse.json(
        { error: "limitPrice must be a positive number" },
        { status: 400 }
      );
    }

    if (!/^[A-Z0-9\-]{1,20}$/.test(productId)) {
      return NextResponse.json(
        { error: "Invalid productId format" },
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

    const client = await getCoinbaseClient(session.user.name);

    // Pre-trade risk gate: check balance for the relevant currency
    const riskCheck = await preTradeCheckCoinbase(client, productId, side, amount);
    if (!riskCheck.allowed) {
      return riskBlockResponse(riskCheck);
    }

    let orderResult;

    if (orderType === "LIMIT" && limitPrice) {
      // LIMIT orders always use base currency size (e.g. 0.5 BTC)
      orderResult = await client.placeLimitOrder({
        productId,
        side,
        baseSize: String(amount),
        limitPrice: String(limitPrice),
      });
    } else {
      // MARKET orders: BUY amount = quote currency (USD), SELL amount = base currency (BTC)
      // The Coinbase client handles this distinction internally
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
        userId: session.user.name,
        ticker: productId,
        direction: side,
        orderType: orderType || "MARKET",
        quantity: amount,
        limitPrice: limitPrice ?? null,
        status: "pending",
        environment: "live",
        dedupeHash: hash,
        notes: side === "BUY"
          ? `Coinbase BUY: ${amount} ${riskCheck.currentPrice ? `@ ~$${riskCheck.currentPrice}` : "market"}`
          : `Coinbase SELL: ${amount} base units`,
      })
      .returning();

    return NextResponse.json({
      order: orderResult,
      trade,
      riskCheck: {
        warnings: riskCheck.warnings,
        accountCash: riskCheck.accountCash,
        estimatedCost: riskCheck.estimatedCost,
        currentPrice: riskCheck.currentPrice,
      },
    });
  } catch (error) {
    return safeError("Coinbase", error);
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
      return NextResponse.json(
        { error: "orderId query parameter is required" },
        { status: 400 }
      );
    }

    const client = await getCoinbaseClient(session.user.name);
    await client.cancelOrders([orderId]);

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    return safeError("Coinbase", error);
  }
}
