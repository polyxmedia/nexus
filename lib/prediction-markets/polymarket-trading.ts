// Polymarket Trading Client
// Wallet-based authentication via @polymarket/clob-client

import { ClobClient, Side, OrderType } from "@polymarket/clob-client";
import { Wallet } from "ethers";

// Ethers v6 renamed _signTypedData to signTypedData. Adapt to ClobClient's EthersSigner interface.
function toEthersSigner(wallet: Wallet) {
  return {
    _signTypedData: (domain: Record<string, unknown>, types: Record<string, Array<{ name: string; type: string }>>, value: Record<string, unknown>) =>
      wallet.signTypedData(domain, types, value),
    getAddress: () => Promise.resolve(wallet.address),
  };
}
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";

const POLY_HOST = "https://clob.polymarket.com";
const CHAIN_ID = 137; // Polygon mainnet

// ── Types ──

export interface PolymarketOrder {
  tokenId: string;
  price: number; // 0.01 - 0.99
  size: number; // number of shares
  side: "buy" | "sell";
  orderType?: "GTC" | "GTD" | "FOK" | "FAK";
  tickSize?: string;
  negRisk?: boolean;
}

export interface PolymarketOrderResponse {
  success: boolean;
  orderID?: string;
  status?: string;
  errorMsg?: string;
}

// ── Credentials (per-user) ──

async function getPolymarketPrivateKey(username: string): Promise<string | null> {
  // Check user-scoped setting first (username:polymarket_private_key)
  const userKey = `${username}:polymarket_private_key`;
  const userRows = await db.select().from(schema.settings).where(eq(schema.settings.key, userKey));
  if (userRows.length > 0 && userRows[0].value) {
    try { return decrypt(userRows[0].value); } catch { return userRows[0].value; }
  }

  // Fall back to global setting (admin-level)
  const globalRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "polymarket_private_key"));
  if (globalRows.length > 0 && globalRows[0].value) {
    try { return decrypt(globalRows[0].value); } catch { return globalRows[0].value; }
  }

  // Fall back to env
  return process.env.POLYMARKET_PRIVATE_KEY || null;
}

// Cache derived API creds per user (deterministic from private key)
const clientCache = new Map<string, { client: ClobClient; address: string; keyHash: string }>();

async function getClient(username: string): Promise<{ client: ClobClient; address: string } | null> {
  const privateKey = await getPolymarketPrivateKey(username);
  if (!privateKey) return null;

  const keyHash = privateKey.slice(-8);
  const cached = clientCache.get(username);
  if (cached && cached.keyHash === keyHash) return cached;

  try {
    const wallet = new Wallet(privateKey);
    const signer = toEthersSigner(wallet);

    // Derive L2 API credentials from the wallet
    const tempClient = new ClobClient(POLY_HOST, CHAIN_ID, signer);
    const apiCreds = await tempClient.createOrDeriveApiKey();

    // Create full authenticated client
    const client = new ClobClient(
      POLY_HOST,
      CHAIN_ID,
      signer,
      apiCreds,
      0, // EOA signature type
      wallet.address,
    );

    const entry = { client, address: wallet.address, keyHash };
    clientCache.set(username, entry);
    return entry;
  } catch (err) {
    console.error("Polymarket client init failed:", err);
    return null;
  }
}

// ── Token ID Resolution ──

// The Gamma API returns clobTokenIds as JSON strings, parse them
export function parseTokenIds(clobTokenIds: string): { yes: string; no: string } | null {
  try {
    const ids = JSON.parse(clobTokenIds);
    if (Array.isArray(ids) && ids.length >= 2) {
      return { yes: ids[0], no: ids[1] };
    }
  } catch { /* ignore */ }
  return null;
}

// Fetch token IDs for a Polymarket event by condition ID or slug
export async function getMarketTokenIds(conditionId: string): Promise<{ yes: string; no: string } | null> {
  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/markets?condition_id=${conditionId}&limit=1`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const markets = await res.json();
    if (markets.length === 0) return null;
    return parseTokenIds(markets[0].clobTokenIds);
  } catch {
    return null;
  }
}

// ── Trading Functions ──

export async function placePolymarketOrder(username: string, order: PolymarketOrder): Promise<PolymarketOrderResponse> {
  const c = await getClient(username);
  if (!c) throw new Error("Polymarket wallet not configured. Add your private key in Settings.");

  const sideEnum = order.side === "buy" ? Side.BUY : Side.SELL;
  const orderTypeMap: Record<string, OrderType.GTC | OrderType.GTD> = {
    GTC: OrderType.GTC,
    GTD: OrderType.GTD,
  };
  const orderTypeEnum = orderTypeMap[order.orderType || "GTC"] || OrderType.GTC;

  // Fetch tick size if not provided
  type TickSize = "0.1" | "0.01" | "0.001" | "0.0001";
  let tickSize: TickSize = (order.tickSize as TickSize) || "0.01";
  let negRisk = order.negRisk ?? false;
  try {
    tickSize = await c.client.getTickSize(order.tokenId);
    negRisk = await c.client.getNegRisk(order.tokenId);
  } catch {
    // Use defaults
  }

  const result = await c.client.createAndPostOrder(
    {
      tokenID: order.tokenId,
      price: order.price,
      size: order.size,
      side: sideEnum,
    },
    { tickSize, negRisk },
    orderTypeEnum,
  );

  return {
    success: !!result?.orderID,
    orderID: result?.orderID,
    status: result?.status,
  };
}

export async function cancelPolymarketOrder(username: string, orderId: string): Promise<void> {
  const c = await getClient(username);
  if (!c) throw new Error("Polymarket wallet not configured.");
  await c.client.cancelOrder({ orderID: orderId });
}

export async function getPolymarketOpenOrders(username: string): Promise<unknown[]> {
  const c = await getClient(username);
  if (!c) return [];
  try {
    const orders = await c.client.getOpenOrders();
    return orders || [];
  } catch {
    return [];
  }
}

export async function getPolymarketTrades(username: string): Promise<unknown[]> {
  const c = await getClient(username);
  if (!c) return [];
  try {
    const trades = await c.client.getTrades();
    return trades || [];
  } catch {
    return [];
  }
}

export async function getPolymarketPositions(username: string): Promise<unknown[]> {
  const c = await getClient(username);
  if (!c) return [];
  try {
    const res = await fetch(
      `https://data-api.polymarket.com/positions?user=${c.address}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function isPolymarketConfigured(username: string): Promise<boolean> {
  const key = await getPolymarketPrivateKey(username);
  return !!key;
}

export async function getPolymarketAddress(username: string): Promise<string | null> {
  const c = await getClient(username);
  return c?.address || null;
}
