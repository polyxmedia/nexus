const T212_BASE = {
  demo: "https://demo.trading212.com/api/v0",
  live: "https://live.trading212.com/api/v0",
};

export type Environment = "demo" | "live";

export class Trading212Client {
  private authHeader: string;
  private baseUrl: string;
  private environment: Environment;

  constructor(apiKey: string, _apiSecret: string, environment: Environment = "live") {
    // Trading 212 API v0 uses the API key directly as the Authorization token
    this.authHeader = apiKey;
    this.environment = environment;
    this.baseUrl = T212_BASE[environment];
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await fetch(url, {
        ...options,
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (res.status === 429) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`T212 API error ${res.status}: ${text}`);
      }

      return res.json();
    }

    throw new Error("T212 API: max retries exceeded");
  }

  // Account
  async getAccountInfo() {
    return this.request("/equity/account/info");
  }

  async getAccountCash() {
    return this.request("/equity/account/cash");
  }

  // Portfolio
  async getPositions() {
    return this.request("/equity/portfolio");
  }

  // Orders
  async placeMarketOrder(body: {
    quantity: number;
    ticker: string;
  }) {
    return this.request("/equity/orders/market", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async placeLimitOrder(body: {
    quantity: number;
    ticker: string;
    limitPrice: number;
    timeValidity: string;
  }) {
    return this.request("/equity/orders/limit", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async placeStopOrder(body: {
    quantity: number;
    ticker: string;
    stopPrice: number;
    timeValidity: string;
  }) {
    return this.request("/equity/orders/stop", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async placeStopLimitOrder(body: {
    quantity: number;
    ticker: string;
    limitPrice: number;
    stopPrice: number;
    timeValidity: string;
  }) {
    return this.request("/equity/orders/stop_limit", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async getOrders() {
    return this.request("/equity/orders");
  }

  async cancelOrder(orderId: string) {
    return this.request(`/equity/orders/${orderId}`, {
      method: "DELETE",
    });
  }

  // Instruments
  async searchInstruments(query: string) {
    return this.request(`/equity/metadata/instruments/search?query=${encodeURIComponent(query)}`);
  }

  async getInstruments() {
    return this.request("/equity/metadata/instruments");
  }

  // History
  async getOrderHistory(cursor?: string, limit = 50) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return this.request(`/equity/history/orders?${params}`);
  }

  async getDividendHistory(cursor?: string, limit = 50) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return this.request(`/equity/history/dividends?${params}`);
  }

  getEnvironment() {
    return this.environment;
  }
}

// ── Shared credential resolver for all T212 API routes ──
// Reads from DB settings first, falls back to env vars.
// Environment priority: DB setting > TRADING212_ENVIRONMENT env var > "demo"
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

async function getSetting(key: string): Promise<string | null> {
  try {
    const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
    return rows[0]?.value ?? null;
  } catch {
    return null;
  }
}

export async function getT212Client(): Promise<{ client: Trading212Client; environment: Environment } | null> {
  const apiKey =
    (await getSetting("t212_api_key")) ||
    process.env.TRADING212_API_KEY ||
    null;

  if (!apiKey) return null;

  const envFromDb = await getSetting("trading_environment");
  const rawEnv =
    envFromDb ||
    process.env.TRADING212_ENVIRONMENT ||
    "demo"; // default to demo — safer, and most dev keys are demo keys

  const environment: Environment = rawEnv === "live" ? "live" : "demo";

  return { client: new Trading212Client(apiKey, "", environment), environment };
}

// Dedup cache: hash -> timestamp
const recentOrders = new Map<string, number>();
const DEDUP_WINDOW_MS = 10_000; // 10 seconds

export function checkDuplicate(hash: string): boolean {
  const now = Date.now();

  // Clean expired entries
  for (const [key, ts] of recentOrders.entries()) {
    if (now - ts > DEDUP_WINDOW_MS) recentOrders.delete(key);
  }

  if (recentOrders.has(hash)) return true;

  recentOrders.set(hash, now);
  return false;
}
