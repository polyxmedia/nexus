"use client";

import { useCallback, useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { DataGrid, type Column } from "@/components/ui/data-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Metric } from "@/components/ui/metric";
import {
  Link2,
  Loader2,
  RefreshCw,
  X,
  TrendingUp,
  TrendingDown,
  Coins,
  BarChart3,
  Landmark,
  Flame,
  Plus,
  Pencil,
  Check,
  ClipboardList,
  Trash2,
  DollarSign,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

// ── Manual Portfolio Panel ──

interface ManualPosition {
  id: number;
  ticker: string;
  name: string | null;
  direction: "long" | "short";
  quantity: number;
  avgCost: number;
  currency: string;
  openedAt: string;
  closedAt: string | null;
  closePrice: number | null;
  notes: string | null;
}

interface ManualPositionWithQuote extends ManualPosition {
  currentPrice?: number;
  pnl?: number;
  pnlPercent?: number;
}

const EMPTY_FORM = {
  ticker: "",
  name: "",
  direction: "long" as "long" | "short",
  quantity: "",
  avgCost: "",
  currency: "USD",
  openedAt: new Date().toISOString().split("T")[0],
  notes: "",
};

function ManualPortfolioPanel() {
  const [positions, setPositions] = useState<ManualPositionWithQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClosed, setShowClosed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [closeModalId, setCloseModalId] = useState<number | null>(null);
  const [closePrice, setClosePrice] = useState("");
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch(`/api/portfolio/manual?closed=${showClosed}`);
      const data = await res.json();
      const pos: ManualPosition[] = data.positions || [];

      // Fetch live quotes for open positions
      const openPositions = pos.filter((p) => !p.closedAt);
      const uniqueTickers = [...new Set(openPositions.map((p) => p.ticker))];

      const quotes: Record<string, number> = {};
      await Promise.all(
        uniqueTickers.map(async (ticker) => {
          try {
            const res = await fetch(`/api/market-data?symbol=${encodeURIComponent(ticker)}`);
            const q = await res.json();
            if (q?.quote?.price) quotes[ticker] = q.quote.price;
          } catch { /* skip */ }
        })
      );

      const enriched: ManualPositionWithQuote[] = pos.map((p) => {
        if (p.closedAt && p.closePrice) {
          const multiplier = p.direction === "long" ? 1 : -1;
          const pnl = (p.closePrice - p.avgCost) * p.quantity * multiplier;
          const pnlPercent = ((p.closePrice - p.avgCost) / p.avgCost) * 100 * multiplier;
          return { ...p, currentPrice: p.closePrice, pnl, pnlPercent };
        }
        const price = quotes[p.ticker];
        if (price) {
          const multiplier = p.direction === "long" ? 1 : -1;
          const pnl = (price - p.avgCost) * p.quantity * multiplier;
          const pnlPercent = ((price - p.avgCost) / p.avgCost) * 100 * multiplier;
          return { ...p, currentPrice: price, pnl, pnlPercent };
        }
        return p;
      });

      setPositions(enriched);
    } catch {
      setPositions([]);
    }
    setLoading(false);
  }, [showClosed]);

  useEffect(() => {
    setLoading(true);
    fetchPositions();
  }, [fetchPositions]);

  const openPositions = positions.filter((p) => !p.closedAt);
  const closedPositions = positions.filter((p) => p.closedAt);
  const displayPositions = showClosed ? positions : openPositions;

  const totalValue = openPositions.reduce(
    (sum, p) => sum + (p.currentPrice || p.avgCost) * p.quantity,
    0
  );
  const totalCost = openPositions.reduce((sum, p) => sum + p.avgCost * p.quantity, 0);
  const totalPnl = openPositions.reduce((sum, p) => sum + (p.pnl || 0), 0);
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const realisedPnl = closedPositions.reduce((sum, p) => sum + (p.pnl || 0), 0);

  const openAddModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (p: ManualPositionWithQuote) => {
    setEditingId(p.id);
    setForm({
      ticker: p.ticker,
      name: p.name || "",
      direction: p.direction,
      quantity: String(p.quantity),
      avgCost: String(p.avgCost),
      currency: p.currency,
      openedAt: p.openedAt.split("T")[0],
      notes: p.notes || "",
    });
    setModalOpen(true);
  };

  const savePosition = async () => {
    if (!form.ticker || !form.quantity || !form.avgCost) return;
    setSaving(true);

    const body = {
      ...(editingId ? { id: editingId } : {}),
      ticker: form.ticker,
      name: form.name || null,
      direction: form.direction,
      quantity: parseFloat(form.quantity),
      avgCost: parseFloat(form.avgCost),
      currency: form.currency,
      openedAt: new Date(form.openedAt).toISOString(),
      notes: form.notes || null,
    };

    await fetch("/api/portfolio/manual", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setModalOpen(false);
    setSaving(false);
    fetchPositions();
  };

  const closePosition = async () => {
    if (!closeModalId || !closePrice) return;
    setClosing(true);
    await fetch("/api/portfolio/manual", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: closeModalId,
        closedAt: new Date().toISOString(),
        closePrice: parseFloat(closePrice),
      }),
    });
    setCloseModalId(null);
    setClosePrice("");
    setClosing(false);
    fetchPositions();
  };

  const deletePosition = async (id: number) => {
    setDeleting(id);
    await fetch("/api/portfolio/manual", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    fetchPositions();
  };

  const columns: Column<ManualPositionWithQuote>[] = [
    {
      key: "ticker",
      header: "Ticker",
      accessor: (row) => (
        <span className="font-mono text-xs text-accent-cyan">
          {row.ticker}
          {row.name && <span className="text-navy-500 ml-1.5 font-sans">{row.name}</span>}
        </span>
      ),
      sortAccessor: (row) => row.ticker,
    },
    {
      key: "direction",
      header: "Side",
      accessor: (row) => (
        <span className={`text-[10px] font-mono uppercase tracking-wider ${row.direction === "long" ? "text-accent-emerald" : "text-accent-rose"}`}>
          {row.direction}
        </span>
      ),
      sortAccessor: (row) => row.direction,
    },
    {
      key: "quantity",
      header: "Qty",
      accessor: (row) => <span className="font-mono text-xs text-navy-200">{row.quantity}</span>,
      sortAccessor: (row) => row.quantity,
    },
    {
      key: "avgCost",
      header: "Avg Cost",
      accessor: (row) => <span className="font-mono text-xs text-navy-300">${row.avgCost.toFixed(2)}</span>,
      sortAccessor: (row) => row.avgCost,
    },
    {
      key: "currentPrice",
      header: "Current",
      accessor: (row) =>
        row.currentPrice ? (
          <span className="font-mono text-xs text-navy-200">${row.currentPrice.toFixed(2)}</span>
        ) : (
          <span className="text-[10px] text-navy-600">--</span>
        ),
      sortAccessor: (row) => row.currentPrice || 0,
    },
    {
      key: "pnl",
      header: "P&L",
      accessor: (row) => {
        if (row.pnl == null) return <span className="text-[10px] text-navy-600">--</span>;
        const positive = row.pnl >= 0;
        return (
          <div className="flex items-center gap-1">
            {positive ? <TrendingUp className="h-3 w-3 text-accent-emerald" /> : <TrendingDown className="h-3 w-3 text-accent-rose" />}
            <span className={`font-mono text-xs ${positive ? "text-accent-emerald" : "text-accent-rose"}`}>
              ${Math.abs(row.pnl).toFixed(2)}
            </span>
            <span className={`text-[10px] ${positive ? "text-accent-emerald/60" : "text-accent-rose/60"}`}>
              ({positive ? "+" : ""}{row.pnlPercent?.toFixed(1)}%)
            </span>
          </div>
        );
      },
      sortAccessor: (row) => row.pnl || 0,
    },
    {
      key: "actions",
      header: "",
      accessor: (row) => (
        <div className="flex items-center gap-1">
          {!row.closedAt && (
            <>
              <button
                onClick={() => openEditModal(row)}
                className="p-1 rounded text-navy-500 hover:text-navy-200 hover:bg-navy-800/50 transition-colors"
                title="Edit"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => { setCloseModalId(row.id); setClosePrice(row.currentPrice?.toFixed(2) || ""); }}
                className="p-1 rounded text-navy-500 hover:text-accent-amber hover:bg-accent-amber/10 transition-colors"
                title="Close position"
              >
                <Check className="h-3 w-3" />
              </button>
            </>
          )}
          <button
            onClick={() => deletePosition(row.id)}
            disabled={deleting === row.id}
            className="p-1 rounded text-navy-600 hover:text-accent-rose hover:bg-accent-rose/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <>
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Metric label="Portfolio Value" value={`$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        <Metric label="Total Cost" value={`$${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        <Metric
          label="Unrealised P&L"
          value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`}
          change={`${totalPnlPercent >= 0 ? "+" : ""}${totalPnlPercent.toFixed(1)}%`}
          changeColor={totalPnl >= 0 ? "green" : "red"}
        />
        <Metric
          label="Realised P&L"
          value={`${realisedPnl >= 0 ? "+" : ""}$${realisedPnl.toFixed(2)}`}
          changeColor={realisedPnl >= 0 ? "green" : "red"}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={openAddModal}>
            <Plus className="h-3 w-3 mr-1.5" />
            Add Position
          </Button>
          <Button variant="outline" size="sm" onClick={fetchPositions}>
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Refresh Prices
          </Button>
        </div>
        <button
          onClick={() => setShowClosed(!showClosed)}
          className={`text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 rounded border transition-colors ${
            showClosed
              ? "border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan"
              : "border-navy-700/30 text-navy-500 hover:text-navy-300"
          }`}
        >
          {showClosed ? "Showing All" : "Show Closed"}
        </button>
      </div>

      {/* Positions table */}
      {displayPositions.length > 0 ? (
        <DataGrid columns={columns} data={displayPositions} keyExtractor={(row) => row.id} emptyMessage="No positions" />
      ) : (
        <div className="border border-navy-700/30 rounded-lg p-12 text-center bg-navy-900/20">
          <DollarSign className="h-8 w-8 text-navy-700 mx-auto mb-3" />
          <p className="text-sm text-navy-400 mb-1">No {showClosed ? "" : "open "}positions yet</p>
          <p className="text-[10px] text-navy-600">Add your first position to start tracking your portfolio</p>
        </div>
      )}

      {/* ── Add/Edit Position Modal ── */}
      <Dialog.Root open={modalOpen} onOpenChange={(open) => !open && setModalOpen(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-navy-700/60 bg-navy-900/95 backdrop-blur-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-sm font-semibold text-navy-100 font-mono">
                {editingId ? "Edit Position" : "Add Position"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-navy-500 hover:text-navy-300 hover:bg-navy-800/60 rounded p-1 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              {editingId ? "Edit an existing manual position" : "Add a new manual position to your portfolio"}
            </Dialog.Description>

            <div className="space-y-4">
              {/* Ticker + Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Ticker</label>
                  <Input
                    placeholder="AAPL"
                    value={form.ticker}
                    onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Name (optional)</label>
                  <Input
                    placeholder="Apple Inc."
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
              </div>

              {/* Direction */}
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Direction</label>
                <div className="flex h-8 rounded-md border border-navy-700/30 overflow-hidden w-fit">
                  <button
                    onClick={() => setForm({ ...form, direction: "long" })}
                    className={`px-4 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                      form.direction === "long"
                        ? "bg-accent-emerald/15 text-accent-emerald"
                        : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"
                    }`}
                  >
                    Long
                  </button>
                  <button
                    onClick={() => setForm({ ...form, direction: "short" })}
                    className={`px-4 text-[10px] font-medium uppercase tracking-wider border-l border-navy-700/30 transition-colors ${
                      form.direction === "short"
                        ? "bg-accent-rose/15 text-accent-rose"
                        : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/40"
                    }`}
                  >
                    Short
                  </button>
                </div>
              </div>

              {/* Quantity + Avg Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Quantity</label>
                  <Input
                    placeholder="10"
                    type="number"
                    step="any"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Avg Cost</label>
                  <Input
                    placeholder="150.00"
                    type="number"
                    step="any"
                    value={form.avgCost}
                    onChange={(e) => setForm({ ...form, avgCost: e.target.value })}
                  />
                </div>
              </div>

              {/* Currency + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Currency</label>
                  <Input
                    placeholder="USD"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Opened</label>
                  <Input
                    type="date"
                    value={form.openedAt}
                    onChange={(e) => setForm({ ...form, openedAt: e.target.value })}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Notes (optional)</label>
                <textarea
                  className="w-full rounded-md border border-navy-700/40 bg-navy-950 px-3 py-2 text-xs text-navy-200 placeholder:text-navy-600 focus:outline-none focus:border-accent-cyan/40 resize-none"
                  rows={2}
                  placeholder="Entry thesis, stop loss levels, etc."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-navy-700/30">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={savePosition}
                disabled={saving || !form.ticker || !form.quantity || !form.avgCost}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Check className="h-3 w-3 mr-1.5" />}
                {editingId ? "Save Changes" : "Add Position"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Close Position Modal ── */}
      <Dialog.Root open={!!closeModalId} onOpenChange={(open) => !open && setCloseModalId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-navy-700/60 bg-navy-900/95 backdrop-blur-md p-6 shadow-2xl">
            <Dialog.Title className="text-sm font-semibold text-navy-100 font-mono mb-4">
              Close Position
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Enter the closing price for this position
            </Dialog.Description>
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-1.5 block">Close Price</label>
              <Input
                placeholder="0.00"
                type="number"
                step="any"
                value={closePrice}
                onChange={(e) => setClosePrice(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-navy-700/30">
              <Button variant="outline" size="sm" onClick={() => setCloseModalId(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={closePosition} disabled={closing || !closePrice}>
                {closing ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Check className="h-3 w-3 mr-1.5" />}
                Close Position
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

// ── Main Page ──

export default function TradingPage() {
  return <TradingPageInner />;
}

type TabKey = "stocks" | "crypto" | "ibkr" | "ig" | "manual";

const TABS: { key: TabKey; icon: typeof BarChart3; label: string }[] = [
  { key: "stocks", icon: BarChart3, label: "Trading 212" },
  { key: "crypto", icon: Coins, label: "Coinbase" },
  { key: "ibkr", icon: Landmark, label: "Interactive Brokers" },
  { key: "ig", icon: Flame, label: "IG Markets" },
  { key: "manual", icon: ClipboardList, label: "Manual Portfolio" },
];

function TradingPageInner() {
  const [activeTab, setActiveTab] = useState<TabKey>("manual");

  return (
    <UpgradeGate minTier="operator" feature="Trading Integration">
    <PageContainer
      title="Trading"
      subtitle="Portfolio & Positions"
    >
      {/* ── Trading integrations coming soon ── */}
      {activeTab !== "manual" && (
        <div className="border border-navy-700/40 rounded-lg p-12 bg-navy-900/30 text-center">
          <Link2 className="h-10 w-10 text-navy-600 mx-auto mb-4" />
          <h2 className="text-base font-semibold text-navy-200 mb-2">Trading Integrations Coming Soon</h2>
          <p className="text-xs text-navy-400 mb-6 max-w-md mx-auto leading-relaxed">
            Direct broker integrations with Interactive Brokers, IG Markets, Trading 212, and Coinbase are in development. Use Manual Portfolio to track your positions in the meantime.
          </p>
          <button
            onClick={() => setActiveTab("manual")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded bg-accent-cyan/10 hover:bg-accent-cyan/15 border border-accent-cyan/20 hover:border-accent-cyan/30 text-[11px] font-mono uppercase tracking-widest text-accent-cyan transition-all"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Track Manually
          </button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 mb-6 border-b border-navy-700/30 pb-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-accent-cyan text-accent-cyan"
                  : "border-transparent text-navy-500 hover:text-navy-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Manual Portfolio Tab ── */}
      {activeTab === "manual" && (
        <ManualPortfolioPanel />
      )}
    </PageContainer>
    </UpgradeGate>
  );
}
