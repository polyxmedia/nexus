"use client";

import { useCallback, useEffect, useState } from "react";
import { DataGrid, type Column } from "@/components/ui/data-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Metric } from "@/components/ui/metric";
import { StatusDot } from "@/components/ui/status-dot";
import {
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  Trash2,
} from "lucide-react";

interface IGPositionRow {
  dealId: string;
  epic: string;
  instrumentName: string;
  direction: "BUY" | "SELL";
  size: number;
  level: number;
  currency: string;
  bid: number;
  offer: number;
  percentageChange: number;
  netChange: number;
  stopLevel: number | null;
  limitLevel: number | null;
  marketStatus: string;
}

interface IGOrderRow {
  dealId: string;
  epic: string;
  instrumentName: string;
  direction: "BUY" | "SELL";
  size: number;
  level: number;
  type: string;
  timeInForce: string;
  currency: string;
  bid: number;
  offer: number;
  marketStatus: string;
}

interface IGSearchResult {
  epic: string;
  instrumentName: string;
  instrumentType: string;
  bid: number;
  offer: number;
  percentageChange: number;
  marketStatus: string;
}

interface IGAccountData {
  accountId: string;
  accountName: string;
  accountType: string;
  status: string;
  currency: string;
  balance: number;
  available: number;
  deposit: number;
  profitLoss: number;
}

const fmt = (v: number | undefined | null, currency = "GBP") =>
  (v ?? 0).toLocaleString("en-US", { style: "currency", currency });

export function IGPanel({ onOpenChart }: { onOpenChart: (symbol: string) => void }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<string | null>(null);

  // Account
  const [account, setAccount] = useState<IGAccountData | null>(null);

  // Positions
  const [positions, setPositions] = useState<IGPositionRow[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);

  // Orders
  const [orders, setOrders] = useState<IGOrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Order form
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IGSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<IGSearchResult | null>(null);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [qty, setQty] = useState("");
  const [orderType, setOrderType] = useState("MARKET");
  const [stopDistance, setStopDistance] = useState("");
  const [limitDistance, setLimitDistance] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderResult, setOrderResult] = useState<string | null>(null);

  // ── Fetch account ──
  const fetchAccount = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ig/account");
      const data = await res.json();
      if (data.error) {
        setConnected(false);
        setError(data.error);
      } else {
        setConnected(true);
        setAccount(data.account);
        setEnvironment(data.environment);
      }
    } catch {
      setConnected(false);
      setError("Cannot reach IG Markets API");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch positions ──
  const fetchPositions = useCallback(async () => {
    setPositionsLoading(true);
    try {
      const res = await fetch("/api/ig/portfolio");
      const data = await res.json();
      setPositions(data.positions || []);
    } catch {
      // silent
    } finally {
      setPositionsLoading(false);
    }
  }, []);

  // ── Fetch orders ──
  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/ig/orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      // silent
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // ── Search markets ──
  const searchMarkets = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/ig/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // ── Place order ──
  const placeOrder = async () => {
    if (!selectedMarket || !qty) return;
    setPlacing(true);
    setOrderResult(null);
    try {
      const res = await fetch("/api/ig/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          epic: selectedMarket.epic,
          size: parseFloat(qty),
          direction: side,
          orderType,
          currencyCode: account?.currency || "GBP",
          stopDistance: stopDistance ? parseFloat(stopDistance) : undefined,
          limitDistance: limitDistance ? parseFloat(limitDistance) : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setOrderResult(`Error: ${data.error}`);
      } else {
        setOrderResult(`Order placed (${data.igResult?.dealStatus || "pending"})`);
        fetchPositions();
        fetchOrders();
      }
    } catch {
      setOrderResult("Error placing order");
    } finally {
      setPlacing(false);
    }
  };

  // ── Cancel order ──
  const cancelOrder = async (dealId: string) => {
    try {
      await fetch(`/api/ig/orders?dealId=${dealId}&type=order`, { method: "DELETE" });
      fetchOrders();
    } catch {
      // silent
    }
  };

  // ── Close position ──
  const closePosition = async (pos: IGPositionRow) => {
    try {
      await fetch(
        `/api/ig/orders?dealId=${pos.dealId}&direction=${pos.direction}&size=${pos.size}&type=position`,
        { method: "DELETE" }
      );
      fetchPositions();
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    if (connected) {
      fetchPositions();
      fetchOrders();
    }
  }, [connected, fetchPositions, fetchOrders]);

  // ── Columns ──
  const positionColumns: Column<IGPositionRow>[] = [
    {
      key: "instrumentName",
      header: "Instrument",
      accessor: (row) => (
        <button
          onClick={() => onOpenChart(row.epic.replace(/\./g, "-"))}
          className="text-accent-cyan hover:underline text-left"
        >
          <span className="text-xs font-mono">{row.instrumentName}</span>
          <span className="text-[9px] text-navy-500 block">{row.epic}</span>
        </button>
      ),
    },
    {
      key: "direction",
      header: "Side",
      accessor: (row) => (
        <span className={`text-[10px] font-mono uppercase ${row.direction === "BUY" ? "text-accent-emerald" : "text-accent-rose"}`}>
          {row.direction}
        </span>
      ),
    },
    {
      key: "size",
      header: "Size",
      accessor: (row) => <span className="text-xs font-mono tabular-nums">{row.size}</span>,
    },
    {
      key: "level",
      header: "Open",
      accessor: (row) => <span className="text-xs font-mono tabular-nums">{row.level.toFixed(2)}</span>,
    },
    {
      key: "bid",
      header: "Current",
      accessor: (row) => <span className="text-xs font-mono tabular-nums">{row.direction === "BUY" ? row.bid.toFixed(2) : row.offer.toFixed(2)}</span>,
    },
    {
      key: "percentageChange",
      header: "P&L %",
      accessor: (row) => {
        const currentPrice = row.direction === "BUY" ? row.bid : row.offer;
        const pnlPct = row.direction === "BUY"
          ? ((currentPrice - row.level) / row.level) * 100
          : ((row.level - currentPrice) / row.level) * 100;
        return (
          <span className={`text-xs font-mono tabular-nums ${pnlPct >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
            {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      accessor: (row) => (
        <button
          onClick={() => closePosition(row)}
          className="text-navy-600 hover:text-accent-rose transition-colors"
          title="Close position"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      ),
    },
  ];

  const orderColumns: Column<IGOrderRow>[] = [
    {
      key: "instrumentName",
      header: "Instrument",
      accessor: (row) => (
        <div>
          <span className="text-xs font-mono">{row.instrumentName}</span>
          <span className="text-[9px] text-navy-500 block">{row.epic}</span>
        </div>
      ),
    },
    {
      key: "direction",
      header: "Side",
      accessor: (row) => (
        <span className={`text-[10px] font-mono uppercase ${row.direction === "BUY" ? "text-accent-emerald" : "text-accent-rose"}`}>
          {row.direction}
        </span>
      ),
    },
    {
      key: "size",
      header: "Size",
      accessor: (row) => <span className="text-xs font-mono tabular-nums">{row.size}</span>,
    },
    {
      key: "level",
      header: "Level",
      accessor: (row) => <span className="text-xs font-mono tabular-nums">{row.level.toFixed(2)}</span>,
    },
    {
      key: "type",
      header: "Type",
      accessor: (row) => <span className="text-[10px] font-mono text-navy-400">{row.type}</span>,
    },
    {
      key: "actions",
      header: "",
      accessor: (row) => (
        <button
          onClick={() => cancelOrder(row.dealId)}
          className="text-navy-600 hover:text-accent-rose transition-colors"
          title="Cancel order"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      ),
    },
  ];

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // ── Not connected ──
  if (!connected) {
    return (
      <div className="border border-navy-700/50 border-dashed rounded-lg p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <StatusDot color="red" label="" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500">IG Markets</span>
        </div>
        <p className="text-sm text-navy-400 mb-1">Not connected</p>
        <p className="text-[10px] text-navy-600 mb-4">
          {error || "Add your IG API key, username, and password in Settings > API Keys."}
        </p>
        <Button variant="outline" size="sm" onClick={fetchAccount}>
          <RefreshCw className="h-3 w-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Account Summary ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusDot color="green" label="" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-navy-500">
            IG Markets {environment === "demo" ? "(Demo)" : "(Live)"}
          </span>
          {account && (
            <span className="text-[9px] font-mono text-navy-600">
              {account.accountId} / {account.accountType}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => { fetchAccount(); fetchPositions(); fetchOrders(); }}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {account && (
        <div className="grid grid-cols-4 gap-3">
          <Metric label="Balance" value={fmt(account.balance, account.currency)} />
          <Metric label="Available" value={fmt(account.available, account.currency)} />
          <Metric label="Deposit" value={fmt(account.deposit, account.currency)} />
          <Metric
            label="P&L"
            value={fmt(account.profitLoss, account.currency)}
            className={account.profitLoss >= 0 ? "text-accent-emerald" : "text-accent-rose"}
          />
        </div>
      )}

      {/* ── Positions ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-mono uppercase tracking-widest text-navy-500">
            Open Positions ({positions.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={fetchPositions} disabled={positionsLoading}>
            {positionsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        </div>
        {positions.length > 0 ? (
          <DataGrid columns={positionColumns} data={positions} keyExtractor={(row) => row.dealId} />
        ) : (
          <p className="text-[10px] text-navy-600 py-4 text-center">No open positions</p>
        )}
      </div>

      {/* ── Working Orders ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-mono uppercase tracking-widest text-navy-500">
            Working Orders ({orders.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={fetchOrders} disabled={ordersLoading}>
            {ordersLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        </div>
        {orders.length > 0 ? (
          <DataGrid columns={orderColumns} data={orders} keyExtractor={(row) => row.dealId} />
        ) : (
          <p className="text-[10px] text-navy-600 py-4 text-center">No working orders</p>
        )}
      </div>

      {/* ── Order Form ── */}
      <div className="border border-navy-700 rounded-lg p-4 space-y-4">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-navy-500">Place Order</h3>

        {/* Market search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-navy-600" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchMarkets()}
              placeholder="Search markets (e.g. AAPL, GBP/USD, Gold)..."
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Button variant="outline" size="sm" onClick={searchMarkets} disabled={searching}>
            {searching ? <Loader2 className="h-3 w-3 animate-spin" /> : "Search"}
          </Button>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && !selectedMarket && (
          <div className="max-h-40 overflow-y-auto border border-navy-700/40 rounded divide-y divide-navy-800/50">
            {searchResults.map((m) => (
              <button
                key={m.epic}
                onClick={() => { setSelectedMarket(m); setSearchResults([]); }}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-navy-800/40 transition-colors text-left"
              >
                <div>
                  <span className="text-xs font-mono text-navy-200">{m.instrumentName}</span>
                  <span className="text-[9px] text-navy-500 block">{m.epic} / {m.instrumentType}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono tabular-nums text-navy-300">{m.bid} / {m.offer}</span>
                  <span className={`text-[9px] font-mono block ${m.percentageChange >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                    {m.percentageChange >= 0 ? "+" : ""}{m.percentageChange.toFixed(2)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected market */}
        {selectedMarket && (
          <div className="flex items-center justify-between px-3 py-2 rounded bg-navy-800/40 border border-navy-700/30">
            <div>
              <span className="text-xs font-mono text-accent-cyan">{selectedMarket.instrumentName}</span>
              <span className="text-[9px] text-navy-500 block">{selectedMarket.epic}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono tabular-nums text-navy-300">{selectedMarket.bid} / {selectedMarket.offer}</span>
              <button
                onClick={() => setSelectedMarket(null)}
                className="text-navy-600 hover:text-navy-400 text-[10px] font-mono"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Order params */}
        <div className="grid grid-cols-5 gap-3">
          {/* Side */}
          <div>
            <label className="text-[9px] font-mono text-navy-600 uppercase block mb-1">Side</label>
            <div className="flex gap-1">
              <button
                onClick={() => setSide("BUY")}
                className={`flex-1 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  side === "BUY" ? "bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30" : "bg-navy-800/30 text-navy-500 border border-navy-700/30"
                }`}
              >
                <ArrowUpRight className="h-3 w-3 inline mr-0.5" /> Buy
              </button>
              <button
                onClick={() => setSide("SELL")}
                className={`flex-1 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  side === "SELL" ? "bg-accent-rose/20 text-accent-rose border border-accent-rose/30" : "bg-navy-800/30 text-navy-500 border border-navy-700/30"
                }`}
              >
                <ArrowDownRight className="h-3 w-3 inline mr-0.5" /> Sell
              </button>
            </div>
          </div>

          {/* Size */}
          <div>
            <label className="text-[9px] font-mono text-navy-600 uppercase block mb-1">Size</label>
            <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="1.0" className="h-8 text-xs" />
          </div>

          {/* Order type */}
          <div>
            <label className="text-[9px] font-mono text-navy-600 uppercase block mb-1">Type</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="w-full h-8 px-2 rounded bg-navy-900/50 border border-navy-700/50 text-xs font-mono text-navy-300"
            >
              <option value="MARKET">Market</option>
              <option value="LIMIT">Limit</option>
            </select>
          </div>

          {/* Stop distance */}
          <div>
            <label className="text-[9px] font-mono text-navy-600 uppercase block mb-1">Stop (pts)</label>
            <Input value={stopDistance} onChange={(e) => setStopDistance(e.target.value)} placeholder="--" className="h-8 text-xs" />
          </div>

          {/* Limit distance */}
          <div>
            <label className="text-[9px] font-mono text-navy-600 uppercase block mb-1">Limit (pts)</label>
            <Input value={limitDistance} onChange={(e) => setLimitDistance(e.target.value)} placeholder="--" className="h-8 text-xs" />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <div>
            {orderResult && (
              <span className={`text-[10px] font-mono ${orderResult.startsWith("Error") ? "text-accent-rose" : "text-accent-emerald"}`}>
                {orderResult}
              </span>
            )}
          </div>
          <Button
            onClick={placeOrder}
            disabled={placing || !selectedMarket || !qty}
            className={side === "BUY" ? "bg-accent-emerald/90 hover:bg-accent-emerald text-white" : "bg-accent-rose/90 hover:bg-accent-rose text-white"}
          >
            {placing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : side === "BUY" ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {side} {selectedMarket?.instrumentName || "Select market"}
          </Button>
        </div>
      </div>
    </div>
  );
}
