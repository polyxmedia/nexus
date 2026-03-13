import { getConfig, getCached, setCache } from "./storage";

export class NexusAPI {
  private baseUrl: string = "";
  private apiKey: string = "";

  async init(): Promise<boolean> {
    const config = await getConfig();
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    return !!this.apiKey;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    if (!this.apiKey) throw new Error("API key not configured");

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });

    if (res.status === 401) throw new Error("Invalid API key");
    if (res.status === 429) throw new Error("Rate limited");
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    return res.json();
  }

  async get<T>(path: string, cacheKey?: string, ttlMs?: number): Promise<T> {
    if (cacheKey) {
      const cached = await getCached<T>(cacheKey);
      if (cached && cached.fetchedAt + (ttlMs || 300_000) > Date.now()) {
        return cached.data;
      }
    }

    const data = await this.request<T>(path);
    if (cacheKey) await setCache(cacheKey, data, ttlMs);
    return data;
  }

  async getSignals(limit = 20) {
    return this.get<{ data: import("../types/api").Signal[] }>(
      `/api/v1/signals?limit=${limit}`,
      "cache:signals",
      60_000
    );
  }

  async getPredictions(limit = 20) {
    return this.get<{ data: import("../types/api").Prediction[] }>(
      `/api/v1/predictions?limit=${limit}`,
      "cache:predictions",
      60_000
    );
  }

  async getQuote(symbol: string) {
    return this.get<{ data: import("../types/api").MarketQuote }>(
      `/api/v1/market/quote?symbol=${encodeURIComponent(symbol)}`,
      `cache:quote:${symbol}`,
      30_000
    );
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.init();
      await this.request("/api/v1/signals?limit=1");
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }
}

export const api = new NexusAPI();
