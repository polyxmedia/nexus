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

interface IBKRPosition {
  acctId: string;
  conid: number;
  contractDesc: string;
  position: number;
  mktPrice: number;
  mktValue: number;
  avgCost: number;
  avgPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  currency: string;
  assetClass: string;
  ticker?: string;
}

interface IBKROrder {
  orderId: number;
  conid: number;
  orderType: string;
  side: string;
  price: number;
  quantity: number;
  filledQuantity: number;
  status: string;
  ticker?: string;
  lastExecutionTime?: string;
}

interface ContractResult {
  conid: number;
  companyName: string;
  companyHeader: string;
  symbol: string;
  secType: string;
  exchange: string;
  currency?: string;
}

interface AccountSummary {
  netliquidation?: { amount: number; currency: string };
  totalcashvalue?: { amount: number; currency: string };
  buyingpower?: { amount: number; currency: string };
  unrealizedpnl?: { amount: number; currency: string };
  realizedpnl?: { amount: number; currency: string };
  grosspositionvalue?: { amount: number; currency: string };
  maintmarginreq?: { amount: number; currency: string };
}

const fmt = (v: number | undefined | null) =>
  (v ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

export function IBKRPanel({ onOpenChart }: { onOpenChart: (symbol: string) => void }) {
  // Connection
  const [gatewayConnected, setGatewayConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  // Account
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<string | null>(null);

  // Positions
  const [positions, setPositions] = useState<IBKRPosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);

  // Orders
  const [orders, setOrders] = useState<IBKROrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Order form
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ContractResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractResult | null>(null);
  const [ibkrSide, setIbkrSide] = useState<"BUY" | "SELL">("BUY");
  const [ibkrQty, setIbkrQty] = useState("");
  const [ibkrOrderType, setIbkrOrderType] = useState("MARKET");
  const [ibkrLimitPrice, setIbkrLimitPrice] = useState("");
  const [ibkrStopPrice, setIbkrStopPrice] = useState("");
  const [ibkrTif, setIbkrTif] = useState("DAY");
  const [placing, setPlacing] = useState(false);
  const [orderResult, setOrderResult] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  // ── Fetch gateway status ──
  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/ibkr/status");
      const data = await res.json();
      if (data.error) {
        setGatewayConnected(false);
        setAuthenticated(false);
        setError(data.error);
      } else {
        setGatewayConnected(true);
        setAuthenticated(data.authenticated ?? false);
        setError(null);
      }
    } catch {
      setGatewayConnected(false);
      setAuthenticated(false);
      setError("Cannot reach IBKR gateway");
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // ── Fetch account summary ──
  const fetchAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/ibkr/account");
      const data = await res.json();
      if (!data.error) {
        setSummary(data.summary || null);
        setAccountId(data.accountId || null);
        setEnvironment(data.environment || null);
      }
    } catch {
      // silent
    }
  }, []);

  // ── Fetch positions ──
  const fetchPositions = useCallback(async () => {
    setPositionsLoading(true);
    try {
      const res = await fetch("/api/ibkr/portfolio");
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
      const res = await fetch("/api/ibkr/orders");
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      } else if (data.orders) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // ── Initial load ──
  useEffect(() => {
    fetchStatus().then(() => {
      fetchAccount();
      fetchPositions();
      fetchOrders();
    });
  }, [fetchStatus, fetchAccount, fetchPositions, fetchOrders]);

  // ── Contract search ──
  const searchContracts = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/ibkr/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  };

  const selectContract = (c: ContractResult) => {
    setSelectedContract(c);
    setSearchResults([]);
    setSearchQuery(c.symbol);
  };

  // ── Place order ──
  const placeOrder = async () => {
    if (!selectedContract || !ibkrQty) return;
    setPlacing(true);
    setOrderResult(null);
    try {
      const body: Record<string, unknown> = {
        conid: selectedContract.conid,
        ticker: selectedContract.symbol,
        quantity: parseFloat(ibkrQty),
        direction: ibkrSide,
        orderType: ibkrOrderType,
        tif: ibkrTif,
      };
      if (ibkrLimitPrice) body.limitPrice = parseFloat(ibkrLimitPrice);
      if (ibkrStopPrice) body.stopPrice = parseFloat(ibkrStopPrice);

      const res = await fetch("/api/ibkr/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setOrderResult(`Error: ${data.error}`);
      } else {
        setOrderResult(`Order placed: ${ibkrSide} ${ibkrQty}x ${selectedContract.symbol}`);
        setIbkrQty("");
        setIbkrLimitPrice("");
        setIbkrStopPrice("");
        setSelectedContract(null);
        setSearchQuery("");
        fetchOrders();
        fetchPositions();
      }
    } catch {
      setOrderResult("Error: Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  // ── Cancel order ──
  const cancelOrder = async (orderId: number) => {
    try {
      await fetch(`/api/ibkr/orders?orderId=${orderId}`, { method: "DELETE" });
      fetchOrders();
    } catch {
      // silent
    }
  };

  const refreshAll = () => {
    fetchStatus();
    fetchAccount();
    fetchPositions();
    fetchOrders();
  };

  // ── Position columns ──
  const positionColumns: Column<IBKRPosition>[] = [
    {
      key: "contract",
      header: "Contract",
      accessor: (row) => (
        <span className="font-mono text-xs">{row.ticker || row.contractDesc}</span>
      ),
    },
    {
      key: "asset",
      header: "Asset",
      accessor: (row) => (
        <span className="text-[10px] text-navy-500 uppercase">{row.assetClass}</span>
      ),
    },
    {
      key: "qty",
      header: "Qty",
      accessor: (row) => <span className="font-mono text-xs">{row.position}</span>,
      sortAccessor: (row) => row.position,
    },
    {
      key: "avgPrice",
      header: "Avg Price",
      accessor: (row) => <span className="font-mono text-xs">{fmt(row.avgPrice)}</span>,
      sortAccessor: (row) => row.avgPrice,
    },
    {
      key: "mktPrice",
      header: "Mkt Price",
      accessor: (row) => <span className="font-mono text-xs">{fmt(row.mktPrice)}</span>,
      sortAccessor: (row) => row.mktPrice,
    },
    {
      key: "mktValue",
      header: "Mkt Value",
      accessor: (row) => <span className="font-mono text-xs">{fmt(row.mktValue)}</span>,
      sortAccessor: (row) => row.mktValue,
    },
    {
      key: "pnl",
      header: "Unrealized P&L",
      accessor: (row) => {
        const val = row.unrealizedPnl || 0;
        return (
          <span className={`font-medium flex items-center gap-1 ${val >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
            {val >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {val >= 0 ? "+" : ""}{fmt(val)}
          </span>
        );
      },
      sortAccessor: (row) => row.unrealizedPnl,
    },
    {
      key: "chart",
      header: "",
      accessor: (row) => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); if (row.ticker) onOpenChart(row.ticker); }}>
          Chart
        </Button>
      ),
    },
  ];

  // ── Order columns ──
  const orderColumns: Column<IBKROrder>[] = [
    {
      key: "ticker",
      header: "Symbol",
      accessor: (row) => <span className="font-mono text-xs">{row.ticker || `IBKR:${row.conid}`}</span>,
    },
    {
      key: "side",
      header: "Side",
      accessor: (row) => (
        <span className={`text-[10px] font-mono uppercase ${row.side === "BUY" ? "text-accent-emerald" : "text-accent-rose"}`}>
          {row.side}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      accessor: (row) => <span className="text-[10px] font-mono uppercase text-navy-400">{row.orderType}</span>,
    },
    {
      key: "qty",
      header: "Qty",
      accessor: (row) => (
        <span className="font-mono text-xs">
          {row.filledQuantity}/{row.quantity}
        </span>
      ),
    },
    {
      key: "price",
      header: "Price",
      accessor: (row) => <span className="font-mono text-xs">{row.price ? fmt(row.price) : "MKT"}</span>,
    },
    {
      key: "status",
      header: "Status",
      accessor: (row) => {
        const color = row.status === "Filled" ? "text-accent-emerald"
          : row.status === "Cancelled" ? "text-navy-600"
          : "text-accent-amber";
        return <span className={`text-[10px] font-mono uppercase ${color}`}>{row.status}</span>;
      },
    },
    {
      key: "cancel",
      header: "",
      accessor: (row) => {
        if (row.status === "Filled" || row.status === "Cancelled") return null;
        return (
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); cancelOrder(row.orderId); }}>
            <Trash2 className="h-3 w-3 text-accent-rose" />
          </Button>
        );
      },
    },
  ];

  // ── Connection status ──
  const connectionLabel = statusLoading
    ? "Checking..."
    : gatewayConnected && authenticated
    ? `Connected${environment ? ` (${environment})` : ""}`
    : gatewayConnected
    ? "Gateway up, not authenticated"
    : "Disconnected";

  const connectionColor = gatewayConnected && authenticated ? "green" as const : gatewayConnected ? "amber" as const : "red" as const;

  // ── Metrics ──
  const nlv = summary?.netliquidation?.amount ?? 0;
  const cash = summary?.totalcashvalue?.amount ?? 0;
  const bp = summary?.buyingpower?.amount ?? 0;
  const uPnl = summary?.unrealizedpnl?.amount ?? 0;
  const rPnl = summary?.realizedpnl?.amount ?? 0;

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusDot color={connectionColor} label={connectionLabel} />
          {accountId && <span className="text-[10px] font-mono text-navy-600">Account: {accountId}</span>}
        </div>
        <Button variant="primary" size="sm" onClick={refreshAll}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="border border-accent-rose/30 rounded-md bg-accent-rose/5 p-3">
          <p className="text-xs text-accent-rose">{error}</p>
          <p className="text-[10px] text-navy-500 mt-1">Check your IBKR Gateway URL and Account ID in Settings.</p>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-5 gap-3">
        {statusLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))
        ) : (
          <>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric label="Net Liquidation" value={fmt(nlv)} />
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric label="Cash" value={fmt(cash)} />
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric label="Buying Power" value={fmt(bp)} />
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric
                label="Unrealized P&L"
                value={`${uPnl >= 0 ? "+" : ""}${fmt(uPnl)}`}
                changeColor={uPnl >= 0 ? "green" : "red"}
              />
            </div>
            <div className="border border-navy-700/30 rounded-md bg-navy-900/60 p-4">
              <Metric
                label="Realized P&L"
                value={`${rPnl >= 0 ? "+" : ""}${fmt(rPnl)}`}
                changeColor={rPnl >= 0 ? "green" : "red"}
              />
            </div>
          </>
        )}
      </div>

      {/* Positions + Order Form */}
      <div className="grid grid-cols-3 gap-4">
        {/* Positions (2/3) */}
        <div className="col-span-2">
          <h2 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-2 pb-2 border-b border-navy-700/20">
            Positions ({positions.length})
          </h2>
          {positionsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
            </div>
          ) : (
            <DataGrid
              data={positions}
              columns={positionColumns}
              keyExtractor={(row) => `${row.conid}-${row.acctId}`}
              emptyMessage={gatewayConnected ? "No open positions" : "Connect to IBKR gateway to view positions"}
              filterFn={(row, q) => (row.ticker || row.contractDesc).toLowerCase().includes(q.toLowerCase())}
              searchPlaceholder="Filter positions..."
            />
          )}
        </div>

        {/* Order Form (1/3) */}
        <div className="border border-navy-700/30 rounded-md bg-navy-900/60 h-fit">
          <div className="px-4 py-3 border-b border-navy-700/20">
            <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500">Place Order</h3>
          </div>
          <div className="p-4 space-y-3">
            {/* Contract Search */}
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Contract</label>
              <div className="flex gap-1.5">
                <Input
                  placeholder="Search symbol..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (selectedContract) setSelectedContract(null);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") searchContracts(); }}
                />
                <Button variant="outline" size="sm" onClick={searchContracts} disabled={searching || !searchQuery.trim()}>
                  {searching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                </Button>
              </div>
              {selectedContract && (
                <p className="text-[10px] text-accent-cyan mt-1 truncate">
                  {selectedContract.companyName} ({selectedContract.secType} / {selectedContract.exchange})
                </p>
              )}
              {searchResults.length > 0 && !selectedContract && (
                <div className="mt-1 border border-navy-700/30 rounded-md bg-navy-900 max-h-40 overflow-y-auto">
                  {searchResults.map((c) => (
                    <button
                      key={c.conid}
                      onClick={() => selectContract(c)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-navy-800 transition-colors border-b border-navy-700/20 last:border-0"
                    >
                      <span className="font-mono text-accent-cyan">{c.symbol}</span>
                      <span className="text-navy-400 ml-2">{c.companyName}</span>
                      <span className="text-navy-600 ml-1 text-[10px]">{c.secType}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Direction */}
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Direction</label>
              <div className="flex h-9 rounded-md border border-navy-700/30 overflow-hidden">
                <button
                  onClick={() => setIbkrSide("BUY")}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${ibkrSide === "BUY" ? "bg-accent-emerald/15 text-accent-emerald" : "text-navy-500 hover:text-navy-300"}`}
                >
                  <ArrowUpRight className="h-3 w-3" /> Buy
                </button>
                <div className="w-px bg-navy-700/30" />
                <button
                  onClick={() => setIbkrSide("SELL")}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${ibkrSide === "SELL" ? "bg-accent-rose/15 text-accent-rose" : "text-navy-500 hover:text-navy-300"}`}
                >
                  <ArrowDownRight className="h-3 w-3" /> Sell
                </button>
              </div>
            </div>

            {/* Order Type */}
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Order Type</label>
              <div className="flex h-7 rounded-md border border-navy-700/30 overflow-hidden w-full">
                {["MARKET", "LIMIT", "STOP", "STOP_LIMIT"].map((type, i) => (
                  <button
                    key={type}
                    onClick={() => setIbkrOrderType(type)}
                    className={`flex-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${i > 0 ? "border-l border-navy-700/30" : ""} ${ibkrOrderType === type ? "bg-accent-cyan/10 text-accent-cyan" : "text-navy-500 hover:text-navy-300"}`}
                  >
                    {type.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Quantity</label>
              <Input placeholder="0" type="number" step="1" value={ibkrQty} onChange={(e) => setIbkrQty(e.target.value)} />
            </div>

            {/* Limit Price */}
            {(ibkrOrderType === "LIMIT" || ibkrOrderType === "STOP_LIMIT") && (
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Limit Price</label>
                <Input placeholder="0.00" type="number" step="any" value={ibkrLimitPrice} onChange={(e) => setIbkrLimitPrice(e.target.value)} />
              </div>
            )}

            {/* Stop Price */}
            {(ibkrOrderType === "STOP" || ibkrOrderType === "STOP_LIMIT") && (
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Stop Price</label>
                <Input placeholder="0.00" type="number" step="any" value={ibkrStopPrice} onChange={(e) => setIbkrStopPrice(e.target.value)} />
              </div>
            )}

            {/* Time in Force */}
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Time in Force</label>
              <div className="flex h-7 rounded-md border border-navy-700/30 overflow-hidden w-full">
                {["DAY", "GTC", "IOC"].map((tif, i) => (
                  <button
                    key={tif}
                    onClick={() => setIbkrTif(tif)}
                    className={`flex-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${i > 0 ? "border-l border-navy-700/30" : ""} ${ibkrTif === tif ? "bg-accent-cyan/10 text-accent-cyan" : "text-navy-500 hover:text-navy-300"}`}
                  >
                    {tif}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-navy-700/20">
            <Button onClick={placeOrder} disabled={placing || !selectedContract || !ibkrQty} variant="primary" className="w-full">
              {placing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
              ) : ibkrSide === "BUY" ? (
                <ArrowUpRight className="h-3.5 w-3.5 mr-2" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 mr-2" />
              )}
              {ibkrSide} {selectedContract?.symbol || "..."} {ibkrQty ? `x ${ibkrQty}` : ""}
            </Button>
            {orderResult && (
              <div className={`mt-2 rounded-md border px-3 py-1.5 text-xs ${orderResult.startsWith("Error") ? "border-accent-rose/30 bg-accent-rose/5 text-accent-rose" : "border-accent-emerald/30 bg-accent-emerald/5 text-accent-emerald"}`}>
                {orderResult}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Open Orders */}
      <div>
        <h2 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-2 pb-2 border-b border-navy-700/20">
          Orders ({orders.length})
        </h2>
        {ordersLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
          </div>
        ) : (
          <DataGrid
            data={orders}
            columns={orderColumns}
            keyExtractor={(row) => String(row.orderId)}
            emptyMessage="No orders"
            filterFn={(row, q) => (row.ticker || String(row.conid)).toLowerCase().includes(q.toLowerCase())}
            searchPlaceholder="Filter orders..."
          />
        )}
      </div>
    </div>
  );
}
