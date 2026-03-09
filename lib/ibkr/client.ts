/**
 * Interactive Brokers Client Portal API Client
 *
 * Uses the IBKR Client Portal API (REST).
 * Requires the IBKR Client Portal Gateway running locally or a configured gateway URL.
 * Paper trading uses the same gateway with a paper trading account.
 *
 * Gateway: https://www.interactivebrokers.com/en/trading/ib-api.php
 * API Docs: https://www.interactivebrokers.com/api/doc.html
 */

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";

// ── Types ──

export type IBKREnvironment = "paper" | "live";

export interface IBKRAccount {
  id: string;
  accountId: string;
  type: string;
  currency: string;
  displayName: string;
}

export interface IBKRPosition {
  acctId: string;
  conid: number;
  contractDesc: string;
  position: number;
  mktPrice: number;
  mktValue: number;
  avgCost: number;
  avgPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  currency: string;
  assetClass: string;
  ticker?: string;
}

export interface IBKROrder {
  orderId: number;
  conid: number;
  orderType: string;
  side: string;
  price: number;
  quantity: number;
  filledQuantity: number;
  status: string;
  ticker: string;
  remainingQuantity: number;
  timeInForce: string;
  lastExecutionTime?: string;
}

export interface IBKRAccountSummary {
  accountId: string;
  netLiquidation: number;
  totalCashValue: number;
  grossPositionValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  buyingPower: number;
  maintMarginReq: number;
  excessLiquidity: number;
  currency: string;
}

export interface IBKRContractSearch {
  conid: number;
  companyHeader: string;
  companyName: string;
  symbol: string;
  description: string;
  restricted: string;
  fop: string;
  opt: string;
  war: string;
  sections: Array<{
    secType: string;
    exchange: string;
    listingExchange?: string;
  }>;
}

export interface IBKRMarketData {
  conid: number;
  last: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
}

export interface IBKRHistoryBar {
  t: number; // timestamp ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

// ── Client ──

export class IBKRClient {
  private gatewayUrl: string;
  private environment: IBKREnvironment;

  constructor(gatewayUrl: string, environment: IBKREnvironment = "paper") {
    // Strip trailing slash
    this.gatewayUrl = gatewayUrl.replace(/\/$/, "");
    this.environment = environment;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.gatewayUrl}/v1/api${path}`;
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "NEXUS-Intelligence/1.0",
            ...options.headers,
          },
          // IBKR gateway uses self-signed certs in dev
        });

        if (res.status === 429) {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt + 1) * 1000;
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
        }

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`IBKR API error ${res.status}: ${text}`);
        }

        return res.json();
      } catch (err) {
        if (attempt < maxRetries && err instanceof TypeError) {
          // Network error, retry
          const delay = Math.pow(2, attempt + 1) * 1000;
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }

    throw new Error("IBKR API: max retries exceeded");
  }

  // ── Authentication / Session ──

  async getAuthStatus(): Promise<{ authenticated: boolean; competing: boolean; connected: boolean; message: string }> {
    return this.request("/iserver/auth/status", { method: "POST" });
  }

  async keepAlive(): Promise<{ session: string }> {
    return this.request("/tickle", { method: "POST" });
  }

  async reauthenticate(): Promise<{ message: string }> {
    return this.request("/iserver/reauthenticate", { method: "POST" });
  }

  // ── Accounts ──

  async getAccounts(): Promise<{ accounts: string[]; selectedAccount: string }> {
    return this.request("/iserver/accounts");
  }

  async getAccountSummary(accountId: string): Promise<IBKRAccountSummary> {
    const ledger = await this.request<Record<string, Record<string, { amount: number }>>>(`/portfolio/${accountId}/ledger`);

    // Ledger returns base currency and total
    const base = ledger.BASE || ledger.USD || Object.values(ledger)[0] || {};

    return {
      accountId,
      netLiquidation: base.netliquidation?.amount ?? 0,
      totalCashValue: base.cashbalance?.amount ?? 0,
      grossPositionValue: base.stockmarketvalue?.amount ?? 0,
      unrealizedPnl: base.unrealizedpnl?.amount ?? 0,
      realizedPnl: base.realizedpnl?.amount ?? 0,
      buyingPower: base.buyingpower?.amount ?? 0,
      maintMarginReq: base.maintmarginreq?.amount ?? 0,
      excessLiquidity: base.excessliquidity?.amount ?? 0,
      currency: base.currency?.amount ? "USD" : "USD",
    };
  }

  // ── Portfolio / Positions ──

  async getPositions(accountId: string, pageId: number = 0): Promise<IBKRPosition[]> {
    return this.request(`/portfolio/${accountId}/positions/${pageId}`);
  }

  // ── Orders ──

  async getOrders(): Promise<{ orders: IBKROrder[] }> {
    return this.request("/iserver/account/orders");
  }

  async placeOrder(accountId: string, order: {
    conid: number;
    orderType: "MKT" | "LMT" | "STP" | "STP_LIMIT";
    side: "BUY" | "SELL";
    quantity: number;
    price?: number;
    auxPrice?: number; // stop price
    tif: "DAY" | "GTC" | "IOC";
    outsideRTH?: boolean;
  }): Promise<{ order_id: string; order_status: string }[]> {
    const body = {
      orders: [{
        acctId: accountId,
        conid: order.conid,
        orderType: order.orderType,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        auxPrice: order.auxPrice,
        tif: order.tif,
        outsideRTH: order.outsideRTH ?? false,
      }],
    };

    return this.request(`/iserver/account/${accountId}/orders`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async confirmOrder(replyId: string, confirmed: boolean): Promise<{ order_id: string; order_status: string }[]> {
    return this.request(`/iserver/reply/${replyId}`, {
      method: "POST",
      body: JSON.stringify({ confirmed }),
    });
  }

  async cancelOrder(accountId: string, orderId: string): Promise<{ msg: string; conid: number; order_id: number }> {
    return this.request(`/iserver/account/${accountId}/order/${orderId}`, {
      method: "DELETE",
    });
  }

  // ── Contract Search ──

  async searchContracts(query: string): Promise<IBKRContractSearch[]> {
    return this.request("/iserver/secdef/search", {
      method: "POST",
      body: JSON.stringify({ symbol: query }),
    });
  }

  async getContractDetails(conid: number): Promise<Record<string, unknown>> {
    return this.request(`/iserver/contract/${conid}/info`);
  }

  // ── Market Data ──

  async getSnapshot(conids: number[], fields: string[] = ["31", "84", "85", "86", "88", "7295", "7296"]): Promise<IBKRMarketData[]> {
    const conidStr = conids.join(",");
    const fieldStr = fields.join(",");
    return this.request(`/iserver/marketdata/snapshot?conids=${conidStr}&fields=${fieldStr}`);
  }

  async getHistory(conid: number, period: string = "1y", bar: string = "1d"): Promise<{ data: IBKRHistoryBar[] }> {
    return this.request(`/iserver/marketdata/history?conid=${conid}&period=${period}&bar=${bar}`);
  }

  // ── Options ──

  async getOptionChain(conid: number): Promise<Record<string, unknown>> {
    return this.request(`/iserver/secdef/info?conid=${conid}&sectype=OPT`);
  }

  async getOptionStrikes(conid: number, sectype: string = "OPT", month: string = ""): Promise<Record<string, unknown>> {
    const params = new URLSearchParams({ conid: String(conid), sectype });
    if (month) params.set("month", month);
    return this.request(`/iserver/secdef/strikes?${params}`);
  }

  // ── Scanner (market screening) ──

  async runScanner(params: {
    instrument: string;
    type: string;
    location: string;
    filter?: Array<{ code: string; value: number }>;
  }): Promise<unknown[]> {
    return this.request("/iserver/scanner/run", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  getEnvironment(): IBKREnvironment {
    return this.environment;
  }

  getGatewayUrl(): string {
    return this.gatewayUrl;
  }
}

// ── Shared credential resolver ──

async function getSetting(key: string): Promise<string | null> {
  try {
    const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
    const value = rows[0]?.value ?? null;
    return value ? decrypt(value) : null;
  } catch {
    return null;
  }
}

export async function getIBKRClient(): Promise<{ client: IBKRClient; environment: IBKREnvironment; accountId: string | null } | null> {
  const gatewayUrl =
    (await getSetting("ibkr_gateway_url")) ||
    process.env.IBKR_GATEWAY_URL ||
    null;

  if (!gatewayUrl) return null;

  const accountId =
    (await getSetting("ibkr_account_id")) ||
    process.env.IBKR_ACCOUNT_ID ||
    null;

  const envFromDb = await getSetting("trading_environment");
  const rawEnv = envFromDb || process.env.TRADING_ENVIRONMENT || "paper";
  const environment: IBKREnvironment = rawEnv === "live" ? "live" : "paper";

  return {
    client: new IBKRClient(gatewayUrl, environment),
    environment,
    accountId,
  };
}

// Dedup cache
const recentOrders = new Map<string, number>();
const DEDUP_WINDOW_MS = 10_000;

export function checkDuplicate(hash: string): boolean {
  const now = Date.now();
  for (const [key, ts] of recentOrders.entries()) {
    if (now - ts > DEDUP_WINDOW_MS) recentOrders.delete(key);
  }
  if (recentOrders.has(hash)) return true;
  recentOrders.set(hash, now);
  return false;
}
