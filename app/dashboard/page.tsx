"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { WidgetRenderer } from "@/components/dashboard/widget-renderer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bot,
  Check,
  Cpu,
  GripVertical,
  Layers,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";

// ── Types ──

interface Widget {
  id: number;
  widgetType: string;
  title: string;
  config: string;
  position: number;
  width: number;
  enabled: number;
}

// ── Widget Store data ──

interface StoreItem {
  type: string;
  name: string;
  description: string;
  category: string;
  defaultWidth: number;
  defaultConfig: Record<string, unknown>;
  accent: "cyan" | "amber" | "emerald" | "rose";
}

const STORE_CATEGORIES = [
  { id: "all", label: "All", icon: Layers, count: 0 },
  { id: "intelligence", label: "Intelligence", icon: Zap, count: 0 },
  { id: "markets", label: "Markets", icon: BarChart3, count: 0 },
  { id: "analytics", label: "Analytics", icon: Activity, count: 0 },
  { id: "data", label: "Data Feeds", icon: Cpu, count: 0 },
  { id: "ai", label: "AI", icon: Bot, count: 0 },
] as const;

const STORE_ITEMS: StoreItem[] = [
  // Intelligence
  { type: "metric", name: "Threat Level", description: "Geopolitical escalation indicator", category: "intelligence", defaultWidth: 1, defaultConfig: { metric: "threat_level" }, accent: "rose" },
  { type: "thesis", name: "Active Thesis", description: "AI-generated market thesis with regime and confidence", category: "intelligence", defaultWidth: 2, defaultConfig: {}, accent: "cyan" },
  { type: "signals", name: "Signal Feed", description: "Filtered intelligence signals by intensity", category: "intelligence", defaultWidth: 1, defaultConfig: { minIntensity: 4 }, accent: "amber" },
  { type: "predictions", name: "Prediction Scorecard", description: "Accuracy tracking with Brier scoring", category: "intelligence", defaultWidth: 1, defaultConfig: {}, accent: "amber" },
  { type: "calendar", name: "Calendar", description: "Hebrew, Islamic & economic calendar events", category: "intelligence", defaultWidth: 1, defaultConfig: {}, accent: "emerald" },
  { type: "prediction_markets", name: "Prediction Markets", description: "Polymarket & Kalshi probability pricing", category: "intelligence", defaultWidth: 2, defaultConfig: {}, accent: "amber" },
  { type: "congressional_trading", name: "Congressional Trading", description: "STOCK Act disclosures, insider clusters", category: "intelligence", defaultWidth: 2, defaultConfig: {}, accent: "rose" },
  // Markets
  { type: "metric", name: "Market Regime", description: "Risk-on/risk-off classification", category: "markets", defaultWidth: 1, defaultConfig: { metric: "market_regime" }, accent: "cyan" },
  { type: "metric", name: "VIX Gauge", description: "CBOE Volatility Index level", category: "markets", defaultWidth: 1, defaultConfig: { metric: "vix" }, accent: "rose" },
  { type: "chart", name: "Price Chart", description: "Candlestick chart for any ticker symbol", category: "markets", defaultWidth: 2, defaultConfig: { symbol: "SPY", range: "3m" }, accent: "cyan" },
  { type: "macro", name: "Macro Dashboard", description: "Key economic indicators from FRED", category: "markets", defaultWidth: 2, defaultConfig: { series: ["UNRATE", "ICSA", "CPIAUCSL", "VIXCLS", "GOLDAMGBD228NLBM", "DCOILWTICO"] }, accent: "emerald" },
  { type: "options", name: "Put/Call Ratio", description: "CBOE equity options sentiment", category: "markets", defaultWidth: 1, defaultConfig: { view: "pcr" }, accent: "amber" },
  { type: "currency_stress", name: "Currency Stress", description: "Dollar index, EUR, JPY, CNY trends", category: "markets", defaultWidth: 1, defaultConfig: {}, accent: "cyan" },
  { type: "commodities", name: "Commodity Complex", description: "Gold, WTI, Brent, Natural Gas", category: "markets", defaultWidth: 1, defaultConfig: {}, accent: "amber" },
  // Analytics
  { type: "metric", name: "Portfolio Value", description: "Live portfolio value with P&L", category: "analytics", defaultWidth: 1, defaultConfig: { metric: "portfolio_value" }, accent: "emerald" },
  { type: "metric", name: "Thesis Confidence", description: "Active thesis confidence level", category: "analytics", defaultWidth: 1, defaultConfig: { metric: "thesis_confidence" }, accent: "cyan" },
  { type: "metric", name: "Prediction Accuracy", description: "Overall prediction accuracy rate", category: "analytics", defaultWidth: 1, defaultConfig: { metric: "prediction_accuracy" }, accent: "amber" },
  { type: "metric", name: "Convergence Density", description: "Multi-layer signal convergence", category: "analytics", defaultWidth: 1, defaultConfig: { metric: "convergence_density" }, accent: "cyan" },
  { type: "risk", name: "Portfolio Risk", description: "VaR, Sharpe ratio, and drawdown", category: "analytics", defaultWidth: 1, defaultConfig: { view: "var" }, accent: "rose" },
  { type: "credit_stress", name: "Credit Stress Monitor", description: "HY & IG OAS spreads with stress regime", category: "analytics", defaultWidth: 1, defaultConfig: {}, accent: "rose" },
  { type: "liquidity", name: "Dollar Liquidity Index", description: "Fed balance sheet net liquidity", category: "analytics", defaultWidth: 1, defaultConfig: {}, accent: "cyan" },
  { type: "inflation_pulse", name: "Inflation Pulse", description: "Breakeven inflation rates and trends", category: "analytics", defaultWidth: 1, defaultConfig: {}, accent: "amber" },
  { type: "vol_term", name: "Volatility Regime", description: "VIX fear gauge with regime label", category: "analytics", defaultWidth: 1, defaultConfig: {}, accent: "rose" },
  { type: "labor_market", name: "Labor Market Pulse", description: "Claims, unemployment, payrolls", category: "analytics", defaultWidth: 1, defaultConfig: {}, accent: "emerald" },
  { type: "housing_consumer", name: "Housing & Consumer", description: "Housing starts, sentiment, retail sales", category: "analytics", defaultWidth: 1, defaultConfig: {}, accent: "emerald" },
  { type: "gdp_nowcast", name: "GDP Nowcast", description: "Real GDP growth with regime classification", category: "analytics", defaultWidth: 1, defaultConfig: {}, accent: "cyan" },
  // Data Feeds
  { type: "news", name: "News Feed", description: "Reuters, BBC, Al Jazeera aggregated feed", category: "data", defaultWidth: 2, defaultConfig: { category: "all", maxItems: 15 }, accent: "cyan" },
  // AI
  { type: "ai_progression", name: "AI Progression Tracker", description: "Remote Labor Index, AI 2027 timeline, sector risk", category: "ai", defaultWidth: 2, defaultConfig: {}, accent: "cyan" },
];

// Compute category counts
for (const cat of STORE_CATEGORIES) {
  (cat as { count: number }).count = cat.id === "all" ? STORE_ITEMS.length : STORE_ITEMS.filter((i) => i.category === cat.id).length;
}

const ACCENT_CLASSES = {
  cyan: { dot: "bg-accent-cyan", border: "border-accent-cyan/20", text: "text-accent-cyan", bg: "bg-accent-cyan/10", bgHover: "hover:bg-accent-cyan/15" },
  amber: { dot: "bg-accent-amber", border: "border-accent-amber/20", text: "text-accent-amber", bg: "bg-accent-amber/10", bgHover: "hover:bg-accent-amber/15" },
  emerald: { dot: "bg-accent-emerald", border: "border-accent-emerald/20", text: "text-accent-emerald", bg: "bg-accent-emerald/10", bgHover: "hover:bg-accent-emerald/15" },
  rose: { dot: "bg-accent-rose", border: "border-accent-rose/20", text: "text-accent-rose", bg: "bg-accent-rose/10", bgHover: "hover:bg-accent-rose/15" },
} as const;

const SIZE_LABELS: Record<number, string> = { 1: "sm", 2: "md", 3: "lg" };

// ── Component ──

export default function DashboardPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState("SPY");
  const [chartPickerFor, setChartPickerFor] = useState<StoreItem | null>(null);

  // ── Drag state ──
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // ── Fetch widgets ──

  const fetchWidgets = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/widgets");
      const data = await res.json();
      setWidgets(data.widgets || []);
    } catch {
      setWidgets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  // ── API helpers ──

  async function addWidget(
    widgetType: string,
    title: string,
    config: Record<string, unknown>,
    width: number,
  ) {
    try {
      const res = await fetch("/api/dashboard/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", widgetType, title, config, width }),
      });
      const data = await res.json();
      if (data.id) await fetchWidgets();
    } catch { /* silent */ }
  }

  async function removeWidget(id: number) {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    try {
      await fetch("/api/dashboard/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", id }),
      });
    } catch {
      await fetchWidgets();
    }
  }

  async function persistOrder(newWidgets: Widget[]) {
    try {
      await fetch("/api/dashboard/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", order: newWidgets.map((w) => w.id) }),
      });
    } catch {
      await fetchWidgets();
    }
  }

  async function resetWidgets() {
    try {
      await fetch("/api/dashboard/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      await fetchWidgets();
    } catch { /* silent */ }
  }

  // ── Drag handlers ──

  function handleDragStart(idx: number) {
    dragItem.current = idx;
    setDragIdx(idx);
  }

  function handleDragEnter(idx: number) {
    dragOverItem.current = idx;
    setDragOverIdx(idx);
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      setDragIdx(null);
      setDragOverIdx(null);
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const sorted = [...widgets];
    const draggedWidget = sorted[dragItem.current];
    sorted.splice(dragItem.current, 1);
    sorted.splice(dragOverItem.current, 0, draggedWidget);

    setWidgets(sorted);
    persistOrder(sorted);

    setDragIdx(null);
    setDragOverIdx(null);
    dragItem.current = null;
    dragOverItem.current = null;
  }

  // ── Store install handler ──

  function handleInstall(item: StoreItem) {
    if (item.type === "chart") {
      setChartPickerFor(item);
      setChartSymbol("SPY");
      return;
    }
    addWidget(item.type, item.name, item.defaultConfig, item.defaultWidth);
  }

  function handleChartConfirm() {
    if (!chartPickerFor) return;
    const sym = chartSymbol.trim().toUpperCase() || "SPY";
    addWidget("chart", sym, { symbol: sym, range: "3m" }, 2);
    setChartPickerFor(null);
  }

  // ── Installed check ──

  function getInstalledKeys(): Set<string> {
    const keys = new Set<string>();
    for (const w of widgets) {
      try {
        const c = JSON.parse(w.config);
        keys.add(`${w.widgetType}:${c.metric || c.symbol || ""}`);
      } catch {
        keys.add(`${w.widgetType}:`);
      }
    }
    return keys;
  }

  function isInstalled(item: StoreItem): boolean {
    const keys = getInstalledKeys();
    const metric = (item.defaultConfig as { metric?: string }).metric || "";
    const symbol = (item.defaultConfig as { symbol?: string }).symbol || "";
    return keys.has(`${item.type}:${metric || symbol}`);
  }

  // ── Loading state ──

  if (loading) {
    return (
      <PageContainer title="Dashboard" subtitle="Intelligence overview">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded" />
          ))}
          <Skeleton className="h-48 col-span-2 rounded" />
          <Skeleton className="h-48 rounded" />
        </div>
      </PageContainer>
    );
  }

  // ── Render ──

  return (
    <PageContainer
      title="Dashboard"
      subtitle="Intelligence overview"
      actions={
        <div className="flex items-center gap-2">
          {editMode && (
            <button
              onClick={resetWidgets}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded border border-navy-700/40 text-navy-400 hover:text-navy-200 hover:border-navy-600/40 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
          <button
            onClick={() => setStoreOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded bg-navy-100 text-navy-950 font-medium hover:bg-white transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add Widget
          </button>
          <button
            onClick={() => {
              setEditMode(!editMode);
            }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded border transition-colors",
              editMode
                ? "border-accent-amber/40 bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20"
                : "border-navy-700/40 text-navy-400 hover:text-navy-200 hover:border-navy-600/40"
            )}
          >
            <Pencil className="h-3 w-3" />
            {editMode ? "Done" : "Edit"}
          </button>
        </div>
      }
    >
      <UpgradeGate minTier="analyst" feature="Intelligence dashboard" blur>
      {/* Widget Grid */}
      <div className="grid grid-cols-3 gap-4">
        {widgets.map((widget, idx) => {
          const colSpan =
            widget.width === 3
              ? "col-span-3"
              : widget.width === 2
              ? "col-span-2"
              : "col-span-1";

          const isDragging = dragIdx === idx;
          const isDragOver = dragOverIdx === idx && dragIdx !== idx;

          return (
            <div
              key={widget.id}
              className={cn(
                colSpan,
                "relative transition-all duration-200",
                isDragging && "opacity-30 scale-[0.97]",
                isDragOver && "before:absolute before:inset-0 before:rounded-md before:border-2 before:border-accent-cyan/40 before:pointer-events-none before:z-10"
              )}
              draggable={editMode}
              onDragStart={(e) => {
                if (!editMode) return;
                handleDragStart(idx);
                e.dataTransfer.effectAllowed = "move";
                const ghost = document.createElement("div");
                ghost.style.opacity = "0";
                document.body.appendChild(ghost);
                e.dataTransfer.setDragImage(ghost, 0, 0);
                setTimeout(() => document.body.removeChild(ghost), 0);
              }}
              onDragEnter={(e) => {
                if (!editMode) return;
                e.preventDefault();
                handleDragEnter(idx);
              }}
              onDragOver={(e) => {
                if (!editMode) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDragEnd={() => {
                if (!editMode) return;
                handleDragEnd();
              }}
            >
              {editMode && (
                <div className="flex items-center gap-1.5 py-1 px-1 cursor-grab active:cursor-grabbing select-none">
                  <GripVertical className="h-3 w-3 text-navy-500" />
                  <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider">
                    Drag
                  </span>
                </div>
              )}
              <WidgetRenderer widget={widget} onRemove={removeWidget} />
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {widgets.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-navy-500 mb-3">No widgets configured.</p>
          <button
            onClick={() => setStoreOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded bg-navy-100 text-navy-950 font-medium hover:bg-white transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add your first widget
          </button>
          <button
            onClick={resetWidgets}
            className="ml-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border border-navy-700/40 text-navy-400 hover:text-navy-200 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Load defaults
          </button>
        </div>
      )}

      {/* ── Widget Store Modal ── */}
      {storeOpen && (
        <WidgetStore
          onClose={() => { setStoreOpen(false); setChartPickerFor(null); }}
          onInstall={handleInstall}
          isInstalled={isInstalled}
          chartPickerFor={chartPickerFor}
          chartSymbol={chartSymbol}
          setChartSymbol={setChartSymbol}
          onChartConfirm={handleChartConfirm}
          onChartCancel={() => setChartPickerFor(null)}
        />
      )}
      </UpgradeGate>
    </PageContainer>
  );
}

// ── Widget Store Modal (App Store style) ──

function WidgetStore({
  onClose,
  onInstall,
  isInstalled,
  chartPickerFor,
  chartSymbol,
  setChartSymbol,
  onChartConfirm,
  onChartCancel,
}: {
  onClose: () => void;
  onInstall: (item: StoreItem) => void;
  isInstalled: (item: StoreItem) => boolean;
  chartPickerFor: StoreItem | null;
  chartSymbol: string;
  setChartSymbol: (s: string) => void;
  onChartConfirm: () => void;
  onChartCancel: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const filtered = STORE_ITEMS.filter((item) => {
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch = search === "" ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  function handleAdd(item: StoreItem) {
    onInstall(item);
    const key = `${item.type}:${item.name}`;
    setJustAdded(key);
    setTimeout(() => setJustAdded(null), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-5xl mx-4 h-[80vh] border border-navy-700/40 rounded-xl bg-navy-950 shadow-2xl flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Sidebar ── */}
        <div className="w-48 shrink-0 border-r border-navy-700/30 flex flex-col bg-navy-950">
          <div className="px-4 pt-5 pb-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-navy-200">
              Widget Store
            </h2>
            <p className="text-[10px] text-navy-500 mt-0.5">{STORE_ITEMS.length} available</p>
          </div>

          <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
            {STORE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setSearch(""); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-colors",
                    isActive
                      ? "bg-navy-800/80 text-navy-100"
                      : "text-navy-400 hover:bg-navy-800/40 hover:text-navy-200"
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-accent-cyan" : "opacity-50")} />
                  <span className="text-[11px] font-medium flex-1">{cat.label}</span>
                  <span className={cn(
                    "text-[9px] font-mono tabular-nums",
                    isActive ? "text-accent-cyan" : "text-navy-600"
                  )}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-navy-700/30">
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider text-navy-500 hover:text-navy-300 hover:bg-navy-800/40 transition-colors"
            >
              <X className="h-3 w-3" />
              Close
            </button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search bar */}
          <div className="px-5 py-3 border-b border-navy-700/30 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-navy-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search widgets..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-navy-700/40 bg-navy-900/60 text-xs text-navy-100 font-mono placeholder:text-navy-600 focus:outline-none focus:border-accent-cyan/40 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-500 hover:text-navy-300"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Chart ticker sub-picker overlay */}
          {chartPickerFor && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-sm space-y-4">
                <button
                  onClick={onChartCancel}
                  className="flex items-center gap-1 text-[10px] font-mono text-navy-500 hover:text-navy-300 transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to widgets
                </button>
                <div className="border border-navy-700/40 rounded-lg bg-navy-900/60 p-5">
                  <h3 className="text-sm font-bold text-navy-100 mb-1">Add Price Chart</h3>
                  <p className="text-[10px] text-navy-500 mb-4">Enter a ticker symbol to track</p>
                  <input
                    type="text"
                    value={chartSymbol}
                    onChange={(e) => setChartSymbol(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onChartConfirm()}
                    placeholder="SPY"
                    className="w-full px-3 py-2.5 rounded-md border border-navy-700/40 bg-navy-800/60 text-sm text-navy-100 font-mono placeholder:text-navy-600 focus:outline-none focus:border-accent-cyan/40"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={onChartConfirm}
                      className="flex-1 px-4 py-2 text-[10px] font-mono uppercase tracking-wider rounded-md bg-navy-100 text-navy-950 font-medium hover:bg-white transition-colors"
                    >
                      Add Chart
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {["SPY", "QQQ", "GLD", "TLT", "BTC", "XRP"].map((sym) => (
                      <button
                        key={sym}
                        onClick={() => setChartSymbol(sym)}
                        className={cn(
                          "px-2 py-1 text-[9px] font-mono rounded border transition-colors",
                          chartSymbol === sym
                            ? "border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan"
                            : "border-navy-700/30 text-navy-500 hover:text-navy-300 hover:border-navy-600/30"
                        )}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Widget grid */}
          {!chartPickerFor && (
            <div className="flex-1 overflow-y-auto p-5">
              {/* Category header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[10px] font-mono uppercase tracking-wider text-navy-500">
                    {search ? `Results for "${search}"` : STORE_CATEGORIES.find((c) => c.id === activeCategory)?.label || "All"}
                  </h3>
                  <p className="text-[10px] text-navy-600 mt-0.5">{filtered.length} widget{filtered.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map((item) => {
                  const installed = isInstalled(item);
                  const wasJustAdded = justAdded === `${item.type}:${item.name}`;
                  const ac = ACCENT_CLASSES[item.accent];

                  return (
                    <div
                      key={`${item.type}-${item.name}`}
                      className={cn(
                        "group relative rounded-lg border bg-navy-900/40 transition-all duration-200",
                        installed
                          ? "border-navy-700/20 opacity-60"
                          : "border-navy-700/30 hover:border-navy-600/50 hover:bg-navy-900/70"
                      )}
                    >
                      {/* Accent top bar */}
                      <div className={cn("h-0.5 rounded-t-lg", ac.dot)} />

                      <div className="p-3.5">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[12px] font-semibold text-navy-100 truncate">{item.name}</h4>
                              <span className={cn(
                                "shrink-0 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider rounded",
                                ac.bg, ac.text
                              )}>
                                {SIZE_LABELS[item.defaultWidth] || "sm"}
                              </span>
                            </div>
                            <p className="text-[10px] text-navy-400 mt-0.5 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-navy-800/50">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600">
                            {item.category}
                          </span>

                          {wasJustAdded ? (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-accent-emerald">
                              <Check className="h-3 w-3" />
                              Added
                            </span>
                          ) : installed ? (
                            <span className="text-[10px] font-mono text-navy-600">
                              Installed
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAdd(item)}
                              className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider border transition-all duration-200",
                                "border-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/10 active:scale-95"
                              )}
                            >
                              <Plus className="h-3 w-3" />
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-16">
                  <Search className="h-5 w-5 text-navy-600 mx-auto mb-2" />
                  <p className="text-xs text-navy-500">No widgets match your search.</p>
                  <button
                    onClick={() => { setSearch(""); setActiveCategory("all"); }}
                    className="mt-2 text-[10px] font-mono text-accent-cyan hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
