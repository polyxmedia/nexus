"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import dynamic from "next/dynamic";
import {
  Plus,
  Search,
  X,
  Trash2,
  GripVertical,
  TrendingUp,
  TrendingDown,
  Minus,
  Pencil,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  List,
  Clock,
  BarChart3,
} from "lucide-react";

const CandlestickChart = dynamic(() => import("@/components/charts/candlestick-chart"), { ssr: false });

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  stale?: boolean;
}

interface WatchlistItem {
  id: number;
  watchlistId: number;
  symbol: string;
  position: number;
  lastUpdated: string | null;
  quote: Quote | null;
}

interface Watchlist {
  id: number;
  name: string;
  position: number;
  items: WatchlistItem[];
}

const POPULAR_SYMBOLS = [
  "SPY", "QQQ", "IWM", "DIA", "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META",
  "TSLA", "AMD", "JPM", "GS", "BAC", "XOM", "CVX", "GLD", "SLV", "TLT",
  "VIX", "BTC", "ETH", "XRP", "SOL",
];

const POLL_INTERVAL = 300_000; // 5min - reduced from 2min to cut bandwidth

export default function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [expandedLists, setExpandedLists] = useState<Set<number>>(new Set());
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [addSymbol, setAddSymbol] = useState<{ watchlistId: number; value: string } | null>(null);
  const [symbolSearch, setSymbolSearch] = useState("");
  const [editingName, setEditingName] = useState<{ id: number; value: string } | null>(null);
  const [dragItem, setDragItem] = useState<{ watchlistId: number; itemId: number } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ watchlistId: number; itemId: number } | null>(null);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [chartData, setChartData] = useState<Record<string, Array<{ time: string; open: number; high: number; low: number; close: number; volume?: number }>>>({});
  const [techData, setTechData] = useState<Record<string, { rsi?: number; trend?: string; momentum?: string; sma20?: number; sma50?: number }>>({});
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchWatchlists = useCallback(async (withQuotes = true) => {
    try {
      const res = await fetch(`/api/watchlists?quotes=${withQuotes}`);
      const data = await res.json();
      const lists: Watchlist[] = data.watchlists || [];
      setWatchlists(lists);
      if (withQuotes) setLastRefresh(new Date());
      // Expand all by default on first load
      setExpandedLists((prev) => {
        if (prev.size === 0 && lists.length > 0) {
          return new Set(lists.map((l) => l.id));
        }
        return prev;
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const toggleSymbolDetail = useCallback(async (symbol: string) => {
    if (expandedSymbol === symbol) {
      setExpandedSymbol(null);
      return;
    }
    setExpandedSymbol(symbol);
    // Fetch chart data if not cached
    if (!chartData[symbol]) {
      try {
        const res = await fetch(`/api/markets/chart?symbol=${encodeURIComponent(symbol)}&range=3mo`);
        const data = await res.json();
        if (data.bars) {
          setChartData((prev) => ({ ...prev, [symbol]: data.bars }));
        }
        if (data.technicals) {
          setTechData((prev) => ({ ...prev, [symbol]: data.technicals }));
        }
      } catch { /* silent */ }
    }
  }, [expandedSymbol, chartData]);

  // Initial load + polling (pauses when tab hidden)
  useEffect(() => {
    fetchWatchlists(true);
    const handleVisibility = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (document.visibilityState === "visible") {
        pollRef.current = setInterval(() => fetchWatchlists(true), POLL_INTERVAL);
      }
    };
    pollRef.current = setInterval(() => fetchWatchlists(true), POLL_INTERVAL);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchWatchlists]);

  async function refresh() {
    setRefreshing(true);
    await fetchWatchlists(true);
  }

  async function createWatchlist() {
    if (!newListName.trim()) return;
    await fetch("/api/watchlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName.trim() }),
    });
    setNewListName("");
    setShowNewList(false);
    await fetchWatchlists(false);
  }

  async function deleteWatchlist(id: number) {
    await fetch("/api/watchlists", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchWatchlists(false);
  }

  async function renameWatchlist(id: number, name: string) {
    await fetch("/api/watchlists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });
    setEditingName(null);
    await fetchWatchlists(false);
  }

  async function addItem(watchlistId: number, symbol: string) {
    await fetch("/api/watchlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_item", watchlistId, symbol }),
    });
    setAddSymbol(null);
    setSymbolSearch("");
    await fetchWatchlists(true);
  }

  async function removeItem(itemId: number) {
    await fetch("/api/watchlists", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_item", itemId }),
    });
    await fetchWatchlists(false);
  }

  async function reorderItems(watchlistId: number, itemIds: number[]) {
    await fetch("/api/watchlists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder_items", watchlistId, itemIds }),
    });
  }

  function toggleExpand(id: number) {
    setExpandedLists((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDragStart(watchlistId: number, itemId: number) {
    setDragItem({ watchlistId, itemId });
  }

  function handleDragOver(e: React.DragEvent, watchlistId: number, itemId: number) {
    e.preventDefault();
    setDragOverItem({ watchlistId, itemId });
  }

  function handleDrop(watchlistId: number) {
    if (!dragItem || !dragOverItem || dragItem.watchlistId !== watchlistId || dragOverItem.watchlistId !== watchlistId) {
      setDragItem(null);
      setDragOverItem(null);
      return;
    }

    const list = watchlists.find((w) => w.id === watchlistId);
    if (!list) return;

    const items = [...list.items];
    const fromIdx = items.findIndex((i) => i.id === dragItem.itemId);
    const toIdx = items.findIndex((i) => i.id === dragOverItem.itemId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);

    // Optimistic update
    setWatchlists((prev) =>
      prev.map((w) => (w.id === watchlistId ? { ...w, items } : w))
    );
    reorderItems(watchlistId, items.map((i) => i.id));

    setDragItem(null);
    setDragOverItem(null);
  }

  const filteredSuggestions = symbolSearch
    ? POPULAR_SYMBOLS.filter(
        (s) =>
          s.toLowerCase().includes(symbolSearch.toLowerCase()) &&
          !watchlists
            .find((w) => w.id === addSymbol?.watchlistId)
            ?.items.some((i) => i.symbol === s)
      )
    : [];

  function formatVolume(v: number): string {
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return String(v);
  }

  function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  // Count total symbols with quotes across all watchlists
  const totalSymbols = watchlists.reduce((s, w) => s + w.items.length, 0);
  const quotedSymbols = watchlists.reduce(
    (s, w) => s + w.items.filter((i) => i.quote).length,
    0
  );

  return (
    <PageContainer
      title="Watchlists"
      subtitle="Market Monitoring"
      actions={
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-navy-500">
              <Clock className="h-3 w-3" />
              {timeAgo(lastRefresh)}
            </div>
          )}
          {totalSymbols > 0 && (
            <span className="text-[10px] font-mono text-navy-600">
              {quotedSymbols}/{totalSymbols} priced
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={refresh}
            disabled={refreshing}
            className="text-navy-400 hover:text-navy-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => setShowNewList(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Watchlist
          </Button>
        </div>
      }
    >
      <UpgradeGate minTier="operator" feature="Watchlist management" blur>
      {/* Auto-refresh indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-emerald/50 animate-pulse" />
          <span className="text-[10px] font-mono text-navy-600">Auto-refresh every 60s</span>
        </div>
      </div>

      {/* New watchlist input */}
      {showNewList && (
        <div className="flex items-center gap-2 mb-4">
          <input
            autoFocus
            type="text"
            placeholder="Watchlist name..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createWatchlist();
              if (e.key === "Escape") setShowNewList(false);
            }}
            className="flex-1 max-w-xs px-3 py-2 text-xs font-mono bg-navy-900/60 border border-navy-700/50 rounded text-navy-200 placeholder:text-navy-600 focus:outline-none focus:border-navy-500"
          />
          <Button size="sm" onClick={createWatchlist}>Create</Button>
          <button onClick={() => setShowNewList(false)} className="text-navy-500 hover:text-navy-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded border border-navy-700/30 bg-navy-900/40 animate-pulse" />
          ))}
        </div>
      ) : watchlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <List className="h-10 w-10 text-navy-600 mb-4" />
          <div className="text-sm text-navy-400 mb-1">No watchlists yet.</div>
          <div className="text-xs text-navy-500 mb-4">Create one to start tracking symbols.</div>
          <Button size="sm" onClick={() => setShowNewList(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create Watchlist
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {watchlists.map((list) => {
            const expanded = expandedLists.has(list.id);
            const listQuoted = list.items.filter((i) => i.quote).length;
            return (
              <div key={list.id} className="border border-navy-700/30 rounded-md bg-navy-900/60 overflow-hidden">
                {/* List Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-navy-900/80 border-b border-navy-700/20">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleExpand(list.id)} className="text-navy-500 hover:text-navy-300">
                      {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                    {editingName?.id === list.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingName.value}
                        onChange={(e) => setEditingName({ ...editingName, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameWatchlist(list.id, editingName.value);
                          if (e.key === "Escape") setEditingName(null);
                        }}
                        onBlur={() => renameWatchlist(list.id, editingName.value)}
                        className="px-1.5 py-0.5 text-xs font-mono bg-navy-800 border border-navy-600 rounded text-navy-200 focus:outline-none"
                      />
                    ) : (
                      <span className="text-xs font-mono font-semibold text-navy-200 uppercase tracking-wider">
                        {list.name}
                      </span>
                    )}
                    <span className="text-[10px] text-navy-600 font-mono">
                      {list.items.length} symbol{list.items.length !== 1 ? "s" : ""}
                      {list.items.length > 0 && listQuoted < list.items.length && (
                        <span className="text-accent-amber ml-1">({list.items.length - listQuoted} no price)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAddSymbol({ watchlistId: list.id, value: "" })}
                      className="p-1 text-navy-500 hover:text-navy-300 transition-colors"
                      title="Add symbol"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingName({ id: list.id, value: list.name })}
                      className="p-1 text-navy-500 hover:text-navy-300 transition-colors"
                      title="Rename"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => deleteWatchlist(list.id)}
                      className="p-1 text-navy-600 hover:text-accent-rose transition-colors"
                      title="Delete watchlist"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Add symbol row */}
                {addSymbol?.watchlistId === list.id && (
                  <div className="px-4 py-2 border-b border-navy-700/20 bg-navy-800/30">
                    <div className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 text-navy-500" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search symbol (e.g. AAPL, BTC)..."
                        value={symbolSearch}
                        onChange={(e) => setSymbolSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && symbolSearch.trim()) {
                            addItem(list.id, symbolSearch.trim());
                          }
                          if (e.key === "Escape") {
                            setAddSymbol(null);
                            setSymbolSearch("");
                          }
                        }}
                        className="flex-1 px-2 py-1 text-xs font-mono bg-transparent text-navy-200 placeholder:text-navy-600 focus:outline-none"
                      />
                      <button onClick={() => { setAddSymbol(null); setSymbolSearch(""); }} className="text-navy-500 hover:text-navy-300">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {/* Show popular symbols when search is empty */}
                    {!symbolSearch && (
                      <div className="mt-2">
                        <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider">Popular</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {POPULAR_SYMBOLS.filter(
                            (s) => !list.items.some((i) => i.symbol === s)
                          ).slice(0, 15).map((s) => (
                            <button
                              key={s}
                              onClick={() => addItem(list.id, s)}
                              className="px-2 py-0.5 text-[10px] font-mono bg-navy-800/60 border border-navy-700/30 rounded text-navy-300 hover:bg-navy-700/60 hover:text-navy-100 transition-colors"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {filteredSuggestions.length > 0 && symbolSearch && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {filteredSuggestions.slice(0, 10).map((s) => (
                          <button
                            key={s}
                            onClick={() => addItem(list.id, s)}
                            className="px-2 py-0.5 text-[10px] font-mono bg-navy-800/60 border border-navy-700/30 rounded text-navy-300 hover:bg-navy-700/60 hover:text-navy-100 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Items Table */}
                {expanded && list.items.length > 0 && (
                  <div>
                    {/* Header row */}
                    <div className="grid grid-cols-[24px_1fr_100px_100px_80px_80px_32px] gap-2 px-4 py-1.5 border-b border-navy-700/10">
                      <span />
                      <span className="text-[9px] font-mono text-navy-600 uppercase">Symbol</span>
                      <span className="text-[9px] font-mono text-navy-600 uppercase text-right">Price</span>
                      <span className="text-[9px] font-mono text-navy-600 uppercase text-right">Change</span>
                      <span className="text-[9px] font-mono text-navy-600 uppercase text-right">Change %</span>
                      <span className="text-[9px] font-mono text-navy-600 uppercase text-right">Volume</span>
                      <span />
                    </div>

                    {/* Data rows */}
                    {list.items.map((item) => {
                      const q = item.quote;
                      const isUp = q ? q.change > 0 : false;
                      const isDown = q ? q.change < 0 : false;
                      const isStale = q && "stale" in q && q.stale;
                      const isDragOver = dragOverItem?.itemId === item.id && dragItem?.watchlistId === list.id;

                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => handleDragStart(list.id, item.id)}
                          onDragOver={(e) => handleDragOver(e, list.id, item.id)}
                          onDrop={() => handleDrop(list.id)}
                          onDragEnd={() => { setDragItem(null); setDragOverItem(null); }}
                          className={`group grid grid-cols-[24px_1fr_100px_100px_80px_80px_32px] gap-2 px-4 py-2 items-center hover:bg-navy-800/30 transition-colors ${
                            isDragOver ? "border-t border-accent-cyan/50" : "border-t border-transparent"
                          }`}
                        >
                          <div className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="h-3 w-3 text-navy-600" />
                          </div>
                          <div className="flex items-center gap-2">
                            {q ? (
                              isUp ? <TrendingUp className="h-3 w-3 text-accent-emerald" /> :
                              isDown ? <TrendingDown className="h-3 w-3 text-accent-rose" /> :
                              <Minus className="h-3 w-3 text-navy-600" />
                            ) : (
                              <Minus className="h-3 w-3 text-navy-700" />
                            )}
                            <span className="text-xs font-mono text-navy-100 font-semibold">{item.symbol}</span>
                            {isStale && (
                              <span className="text-[8px] font-mono text-accent-amber/70 uppercase px-1 py-px rounded bg-accent-amber/10">stale</span>
                            )}
                          </div>
                          <span className={`text-xs font-mono text-right tabular-nums ${q ? (isStale ? "text-navy-300" : "text-navy-200") : "text-navy-600"}`}>
                            {q ? q.price.toFixed(q.price >= 100 ? 2 : q.price >= 1 ? 2 : 4) : "--"}
                          </span>
                          <span
                            className={`text-xs font-mono text-right tabular-nums ${
                              !q ? "text-navy-600" : isUp ? "text-accent-emerald" : isDown ? "text-accent-rose" : "text-navy-500"
                            }`}
                          >
                            {q ? `${q.change >= 0 ? "+" : ""}${q.change.toFixed(2)}` : "--"}
                          </span>
                          <span
                            className={`text-xs font-mono text-right tabular-nums ${
                              !q ? "text-navy-600" : isUp ? "text-accent-emerald" : isDown ? "text-accent-rose" : "text-navy-500"
                            }`}
                          >
                            {q ? `${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%` : "--"}
                          </span>
                          <span className="text-[10px] font-mono text-navy-400 text-right tabular-nums">
                            {q && q.volume ? formatVolume(q.volume) : "--"}
                          </span>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-navy-600 hover:text-accent-rose transition-all"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {expanded && list.items.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-navy-500">No symbols added.</p>
                    <button
                      onClick={() => setAddSymbol({ watchlistId: list.id, value: "" })}
                      className="mt-2 text-[10px] font-mono text-navy-400 hover:text-navy-200 transition-colors"
                    >
                      + Add a symbol
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </UpgradeGate>
    </PageContainer>
  );
}
