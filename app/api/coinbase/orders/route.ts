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
  const rl = rateLimit(`coinbase:${session.user.name}`, 30, 60 * 60 * 1000);
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
    let orderResult;

    if (orderType === "LIMIT" && limitPrice) {
      orderResult = await client.placeLimitOrder({
        productId,
        side,
        baseSize: String(amount),
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
        quantity: amount,
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
