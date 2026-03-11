/**
 * Twelve Data market data provider.
 * Covers stocks, ETFs, crypto, forex, and indices.
 * API docs: https://twelvedata.com/docs
 *
 * Used as the primary market data source. Alpha Vantage is retained
 * only for options chain data (GEX engine).
 */

import type { QuoteResult, DailyBar } from "./alpha-vantage";

const BASE_URL = "https://api.twelvedata.com";

// ---------------------------------------------------------------------------
// Rate-limited request queue (same pattern as alpha-vantage.ts)
// Twelve Data free: 8 req/min, Grow ($8): 800 req/min
// ---------------------------------------------------------------------------

const RPM = Math.max(1, parseInt(process.env.TWELVE_DATA_RPM || "800", 10));
const MIN_INTERVAL_MS = Math.ceil(60_000 / RPM);

let lastRequestTime = 0;
const pendingRequests: Array<{
  url: string;
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
}> = [];
let draining = false;

const inflight = new Map<string, Promise<unknown>>();

async function drainQueue() {
  if (draining) return;
  draining = true;

  while (pendingRequests.length > 0) {
    const now = Date.now();
    const wait = lastRequestTime + MIN_INTERVAL_MS - now;
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
    }

    const req = pendingRequests.shift();
    if (!req) break;

    lastRequestTime = Date.now();
    try {
      const res = await fetch(req.url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) {
        req.reject(new Error(`Twelve Data HTTP ${res.status}`));
        continue;
      }
      const json = await res.json();
      req.resolve(json);
    } catch (err) {
      req.reject(err instanceof Error ? err : new Error(String(err)));
    }
  }

  draining = false;
}

function throttledFetch(url: string): Promise<Record<string, unknown>> {
  const existing = inflight.get(url);
  if (existing) return existing as Promise<Record<string, unknown>>;

  const promise = new Promise<unknown>((resolve, reject) => {
    pendingRequests.push({ url, resolve, reject });
    drainQueue();
  }).finally(() => {
    inflight.delete(url);
  });

  inflight.set(url, promise);
  return promise as Promise<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Caches (same strategy as alpha-vantage.ts)
// ---------------------------------------------------------------------------

const quoteCache = new Map<string, { data: QuoteResult; expiry: number }>();

function getQuoteTTL(): number {
  const utcHour = new Date().getUTCHours();
  const isMarketHours = utcHour >= 13 && utcHour < 20;
  return isMarketHours ? 60_000 : 300_000;
}

const dailyCache = new Map<string, { data: DailyBar[]; expiry: number }>();
const DAILY_CACHE_TTL_MS = 1_800_000; // 30 minutes

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of quoteCache) {
    if (v.expiry < now) quoteCache.delete(k);
  }
  for (const [k, v] of dailyCache) {
    if (v.expiry < now) dailyCache.delete(k);
  }
}, 300_000);

// ---------------------------------------------------------------------------
// Symbol helpers
// Twelve Data uses native formats: AAPL, BTC/USD, EUR/USD
// ---------------------------------------------------------------------------

const CRYPTO_SYMBOLS = new Set([
  "BTC", "ETH", "XRP", "SOL", "ADA", "DOGE", "DOT", "AVAX", "MATIC", "LINK",
  "UNI", "ATOM", "LTC", "BCH", "XLM", "ALGO", "VET", "FIL", "ICP", "AAVE",
  "NEAR", "APT", "ARB", "OP", "SUI", "SEI", "TIA", "PEPE", "SHIB", "BNB",
]);

const FOREX_PAIRS = new Set([
  "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "CNY", "HKD", "SGD",
  "SEK", "NOK", "MXN", "ZAR", "TRY", "BRL", "INR", "KRW",
]);

interface ParsedSymbol {
  tdSymbol: string; // Symbol formatted for Twelve Data
  type: "stock" | "crypto" | "forex";
}

function parseSymbol(symbol: string): ParsedSymbol {
  const upper = symbol.toUpperCase().trim();

  // Check crypto formats: BTC, BTC-USD, BTC/USD, BTCUSD
  const dashMatch = upper.match(/^([A-Z]+)[-/](USD|EUR|GBP|JPY|AUD|CAD)$/);
  if (dashMatch && CRYPTO_SYMBOLS.has(dashMatch[1])) {
    return { tdSymbol: `${dashMatch[1]}/${dashMatch[2]}`, type: "crypto" };
  }

  for (const market of ["USD", "EUR", "GBP"]) {
    if (upper.endsWith(market) && CRYPTO_SYMBOLS.has(upper.slice(0, -market.length))) {
      return { tdSymbol: `${upper.slice(0, -market.length)}/${market}`, type: "crypto" };
    }
  }

  if (CRYPTO_SYMBOLS.has(upper)) {
    return { tdSymbol: `${upper}/USD`, type: "crypto" };
  }

  // Check forex: EUR/USD, EURUSD
  const fxMatch = upper.match(/^([A-Z]{3})[-/]?([A-Z]{3})$/);
  if (fxMatch && (FOREX_PAIRS.has(fxMatch[1]) || fxMatch[1] === "USD") &&
      (FOREX_PAIRS.has(fxMatch[2]) || fxMatch[2] === "USD") &&
      fxMatch[1] !== fxMatch[2]) {
    return { tdSymbol: `${fxMatch[1]}/${fxMatch[2]}`, type: "forex" };
  }

  return { tdSymbol: upper, type: "stock" };
}

function checkError(json: Record<string, unknown>, symbol: string) {
  if (json.status === "error" || json.code) {
    const msg = (json.message as string) || "Unknown error";
    if (msg.includes("API rate limit") || json.code === 429) {
      throw new Error(`Twelve Data rate limited for ${symbol}: ${msg}`);
    }
    throw new Error(`Twelve Data error for ${symbol}: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Public API (matches alpha-vantage.ts exports)
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) throw new Error("TWELVE_DATA_API_KEY not set");
  return key;
}

export async function getQuote(symbol: string): Promise<QuoteResult> {
  const cacheKey = `td:quote:${symbol}`;
  const cached = quoteCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.data;

  const { tdSymbol } = parseSymbol(symbol);
  const apiKey = getApiKey();

  const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(tdSymbol)}&apikey=${apiKey}`;
  const json = await throttledFetch(url);
  checkError(json, symbol);

  const price = parseFloat(json.close as string);
  if (!price && price !== 0) {
    throw new Error(`No quote data for ${symbol} from Twelve Data`);
  }

  const result: QuoteResult = {
    symbol: (json.symbol as string) || tdSymbol,
    price,
    change: parseFloat((json.change as string) || "0"),
    changePercent: parseFloat((json.percent_change as string) || "0"),
    volume: parseInt((json.volume as string) || "0", 10),
    timestamp: (json.datetime as string) || new Date().toISOString(),
  };

  quoteCache.set(cacheKey, { data: result, expiry: Date.now() + getQuoteTTL() });
  return result;
}

export async function getDailySeries(
  symbol: string,
  outputSize: "compact" | "full" = "compact"
): Promise<DailyBar[]> {
  const cacheKey = `td:daily:${symbol}:${outputSize}`;
  const cached = dailyCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.data;

  const { tdSymbol } = parseSymbol(symbol);
  const apiKey = getApiKey();
  const size = outputSize === "compact" ? 100 : 5000;

  const url = `${BASE_URL}/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=1day&outputsize=${size}&apikey=${apiKey}`;
  const json = await throttledFetch(url);
  checkError(json, symbol);

  const values = json.values as Array<Record<string, string>> | undefined;
  if (!values || values.length === 0) {
    throw new Error(`No daily data for ${symbol} from Twelve Data`);
  }

  const bars: DailyBar[] = values
    .map((v) => ({
      date: v.datetime?.split(" ")[0] || v.datetime, // Strip time portion if present
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseInt(v.volume || "0", 10),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  dailyCache.set(cacheKey, { data: bars, expiry: Date.now() + DAILY_CACHE_TTL_MS });
  return bars;
}

export async function getForexDailySeries(
  fromCurrency: string,
  toCurrency: string,
  outputSize: "compact" | "full" = "compact"
): Promise<DailyBar[]> {
  return getDailySeries(`${fromCurrency}/${toCurrency}`, outputSize);
}

export async function searchSymbol(
  query: string
): Promise<Array<{ symbol: string; name: string; type: string; region: string }>> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/symbol_search?symbol=${encodeURIComponent(query)}&apikey=${apiKey}`;
  const json = await throttledFetch(url);

  const results = (json.data || []) as Array<Record<string, string>>;

  return results.map((m) => ({
    symbol: m.symbol,
    name: m.instrument_name,
    type: m.instrument_type || m.type || "",
    region: m.country || m.exchange || "",
  }));
}
