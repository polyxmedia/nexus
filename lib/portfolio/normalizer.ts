import "server-only";

export interface NormalizedPosition {
  broker: string;
  symbol: string;
  normalizedSymbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  currency: string;
  assetClass: "equity" | "crypto" | "etf" | "option";
}

const KNOWN_ETFS = new Set([
  "SPY", "QQQ", "IWM", "DIA", "VTI", "VOO", "EEM", "EFA", "GLD", "SLV",
  "TLT", "HYG", "LQD", "XLF", "XLE", "XLK", "XLV", "XLU", "XLI", "XLP",
  "XLY", "XLB", "XLRE", "XLC", "VNQ", "ARKK", "JETS", "TAN", "SMH", "OIH",
  "GDX", "GDXJ", "XOP", "UNG", "USO", "FXI", "KWEB", "IBIT", "BITO",
]);

const CRYPTO_SYMBOLS = new Set([
  "BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "DOT", "AVAX", "MATIC",
  "LINK", "UNI", "AAVE", "LTC", "BCH", "ATOM", "NEAR", "FTM", "ARB",
]);

export function normalizeT212Symbol(ticker: string): string {
  // T212 uses suffixes: "AAPL_US_EQ", "TSLA_US_EQ", "VOD_L_EQ"
  return ticker.replace(/_[A-Z]+_EQ$/, "").replace(/_EQ$/, "");
}

export function normalizeCoinbaseSymbol(productId: string): string {
  // Coinbase uses "BTC-USD" format
  return productId.toUpperCase();
}

export function normalizeAlpacaSymbol(symbol: string): string {
  return symbol.toUpperCase();
}

export function detectAssetClass(symbol: string, broker: string): NormalizedPosition["assetClass"] {
  if (broker === "coinbase") return "crypto";

  const normalized = symbol.replace(/-USD$/, "").replace(/_.*$/, "");

  if (CRYPTO_SYMBOLS.has(normalized)) return "crypto";
  if (KNOWN_ETFS.has(normalized)) return "etf";

  return "equity";
}
