// Kalshi Trading Client
// RSA-PSS key-based authentication for order placement

import crypto from "crypto";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";

const KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2";
const KALSHI_DEMO_BASE = "https://demo-api.kalshi.co/trade-api/v2";

// ── Types ──

export interface KalshiOrder {
  ticker: string;
  action: "buy" | "sell";
  side: "yes" | "no";
  count: number;
  type: "limit";
  yes_price?: number; // cents 1-99
  no_price?: number;  // cents 1-99
  client_order_id?: string;
  time_in_force?: "gtc" | "day" | "ioc" | "fok";
}

export interface KalshiOrderResponse {
  order: {
    order_id: string;
    ticker: string;
    status: string;
    side: string;
    action: string;
    count: number;
    yes_price: number;
    no_price: number;
    created_time: string;
  };
}

export interface KalshiBalance {
  available_balance: number; // cents
  portfolio_value: number;   // cents
}

export interface KalshiPosition {
  ticker: string;
  market_exposure: number;
  resting_orders_count: number;
  total_traded: number;
  realized_pnl: number;
  fees_paid: number;
}

// ── Auth (per-user) ──

function tryDecrypt(value: string): string {
  try { return decrypt(value); } catch { return value; }
}

async function getKalshiCredentials(username: string): Promise<{ keyId: string; privateKey: string; demo: boolean } | null> {
  // Check user-scoped settings first
  const userKeyIdRows = await db.select().from(schema.settings).where(eq(schema.settings.key, `${username}:kalshi_api_key_id`));
  const userPrivKeyRows = await db.select().from(schema.settings).where(eq(schema.settings.key, `${username}:kalshi_private_key`));

  if (userKeyIdRows.length > 0 && userPrivKeyRows.length > 0) {
    const demoRows = await db.select().from(schema.settings).where(eq(schema.settings.key, `${username}:kalshi_environment`));
    const demo = demoRows.length > 0 ? demoRows[0].value === "demo" : false;
    return {
      keyId: tryDecrypt(userKeyIdRows[0].value),
      privateKey: tryDecrypt(userPrivKeyRows[0].value),
      demo,
    };
  }

  // Fall back to global settings
  const keyIdRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "kalshi_api_key_id"));
  const privKeyRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "kalshi_private_key"));

  if (keyIdRows.length > 0 && privKeyRows.length > 0) {
    const demoRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "kalshi_environment"));
    const demo = demoRows.length > 0 ? demoRows[0].value === "demo" : false;
    return {
      keyId: tryDecrypt(keyIdRows[0].value),
      privateKey: tryDecrypt(privKeyRows[0].value),
      demo,
    };
  }

  // Fall back to env vars
  const keyId = process.env.KALSHI_API_KEY_ID;
  const privateKey = process.env.KALSHI_PRIVATE_KEY;
  if (keyId && privateKey) {
    const demo = process.env.KALSHI_ENVIRONMENT === "demo";
    return { keyId, privateKey, demo };
  }

  return null;
}

function signRequest(privateKeyPem: string, timestamp: string, method: string, path: string): string {
  const message = `${timestamp}${method.toUpperCase()}${path}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(message);
  sign.end();
  return sign.sign(
    { key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST },
    "base64"
  );
}

async function kalshiFetch(
  username: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const creds = await getKalshiCredentials(username);
  if (!creds) throw new Error("Kalshi API credentials not configured");

  const base = creds.demo ? KALSHI_DEMO_BASE : KALSHI_BASE;
  const timestamp = String(Date.now());
  const signature = signRequest(creds.privateKey, timestamp, method, `/trade-api/v2${path}`);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "KALSHI-ACCESS-KEY": creds.keyId,
    "KALSHI-ACCESS-TIMESTAMP": timestamp,
    "KALSHI-ACCESS-SIGNATURE": signature,
  };

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Kalshi API error ${res.status}: ${errText}`);
  }

  return res;
}

// ── Trading Functions ──

export async function getKalshiBalance(username: string): Promise<KalshiBalance> {
  const res = await kalshiFetch(username, "GET", "/portfolio/balance");
  return res.json();
}

export async function getKalshiPositions(username: string): Promise<{ market_positions: KalshiPosition[] }> {
  const res = await kalshiFetch(username, "GET", "/portfolio/positions");
  return res.json();
}

export async function placeKalshiOrder(username: string, order: KalshiOrder): Promise<KalshiOrderResponse> {
  const clientOrderId = order.client_order_id || crypto.randomUUID();

  const payload = {
    ticker: order.ticker,
    action: order.action,
    side: order.side,
    count: order.count,
    type: order.type || "limit",
    ...(order.yes_price !== undefined && { yes_price: order.yes_price }),
    ...(order.no_price !== undefined && { no_price: order.no_price }),
    client_order_id: clientOrderId,
    time_in_force: order.time_in_force || "gtc",
  };

  const res = await kalshiFetch(username, "POST", "/portfolio/orders", payload);
  return res.json();
}

export async function cancelKalshiOrder(username: string, orderId: string): Promise<void> {
  await kalshiFetch(username, "DELETE", `/portfolio/orders/${orderId}`);
}

export async function getKalshiOrders(username: string): Promise<{ orders: KalshiOrderResponse["order"][] }> {
  const res = await kalshiFetch(username, "GET", "/portfolio/orders");
  return res.json();
}

export async function isKalshiConfigured(username: string): Promise<boolean> {
  const creds = await getKalshiCredentials(username);
  return creds !== null;
}
