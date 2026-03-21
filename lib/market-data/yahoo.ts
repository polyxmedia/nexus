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
  EURUSD: "EURUSD=X",
  "GBP/USD": "GBPUSD=X",
  GBPUSD: "GBPUSD=X",
  "USD/JPY": "USDJPY=X",
  USDJPY: "USDJPY=X",
  "USD/CHF": "USDCHF=X",
  USDCHF: "USDCHF=X",
  "AUD/USD": "AUDUSD=X",
  AUDUSD: "AUDUSD=X",
  "USD/CAD": "USDCAD=X",
  USDCAD: "USDCAD=X",
  "NZD/USD": "NZDUSD=X",
  NZDUSD: "NZDUSD=X",
  "EUR/GBP": "EURGBP=X",
  EURGBP: "EURGBP=X",
  "EUR/JPY": "EURJPY=X",
  EURJPY: "EURJPY=X",
  "GBP/JPY": "GBPJPY=X",
  GBPJPY: "GBPJPY=X",
  "EUR/CHF": "EURCHF=X",
  EURCHF: "EURCHF=X",
  "AUD/JPY": "AUDJPY=X",
  AUDJPY: "AUDJPY=X",
  // LSE-listed leveraged ETPs
  "3OIL": "3OIL.L",
  "3LTS": "3LTS.L",
  "3NGS": "3NGS.L",
  "3GOL": "3GOL.L",
  "3SIL": "3SIL.L",
  "3LNG": "3LNG.L",
  "3LAP": "3LAP.L",
  "3LNV": "3LNV.L",
  "3LMS": "3LMS.L",
  "3LTS": "3LTS.L",
  "3LAZ": "3LAZ.L",
  "3LMT": "3LMT.L",
  "3LGG": "3LGG.L",
  BOIL: "BOIL.L",
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

  return parseChartResult(result, symbol);
}

/**
 * Fetch historical data between specific dates (for backtesting).
 * Unlike the period-based version, this guarantees coverage of the full range.
 */
export async function getHistoricalDataRange(
  symbol: string,
  startDate: string,
  endDate?: string
): Promise<BarData[]> {
  const ticker = resolveSymbol(symbol);

  // Add 90-day buffer before start to allow lookback calculations (e.g. 90d returns)
  const bufferedStart = new Date(startDate);
  if (isNaN(bufferedStart.getTime())) throw new Error(`Invalid startDate: ${startDate}`);
  bufferedStart.setDate(bufferedStart.getDate() - 90);

  const result = await yf.chart(ticker, {
    period1: bufferedStart,
    period2: endDate ? new Date(endDate) : undefined,
    interval: "1d",
  });

  return parseChartResult(result, symbol);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseChartResult(result: any, symbol: string): BarData[] {
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
  const result = await yf.quote(ticker) as Record<string, unknown> | undefined;

  if (!result) {
    throw new Error(`No quote data returned for ${symbol} (ticker: ${ticker})`);
  }

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
