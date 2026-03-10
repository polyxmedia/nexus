const BASE_URL = "https://www.alphavantage.co/query";

interface QuoteResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

// Known crypto symbols - Alpha Vantage uses a different endpoint for these
const CRYPTO_SYMBOLS = new Set([
  "BTC", "ETH", "XRP", "SOL", "ADA", "DOGE", "DOT", "AVAX", "MATIC", "LINK",
  "UNI", "ATOM", "LTC", "BCH", "XLM", "ALGO", "VET", "FIL", "ICP", "AAVE",
  "NEAR", "APT", "ARB", "OP", "SUI", "SEI", "TIA", "PEPE", "SHIB", "BNB",
]);

/**
 * Detect if a symbol is a crypto symbol.
 * Handles formats: XRP, XRP-USD, XRPUSD, XRP/USD
 */
function parseCryptoSymbol(symbol: string): { isCrypto: boolean; base: string; market: string } {
  const upper = symbol.toUpperCase();

  // XRP-USD, XRP/USD
  const dashMatch = upper.match(/^([A-Z]+)[-/](USD|EUR|GBP|JPY|AUD|CAD)$/);
  if (dashMatch && CRYPTO_SYMBOLS.has(dashMatch[1])) {
    return { isCrypto: true, base: dashMatch[1], market: dashMatch[2] };
  }

  // XRPUSD
  for (const market of ["USD", "EUR", "GBP"]) {
    if (upper.endsWith(market) && CRYPTO_SYMBOLS.has(upper.slice(0, -market.length))) {
      return { isCrypto: true, base: upper.slice(0, -market.length), market };
    }
  }

  // Plain symbol like XRP
  if (CRYPTO_SYMBOLS.has(upper)) {
    return { isCrypto: true, base: upper, market: "USD" };
  }

  return { isCrypto: false, base: upper, market: "USD" };
}

// ---------------------------------------------------------------------------
// Rate-limited request queue
// All Alpha Vantage HTTP requests go through this single throttle so
// concurrent callers (signals, predictions, GEX, BOCPD, etc.) share
// the same budget instead of stampeding the API independently.
// ---------------------------------------------------------------------------

// Configurable via env: ALPHA_VANTAGE_RPM (requests per minute)
// Free tier: 5/min, Premium ($49.99/mo): 75/min, higher tiers go up from there
const RPM = Math.max(1, parseInt(process.env.ALPHA_VANTAGE_RPM || "75", 10));
const MIN_INTERVAL_MS = Math.ceil(60_000 / RPM); // ms between requests

let lastRequestTime = 0;
const pendingRequests: Array<{
  url: string;
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
}> = [];
let draining = false;

// Inflight deduplication: if the exact same URL is already being fetched,
// piggyback on that promise instead of queuing a second request
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
        req.reject(new Error(`Alpha Vantage HTTP ${res.status}`));
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
  // Dedup: if this exact URL is already inflight, return the same promise
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
// Caches
// Quotes: 2 minutes (prices move, but not every second for our purposes)
// Daily series: 30 minutes (daily bars only change once per day)
// ---------------------------------------------------------------------------

const quoteCache = new Map<string, { data: QuoteResult; expiry: number }>();

// Quote cache is market-hours aware: 60s during trading, 5min outside
// Daily bars only change once per day, so 30min cache is fine
function getQuoteTTL(): number {
  const now = new Date();
  const utcHour = now.getUTCHours();
  // US market hours roughly 13:30-20:00 UTC (9:30am-4pm ET)
  const isMarketHours = utcHour >= 13 && utcHour < 20;
  return isMarketHours ? 60_000 : 300_000; // 1 min vs 5 min
}

const dailyCache = new Map<string, { data: DailyBar[]; expiry: number }>();
const DAILY_CACHE_TTL_MS = 1_800_000; // 30 minutes

// Periodic cache cleanup to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of quoteCache) {
    if (v.expiry < now) quoteCache.delete(k);
  }
  for (const [k, v] of dailyCache) {
    if (v.expiry < now) dailyCache.delete(k);
  }
}, 300_000); // every 5 min

function checkRateLimit(json: Record<string, unknown>, symbol: string) {
  if (json["Note"] || json["Information"]) {
    const msg = (json["Note"] || json["Information"]) as string;
    throw new Error(`Alpha Vantage rate limited for ${symbol}: ${msg}`);
  }
}

export async function getQuote(
  symbol: string,
  apiKey: string
): Promise<QuoteResult> {
  const cacheKey = `quote:${symbol}`;
  const cached = quoteCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const crypto = parseCryptoSymbol(symbol);

  if (crypto.isCrypto) {
    return getCryptoQuote(crypto.base, crypto.market, apiKey);
  }

  const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
  const json = await throttledFetch(url);
  checkRateLimit(json, symbol);

  const gq = json["Global Quote"] as Record<string, string> | undefined;

  if (!gq || !gq["05. price"]) {
    throw new Error(`No quote data for ${symbol}. The symbol may not be supported by Alpha Vantage (try without ^ prefix for indices, or use ETF equivalents like SPY for S&P500).`);
  }

  const result: QuoteResult = {
    symbol: gq["01. symbol"],
    price: parseFloat(gq["05. price"]),
    change: parseFloat(gq["09. change"]),
    changePercent: parseFloat(gq["10. change percent"]?.replace("%", "") || "0"),
    volume: parseInt(gq["06. volume"], 10),
    timestamp: gq["07. latest trading day"],
  };

  quoteCache.set(cacheKey, { data: result, expiry: Date.now() + getQuoteTTL() });
  return result;
}

async function getCryptoQuote(
  base: string,
  market: string,
  apiKey: string
): Promise<QuoteResult> {
  const cacheKey = `quote:crypto:${base}:${market}`;
  const cached = quoteCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const url = `${BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=${base}&to_currency=${market}&apikey=${apiKey}`;
  const json = await throttledFetch(url);
  checkRateLimit(json, `${base}/${market}`);

  const rate = (json["Realtime Currency Exchange Rate"] || {}) as Record<string, string>;

  if (!rate["5. Exchange Rate"]) {
    throw new Error(`No crypto quote for ${base}/${market}. Symbol may not be supported.`);
  }

  const price = parseFloat(rate["5. Exchange Rate"]);
  const bid = parseFloat(rate["8. Bid Price"] || "0");
  const ask = parseFloat(rate["9. Ask Price"] || "0");

  const result: QuoteResult = {
    symbol: `${base}/${market}`,
    price,
    change: bid && ask ? ask - bid : 0,
    changePercent: 0, // Exchange rate endpoint doesn't provide daily change
    volume: 0,
    timestamp: rate["6. Last Refreshed"] || new Date().toISOString(),
  };

  quoteCache.set(cacheKey, { data: result, expiry: Date.now() + getQuoteTTL() });
  return result;
}

export interface DailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function getDailySeries(
  symbol: string,
  apiKey: string,
  outputSize: "compact" | "full" = "compact"
): Promise<DailyBar[]> {
  const cacheKey = `daily:${symbol}:${outputSize}`;
  const cached = dailyCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const crypto = parseCryptoSymbol(symbol);

  if (crypto.isCrypto) {
    return getCryptoDailySeries(crypto.base, crypto.market, apiKey, outputSize);
  }

  const url = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=${outputSize}&apikey=${apiKey}`;
  const json = await throttledFetch(url);
  checkRateLimit(json, symbol);

  const timeSeries = json["Time Series (Daily)"] as Record<string, Record<string, string>> | undefined;

  if (!timeSeries) {
    throw new Error(`No daily data for ${symbol}. The symbol may not be supported or the API key may have exhausted its daily quota.`);
  }

  const bars: DailyBar[] = Object.entries(timeSeries)
    .map(([date, v]) => ({
      date,
      open: parseFloat(v["1. open"]),
      high: parseFloat(v["2. high"]),
      low: parseFloat(v["3. low"]),
      close: parseFloat(v["4. close"]),
      volume: parseInt(v["5. volume"], 10),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  dailyCache.set(cacheKey, { data: bars, expiry: Date.now() + DAILY_CACHE_TTL_MS });
  return bars;
}

async function getCryptoDailySeries(
  base: string,
  market: string,
  apiKey: string,
  outputSize: "compact" | "full"
): Promise<DailyBar[]> {
  const cacheKey = `daily:crypto:${base}:${market}:${outputSize}`;
  const cached = dailyCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const url = `${BASE_URL}?function=DIGITAL_CURRENCY_DAILY&symbol=${base}&market=${market}&apikey=${apiKey}`;
  const json = await throttledFetch(url);
  checkRateLimit(json, `${base}/${market}`);

  const timeSeries = json["Time Series (Digital Currency Daily)"] as Record<string, Record<string, string>> | undefined;

  if (!timeSeries) {
    throw new Error(`No daily crypto data for ${base}/${market}. Symbol may not be supported.`);
  }

  const mkt = market.toUpperCase();
  const allBars: DailyBar[] = Object.entries(timeSeries)
    .map(([date, v]) => ({
      date,
      open: parseFloat(v[`1a. open (${mkt})`] || v["1. open"] || "0"),
      high: parseFloat(v[`2a. high (${mkt})`] || v["2. high"] || "0"),
      low: parseFloat(v[`3a. low (${mkt})`] || v["3. low"] || "0"),
      close: parseFloat(v[`4a. close (${mkt})`] || v["4. close"] || "0"),
      volume: parseFloat(v["5. volume"] || "0"),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Respect outputSize
  const bars = outputSize === "compact" ? allBars.slice(-100) : allBars;

  dailyCache.set(cacheKey, { data: bars, expiry: Date.now() + DAILY_CACHE_TTL_MS });
  return bars;
}

export async function getForexDailySeries(
  fromCurrency: string,
  toCurrency: string,
  apiKey: string,
  outputSize: "compact" | "full" = "compact"
): Promise<DailyBar[]> {
  const cacheKey = `daily:fx:${fromCurrency}:${toCurrency}:${outputSize}`;
  const cached = dailyCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const url = `${BASE_URL}?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&outputsize=${outputSize}&apikey=${apiKey}`;
  const json = await throttledFetch(url);
  checkRateLimit(json, `${fromCurrency}/${toCurrency}`);

  const timeSeries = json["Time Series FX (Daily)"] as Record<string, Record<string, string>> | undefined;

  if (!timeSeries) {
    throw new Error(`No FX data for ${fromCurrency}/${toCurrency}. Pair may not be supported.`);
  }

  const bars: DailyBar[] = Object.entries(timeSeries)
    .map(([date, v]) => ({
      date,
      open: parseFloat(v["1. open"]),
      high: parseFloat(v["2. high"]),
      low: parseFloat(v["3. low"]),
      close: parseFloat(v["4. close"]),
      volume: 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  dailyCache.set(cacheKey, { data: bars, expiry: Date.now() + DAILY_CACHE_TTL_MS });
  return bars;
}

export async function searchSymbol(
  query: string,
  apiKey: string
): Promise<Array<{ symbol: string; name: string; type: string; region: string }>> {
  const url = `${BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${apiKey}`;
  const json = await throttledFetch(url);
  const matches = (json["bestMatches"] || []) as Array<Record<string, string>>;

  return matches.map((m) => ({
    symbol: m["1. symbol"],
    name: m["2. name"],
    type: m["3. type"],
    region: m["4. region"],
  }));
}
