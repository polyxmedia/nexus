import "server-only";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  symbol: string;
  exchange: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: string;
}

export interface MicrostructureMetrics {
  symbol: string;
  spreadBps: number;
  midPrice: number;
  imbalanceRatio: number;
  depth5Bid: number;
  depth5Ask: number;
  depthImbalance: number;
  vwapBid: number;
  vwapAsk: number;
  liquidityScore: number;
  flowDirection: "buy_pressure" | "sell_pressure" | "balanced";
}

async function getCoinbaseCredentials(): Promise<{ key: string; secret: string } | null> {
  const [keyRow, secretRow] = await Promise.all([
    db.select().from(schema.settings).where(eq(schema.settings.key, "coinbase_api_key")),
    db.select().from(schema.settings).where(eq(schema.settings.key, "coinbase_api_secret")),
  ]);
  if (keyRow.length === 0 || secretRow.length === 0) return null;
  return { key: keyRow[0].value, secret: secretRow[0].value };
}

export async function getOrderBook(symbol: string): Promise<OrderBook> {
  // Fetch from Coinbase Advanced Trade API
  const creds = await getCoinbaseCredentials();

  // Fallback to public endpoint if no credentials
  const url = `https://api.exchange.coinbase.com/products/${symbol}/book?level=2`;

  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Order book fetch failed: ${response.status}`);
  }

  const data = await response.json();

  const bids: OrderBookLevel[] = (data.bids || []).slice(0, 50).map((b: string[]) => ({
    price: parseFloat(b[0]),
    size: parseFloat(b[1]),
  }));

  const asks: OrderBookLevel[] = (data.asks || []).slice(0, 50).map((a: string[]) => ({
    price: parseFloat(a[0]),
    size: parseFloat(a[1]),
  }));

  return {
    symbol,
    exchange: "coinbase",
    bids,
    asks,
    timestamp: new Date().toISOString(),
  };
}

export function computeMicrostructure(book: OrderBook): MicrostructureMetrics {
  const { bids, asks, symbol } = book;

  if (bids.length === 0 || asks.length === 0) {
    return {
      symbol,
      spreadBps: 0, midPrice: 0, imbalanceRatio: 0.5,
      depth5Bid: 0, depth5Ask: 0, depthImbalance: 0,
      vwapBid: 0, vwapAsk: 0, liquidityScore: 0,
      flowDirection: "balanced",
    };
  }

  const bestBid = bids[0].price;
  const bestAsk = asks[0].price;
  const midPrice = (bestBid + bestAsk) / 2;
  const spreadBps = midPrice > 0 ? ((bestAsk - bestBid) / midPrice) * 10000 : 0;

  // Depth at top 5 levels
  const depth5Bid = bids.slice(0, 5).reduce((s, l) => s + l.size * l.price, 0);
  const depth5Ask = asks.slice(0, 5).reduce((s, l) => s + l.size * l.price, 0);

  // Imbalance ratio: bid volume / total volume
  const totalBidVol = bids.slice(0, 10).reduce((s, l) => s + l.size, 0);
  const totalAskVol = asks.slice(0, 10).reduce((s, l) => s + l.size, 0);
  const totalVol = totalBidVol + totalAskVol;
  const imbalanceRatio = totalVol > 0 ? totalBidVol / totalVol : 0.5;

  // Depth imbalance: (bid_depth - ask_depth) / (bid_depth + ask_depth)
  const totalDepth = depth5Bid + depth5Ask;
  const depthImbalance = totalDepth > 0 ? (depth5Bid - depth5Ask) / totalDepth : 0;

  // Volume-weighted average prices (top 10 levels)
  const bidVolTotal = bids.slice(0, 10).reduce((s, l) => s + l.size, 0);
  const askVolTotal = asks.slice(0, 10).reduce((s, l) => s + l.size, 0);
  const vwapBid = bidVolTotal > 0
    ? bids.slice(0, 10).reduce((s, l) => s + l.price * l.size, 0) / bidVolTotal
    : bestBid;
  const vwapAsk = askVolTotal > 0
    ? asks.slice(0, 10).reduce((s, l) => s + l.price * l.size, 0) / askVolTotal
    : bestAsk;

  // Liquidity score: 0-100 based on spread and depth
  const spreadScore = Math.max(0, 100 - spreadBps * 2); // tight spread = high score
  const depthScore = Math.min(100, Math.sqrt(totalDepth) * 2); // more depth = higher
  const liquidityScore = Math.round((spreadScore * 0.6 + depthScore * 0.4) * 10) / 10;

  // Flow direction
  const flowDirection = imbalanceRatio > 0.6
    ? "buy_pressure" as const
    : imbalanceRatio < 0.4
    ? "sell_pressure" as const
    : "balanced" as const;

  return {
    symbol,
    spreadBps: Math.round(spreadBps * 100) / 100,
    midPrice: Math.round(midPrice * 100) / 100,
    imbalanceRatio: Math.round(imbalanceRatio * 1000) / 1000,
    depth5Bid: Math.round(depth5Bid * 100) / 100,
    depth5Ask: Math.round(depth5Ask * 100) / 100,
    depthImbalance: Math.round(depthImbalance * 1000) / 1000,
    vwapBid: Math.round(vwapBid * 100) / 100,
    vwapAsk: Math.round(vwapAsk * 100) / 100,
    liquidityScore,
    flowDirection,
  };
}

export async function snapshotAndStore(symbol: string): Promise<MicrostructureMetrics> {
  const book = await getOrderBook(symbol);
  const metrics = computeMicrostructure(book);

  // Store snapshot
  const [snapshot] = await db.insert(schema.orderbookSnapshots).values({
    symbol,
    exchange: book.exchange,
    bids: JSON.stringify(book.bids.slice(0, 20)),
    asks: JSON.stringify(book.asks.slice(0, 20)),
    spreadBps: metrics.spreadBps,
    imbalanceRatio: metrics.imbalanceRatio,
    depth5Bid: metrics.depth5Bid,
    depth5Ask: metrics.depth5Ask,
    midPrice: metrics.midPrice,
    snapshotAt: book.timestamp,
  }).returning();

  // Check for flow imbalance alert
  if (metrics.imbalanceRatio > 0.7 || metrics.imbalanceRatio < 0.3) {
    await db.insert(schema.flowImbalanceAlerts).values({
      symbol,
      imbalanceRatio: metrics.imbalanceRatio,
      direction: metrics.flowDirection,
      magnitude: Math.abs(metrics.imbalanceRatio - 0.5) * 2,
      snapshotId: snapshot.id,
    });
  }

  return metrics;
}
