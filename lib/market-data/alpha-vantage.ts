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

// Simple in-memory cache
const cache = new Map<string, { data: QuoteResult; expiry: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

function checkRateLimit(json: Record<string, unknown>, symbol: string) {
  if (json["Note"] || json["Information"]) {
    throw new Error(`Alpha Vantage rate limited for ${symbol}. Free tier allows 25 requests/day, 5/min.`);
  }
}

export async function getQuote(
  symbol: string,
  apiKey: string
): Promise<QuoteResult> {
  const cacheKey = `quote:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const crypto = parseCryptoSymbol(symbol);

  if (crypto.isCrypto) {
    return getCryptoQuote(crypto.base, crypto.market, apiKey);
  }

  const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Alpha Vantage error: ${res.status}`);
  }

  const json = await res.json();
  checkRateLimit(json, symbol);

  const gq = json["Global Quote"];

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

  cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });
  return result;
}

async function getCryptoQuote(
  base: string,
  market: string,
  apiKey: string
): Promise<QuoteResult> {
  const cacheKey = `quote:crypto:${base}:${market}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const url = `${BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=${base}&to_currency=${market}&apikey=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Alpha Vantage error: ${res.status}`);
  }

  const json = await res.json();
  checkRateLimit(json, `${base}/${market}`);

  const rate = json["Realtime Currency Exchange Rate"];

  if (!rate || !rate["5. Exchange Rate"]) {
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

  cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });
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

const dailyCache = new Map<string, { data: DailyBar[]; expiry: number }>();
const DAILY_CACHE_TTL_MS = 300_000; // 5 minutes

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
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Alpha Vantage error: ${res.status}`);
  }

  const json = await res.json();
  checkRateLimit(json, symbol);

  const timeSeries = json["Time Series (Daily)"];

  if (!timeSeries) {
    throw new Error(`No daily data for ${symbol}. The symbol may not be supported or the API key may have exhausted its daily quota.`);
  }

  const bars: DailyBar[] = Object.entries(timeSeries)
    .map(([date, values]) => {
      const v = values as Record<string, string>;
      return {
        date,
        open: parseFloat(v["1. open"]),
        high: parseFloat(v["2. high"]),
        low: parseFloat(v["3. low"]),
        close: parseFloat(v["4. close"]),
        volume: parseInt(v["5. volume"], 10),
      };
    })
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
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Alpha Vantage error: ${res.status}`);
  }

  const json = await res.json();
  checkRateLimit(json, `${base}/${market}`);

  const timeSeries = json["Time Series (Digital Currency Daily)"];

  if (!timeSeries) {
    throw new Error(`No daily crypto data for ${base}/${market}. Symbol may not be supported.`);
  }

  const mkt = market.toUpperCase();
  const allBars: DailyBar[] = Object.entries(timeSeries)
    .map(([date, values]) => {
      const v = values as Record<string, string>;
      return {
        date,
        open: parseFloat(v[`1a. open (${mkt})`] || v["1. open"] || "0"),
        high: parseFloat(v[`2a. high (${mkt})`] || v["2. high"] || "0"),
        low: parseFloat(v[`3a. low (${mkt})`] || v["3. low"] || "0"),
        close: parseFloat(v[`4a. close (${mkt})`] || v["4. close"] || "0"),
        volume: parseFloat(v["5. volume"] || "0"),
      };
    })
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
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Alpha Vantage error: ${res.status}`);
  }

  const json = await res.json();
  checkRateLimit(json, `${fromCurrency}/${toCurrency}`);

  const timeSeries = json["Time Series FX (Daily)"];

  if (!timeSeries) {
    throw new Error(`No FX data for ${fromCurrency}/${toCurrency}. Pair may not be supported.`);
  }

  const bars: DailyBar[] = Object.entries(timeSeries)
    .map(([date, values]) => {
      const v = values as Record<string, string>;
      return {
        date,
        open: parseFloat(v["1. open"]),
        high: parseFloat(v["2. high"]),
        low: parseFloat(v["3. low"]),
        close: parseFloat(v["4. close"]),
        volume: 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  dailyCache.set(cacheKey, { data: bars, expiry: Date.now() + DAILY_CACHE_TTL_MS });
  return bars;
}

export async function searchSymbol(
  query: string,
  apiKey: string
): Promise<Array<{ symbol: string; name: string; type: string; region: string }>> {
  const url = `${BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Alpha Vantage error: ${res.status}`);
  }

  const json = await res.json();
  const matches = json["bestMatches"] || [];

  return matches.map((m: Record<string, string>) => ({
    symbol: m["1. symbol"],
    name: m["2. name"],
    type: m["3. type"],
    region: m["4. region"],
  }));
}
