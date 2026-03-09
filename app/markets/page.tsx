"use client";

import { useCallback, useEffect, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { PageContainer } from "@/components/layout/page-container";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const CandlestickChart = dynamic(
  () => import("@/components/charts/candlestick-chart"),
  { ssr: false }
);

interface BarData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface QuoteInfo {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  name: string;
  marketCap?: number;
  high52w?: number;
  low52w?: number;
}

interface MarketCategory {
  label: string;
  symbols: { symbol: string; name: string }[];
}

const CATEGORIES: Record<string, MarketCategory> = {
  stocks: {
    label: "Stocks",
    symbols: [
      { symbol: "SPY", name: "S&P 500 ETF" },
      { symbol: "QQQ", name: "Nasdaq 100 ETF" },
      { symbol: "AAPL", name: "Apple" },
      { symbol: "MSFT", name: "Microsoft" },
      { symbol: "NVDA", name: "NVIDIA" },
      { symbol: "AMZN", name: "Amazon" },
      { symbol: "GOOGL", name: "Alphabet" },
      { symbol: "META", name: "Meta" },
      { symbol: "TSLA", name: "Tesla" },
      { symbol: "JPM", name: "JPMorgan" },
    ],
  },
  crypto: {
    label: "Crypto",
    symbols: [
      { symbol: "BTC", name: "Bitcoin" },
      { symbol: "ETH", name: "Ethereum" },
      { symbol: "XRP", name: "Ripple" },
      { symbol: "SOL", name: "Solana" },
      { symbol: "ADA", name: "Cardano" },
      { symbol: "DOGE", name: "Dogecoin" },
      { symbol: "DOT", name: "Polkadot" },
      { symbol: "AVAX", name: "Avalanche" },
      { symbol: "LINK", name: "Chainlink" },
      { symbol: "LTC", name: "Litecoin" },
    ],
  },
  fx: {
    label: "FX",
    symbols: [
      { symbol: "EUR/USD", name: "Euro / US Dollar" },
      { symbol: "GBP/USD", name: "British Pound / US Dollar" },
      { symbol: "USD/JPY", name: "US Dollar / Japanese Yen" },
      { symbol: "USD/CHF", name: "US Dollar / Swiss Franc" },
      { symbol: "AUD/USD", name: "Australian Dollar / US Dollar" },
      { symbol: "USD/CAD", name: "US Dollar / Canadian Dollar" },
      { symbol: "NZD/USD", name: "New Zealand Dollar / US Dollar" },
      { symbol: "EUR/GBP", name: "Euro / British Pound" },
      { symbol: "EUR/JPY", name: "Euro / Japanese Yen" },
      { symbol: "GBP/JPY", name: "British Pound / Japanese Yen" },
    ],
  },
  commodities: {
    label: "Commodities",
    symbols: [
      { symbol: "GC=F", name: "Gold Futures" },
      { symbol: "SI=F", name: "Silver Futures" },
      { symbol: "CL=F", name: "Crude Oil Futures" },
      { symbol: "NG=F", name: "Natural Gas Futures" },
      { symbol: "ZW=F", name: "Wheat Futures" },
      { symbol: "ZC=F", name: "Corn Futures" },
      { symbol: "HG=F", name: "Copper Futures" },
      { symbol: "PL=F", name: "Platinum Futures" },
    ],
  },
};

const PERIODS = [
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
  { value: "5y", label: "5Y" },
] as const;

const TAB_KEYS = Object.keys(CATEGORIES);

export default function MarketsPage() {
  const [activeTab, setActiveTab] = useState("stocks");
  const [selectedSymbol, setSelectedSymbol] = useState(CATEGORIES.stocks.symbols[0]);
  const [period, setPeriod] = useState<string>("6mo");
  const [chartData, setChartData] = useState<BarData[]>([]);
  const [quote, setQuote] = useState<QuoteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChart = useCallback(async (symbol: string, p: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/markets/chart?symbol=${encodeURIComponent(symbol)}&period=${p}`
      );
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setChartData([]);
        setQuote(null);
      } else {
        setChartData(
          (data.bars || []).map((b: { date: string; open: number; high: number; low: number; close: number; volume: number }) => ({
            time: b.date,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
            volume: b.volume,
          }))
        );
        setQuote(data.quote || null);
      }
    } catch {
      setError("Failed to fetch chart data");
      setChartData([]);
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChart(selectedSymbol.symbol, period);
  }, [selectedSymbol, period, fetchChart]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const cat = CATEGORIES[tab];
    if (cat) {
      setSelectedSymbol(cat.symbols[0]);
    }
  };

  const fmtPrice = (n: number) => {
    if (n >= 1000) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(6);
  };

  return (
    <PageContainer title="Markets" subtitle="Live market data via Yahoo Finance">
      <UpgradeGate minTier="operator" feature="Market data and analysis" blur>
      <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
        <Tabs.List className="flex border-b border-navy-700/30 mb-6">
          {TAB_KEYS.map((key) => (
            <Tabs.Trigger
              key={key}
              value={key}
              className="px-4 py-2 text-[11px] font-medium uppercase tracking-widest text-navy-500 border-b-2 border-transparent transition-colors data-[state=active]:text-accent-cyan data-[state=active]:border-accent-cyan hover:text-navy-300"
            >
              {CATEGORIES[key].label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {TAB_KEYS.map((key) => (
          <Tabs.Content key={key} value={key}>
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES[key].symbols.map((s) => (
                <button
                  key={s.symbol}
                  onClick={() => setSelectedSymbol(s)}
                  className={`px-3 py-1.5 rounded text-[11px] font-medium transition-colors border ${
                    selectedSymbol.symbol === s.symbol
                      ? "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30"
                      : "text-navy-400 border-navy-700/30 hover:text-navy-200 hover:bg-navy-800/40"
                  }`}
                >
                  {s.symbol}
                </button>
              ))}
            </div>
          </Tabs.Content>
        ))}
      </Tabs.Root>

      {/* Chart area */}
      <div className="border border-navy-700/30 rounded-md bg-navy-900/60">
        {/* Chart header */}
        <div className="px-4 py-3 border-b border-navy-700/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-navy-100">{selectedSymbol.symbol}</span>
            <span className="text-xs text-navy-500">{quote?.name || selectedSymbol.name}</span>
          </div>
          <div className="flex items-center gap-4">
            {quote && !loading && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-navy-100">
                  {fmtPrice(quote.price)}
                </span>
                <span
                  className={`text-xs font-medium ${
                    quote.change >= 0 ? "text-accent-emerald" : "text-accent-rose"
                  }`}
                >
                  {quote.change >= 0 ? "+" : ""}
                  {quote.change.toFixed(2)}
                  {" "}
                  ({quote.changePercent >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%)
                </span>
              </div>
            )}
            {/* Period selector */}
            <div className="flex h-7 rounded border border-navy-700/30 overflow-hidden">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-2.5 text-[10px] font-medium tracking-wider transition-colors ${
                    period === p.value
                      ? "bg-accent-cyan/10 text-accent-cyan"
                      : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quote stats row */}
        {quote && !loading && (
          <div className="px-4 py-2 border-b border-navy-700/10 flex items-center gap-6 text-[10px]">
            {quote.volume > 0 && (
              <div>
                <span className="text-navy-600 uppercase tracking-wider mr-1.5">Vol</span>
                <span className="text-navy-300">{(quote.volume / 1e6).toFixed(2)}M</span>
              </div>
            )}
            {quote.marketCap && (
              <div>
                <span className="text-navy-600 uppercase tracking-wider mr-1.5">Mkt Cap</span>
                <span className="text-navy-300">
                  {quote.marketCap >= 1e12
                    ? `${(quote.marketCap / 1e12).toFixed(2)}T`
                    : `${(quote.marketCap / 1e9).toFixed(2)}B`}
                </span>
              </div>
            )}
            {quote.high52w && (
              <div>
                <span className="text-navy-600 uppercase tracking-wider mr-1.5">52w H</span>
                <span className="text-navy-300">{fmtPrice(quote.high52w)}</span>
              </div>
            )}
            {quote.low52w && (
              <div>
                <span className="text-navy-600 uppercase tracking-wider mr-1.5">52w L</span>
                <span className="text-navy-300">{fmtPrice(quote.low52w)}</span>
              </div>
            )}
          </div>
        )}

        {/* Chart body */}
        <div className="p-2 min-h-[440px] flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-navy-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-[10px] uppercase tracking-wider">Loading chart...</span>
            </div>
          ) : error ? (
            <div className="text-center">
              <p className="text-xs text-accent-rose">{error}</p>
              <p className="text-[10px] text-navy-600 mt-1">Try another symbol or check your connection</p>
            </div>
          ) : chartData.length > 0 ? (
            <div className="w-full">
              <CandlestickChart
                data={chartData}
                symbol={selectedSymbol.symbol}
                height={420}
                showVolume={activeTab !== "fx"}
              />
            </div>
          ) : (
            <p className="text-xs text-navy-600">No data available</p>
          )}
        </div>
      </div>
      </UpgradeGate>
    </PageContainer>
  );
}
