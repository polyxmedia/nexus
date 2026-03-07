import crypto from "crypto";

const CB_BASE = "https://api.coinbase.com";
const CB_ADVANCED_BASE = "https://api.coinbase.com/api/v3/brokerage";

export interface CoinbaseAccount {
  uuid: string;
  name: string;
  currency: { code: string; name: string };
  available_balance: { value: string; currency: string };
  hold: { value: string; currency: string };
  type: string;
}

export interface CoinbaseOrder {
  order_id: string;
  product_id: string;
  side: "BUY" | "SELL";
  status: string;
  created_time: string;
  completion_percentage: string;
  filled_size: string;
  average_filled_price: string;
  total_value_after_fees: string;
  order_type: string;
}

export interface CoinbaseProduct {
  product_id: string;
  price: string;
  price_percentage_change_24h: string;
  volume_24h: string;
  base_currency_id: string;
  quote_currency_id: string;
  status: string;
}

export class CoinbaseClient {
  private apiKey: string;
  private apiSecret: string;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  private sign(
    timestamp: string,
    method: string,
    path: string,
    body: string = ""
  ): string {
    const message = timestamp + method.toUpperCase() + path + body;
    return crypto
      .createHmac("sha256", this.apiSecret)
      .update(message)
      .digest("hex");
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    base: string = CB_ADVANCED_BASE
  ): Promise<T> {
    const url = `${base}${path}`;
    const method = (options.method || "GET").toUpperCase();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = options.body ? String(options.body) : "";

    const signature = this.sign(timestamp, method, `/api/v3/brokerage${path}`, body);

    const res = await fetch(url, {
      ...options,
      method,
      headers: {
        "CB-ACCESS-KEY": this.apiKey,
        "CB-ACCESS-SIGN": signature,
        "CB-ACCESS-TIMESTAMP": timestamp,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Coinbase API error ${res.status}: ${text}`);
    }

    return res.json();
  }

  // ── Accounts ──

  async getAccounts(): Promise<CoinbaseAccount[]> {
    const data = await this.request<{ accounts: CoinbaseAccount[] }>("/accounts");
    return data.accounts || [];
  }

  async getAccount(accountId: string): Promise<CoinbaseAccount> {
    const data = await this.request<{ account: CoinbaseAccount }>(`/accounts/${accountId}`);
    return data.account;
  }

  // ── Products / Prices ──

  async getProduct(productId: string): Promise<CoinbaseProduct> {
    const data = await this.request<CoinbaseProduct>(`/products/${productId}`);
    return data;
  }

  async getProducts(productType?: string): Promise<CoinbaseProduct[]> {
    const params = productType ? `?product_type=${productType}` : "";
    const data = await this.request<{ products: CoinbaseProduct[] }>(`/products${params}`);
    return data.products || [];
  }

  async getBestBidAsk(productIds: string[]): Promise<unknown> {
    const params = productIds.map((id) => `product_ids=${id}`).join("&");
    return this.request(`/best_bid_ask?${params}`);
  }

  // ── Orders ──

  async placeMarketOrder(params: {
    productId: string;
    side: "BUY" | "SELL";
    amount: string; // quote currency amount for BUY, base currency amount for SELL
  }): Promise<CoinbaseOrder> {
    const orderConfig =
      params.side === "BUY"
        ? { market_market_ioc: { quote_size: params.amount } }
        : { market_market_ioc: { base_size: params.amount } };

    const body = {
      client_order_id: crypto.randomUUID(),
      product_id: params.productId,
      side: params.side,
      order_configuration: orderConfig,
    };

    const data = await this.request<{ success: boolean; order_id: string; success_response?: CoinbaseOrder }>(
      "/orders",
      { method: "POST", body: JSON.stringify(body) }
    );

    if (!data.success) {
      throw new Error(`Order failed: ${JSON.stringify(data)}`);
    }

    return data.success_response as CoinbaseOrder;
  }

  async placeLimitOrder(params: {
    productId: string;
    side: "BUY" | "SELL";
    baseSize: string;
    limitPrice: string;
    postOnly?: boolean;
  }): Promise<CoinbaseOrder> {
    const body = {
      client_order_id: crypto.randomUUID(),
      product_id: params.productId,
      side: params.side,
      order_configuration: {
        limit_limit_gtc: {
          base_size: params.baseSize,
          limit_price: params.limitPrice,
          post_only: params.postOnly ?? false,
        },
      },
    };

    const data = await this.request<{ success: boolean; success_response?: CoinbaseOrder }>(
      "/orders",
      { method: "POST", body: JSON.stringify(body) }
    );

    if (!data.success) {
      throw new Error(`Limit order failed: ${JSON.stringify(data)}`);
    }

    return data.success_response as CoinbaseOrder;
  }

  async getOrder(orderId: string): Promise<CoinbaseOrder> {
    const data = await this.request<{ order: CoinbaseOrder }>(`/orders/historical/${orderId}`);
    return data.order;
  }

  async getOrders(params?: {
    productId?: string;
    status?: string[];
    limit?: number;
  }): Promise<CoinbaseOrder[]> {
    const searchParams = new URLSearchParams();
    if (params?.productId) searchParams.set("product_id", params.productId);
    if (params?.status) params.status.forEach((s) => searchParams.append("order_status", s));
    if (params?.limit) searchParams.set("limit", String(params.limit));

    const query = searchParams.toString();
    const path = `/orders/historical${query ? `?${query}` : ""}`;
    const data = await this.request<{ orders: CoinbaseOrder[] }>(path);
    return data.orders || [];
  }

  async cancelOrders(orderIds: string[]): Promise<unknown> {
    return this.request("/orders/batch_cancel", {
      method: "POST",
      body: JSON.stringify({ order_ids: orderIds }),
    });
  }

  // ── Portfolio Summary ──

  async getPortfolioSummary(): Promise<{
    accounts: CoinbaseAccount[];
    totalBalance: number;
    holdings: Array<{
      currency: string;
      balance: number;
      available: number;
      hold: number;
    }>;
  }> {
    const accounts = await this.getAccounts();

    const holdings = accounts
      .map((a) => ({
        currency: a.currency.code,
        balance: parseFloat(a.available_balance.value) + parseFloat(a.hold.value),
        available: parseFloat(a.available_balance.value),
        hold: parseFloat(a.hold.value),
      }))
      .filter((h) => h.balance > 0);

    const totalBalance = holdings.reduce((sum, h) => sum + h.balance, 0);

    return { accounts, totalBalance, holdings };
  }
}
