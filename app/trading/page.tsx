"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { PageContainer } from "@/components/layout/page-container";
import { UpgradeGate } from "@/components/ui/upgrade-gate";
import { DataGrid, type Column } from "@/components/ui/data-grid";
import { StatusDot } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Metric } from "@/components/ui/metric";
import {
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  X,
  TrendingUp,
  TrendingDown,
  Coins,
  BarChart3,
  Landmark,
} from "lucide-react";
import { IBKRPanel } from "@/components/trading/ibkr-panel";
import { EquityCurve } from "@/components/trading/equity-curve";

const CandlestickChart = dynamic(() => import("@/components/charts/candlestick-chart"), { ssr: false });

interface Position {
  ticker: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  ppl: number;
  fxPpl: number;
}

interface Instrument {
  ticker: string;
  name: string;
  shortName: string;
  type: string;
  currencyCode: string;
}

interface AccountData {
  info: { id: number; currencyCode: string };
  cash: {
    free: number;
    total: number;
    ppl: number;
    result: number;
    invested: number;
    pieCash: number;
    blocked: number;
  };
  environment: string;
}

interface ChartBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

const TIME_RANGES = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "ALL", days: 0 },
] as const;

const WATCHLIST_SYMBOLS = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "GLD", label: "Gold" },
  { symbol: "USO", label: "Oil" },
  { symbol: "QQQ", label: "NASDAQ" },
  { symbol: "TLT", label: "Bonds" },
  { symbol: "BTC", label: "Bitcoin" },
];

const CRYPTO_WATCHLIST = [
  { productId: "XRP-USD", label: "XRP" },
  { productId: "BTC-USD", label: "BTC" },
  { productId: "ETH-USD", label: "ETH" },
  { productId: "SOL-USD", label: "SOL" },
  { productId: "ADA-USD", label: "ADA" },
  { productId: "DOGE-USD", label: "DOGE" },
];

interface CryptoHolding {
  currency: string;
  balance: number;
  available: number;
  hold: number;
}

interface CryptoProduct {
  product_id: string;
  price: string;
  price_percentage_change_24h: string;
  volume_24h: string;
  base_currency_id: string;
  quote_currency_id: string;
}

// ── Coinbase Panel ──

function CoinbasePanel({
  onOpenChart,
}: {
  onOpenChart: (symbol: string) => void;
}) {
  const [holdings, setHoldings] = useState<CryptoHolding[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [cbConnected, setCbConnected] = useState(false);
  const [cbLoading, setCbLoading] = useState(true);
  const [cbError, setCbError] = useState<string | null>(null);

  const [productId, setProductId] = useState("XRP-USD");
  const [cbSide, setCbSide] = useState<"BUY" | "SELL">("BUY");
  const [cbAmount, setCbAmount] = useState("");
  const [cbOrderType, setCbOrderType] = useState("MARKET");
  const [cbLimitPrice, setCbLimitPrice] = useState("");
  const [cbPlacing, setCbPlacing] = useState(false);
  const [cbOrderResult, setCbOrderResult] = useState<string | null>(null);

  const [prices, setPrices] = useState<Record<string, CryptoProduct>>({});
  const [pricesLoading, setPricesLoading] = useState(true);

  const fetchCoinbaseData = useCallback(async () => {
    setCbLoading(true);
    setCbError(null);
    try {
      const res = await fetch("/api/coinbase/accounts");
      const data = await res.json();
      if (data.error) {
        setCbError(data.error);
        setCbConnected(false);
      } else {
        setHoldings(data.holdings || []);
        setTotalBalance(data.totalBalance || 0);
        setCbConnected(true);
      }
    } catch {
      setCbError("Failed to connect to Coinbase");
      setCbConnected(false);
    } finally {
      setCbLoading(false);
    }
  }, []);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/coinbase/products");
      const data = await res.json();
      if (Array.isArray(data)) {
        const map: Record<string, CryptoProduct> = {};
        for (const p of data) {
          map[p.product_id] = p;
        }
        setPrices(map);
      }
    } catch {
      // silent
    } finally {
      setPricesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoinbaseData();
    fetchPrices();
  }, [fetchCoinbaseData, fetchPrices]);

  const placeCryptoOrder = async () => {
    if (!productId || !cbAmount) return;
    setCbPlacing(true);
    setCbOrderResult(null);
    try {
      const body: Record<string, unknown> = {
        productId,
        side: cbSide,
        amount: cbAmount,
        orderType: cbOrderType,
      };
      if (cbLimitPrice) body.limitPrice = parseFloat(cbLimitPrice);

      const res = await fetch("/api/coinbase/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setCbOrderResult(`Error: ${data.error}`);
      } else {
        setCbOrderResult(`Order placed: ${cbSide} ${cbAmount} ${productId}`);
        setCbAmount("");
        fetchCoinbaseData();
      }
    } catch {
      setCbOrderResult("Failed to place order");
    } finally {
      setCbPlacing(false);
    }
  };

  return (
    <div>
      {cbError && (
        <div className="mb-4 border border-accent-rose/30 rounded-md bg-accent-rose/5 p-3">
          <p className="text-xs text-accent-rose">{cbError}</p>
          <p className="text-[10px] text-navy-500 mt-1">Set COINBASE_API_KEY and COINBASE_API_SECRET in Settings or environment.</p>
        </div>
      )}

      {/* Quick chart buttons */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-[10px] text-navy-500 uppercase tracking-wider mr-1">Quick Chart:</span>
        {CRYPTO_WATCHLIST.map((w) => (
          <button
            key={w.productId}
            onClick={() => onOpenChart(w.productId.split("-")[0])}
            className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded border border-navy-700/30 text-navy-400 hover:text-accent-cyan hover:border-accent-cyan/30 transition-colors"
          >
            {w.label}
          </button>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {cbLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))
        ) : (
          <>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric label="Total Balance" value={`$${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric label="Assets" value={String(holdings.length)} />
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric
                label="XRP Price"
                value={prices["XRP-USD"] ? `$${parseFloat(prices["XRP-USD"].price).toFixed(4)}` : "N/A"}
                change={prices["XRP-USD"]?.price_percentage_change_24h ? `${parseFloat(prices["XRP-USD"].price_percentage_change_24h).toFixed(2)}%` : ""}
                changeColor={prices["XRP-USD"] && parseFloat(prices["XRP-USD"].price_percentage_change_24h) >= 0 ? "green" : "red"}
              />
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric
                label="BTC Price"
                value={prices["BTC-USD"] ? `$${parseFloat(prices["BTC-USD"].price).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "N/A"}
                change={prices["BTC-USD"]?.price_percentage_change_24h ? `${parseFloat(prices["BTC-USD"].price_percentage_change_24h).toFixed(2)}%` : ""}
                changeColor={prices["BTC-USD"] && parseFloat(prices["BTC-USD"].price_percentage_change_24h) >= 0 ? "green" : "red"}
              />
            </div>
          </>
        )}
      </div>

      {/* Holdings + Order Form */}
      <div className="grid grid-cols-3 gap-4">
        {/* Holdings (2/3) */}
        <div className="col-span-2">
          <h2 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-2 pb-2 border-b border-navy-700/20">
            Crypto Holdings ({holdings.length})
          </h2>
          {cbLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
            </div>
          ) : holdings.length === 0 ? (
            <div className="text-center py-8 text-xs text-navy-500">
              {cbConnected ? "No crypto holdings" : "Connect Coinbase to view holdings"}
            </div>
          ) : (
            <div className="divide-y divide-navy-800/40">
              {holdings.map((h) => {
                const product = prices[`${h.currency}-USD`];
                const price = product ? parseFloat(product.price) : null;
                const usdValue = price ? h.balance * price : null;
                const change24h = product ? parseFloat(product.price_percentage_change_24h || "0") : null;
                return (
                  <div key={h.currency} className="flex items-center justify-between py-2.5 px-1 hover:bg-navy-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onOpenChart(h.currency)}
                        className="text-sm font-semibold text-accent-cyan hover:underline w-14"
                      >
                        {h.currency}
                      </button>
                      <div>
                        <span className="text-xs text-navy-200 font-mono">{h.balance.toFixed(h.currency === "BTC" ? 8 : 4)}</span>
                        {h.hold > 0 && (
                          <span className="text-[10px] text-navy-500 ml-2">({h.hold.toFixed(4)} held)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {price && (
                        <span className="text-xs text-navy-300 font-mono">${price.toFixed(h.currency === "BTC" ? 2 : 4)}</span>
                      )}
                      {usdValue != null && (
                        <span className="text-xs text-navy-200 font-medium font-mono w-24 text-right">
                          ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                      {change24h != null && (
                        <span className={`text-[10px] font-mono w-16 text-right flex items-center justify-end gap-0.5 ${change24h >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                          {change24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Watchlist prices */}
          {!pricesLoading && Object.keys(prices).length > 0 && (
            <div className="mt-4">
              <h2 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-2 pb-2 border-b border-navy-700/20">
                Watchlist
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {CRYPTO_WATCHLIST.map((w) => {
                  const p = prices[w.productId];
                  if (!p) return null;
                  const prc = parseFloat(p.price);
                  const chg = parseFloat(p.price_percentage_change_24h || "0");
                  return (
                    <button
                      key={w.productId}
                      onClick={() => { setProductId(w.productId); onOpenChart(w.label); }}
                      className="flex items-center justify-between p-2.5 rounded border border-navy-700/30 bg-navy-900/40 hover:bg-navy-800/40 hover:border-navy-600/40 transition-colors"
                    >
                      <div>
                        <span className="text-xs font-semibold text-navy-100">{w.label}</span>
                        <span className="text-[10px] text-navy-500 ml-1.5">${prc < 1 ? prc.toFixed(4) : prc.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <span className={`text-[10px] font-mono ${chg >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                        {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Order Form (1/3) */}
        <div className="border border-navy-700/30 rounded-md bg-navy-900/60 h-fit">
          <div className="px-4 py-3 border-b border-navy-700/20">
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500">Crypto Order</h3>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Trading Pair</label>
              <div className="flex flex-wrap gap-1">
                {CRYPTO_WATCHLIST.map((w) => (
                  <button
                    key={w.productId}
                    onClick={() => setProductId(w.productId)}
                    className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${
                      productId === w.productId
                        ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30"
                        : "text-navy-500 hover:text-navy-300 border border-navy-700/30"
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Side</label>
              <div className="flex h-9 rounded-md border border-navy-700/30 overflow-hidden">
                <button onClick={() => setCbSide("BUY")} className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${cbSide === "BUY" ? "bg-accent-emerald/15 text-accent-emerald" : "text-navy-500 hover:text-navy-300"}`}>
                  <ArrowUpRight className="h-3 w-3" /> Buy
                </button>
                <div className="w-px bg-navy-700/30" />
                <button onClick={() => setCbSide("SELL")} className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${cbSide === "SELL" ? "bg-accent-rose/15 text-accent-rose" : "text-navy-500 hover:text-navy-300"}`}>
                  <ArrowDownRight className="h-3 w-3" /> Sell
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Type</label>
              <div className="flex h-7 rounded-md border border-navy-700/30 overflow-hidden w-full">
                {["MARKET", "LIMIT"].map((type, i) => (
                  <button
                    key={type}
                    onClick={() => setCbOrderType(type)}
                    className={`flex-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${i > 0 ? "border-l border-navy-700/30" : ""} ${cbOrderType === type ? "bg-accent-cyan/10 text-accent-cyan" : "text-navy-500 hover:text-navy-300"}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">
                {cbSide === "BUY" ? "Amount (USD)" : "Amount (crypto)"}
              </label>
              <Input placeholder="0.00" type="number" step="any" value={cbAmount} onChange={(e) => setCbAmount(e.target.value)} />
            </div>

            {cbOrderType === "LIMIT" && (
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Limit Price</label>
                <Input placeholder="0.00" type="number" step="any" value={cbLimitPrice} onChange={(e) => setCbLimitPrice(e.target.value)} />
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-navy-700/20">
            <Button onClick={placeCryptoOrder} disabled={cbPlacing || !productId || !cbAmount} variant="primary" className="w-full">
              {cbPlacing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : cbSide === "BUY" ? <ArrowUpRight className="h-3.5 w-3.5 mr-2" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-2" />}
              {cbSide} {productId} {cbAmount ? `$${cbAmount}` : ""}
            </Button>
            {cbOrderResult && (
              <div className={`mt-2 rounded-md border px-3 py-1.5 text-xs ${cbOrderResult.startsWith("Error") ? "border-accent-rose/30 bg-accent-rose/5 text-accent-rose" : "border-accent-emerald/30 bg-accent-emerald/5 text-accent-emerald"}`}>
                {cbOrderResult}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ticker Autocomplete ──

function TickerAutocomplete({
  value,
  onChange,
  instruments,
  loading,
}: {
  value: string;
  onChange: (ticker: string, name?: string) => void;
  instruments: Instrument[];
  loading: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: Instrument[] = [];
    for (const inst of instruments) {
      if (results.length >= 50) break;
      if (
        inst.shortName?.toLowerCase().startsWith(q) ||
        inst.ticker.toLowerCase().startsWith(q) ||
        inst.name.toLowerCase().includes(q)
      ) {
        results.push(inst);
      }
    }
    results.sort((a, b) => {
      const aExact = a.ticker.toLowerCase() === q || a.shortName?.toLowerCase() === q;
      const bExact = b.ticker.toLowerCase() === q || b.shortName?.toLowerCase() === q;
      if (aExact && !bExact) return -1;
      if (bExact && !aExact) return 1;
      return a.shortName.localeCompare(b.shortName);
    });
    return results;
  }, [query, instruments]);

  useEffect(() => { setHighlightIndex(0); }, [filtered]);
  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlightIndex] as HTMLElement;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  const select = useCallback((inst: Instrument) => {
    onChange(inst.ticker, inst.name);
    setQuery(inst.ticker);
    setOpen(false);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) {
      if (e.key === "ArrowDown" && filtered.length > 0) { setOpen(true); e.preventDefault(); }
      return;
    }
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1)); break;
      case "ArrowUp": e.preventDefault(); setHighlightIndex((i) => Math.max(i - 1, 0)); break;
      case "Enter": e.preventDefault(); if (filtered[highlightIndex]) select(filtered[highlightIndex]); break;
      case "Escape": setOpen(false); break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder={loading ? "Loading instruments..." : "Search ticker or name..."}
        value={query}
        onChange={(e) => { setQuery(e.target.value.toUpperCase()); setOpen(true); if (!e.target.value.trim()) onChange(""); }}
        onFocus={() => query.trim() && setOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      {open && filtered.length > 0 && (
        <div ref={listRef} className="absolute z-50 top-full mt-1 left-0 right-0 max-h-56 overflow-y-auto rounded-md border border-navy-700/40 bg-navy-900/95 backdrop-blur-md">
          {filtered.map((inst, i) => (
            <button
              key={inst.ticker}
              onMouseDown={() => select(inst)}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${i === highlightIndex ? "bg-navy-800/80" : "hover:bg-navy-800/40"}`}
            >
              <span className="text-xs font-semibold text-navy-100 w-20 shrink-0">{inst.shortName || inst.ticker}</span>
              <span className="text-[10px] text-navy-400 truncate flex-1">{inst.name}</span>
              <span className="text-[10px] text-navy-600 shrink-0">{inst.currencyCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Chart Panel ──

function ChartPanel({
  symbol,
  onClose,
  onSymbolChange,
  chartHeight = 340,
}: {
  symbol: string;
  onClose: () => void;
  onSymbolChange: (s: string) => void;
  chartHeight?: number;
}) {
  const [chartData, setChartData] = useState<ChartBar[]>([]);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<typeof TIME_RANGES[number]>(TIME_RANGES[2]); // 3M default
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const full = range.days === 0 || range.days > 365;
      const [histRes, quoteRes] = await Promise.all([
        fetch(`/api/market-data?type=chart&symbol=${encodeURIComponent(symbol)}&full=${full}`),
        fetch(`/api/market-data?symbol=${encodeURIComponent(symbol)}`),
      ]);

      const histData = await histRes.json();
      const quoteData = await quoteRes.json();

      if (histData.error) {
        setError(histData.error);
      } else {
        let bars: ChartBar[] = (histData.bars || []).map((b: { date: string; open: number; high: number; low: number; close: number; volume: number }) => ({
          time: b.date,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
          volume: b.volume,
        }));

        // Filter by range
        if (range.days > 0) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - range.days);
          const cutoffStr = cutoff.toISOString().split("T")[0];
          bars = bars.filter((b) => b.time >= cutoffStr);
        }

        setChartData(bars);
      }

      if (quoteData.quote) {
        setQuote(quoteData.quote);
      }
    } catch {
      setError("Failed to load chart data");
    } finally {
      setLoading(false);
    }
  }, [symbol, range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const priceChange = quote?.change || 0;
  const pctChange = quote?.changePercent || 0;

  return (
    <div className="border border-navy-700/30 rounded-md bg-navy-900/60 mb-6">
      {/* Header */}
      <div className="px-4 py-3 border-b border-navy-700/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-navy-100 font-mono">{symbol}</span>
              {quote && (
                <>
                  <span className="text-lg font-bold text-navy-100">${quote.price.toFixed(2)}</span>
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${priceChange >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                    {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)} ({pctChange >= 0 ? "+" : ""}{pctChange.toFixed(2)}%)
                  </span>
                </>
              )}
            </div>
            {quote?.timestamp && (
              <span className="text-[10px] text-navy-500 font-mono">{quote.timestamp}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Watchlist quick links */}
          <div className="flex items-center gap-1 mr-2">
            {WATCHLIST_SYMBOLS.map((w) => (
              <button
                key={w.symbol}
                onClick={() => onSymbolChange(w.symbol)}
                className={`px-2 py-1 text-[9px] font-mono uppercase tracking-wider rounded transition-colors ${
                  symbol === w.symbol
                    ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30"
                    : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          {/* Time range selector */}
          <div className="flex h-7 rounded-md border border-navy-700/30 overflow-hidden">
            {TIME_RANGES.map((r, i) => (
              <button
                key={r.label}
                onClick={() => setRange(r)}
                className={`px-2.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  i > 0 ? "border-l border-navy-700/30" : ""
                } ${range.label === r.label ? "bg-accent-cyan/10 text-accent-cyan" : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="ml-2 text-navy-500 hover:text-navy-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 py-2">
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: chartHeight }}>
            <Loader2 className="h-5 w-5 animate-spin text-navy-500" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center" style={{ height: chartHeight }}>
            <p className="text-xs text-accent-rose">{error}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height: chartHeight }}>
            <p className="text-xs text-navy-500">No chart data available for {symbol}</p>
          </div>
        ) : (
          <CandlestickChart data={chartData} symbol={symbol} height={chartHeight} showVolume />
        )}
      </div>

      {/* Stats bar */}
      {chartData.length > 0 && !loading && (
        <div className="px-4 py-2 border-t border-navy-700/20 flex items-center gap-6 text-[10px] text-navy-500 font-mono">
          <span>High: <span className="text-accent-emerald">{Math.max(...chartData.map((b) => b.high)).toFixed(2)}</span></span>
          <span>Low: <span className="text-accent-rose">{Math.min(...chartData.map((b) => b.low)).toFixed(2)}</span></span>
          <span>Open: <span className="text-navy-300">{chartData[0]?.open.toFixed(2)}</span></span>
          <span>Close: <span className="text-navy-300">{chartData[chartData.length - 1]?.close.toFixed(2)}</span></span>
          <span>Bars: {chartData.length}</span>
          <span>Range: {chartData[0]?.time} to {chartData[chartData.length - 1]?.time}</span>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──

export default function TradingPage() {
  return (
    <Suspense>
      <TradingPageInner />
    </Suspense>
  );
}

function TradingPageInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"stocks" | "crypto" | "ibkr">("stocks");

  const [account, setAccount] = useState<AccountData | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [instrumentsLoading, setInstrumentsLoading] = useState(true);

  const [ticker, setTicker] = useState("");
  const [tickerName, setTickerName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState("MARKET");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderResult, setOrderResult] = useState<string | null>(null);

  // Chart panels — array of open symbols, max 4
  const [chartPanels, setChartPanels] = useState<string[]>([]);

  const addPanel = (symbol: string) => {
    setChartPanels(prev => {
      if (prev.includes(symbol)) return prev; // already open
      if (prev.length >= 4) return [...prev.slice(1), symbol]; // cap at 4, drop oldest
      return [...prev, symbol];
    });
  };
  const removePanel = (idx: number) => setChartPanels(prev => prev.filter((_, i) => i !== idx));
  const updatePanel = (idx: number, symbol: string) => setChartPanels(prev => prev.map((s, i) => i === idx ? symbol : s));
  const togglePanel = (symbol: string) => setChartPanels(prev => prev.includes(symbol) ? prev.filter(s => s !== symbol) : (prev.length >= 4 ? [...prev.slice(1), symbol] : [...prev, symbol]));

  const fetchAccountData = async () => {
    setLoading(true);
    setError(null);
    try {
      const accountRes = await fetch("/api/trading212/account");
      const accountData = await accountRes.json();
      if (accountData.error) {
        setError(accountData.error);
        setConnected(false);
        setLoading(false);
        return;
      }
      setAccount(accountData);
      setConnected(true);
      const positionsRes = await fetch("/api/trading212/portfolio");
      const positionsData = await positionsRes.json();
      setPositions(positionsData.positions || []);
    } catch {
      setError("Failed to connect to Trading 212");
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill from query params (e.g. from Copy Trade on congress page)
  useEffect(() => {
    const symbol = searchParams.get("symbol");
    const side = searchParams.get("side");
    if (symbol) {
      setTicker(symbol);
      addPanel(symbol);
    }
    if (side === "BUY" || side === "SELL") {
      setDirection(side);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    fetchAccountData().then(() => {
      fetch("/api/trading212/instruments")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setInstruments(data); })
        .catch(() => {})
        .finally(() => setInstrumentsLoading(false));
    });
  }, []);

  const placeOrder = async () => {
    if (!ticker || !quantity) return;
    setPlacing(true);
    setOrderResult(null);
    try {
      const body: Record<string, unknown> = { ticker, quantity: parseFloat(quantity), direction, orderType };
      if (limitPrice) body.limitPrice = parseFloat(limitPrice);
      if (stopPrice) body.stopPrice = parseFloat(stopPrice);
      const res = await fetch("/api/trading212/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) setOrderResult(`Error: ${data.error}`);
      else { setOrderResult(`Order placed: ${direction} ${quantity} ${ticker}`); setTicker(""); setTickerName(""); setQuantity(""); fetchAccountData(); }
    } catch { setOrderResult("Failed to place order"); }
    finally { setPlacing(false); }
  };

  const handleTickerChange = useCallback((t: string, name?: string) => {
    setTicker(t);
    setTickerName(name || "");
  }, []);

  const fmt = (n: number | undefined) => {
    if (n == null) return "--";
    return n.toLocaleString("en-GB", { style: "currency", currency: account?.info?.currencyCode || "GBP" });
  };

  const cash = account?.cash;
  const totalValue = cash ? cash.total : 0;
  const invested = cash ? cash.invested : 0;
  const pnl = cash ? cash.ppl : 0;
  const freeCash = cash ? cash.free : 0;
  const returnPct = invested > 0 ? ((pnl / invested) * 100).toFixed(2) : "0.00";

  const positionColumns: Column<Position>[] = [
    {
      key: "ticker",
      header: "Ticker",
      accessor: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); addPanel(row.ticker); }}
          className="font-semibold text-accent-cyan hover:underline"
        >
          {row.ticker}
        </button>
      ),
      sortAccessor: (row) => row.ticker,
    },
    {
      key: "quantity",
      header: "Qty",
      accessor: (row) => <span className="text-navy-200">{row.quantity.toFixed(4)}</span>,
      sortAccessor: (row) => row.quantity,
    },
    {
      key: "avgPrice",
      header: "Avg Price",
      accessor: (row) => <span className="text-navy-300">{fmt(row.averagePrice)}</span>,
      sortAccessor: (row) => row.averagePrice,
    },
    {
      key: "currentPrice",
      header: "Current",
      accessor: (row) => <span className="text-navy-200 font-medium">{fmt(row.currentPrice)}</span>,
      sortAccessor: (row) => row.currentPrice,
    },
    {
      key: "pnl",
      header: "P&L",
      accessor: (row) => {
        const val = row.ppl || 0;
        return (
          <span className={`font-medium flex items-center gap-1 ${val >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
            {val >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {val >= 0 ? "+" : ""}{fmt(val)}
          </span>
        );
      },
      sortAccessor: (row) => row.ppl,
    },
    {
      key: "fxPnl",
      header: "FX P&L",
      accessor: (row) => {
        const val = row.fxPpl || 0;
        if (val === 0) return <span className="text-navy-600">--</span>;
        return <span className={val >= 0 ? "text-accent-emerald" : "text-accent-rose"}>{val >= 0 ? "+" : ""}{fmt(val)}</span>;
      },
      sortAccessor: (row) => row.fxPpl,
    },
    {
      key: "chart",
      header: "",
      accessor: (row) => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); addPanel(row.ticker); }}>
          Chart
        </Button>
      ),
    },
  ];

  return (
    <UpgradeGate minTier="analyst" feature="Trading Integration">
    <PageContainer
      title="Trading"
      subtitle="Stocks & Crypto"
      actions={
        <div className="flex items-center gap-3">
          <StatusDot color={connected ? "green" : "red"} label={connected ? `Connected (${account?.environment || "live"})` : "Disconnected"} />
          <Button variant="primary" size="sm" onClick={fetchAccountData}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      }
    >
      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 mb-6 border-b border-navy-700/30 pb-0">
        <button
          onClick={() => setActiveTab("stocks")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 -mb-px ${
            activeTab === "stocks"
              ? "border-accent-cyan text-accent-cyan"
              : "border-transparent text-navy-500 hover:text-navy-300"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Trading 212
        </button>
        <button
          onClick={() => setActiveTab("crypto")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 -mb-px ${
            activeTab === "crypto"
              ? "border-accent-cyan text-accent-cyan"
              : "border-transparent text-navy-500 hover:text-navy-300"
          }`}
        >
          <Coins className="h-3.5 w-3.5" />
          Coinbase
        </button>
        <button
          onClick={() => setActiveTab("ibkr")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 -mb-px ${
            activeTab === "ibkr"
              ? "border-accent-cyan text-accent-cyan"
              : "border-transparent text-navy-500 hover:text-navy-300"
          }`}
        >
          <Landmark className="h-3.5 w-3.5" />
          Interactive Brokers
        </button>
      </div>

      {/* ── Equity Curve ── */}
      <EquityCurve />

      {/* ── Chart Panels grid ── */}
      {chartPanels.length > 0 && (() => {
        const count = chartPanels.length;
        const cols = count === 1 ? "grid-cols-1" : "grid-cols-2";
        const h = count === 1 ? 380 : count <= 2 ? 300 : 260;
        return (
          <div className={`grid ${cols} gap-3 mb-6`}>
            {chartPanels.map((sym, idx) => (
              <ChartPanel
                key={`${sym}-${idx}`}
                symbol={sym}
                onClose={() => removePanel(idx)}
                onSymbolChange={(s) => updatePanel(idx, s)}
                chartHeight={h}
              />
            ))}
          </div>
        );
      })()}

      {/* ── Crypto Tab ── */}
      {activeTab === "crypto" && (
        <CoinbasePanel onOpenChart={(s) => addPanel(s)} />
      )}

      {/* ── IBKR Tab ── */}
      {activeTab === "ibkr" && (
        <IBKRPanel onOpenChart={(s) => addPanel(s)} />
      )}

      {/* ── Stocks Tab ── */}
      {activeTab === "stocks" && error && (
        <div className="mb-4 border border-accent-rose/30 rounded-md bg-accent-rose/5 p-3">
          <p className="text-xs text-accent-rose">{error}</p>
          <p className="text-[10px] text-navy-500 mt-1">Check your Trading 212 API key and secret in Settings.</p>
        </div>
      )}

      {/* ── Watchlist quick-chart toggles ── */}
      {activeTab === "stocks" && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-navy-600 uppercase tracking-wider font-mono mr-1">Charts:</span>
          {WATCHLIST_SYMBOLS.map((w) => {
            const isOpen = chartPanels.includes(w.symbol);
            return (
              <button
                key={w.symbol}
                onClick={() => togglePanel(w.symbol)}
                className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded border transition-colors ${
                  isOpen
                    ? "border-accent-cyan/40 text-accent-cyan bg-accent-cyan/10"
                    : "border-navy-700/30 text-navy-500 hover:text-accent-cyan hover:border-accent-cyan/30"
                }`}
              >
                {w.label}
              </button>
            );
          })}
          {chartPanels.length > 0 && (
            <button
              onClick={() => setChartPanels([])}
              className="ml-auto px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-navy-700 hover:text-navy-500 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* ── Stocks content ── */}
      {activeTab === "stocks" && <>
      {/* ── Metrics Row ── */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))
        ) : (
          <>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric label="Total Value" value={fmt(totalValue)} />
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric label="Invested" value={fmt(invested)} />
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric
                label="P&L"
                value={`${pnl >= 0 ? "+" : ""}${fmt(pnl)}`}
                change={`${pnl >= 0 ? "+" : ""}${returnPct}%`}
                changeColor={pnl >= 0 ? "green" : "red"}
              />
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric label="Free Cash" value={fmt(freeCash)} />
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric
                label="Realised"
                value={`${(cash?.result || 0) >= 0 ? "+" : ""}${fmt(cash?.result)}`}
                changeColor={(cash?.result || 0) >= 0 ? "green" : "red"}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Positions + Order Form side by side ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Positions (2/3 width) */}
        <div className="col-span-2">
          <h2 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-2 pb-2 border-b border-navy-700/20">
            Open Positions ({positions.length})
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
            </div>
          ) : (
            <DataGrid
              data={positions}
              columns={positionColumns}
              keyExtractor={(row) => row.ticker}
              emptyMessage={connected ? "No open positions" : "Connect to Trading 212 to view positions"}
              filterFn={(row, q) => row.ticker.toLowerCase().includes(q.toLowerCase())}
              searchPlaceholder="Filter positions..."
            />
          )}
        </div>

        {/* Order Form (1/3 width) */}
        <div className="border border-navy-700/30 rounded-md bg-navy-900/60 h-fit">
          <div className="px-4 py-3 border-b border-navy-700/20">
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500">Place Order</h3>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Instrument</label>
              <TickerAutocomplete value={ticker} onChange={handleTickerChange} instruments={instruments} loading={instrumentsLoading} />
              {tickerName && <p className="text-[10px] text-navy-400 mt-1 truncate">{tickerName}</p>}
            </div>

            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Direction</label>
              <div className="flex h-9 rounded-md border border-navy-700/30 overflow-hidden">
                <button onClick={() => setDirection("BUY")} className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${direction === "BUY" ? "bg-accent-emerald/15 text-accent-emerald" : "text-navy-500 hover:text-navy-300"}`}>
                  <ArrowUpRight className="h-3 w-3" /> Buy
                </button>
                <div className="w-px bg-navy-700/30" />
                <button onClick={() => setDirection("SELL")} className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${direction === "SELL" ? "bg-accent-rose/15 text-accent-rose" : "text-navy-500 hover:text-navy-300"}`}>
                  <ArrowDownRight className="h-3 w-3" /> Sell
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Order Type</label>
              <div className="flex h-7 rounded-md border border-navy-700/30 overflow-hidden w-full">
                {["MARKET", "LIMIT", "STOP"].map((type, i) => (
                  <button key={type} onClick={() => setOrderType(type)} className={`flex-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${i > 0 ? "border-l border-navy-700/30" : ""} ${orderType === type ? "bg-accent-cyan/10 text-accent-cyan" : "text-navy-500 hover:text-navy-300"}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Quantity</label>
              <Input placeholder="0.00" type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>

            {(orderType === "LIMIT" || orderType === "STOP_LIMIT") && (
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Limit Price</label>
                <Input placeholder="0.00" type="number" step="any" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} />
              </div>
            )}

            {(orderType === "STOP" || orderType === "STOP_LIMIT") && (
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Stop Price</label>
                <Input placeholder="0.00" type="number" step="any" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} />
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-navy-700/20">
            <Button onClick={placeOrder} disabled={placing || !ticker || !quantity} variant="primary" className="w-full">
              {placing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : direction === "BUY" ? <ArrowUpRight className="h-3.5 w-3.5 mr-2" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-2" />}
              {direction} {ticker || "..."} {quantity ? `x ${quantity}` : ""}
            </Button>
            {orderResult && (
              <div className={`mt-2 rounded-md border px-3 py-1.5 text-xs ${orderResult.startsWith("Error") ? "border-accent-rose/30 bg-accent-rose/5 text-accent-rose" : "border-accent-emerald/30 bg-accent-emerald/5 text-accent-emerald"}`}>
                {orderResult}
              </div>
            )}
          </div>
        </div>
      </div>
      </>}
    </PageContainer>
    </UpgradeGate>
  );
}
