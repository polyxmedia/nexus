import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance();

export interface BarData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  name: string;
  marketCap?: number;
  high52w?: number;
  low52w?: number;
}

// Map common shorthand symbols to Yahoo Finance tickers
const SYMBOL_MAP: Record<string, string> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  XRP: "XRP-USD",
  SOL: "SOL-USD",
  ADA: "ADA-USD",
  DOGE: "DOGE-USD",
  DOT: "DOT-USD",
  AVAX: "AVAX-USD",
  LINK: "LINK-USD",
  LTC: "LTC-USD",
  UNI: "UNI-USD",
  ATOM: "ATOM-USD",
  MATIC: "MATIC-USD",
  SHIB: "SHIB-USD",
  BNB: "BNB-USD",
  "EUR/USD": "EURUSD=X",
  "GBP/USD": "GBPUSD=X",
  "USD/JPY": "USDJPY=X",
  "USD/CHF": "USDCHF=X",
  "AUD/USD": "AUDUSD=X",
  "USD/CAD": "USDCAD=X",
  "NZD/USD": "NZDUSD=X",
  "EUR/GBP": "EURGBP=X",
  "EUR/JPY": "EURJPY=X",
  "GBP/JPY": "GBPJPY=X",
  "EUR/CHF": "EURCHF=X",
  "AUD/JPY": "AUDJPY=X",
};

function resolveSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  return SYMBOL_MAP[upper] || upper;
}

function getStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case "3mo": now.setMonth(now.getMonth() - 3); break;
    case "6mo": now.setMonth(now.getMonth() - 6); break;
    case "1y": now.setFullYear(now.getFullYear() - 1); break;
    case "2y": now.setFullYear(now.getFullYear() - 2); break;
    case "5y": now.setFullYear(now.getFullYear() - 5); break;
    default: now.setMonth(now.getMonth() - 6); break;
  }
  return now;
}

export async function getHistoricalData(
  symbol: string,
  period: "3mo" | "6mo" | "1y" | "2y" | "5y" = "6mo"
): Promise<BarData[]> {
  const ticker = resolveSymbol(symbol);

  const result = await yf.chart(ticker, {
    period1: getStartDate(period),
    interval: "1d",
  });

  const quotes = result.quotes;
  if (!quotes || quotes.length === 0) {
    throw new Error(`No historical data for ${symbol}`);
  }

  return quotes
    .filter((q: Record<string, unknown>) => q.open != null && q.high != null && q.low != null && q.close != null)
    .map((q: Record<string, unknown>) => ({
      date: new Date(q.date as string | number | Date).toISOString().split("T")[0],
      open: q.open as number,
      high: q.high as number,
      low: q.low as number,
      close: q.close as number,
      volume: (q.volume as number) ?? 0,
    }));
}

export async function getQuoteData(symbol: string): Promise<QuoteData> {
  const ticker = resolveSymbol(symbol);
  const result = await yf.quote(ticker) as Record<string, unknown>;

  const marketTime = result.regularMarketTime;
  const timestamp = marketTime instanceof Date
    ? marketTime.toISOString()
    : typeof marketTime === "number"
      ? new Date(marketTime * 1000).toISOString()
      : new Date().toISOString();

  return {
    symbol,
    price: (result.regularMarketPrice as number) ?? 0,
    change: (result.regularMarketChange as number) ?? 0,
    changePercent: (result.regularMarketChangePercent as number) ?? 0,
    volume: (result.regularMarketVolume as number) ?? 0,
    timestamp,
    name: (result.shortName as string) || (result.longName as string) || symbol,
    marketCap: (result.marketCap as number) ?? undefined,
    high52w: (result.fiftyTwoWeekHigh as number) ?? undefined,
    low52w: (result.fiftyTwoWeekLow as number) ?? undefined,
  };
}

export async function getMultipleQuotes(symbols: string[]): Promise<QuoteData[]> {
  const results = await Promise.allSettled(
    symbols.map((s) => getQuoteData(s))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<QuoteData> => r.status === "fulfilled")
    .map((r) => r.value);
}
