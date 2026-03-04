const T212_BASE = {
  demo: "https://demo.trading212.com/api/v0",
  live: "https://live.trading212.com/api/v0",
};

export type Environment = "demo" | "live";

export class Trading212Client {
  private authHeader: string;
  private baseUrl: string;
  private environment: Environment;

  constructor(apiKey: string, apiSecret: string, environment: Environment = "live") {
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    this.authHeader = `Basic ${credentials}`;
    this.environment = environment;
    this.baseUrl = T212_BASE[environment];
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`T212 API error ${res.status}: ${text}`);
    }

    return res.json();
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
