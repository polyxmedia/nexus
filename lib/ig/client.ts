import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/encryption";

// IG Markets REST Trading API client (session v3 auth)
// Docs: https://labs.ig.com/rest-trading-api-reference

const IG_BASE = {
  demo: "https://demo-api.ig.com/gateway/deal",
  live: "https://api.ig.com/gateway/deal",
};

export type IGEnvironment = "demo" | "live";

interface IGSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // ms timestamp
}

// In-memory session cache (per API key) — avoids re-auth on every request
const sessionCache = new Map<string, IGSession>();

export class IGClient {
  private apiKey: string;
  private username: string;
  private password: string;
  private accountId: string | null;
  private environment: IGEnvironment;
  private baseUrl: string;

  constructor(
    apiKey: string,
    username: string,
    password: string,
    accountId: string | null,
    environment: IGEnvironment = "demo"
  ) {
    this.apiKey = apiKey;
    this.username = username;
    this.password = password;
    this.accountId = accountId;
    this.environment = environment;
    this.baseUrl = IG_BASE[environment];
  }

  // Session v3: returns access_token + refresh_token (OAuth-style)
  private async authenticate(): Promise<IGSession> {
    const cached = sessionCache.get(this.apiKey);
    if (cached && Date.now() < cached.expiresAt - 10_000) {
      return cached;
    }

    // Try refresh first if we have a cached refresh token
    if (cached?.refreshToken) {
      try {
        return await this.refreshSession(cached.refreshToken);
      } catch {
        // Refresh failed, do full login
      }
    }

    const res = await fetch(`${this.baseUrl}/session`, {
      method: "POST",
      headers: {
        "X-IG-API-KEY": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json; charset=UTF-8",
        Version: "3",
      },
      body: JSON.stringify({
        identifier: this.username,
        password: this.password,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`IG auth failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    const session: IGSession = {
      accessToken: data.oauthToken?.access_token || data.access_token,
      refreshToken: data.oauthToken?.refresh_token || data.refresh_token,
      expiresAt: Date.now() + ((data.oauthToken?.expires_in || data.expires_in || 60) * 1000),
    };

    sessionCache.set(this.apiKey, session);
    return session;
  }

  private async refreshSession(refreshToken: string): Promise<IGSession> {
    const res = await fetch(`${this.baseUrl}/session/refresh-token`, {
      method: "POST",
      headers: {
        "X-IG-API-KEY": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json; charset=UTF-8",
        Version: "1",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) throw new Error("IG token refresh failed");

    const data = await res.json();
    const session: IGSession = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + ((data.expires_in || 60) * 1000),
    };

    sessionCache.set(this.apiKey, session);
    return session;
  }

  private async request<T>(path: string, options: RequestInit = {}, version = "1"): Promise<T> {
    const session = await this.authenticate();
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const headers: Record<string, string> = {
        "X-IG-API-KEY": this.apiKey,
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json; charset=UTF-8",
        Version: version,
      };

      if (this.accountId) {
        headers["IG-ACCOUNT-ID"] = this.accountId;
      }

      const res = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: { ...headers, ...(options.headers as Record<string, string>) },
      });

      if (res.status === 429) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt + 1) * 1000;
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }

      if (res.status === 401) {
        // Token expired, clear cache and retry once
        sessionCache.delete(this.apiKey);
        if (attempt === 0) continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`IG API error ${res.status}: ${text}`);
      }

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return res.json();
      }
      return {} as T;
    }

    throw new Error("IG API: max retries exceeded");
  }

  // ── Accounts ──

  async getAccounts(): Promise<{ accounts: IGAccount[] }> {
    return this.request("/accounts");
  }

  async getSession(): Promise<{ accountId: string; clientId: string; currency: string; timezoneOffset: number }> {
    return this.request("/session");
  }

  // ── Positions ──

  async getPositions(): Promise<{ positions: IGPosition[] }> {
    return this.request("/positions", {}, "2");
  }

  // ── Working Orders ──

  async getWorkingOrders(): Promise<{ workingOrders: IGWorkingOrder[] }> {
    return this.request("/workingorders", {}, "2");
  }

  // ── Open Position (OTC) ──

  async openPosition(params: {
    epic: string;
    direction: "BUY" | "SELL";
    size: number;
    orderType: "MARKET" | "LIMIT";
    currencyCode: string;
    expiry?: string;
    limitDistance?: number;
    stopDistance?: number;
    limitLevel?: number;
    stopLevel?: number;
    guaranteedStop?: boolean;
    forceOpen?: boolean;
  }): Promise<{ dealReference: string }> {
    return this.request("/positions/otc", {
      method: "POST",
      body: JSON.stringify({
        epic: params.epic,
        direction: params.direction,
        size: params.size,
        orderType: params.orderType,
        currencyCode: params.currencyCode,
        expiry: params.expiry || "-",
        limitDistance: params.limitDistance || null,
        stopDistance: params.stopDistance || null,
        limitLevel: params.limitLevel || null,
        stopLevel: params.stopLevel || null,
        guaranteedStop: params.guaranteedStop || false,
        forceOpen: params.forceOpen || true,
      }),
    }, "2");
  }

  // ── Close Position ──

  async closePosition(dealId: string, direction: "BUY" | "SELL", size: number): Promise<{ dealReference: string }> {
    return this.request("/positions/otc", {
      method: "DELETE",
      headers: { _method: "DELETE" },
      body: JSON.stringify({
        dealId,
        direction,
        size,
        orderType: "MARKET",
      }),
    }, "1");
  }

  // ── Create Working Order ──

  async createWorkingOrder(params: {
    epic: string;
    direction: "BUY" | "SELL";
    size: number;
    type: "LIMIT" | "STOP";
    level: number;
    currencyCode: string;
    expiry?: string;
    goodTillDate?: string;
    limitDistance?: number;
    stopDistance?: number;
    guaranteedStop?: boolean;
    forceOpen?: boolean;
  }): Promise<{ dealReference: string }> {
    return this.request("/workingorders/otc", {
      method: "POST",
      body: JSON.stringify({
        epic: params.epic,
        direction: params.direction,
        size: params.size,
        type: params.type,
        level: params.level,
        currencyCode: params.currencyCode,
        expiry: params.expiry || "-",
        goodTillDate: params.goodTillDate || null,
        timeInForce: params.goodTillDate ? "GOOD_TILL_DATE" : "GOOD_TILL_CANCELLED",
        limitDistance: params.limitDistance || null,
        stopDistance: params.stopDistance || null,
        guaranteedStop: params.guaranteedStop || false,
        forceOpen: params.forceOpen || true,
      }),
    }, "2");
  }

  // ── Delete Working Order ──

  async deleteWorkingOrder(dealId: string): Promise<{ dealReference: string }> {
    return this.request(`/workingorders/otc/${dealId}`, { method: "DELETE" });
  }

  // ── Deal Confirmation ──

  async getDealConfirmation(dealReference: string): Promise<IGDealConfirmation> {
    return this.request(`/confirms/${dealReference}`);
  }

  // ── Markets / Search ──

  async searchMarkets(query: string): Promise<{ markets: IGMarketSearch[] }> {
    return this.request(`/markets?searchTerm=${encodeURIComponent(query)}`);
  }

  async getMarketDetails(epic: string): Promise<IGMarketDetail> {
    return this.request(`/markets/${epic}`, {}, "3");
  }

  // ── History ──

  async getActivity(from: string, to: string): Promise<{ activities: IGActivity[] }> {
    return this.request(`/history/activity?from=${from}&to=${to}`, {}, "3");
  }

  async getTransactions(type: string = "ALL", from: string, to: string): Promise<{ transactions: IGTransaction[] }> {
    return this.request(`/history/transactions/${type}/${from}/${to}`);
  }

  // ── Client Sentiment ──

  async getSentiment(marketId: string): Promise<{ longPositionPercentage: number; shortPositionPercentage: number }> {
    return this.request(`/clientsentiment/${marketId}`);
  }

  getEnvironment(): IGEnvironment {
    return this.environment;
  }
}

// ── Types ──

export interface IGAccount {
  accountId: string;
  accountName: string;
  accountAlias: string | null;
  status: string;
  accountType: string;
  preferred: boolean;
  balance: {
    balance: number;
    deposit: number;
    profitLoss: number;
    available: number;
  };
  currency: string;
  canTransferFrom: boolean;
  canTransferTo: boolean;
}

export interface IGPosition {
  position: {
    contractSize: number;
    createdDate: string;
    createdDateUTC: string;
    dealId: string;
    dealReference: string;
    size: number;
    direction: "BUY" | "SELL";
    limitLevel: number | null;
    stopLevel: number | null;
    currency: string;
    controlledRisk: boolean;
    level: number;
  };
  market: {
    instrumentName: string;
    expiry: string;
    epic: string;
    instrumentType: string;
    lotSize: number;
    high: number;
    low: number;
    percentageChange: number;
    netChange: number;
    bid: number;
    offer: number;
    updateTime: string;
    updateTimeUTC: string;
    delayTime: number;
    streamingPricesAvailable: boolean;
    marketStatus: string;
    scalingFactor: number;
  };
}

export interface IGWorkingOrder {
  workingOrderData: {
    dealId: string;
    direction: "BUY" | "SELL";
    epic: string;
    orderSize: number;
    orderLevel: number;
    timeInForce: string;
    goodTillDate: string | null;
    createdDate: string;
    createdDateUTC: string;
    guaranteedStop: boolean;
    orderType: string;
    stopDistance: number | null;
    limitDistance: number | null;
    currencyCode: string;
  };
  marketData: {
    instrumentName: string;
    exchangeId: string;
    expiry: string;
    marketStatus: string;
    epic: string;
    instrumentType: string;
    lotSize: number;
    high: number;
    low: number;
    percentageChange: number;
    netChange: number;
    bid: number;
    offer: number;
    updateTime: string;
    updateTimeUTC: string;
    delayTime: number;
    streamingPricesAvailable: boolean;
    scalingFactor: number;
  };
}

export interface IGDealConfirmation {
  date: string;
  status: string;
  reason: string;
  dealStatus: string;
  epic: string;
  expiry: string;
  dealReference: string;
  dealId: string;
  affectedDeals: { dealId: string; status: string }[];
  level: number;
  size: number;
  direction: string;
  stopLevel: number | null;
  limitLevel: number | null;
  stopDistance: number | null;
  limitDistance: number | null;
  guaranteedStop: boolean;
  profit: number | null;
  profitCurrency: string | null;
}

export interface IGMarketSearch {
  epic: string;
  instrumentName: string;
  instrumentType: string;
  expiry: string;
  high: number;
  low: number;
  percentageChange: number;
  netChange: number;
  updateTime: string;
  updateTimeUTC: string;
  bid: number;
  offer: number;
  delayTime: number;
  streamingPricesAvailable: boolean;
  marketStatus: string;
  scalingFactor: number;
}

export interface IGMarketDetail {
  instrument: {
    epic: string;
    expiry: string;
    name: string;
    forceOpenAllowed: boolean;
    stopsLimitsAllowed: boolean;
    lotSize: number;
    unit: string;
    type: string;
    controlledRiskAllowed: boolean;
    streamingPricesAvailable: boolean;
    marketId: string;
    currencies: { code: string; symbol: string; baseExchangeRate: number; exchangeRate: number; isDefault: boolean }[];
    marginDepositBands: { min: number; max: number; margin: number; currency: string }[];
    openingHours: { marketTimes: { openTime: string; closeTime: string }[] } | null;
  };
  dealingRules: {
    minStopOrProfitDistance: { unit: string; value: number };
    minControlledRiskStopDistance: { unit: string; value: number };
    minStepDistance: { unit: string; value: number };
    minDealSize: { unit: string; value: number };
    maxStopOrProfitDistance: { unit: string; value: number };
    controlledRiskSpacing: { unit: string; value: number };
    marketOrderPreference: string;
    trailingStopsPreference: string;
  };
  snapshot: {
    marketStatus: string;
    netChange: number;
    percentageChange: number;
    updateTime: string;
    delayTime: number;
    bid: number;
    offer: number;
    high: number;
    low: number;
    binaryOdds: number | null;
    decimalPlacesFactor: number;
    scalingFactor: number;
    controlledRiskExtraSpread: number;
  };
}

export interface IGActivity {
  date: string;
  dateUTC: string;
  dealId: string;
  epic: string;
  period: string;
  channel: string;
  type: string;
  status: string;
  description: string;
  details: {
    direction: string;
    size: number;
    level: number;
    currency: string;
    actions: { actionType: string; affectedDealId: string }[];
  };
}

export interface IGTransaction {
  date: string;
  dateUtc: string;
  instrumentName: string;
  period: string;
  profitAndLoss: string;
  transactionType: string;
  reference: string;
  openLevel: string;
  closeLevel: string;
  cashTransaction: boolean;
  currency: string;
  size: string;
  openDateUtc: string;
  closeDateUtc: string;
}

// ── Factory ──

async function getSetting(key: string): Promise<string | null> {
  try {
    const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
    const value = rows[0]?.value ?? null;
    return value ? decrypt(value) : null;
  } catch {
    return null;
  }
}

export async function getIGClient(): Promise<{
  client: IGClient;
  environment: IGEnvironment;
  accountId: string | null;
} | null> {
  const apiKey = (await getSetting("ig_api_key")) || process.env.IG_API_KEY || null;
  if (!apiKey) return null;

  const accountId = (await getSetting("ig_account_id")) || process.env.IG_ACCOUNT_ID || null;
  const envFromDb = await getSetting("trading_environment");
  const rawEnv = envFromDb || process.env.IG_ENVIRONMENT || "demo";
  const environment: IGEnvironment = rawEnv === "live" ? "live" : "demo";

  // Prefer stored OAuth tokens (no password needed)
  const storedAccessToken = await getSetting("ig_oauth_access_token");
  const storedRefreshToken = await getSetting("ig_oauth_refresh_token");

  if (storedAccessToken && storedRefreshToken) {
    // Create client without credentials, pre-seed the session cache with stored tokens
    const client = new IGClient(apiKey, "", "", accountId, environment);
    const expiresAtStr = await getSetting("ig_oauth_expires_at");
    const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : Date.now() + 55_000;

    sessionCache.set(apiKey, {
      accessToken: storedAccessToken,
      refreshToken: storedRefreshToken,
      expiresAt,
    });

    return { client, environment, accountId };
  }

  // Legacy fallback: username + password from settings or env
  const username = (await getSetting("ig_username")) || process.env.IG_USERNAME || null;
  const password = (await getSetting("ig_password")) || process.env.IG_PASSWORD || null;

  if (!username || !password) return null;

  return {
    client: new IGClient(apiKey, username, password, accountId, environment),
    environment,
    accountId,
  };
}

// ── Dedup cache ──

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
