"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { DataGrid, type Column } from "@/components/ui/data-grid";
import { StatusDot } from "@/components/ui/status-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  RefreshCw,
} from "lucide-react";

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

// ── Ticker Autocomplete ──────────────────────────────────────────

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
    // Sort: exact ticker matches first, then shortName starts, then by name
    results.sort((a, b) => {
      const aExact = a.ticker.toLowerCase() === q || a.shortName?.toLowerCase() === q;
      const bExact = b.ticker.toLowerCase() === q || b.shortName?.toLowerCase() === q;
      if (aExact && !bExact) return -1;
      if (bExact && !aExact) return 1;
      return a.shortName.localeCompare(b.shortName);
    });
    return results;
  }, [query, instruments]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlightIndex] as HTMLElement;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  const select = useCallback(
    (inst: Instrument) => {
      onChange(inst.ticker, inst.name);
      setQuery(inst.ticker);
      setOpen(false);
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) {
      if (e.key === "ArrowDown" && filtered.length > 0) {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[highlightIndex]) select(filtered[highlightIndex]);
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder={loading ? "Loading instruments..." : "Search ticker or name..."}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value.toUpperCase());
          setOpen(true);
          if (!e.target.value.trim()) onChange("");
        }}
        onFocus={() => query.trim() && setOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      {open && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 top-full mt-1 left-0 right-0 max-h-56 overflow-y-auto rounded-md border border-navy-700/40 bg-navy-900/95 backdrop-blur-md wr-shadow-md"
        >
          {filtered.map((inst, i) => (
            <button
              key={inst.ticker}
              onMouseDown={() => select(inst)}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                i === highlightIndex ? "bg-navy-800/80" : "hover:bg-navy-800/40"
              }`}
            >
              <span className="text-xs font-semibold text-navy-100 w-20 shrink-0">
                {inst.shortName || inst.ticker}
              </span>
              <span className="text-[10px] text-navy-400 truncate flex-1">
                {inst.name}
              </span>
              <span className="text-[10px] text-navy-600 shrink-0">
                {inst.currencyCode}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────

export default function TradingPage() {
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

  const fetchAccountData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountRes, positionsRes] = await Promise.all([
        fetch("/api/trading212/account"),
        fetch("/api/trading212/portfolio"),
      ]);
      const accountData = await accountRes.json();
      const positionsData = await positionsRes.json();

      if (accountData.error) {
        setError(accountData.error);
        setConnected(false);
      } else {
        setAccount(accountData);
        setPositions(positionsData.positions || []);
        setConnected(true);
      }
    } catch {
      setError("Failed to connect to Trading 212");
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountData();
    // Load instruments for autocomplete
    fetch("/api/trading212/instruments")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setInstruments(data);
      })
      .catch(() => {})
      .finally(() => setInstrumentsLoading(false));
  }, []);

  const placeOrder = async () => {
    if (!ticker || !quantity) return;
    setPlacing(true);
    setOrderResult(null);
    try {
      const body: Record<string, unknown> = {
        ticker,
        quantity: parseFloat(quantity),
        direction,
        orderType,
      };
      if (limitPrice) body.limitPrice = parseFloat(limitPrice);
      if (stopPrice) body.stopPrice = parseFloat(stopPrice);

      const res = await fetch("/api/trading212/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setOrderResult(`Error: ${data.error}`);
      } else {
        setOrderResult(`Order placed: ${direction} ${quantity} ${ticker}`);
        setTicker("");
        setTickerName("");
        setQuantity("");
        fetchAccountData();
      }
    } catch {
      setOrderResult("Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  const handleTickerChange = useCallback((t: string, name?: string) => {
    setTicker(t);
    setTickerName(name || "");
  }, []);

  // Format currency
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
        <span className="font-semibold text-navy-100">{row.ticker}</span>
      ),
      sortAccessor: (row) => row.ticker,
    },
    {
      key: "quantity",
      header: "Qty",
      accessor: (row) => (
        <span className="text-navy-200">{row.quantity.toFixed(4)}</span>
      ),
      sortAccessor: (row) => row.quantity,
    },
    {
      key: "avgPrice",
      header: "Avg Price",
      accessor: (row) => (
        <span className="text-navy-300">{fmt(row.averagePrice)}</span>
      ),
      sortAccessor: (row) => row.averagePrice,
    },
    {
      key: "currentPrice",
      header: "Current",
      accessor: (row) => (
        <span className="text-navy-200 font-medium">{fmt(row.currentPrice)}</span>
      ),
      sortAccessor: (row) => row.currentPrice,
    },
    {
      key: "pnl",
      header: "P&L",
      accessor: (row) => {
        const val = row.ppl || 0;
        return (
          <span className={val >= 0 ? "text-accent-emerald font-medium" : "text-accent-rose font-medium"}>
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
        return (
          <span className={val >= 0 ? "text-accent-emerald" : "text-accent-rose"}>
            {val >= 0 ? "+" : ""}{fmt(val)}
          </span>
        );
      },
      sortAccessor: (row) => row.fxPpl,
    },
  ];

  return (
    <PageContainer
      title="Trading"
      subtitle="Trading 212 integration"
      actions={
        <div className="flex items-center gap-3">
          <StatusDot
            color={connected ? "green" : "red"}
            label={connected ? `Connected (${account?.environment || "live"})` : "Disconnected"}
          />
          <Button variant="primary" size="sm" onClick={fetchAccountData}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      }
    >
      {error && (
        <div className="mb-4 border border-accent-rose/30 rounded-md bg-accent-rose/5 p-3">
          <p className="text-xs text-accent-rose">{error}</p>
          <p className="text-[10px] text-navy-500 mt-1">
            Check your Trading 212 API key and secret in Settings.
          </p>
        </div>
      )}

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
              <div className="text-[10px] uppercase tracking-wider text-navy-500 mb-1">Total Value</div>
              <div className="text-lg font-bold text-navy-100">{fmt(totalValue)}</div>
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <div className="text-[10px] uppercase tracking-wider text-navy-500 mb-1">Invested</div>
              <div className="text-lg font-bold text-navy-100">{fmt(invested)}</div>
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <div className="text-[10px] uppercase tracking-wider text-navy-500 mb-1">P&L</div>
              <div className={`text-lg font-bold ${pnl >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                {pnl >= 0 ? "+" : ""}{fmt(pnl)}
              </div>
              <div className={`text-[10px] ${pnl >= 0 ? "text-accent-emerald/70" : "text-accent-rose/70"}`}>
                {pnl >= 0 ? "+" : ""}{returnPct}%
              </div>
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <div className="text-[10px] uppercase tracking-wider text-navy-500 mb-1">Free Cash</div>
              <div className="text-lg font-bold text-navy-100">{fmt(freeCash)}</div>
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <div className="text-[10px] uppercase tracking-wider text-navy-500 mb-1">Realised</div>
              <div className={`text-lg font-bold ${(cash?.result || 0) >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                {(cash?.result || 0) >= 0 ? "+" : ""}{fmt(cash?.result)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Order Form ── */}
      <div className="border border-navy-700/30 rounded-md bg-navy-900/60 mb-6">
        <div className="px-4 py-3 border-b border-navy-700/20">
          <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500">
            Place Order
          </h3>
        </div>

        <div className="p-4 space-y-4">
          {/* Row 1: Instrument + Direction */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Instrument</label>
              <TickerAutocomplete
                value={ticker}
                onChange={handleTickerChange}
                instruments={instruments}
                loading={instrumentsLoading}
              />
              {tickerName && (
                <p className="text-[10px] text-navy-400 mt-1.5 truncate">{tickerName}</p>
              )}
            </div>

            <div className="w-48 shrink-0">
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Direction</label>
              <div className="flex h-9 rounded-md border border-navy-700/30 overflow-hidden">
                <button
                  onClick={() => setDirection("BUY")}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${
                    direction === "BUY"
                      ? "bg-accent-emerald/15 text-accent-emerald"
                      : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"
                  }`}
                >
                  <ArrowUpRight className="h-3 w-3" />
                  Buy
                </button>
                <div className="w-px bg-navy-700/30" />
                <button
                  onClick={() => setDirection("SELL")}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${
                    direction === "SELL"
                      ? "bg-accent-rose/15 text-accent-rose"
                      : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"
                  }`}
                >
                  <ArrowDownRight className="h-3 w-3" />
                  Sell
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Order type tabs */}
          <div>
            <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Order Type</label>
            <div className="flex h-8 rounded-md border border-navy-700/30 overflow-hidden w-fit">
              {["MARKET", "LIMIT", "STOP", "STOP_LIMIT"].map((type, i) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`px-4 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                    i > 0 ? "border-l border-navy-700/30" : ""
                  } ${
                    orderType === type
                      ? "bg-accent-cyan/10 text-accent-cyan"
                      : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"
                  }`}
                >
                  {type.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Quantity + conditional prices */}
          <div className="flex gap-4">
            <div className="w-40">
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Quantity</label>
              <Input
                placeholder="0.00"
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            {(orderType === "LIMIT" || orderType === "STOP_LIMIT") && (
              <div className="w-40">
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Limit Price</label>
                <Input
                  placeholder="0.00"
                  type="number"
                  step="any"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                />
              </div>
            )}

            {(orderType === "STOP" || orderType === "STOP_LIMIT") && (
              <div className="w-40">
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Stop Price</label>
                <Input
                  placeholder="0.00"
                  type="number"
                  step="any"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer: submit + result */}
        <div className="px-4 py-3 border-t border-navy-700/20 flex items-center gap-3">
          <Button
            onClick={placeOrder}
            disabled={placing || !ticker || !quantity}
            variant="primary"
          >
            {placing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
            ) : direction === "BUY" ? (
              <ArrowUpRight className="h-3.5 w-3.5 mr-2" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 mr-2" />
            )}
            {direction} {ticker || "..."} {quantity ? `x ${quantity}` : ""}
          </Button>

          {orderResult && (
            <div
              className={`rounded-md border px-3 py-1.5 text-xs ${
                orderResult.startsWith("Error")
                  ? "border-accent-rose/30 bg-accent-rose/5 text-accent-rose"
                  : "border-accent-emerald/30 bg-accent-emerald/5 text-accent-emerald"
              }`}
            >
              {orderResult}
            </div>
          )}
        </div>
      </div>

      {/* ── Positions ── */}
      <div>
        <h2 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-2 pb-2 border-b border-navy-700/20">
          Open Positions ({positions.length})
        </h2>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <DataGrid
            data={positions}
            columns={positionColumns}
            keyExtractor={(row) => row.ticker}
            emptyMessage={connected ? "No open positions" : "Connect to Trading 212 to view positions"}
            filterFn={(row, q) =>
              row.ticker.toLowerCase().includes(q.toLowerCase())
            }
            searchPlaceholder="Filter positions..."
          />
        )}
      </div>
    </PageContainer>
  );
}
