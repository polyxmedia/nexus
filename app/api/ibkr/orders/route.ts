import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getIBKRClient, checkDuplicate } from "@/lib/ibkr/client";
import { createDedupeHash } from "@/lib/utils";
import { requireTier } from "@/lib/auth/require-tier";
import { rateLimit } from "@/lib/rate-limit";
import { validateOrigin, safeError } from "@/lib/security/csrf";

export async function GET() {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ibkr = await getIBKRClient();
    if (!ibkr) {
      return NextResponse.json({ error: "IBKR gateway URL not configured." }, { status: 400 });
    }

    const orders = await ibkr.client.getOrders();
    return NextResponse.json(orders);
  } catch (error) {
    return safeError("IBKR", error);
  }
}

export async function POST(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const username = session.user.name;

  // Rate limit: 30 orders per hour per user
  const rl = await rateLimit(`ibkr:${username}`, 30, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trading rate limit exceeded. Max 30 orders per hour." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const { conid, ticker, quantity, direction, orderType, limitPrice, stopPrice, tif, signalId, predictionId } = body;

    if (!conid || !quantity || !direction || !orderType) {
      return NextResponse.json(
        { error: "conid, quantity, direction, and orderType are required" },
        { status: 400 }
      );
    }

    // Dedup
    const hash = createDedupeHash(ticker || String(conid), quantity, orderType, direction);
    if (checkDuplicate(hash)) {
      return NextResponse.json(
        { error: "Duplicate order detected, please wait before retrying" },
        { status: 409 }
      );
    }

    // Risk controls
    const maxSizeRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "max_order_size"));
    if (maxSizeRows.length > 0) {
      const maxSize = parseFloat(maxSizeRows[0].value);
      if (quantity > maxSize) {
        return NextResponse.json(
          { error: `Order quantity ${quantity} exceeds max order size of ${maxSize}` },
          { status: 400 }
        );
      }
    }

    const ibkr = await getIBKRClient();
    if (!ibkr) {
      return NextResponse.json({ error: "IBKR gateway URL not configured." }, { status: 400 });
    }

    const { client, environment, accountId } = ibkr;

    let activeAccountId = accountId;
    if (!activeAccountId) {
      const accounts = await client.getAccounts();
      activeAccountId = accounts.selectedAccount || accounts.accounts?.[0] || null;
    }

    if (!activeAccountId) {
      return NextResponse.json({ error: "No IBKR account found." }, { status: 400 });
    }

    // Map order type
    const ibkrOrderType = orderType === "MARKET" ? "MKT" as const :
                          orderType === "LIMIT" ? "LMT" as const :
                          orderType === "STOP" ? "STP" as const :
                          "STP_LIMIT" as const;

    const orderResult = await client.placeOrder(activeAccountId, {
      conid: Number(conid),
      orderType: ibkrOrderType,
      side: direction as "BUY" | "SELL",
      quantity: Math.abs(quantity),
      price: limitPrice || undefined,
      auxPrice: stopPrice || undefined,
      tif: (tif as "DAY" | "GTC" | "IOC") || "DAY",
    });

    // Record in trades table
    const trade = await db
      .insert(schema.trades)
      .values({
        userId: username,
        signalId: signalId || null,
        predictionId: predictionId || null,
        ticker: ticker || `IBKR:${conid}`,
        direction,
        orderType,
        quantity,
        limitPrice: limitPrice || null,
        stopPrice: stopPrice || null,
        t212OrderId: orderResult?.[0]?.order_id || null,
        status: "pending",
        environment,
        dedupeHash: hash,
      })
      .returning();

    return NextResponse.json({ trade, ibkrResult: orderResult });
  } catch (error) {
    return safeError("IBKR", error);
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

    const ibkr = await getIBKRClient();
    if (!ibkr) {
      return NextResponse.json({ error: "IBKR gateway URL not configured." }, { status: 400 });
    }

    const { accountId, client } = ibkr;

    let activeAccountId = accountId;
    if (!activeAccountId) {
      const accounts = await client.getAccounts();
      activeAccountId = accounts.selectedAccount || accounts.accounts?.[0] || null;
    }

    if (!activeAccountId) {
      return NextResponse.json({ error: "No IBKR account found." }, { status: 400 });
    }

    const result = await client.cancelOrder(activeAccountId, orderId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return safeError("IBKR", error);
  }
}
