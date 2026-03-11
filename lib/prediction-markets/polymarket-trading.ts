// Polymarket Server-Side Module (Read-Only)
// Trading/signing happens client-side via WalletConnect.
// This module handles: position lookups, configuration checks, token ID resolution.

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// ── Token ID Resolution ──

export function parseTokenIds(clobTokenIds: string): { yes: string; no: string } | null {
  try {
    const ids = JSON.parse(clobTokenIds);
    if (Array.isArray(ids) && ids.length >= 2) {
      return { yes: ids[0], no: ids[1] };
    }
  } catch { /* ignore */ }
  return null;
}

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

// ── Wallet Address (stored in user settings, public and safe) ──

export async function getPolymarketAddress(username: string): Promise<string | null> {
  const key = `${username}:polymarket_address`;
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
  if (rows.length > 0 && rows[0].value) return rows[0].value;
  return null;
}

export async function setPolymarketAddress(username: string, address: string): Promise<void> {
  const key = `${username}:polymarket_address`;
  const existing = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
  if (existing.length > 0) {
    await db.update(schema.settings).set({ value: address }).where(eq(schema.settings.key, key));
  } else {
    await db.insert(schema.settings).values({ key, value: address });
  }
}

export async function clearPolymarketAddress(username: string): Promise<void> {
  const key = `${username}:polymarket_address`;
  await db.delete(schema.settings).where(eq(schema.settings.key, key));
}

export async function isPolymarketConfigured(username: string): Promise<boolean> {
  const addr = await getPolymarketAddress(username);
  return !!addr;
}

// ── Positions (public data, no auth needed) ──

export async function getPolymarketPositions(username: string): Promise<unknown[]> {
  const address = await getPolymarketAddress(username);
  if (!address) return [];
  try {
    const res = await fetch(
      `https://data-api.polymarket.com/positions?user=${address}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// Legacy exports for backward compatibility with order route
// Trading now happens client-side, these are no-ops
export async function placePolymarketOrder(): Promise<never> {
  throw new Error("Polymarket trading has moved to client-side wallet signing. Use the bet modal.");
}
export async function cancelPolymarketOrder(): Promise<never> {
  throw new Error("Polymarket trading has moved to client-side wallet signing.");
}
export async function getPolymarketOpenOrders(): Promise<unknown[]> {
  return [];
}
export async function getPolymarketTrades(): Promise<unknown[]> {
  return [];
}
