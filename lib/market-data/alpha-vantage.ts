const BASE_URL = "https://www.alphavantage.co/query";

interface QuoteResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

// Simple in-memory cache
const cache = new Map<string, { data: QuoteResult; expiry: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

export async function getQuote(
  symbol: string,
  apiKey: string
): Promise<QuoteResult> {
  const cacheKey = `quote:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Alpha Vantage error: ${res.status}`);
  }

  const json = await res.json();
  const gq = json["Global Quote"];

  if (!gq || !gq["05. price"]) {
    throw new Error(`No quote data for ${symbol}`);
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

  const url = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=${outputSize}&apikey=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Alpha Vantage error: ${res.status}`);
  }

  const json = await res.json();
  const timeSeries = json["Time Series (Daily)"];

  if (!timeSeries) {
    throw new Error(`No daily data for ${symbol}`);
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
