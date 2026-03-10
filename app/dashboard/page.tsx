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
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { useSubscription } from "@/lib/hooks/useSubscription";

// ── Types ──

type MinTier = "analyst" | "operator" | "institution";

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
  minTier: MinTier;
}

const TIER_LEVELS: Record<string, number> = {
  free: 0,
  analyst: 1,
  operator: 2,
  institution: 3,
};

const TIER_LABELS: Record<string, string> = {
  analyst: "Analyst",
  operator: "Operator",
  institution: "Institution",
};

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
  { type: "metric", name: "Threat Level", description: "Geopolitical escalation indicator", category: "intelligence", defaultWidth: 1, defaultConfig: { metric: "threat_level" }, accent: "rose", minTier: "analyst" },
  { type: "thesis", name: "Active Thesis", description: "AI-generated market thesis with regime and confidence", category: "intelligence", defaultWidth: 2, defaultConfig: {}, accent: "cyan", minTier: "analyst" },
  { type: "signals", name: "Signal Feed", description: "Filtered intelligence signals by intensity", category: "intelligence", defaultWidth: 1, defaultConfig: { minIntensity: 4 }, accent: "amber", minTier: "analyst" },
  { type: "predictions", name: "Prediction Scorecard", description: "Accuracy tracking with Brier scoring", category: "intelligence", defaultWidth: 1, defaultConfig: {}, accent: "amber", minTier: "analyst" },
  { type: "calendar", name: "Calendar", description: "Hebrew, Islamic & economic calendar events", category: "intelligence", defaultWidth: 1, defaultConfig: {}, accent: "emerald", minTier: "analyst" },
  { type: "prediction_markets", name: "Prediction Markets", description: "Polymarket & Kalshi probability pricing", category: "intelligence", defaultWidth: 2, defaultConfig: {}, accent: "amber", minTier: "operator" },
  { type: "congressional_trading", name: "Congressional Trading", description: "STOCK Act disclosures, insider clusters", category: "intelligence", defaultWidth: 2, defaultConfig: {}, accent: "rose", minTier: "operator" },
  // Markets
  { type: "metric", name: "Market Regime", description: "Risk-on/risk-off classification", category: "markets", defaultWidth: 1, defaultConfig: { metric: "market_regime" }, accent: "cyan", minTier: "analyst" },
  { type: "metric", name: "VIX Gauge", description: "CBOE Volatility Index level", category: "markets", defaultWidth: 1, defaultConfig: { metric: "vix" }, accent: "rose", minTier: "analyst" },
  { type: "chart", name: "Price Chart", description: "Candlestick chart for any ticker symbol", category: "markets", defaultWidth: 2, defaultConfig: { symbol: "SPY", range: "3m" }, accent: "cyan", minTier: "analyst" },
  { type: "macro", name: "Macro Dashboard", description: "Key economic indicators from FRED", category: "markets", defaultWidth: 2, defaultConfig: { series: ["UNRATE", "ICSA", "CPIAUCSL", "VIXCLS", "GOLDAMGBD228NLBM", "DCOILWTICO"] }, accent: "emerald", minTier: "operator" },
  { type: "options", name: "Put/Call Ratio", description: "CBOE equity options sentiment", category: "markets", defaultWidth: 1, defaultConfig: { view: "pcr" }, accent: "amber", minTier: "operator" },
  { type: "currency_stress", name: "Currency Stress", description: "Dollar index, EUR, JPY, CNY trends", category: "markets", defaultWidth: 1, defaultConfig: {}, accent: "cyan", minTier: "operator" },
  { type: "commodities", name: "Commodity Complex", description: "Gold, WTI, Brent, Natural Gas", category: "markets", defaultWidth: 1, defaultConfig: {}, accent: "amber", minTier: "operator" },
  // Analytics
  { type: "metric", name: "Portfolio Value", description: "Live portfolio value with P&L", category: "analytics", defaultWidth: 1, defaultConfig: { metric: "portfolio_value" }, accent: "emerald", minTier: "operator" },
  { type: "metric", name: "Thesis Confidence", description: "Active thesis confidence level", category: "analytics", defaultWidth: 1, defaultConfig: { metric: "thesis_confidence" }, accent: "cyan", minTier: "analyst" },
  { type: "metric", name: "Prediction Accuracy", description: "Overall prediction accuracy rate", category: "analytics", defaultWidth: 1, defaultConfig: { metric: "prediction_accuracy" }, accent: "amber", minTier: "analyst" },
  { type: "metric", name: "Convergence Density", description: "Multi-layer signal convergence", category: "analytics", defaultWidth: 1, defaultConfig: { metric: "convergence_density" }, accent: "cyan", minTier: "analyst" },
  { type: "risk", name: "Portfolio Risk", description: "VaR, Sharpe ratio, and drawdown", category: "analytics", defaultWidth: 1, defaultConfig: { view: "var" }, accent: "rose", minTier: "operator" },
  { type: "credit_stress", name: "Credit Stress Monitor", description: "HY & IG OAS spreads with stress regime", category: "analytics", defaultWidth: 1, defaultConfig: {}, accent: "rose", minTier: "operator" },
  { type: "liquidity", name: "Dollar Liquidity Index", description: "Fed balance sheet net liquidity", category: "analytics", defaultWidth: 1, defaultConfig: {}, accent: "cyan", minTier: "operator" },
  { type: "inflation_pulse", name: "Inflation Pulse", description: "Breakeven inflation rates and trends", category: "analytics", defaultWidth: 1, defaultConfig: {}, accent: "amber", minTier: "operator" },
  { type: "vol_term", name: "Volatility Regime", description: "VIX fear gauge with regime label", category: "analytics", defaultWidth: 1, defaultConfig: {}, accent: "rose", minTier: "operator" },
  { type: "labor_market", name: "Labor Market Pulse", description: "Claims, unemployment, payrolls", category: "analytics", defaultWidth: 1, defaultConfig: {}, accent: "emerald", minTier: "operator" },
  { type: "housing_consumer", name: "Housing & Consumer", description: "Housing starts, sentiment, retail sales", category: "analytics", defaultWidth: 1, defaultConfig: {}, accent: "emerald", minTier: "operator" },
  { type: "gdp_nowcast", name: "GDP Nowcast", description: "Real GDP growth with regime classification", category: "analytics", defaultWidth: 1, defaultConfig: {}, accent: "cyan", minTier: "operator" },
  // Data Feeds
  { type: "news", name: "News Feed", description: "Reuters, BBC, Al Jazeera aggregated feed", category: "data", defaultWidth: 2, defaultConfig: { category: "all", maxItems: 15 }, accent: "cyan", minTier: "analyst" },
  // AI
  { type: "ai_progression", name: "AI Progression Tracker", description: "Remote Labor Index, AI 2027 timeline, sector risk", category: "ai", defaultWidth: 2, defaultConfig: {}, accent: "cyan", minTier: "operator" },
  { type: "quick_chat", name: "Quick Chat", description: "Start a conversation with the AI analyst", category: "ai", defaultWidth: 2, defaultConfig: {}, accent: "cyan", minTier: "analyst" },
  { type: "daily_report", name: "Daily Report", description: "AI-generated daily intelligence briefing with drill-down sections", category: "intelligence", defaultWidth: 3, defaultConfig: {}, accent: "cyan", minTier: "analyst" },
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
  const { tier, isAdmin } = useSubscription();

  // ── Drag state ──
  const dragItem = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null); // index to insert BEFORE (widgets.length = append)

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
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch("/api/dashboard/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", widgetType, title, config, width }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || "Failed to add widget" };
      }
      if (data.id) await fetchWidgets();
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
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

  function handleDragStart(idx: number, e: React.DragEvent) {
    dragItem.current = idx;
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    // Invisible ghost so we use our own visual feedback
    const ghost = document.createElement("div");
    ghost.style.cssText = "position:fixed;top:-9999px;width:1px;height:1px;opacity:0";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    requestAnimationFrame(() => ghost.remove());
  }

  function getDropIndex(e: React.DragEvent, targetIdx: number): number {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    // Drop before or after the target based on cursor position
    return e.clientY < midY ? targetIdx : targetIdx + 1;
  }

  function handleDragOver(e: React.DragEvent, targetIdx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const idx = getDropIndex(e, targetIdx);
    if (idx !== dropTarget) setDropTarget(idx);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (dragItem.current === null || dropTarget === null) return;

    const from = dragItem.current;
    let to = dropTarget;
    if (from === to || from === to - 1) {
      // No actual move needed
      resetDragState();
      return;
    }

    const sorted = [...widgets];
    const [dragged] = sorted.splice(from, 1);
    // Adjust insertion index since we removed an item before the target
    if (to > from) to--;
    sorted.splice(to, 0, dragged);

    setWidgets(sorted);
    persistOrder(sorted);
    resetDragState();
  }

  function resetDragState() {
    setDragIdx(null);
    setDropTarget(null);
    dragItem.current = null;
  }

  // ── Store install handler ──

  async function handleInstall(item: StoreItem): Promise<{ ok: boolean; error?: string }> {
    if (item.type === "chart") {
      setChartPickerFor(item);
      setChartSymbol("SPY");
      return { ok: true };
    }
    return addWidget(item.type, item.name, item.defaultConfig, item.defaultWidth);
  }

  async function handleChartConfirm() {
    if (!chartPickerFor) return;
    const sym = chartSymbol.trim().toUpperCase() || "SPY";
    await addWidget("chart", sym, { symbol: sym, range: "3m" }, 2);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded" />
          ))}
          <Skeleton className="h-48 sm:col-span-2 rounded" />
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
      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 transition-all duration-200",
          editMode ? "gap-8 select-none" : "gap-4"
        )}
        onDragOver={editMode ? (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          // If dragging over the grid background (empty space), drop at end
          if (e.target === e.currentTarget) setDropTarget(widgets.length);
        } : undefined}
        onDrop={editMode ? handleDrop : undefined}
        onDragLeave={editMode ? (e) => {
          // Only reset if leaving the grid entirely
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null);
        } : undefined}
      >
        {widgets.map((widget, idx) => {
          const colSpan =
            widget.width === 3
              ? "col-span-1 sm:col-span-2 md:col-span-3"
              : widget.width === 2
              ? "col-span-1 sm:col-span-2"
              : "col-span-1";

          const isDragging = dragIdx === idx;
          const showDropBefore = dropTarget === idx && dragIdx !== null && dragIdx !== idx && dragIdx !== idx - 1;
          const showDropAfter = idx === widgets.length - 1 && dropTarget === widgets.length && dragIdx !== null && dragIdx !== idx;

          return (
            <div
              key={widget.id}
              className={cn(
                colSpan,
                "relative transition-all duration-150",
                isDragging && "opacity-20 scale-[0.96]",
                editMode && "cursor-grab active:cursor-grabbing",
              )}
              draggable={editMode}
              onDragStart={editMode ? (e) => handleDragStart(idx, e) : undefined}
              onDragOver={editMode ? (e) => handleDragOver(e, idx) : undefined}
              onDragEnd={editMode ? resetDragState : undefined}
            >
              {/* Drop indicator line BEFORE this widget */}
              {showDropBefore && (
                <div className="absolute -top-2 left-0 right-0 h-0.5 bg-accent-cyan rounded-full z-20 shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
              )}

              {editMode && (
                <div className="flex items-center gap-1.5 py-1 px-1 select-none">
                  <GripVertical className="h-3 w-3 text-navy-500" />
                  <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider">
                    Drag
                  </span>
                </div>
              )}
              <WidgetRenderer widget={widget} onRemove={removeWidget} />

              {/* Drop indicator line AFTER last widget */}
              {showDropAfter && (
                <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-accent-cyan rounded-full z-20 shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
              )}
            </div>
          );
        })}

        {/* Empty drop zone at end of grid when dragging */}
        {editMode && dragIdx !== null && (
          <div
            className={cn(
              "col-span-1 rounded-md border-2 border-dashed transition-colors min-h-[8rem] flex items-center justify-center",
              dropTarget === widgets.length
                ? "border-accent-cyan/40 bg-accent-cyan/5"
                : "border-navy-700/20 bg-transparent"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDropTarget(widgets.length);
            }}
          >
            <span className={cn(
              "text-[10px] font-mono uppercase tracking-wider transition-colors",
              dropTarget === widgets.length ? "text-accent-cyan/60" : "text-navy-700"
            )}>
              Drop here
            </span>
          </div>
        )}
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
          userTier={tier || "free"}
          isAdmin={isAdmin}
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
  userTier,
  isAdmin,
}: {
  onClose: () => void;
  onInstall: (item: StoreItem) => Promise<{ ok: boolean; error?: string }>;
  isInstalled: (item: StoreItem) => boolean;
  chartPickerFor: StoreItem | null;
  chartSymbol: string;
  setChartSymbol: (s: string) => void;
  onChartConfirm: () => void;
  onChartCancel: () => void;
  userTier: string;
  isAdmin: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const userLevel = isAdmin ? 3 : (TIER_LEVELS[userTier] ?? 0);

  function canAccessWidget(item: StoreItem): boolean {
    if (isAdmin) return true;
    return userLevel >= (TIER_LEVELS[item.minTier] ?? 1);
  }

  const filtered = STORE_ITEMS.filter((item) => {
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch = search === "" ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    // Accessible widgets first, locked widgets after
    const aLocked = !canAccessWidget(a) ? 1 : 0;
    const bLocked = !canAccessWidget(b) ? 1 : 0;
    return aLocked - bLocked;
  });

  async function handleAdd(item: StoreItem) {
    if (!canAccessWidget(item)) return;
    setAddError(null);
    const result = await onInstall(item);
    if (result.ok) {
      const key = `${item.type}:${item.name}`;
      setJustAdded(key);
      setTimeout(() => setJustAdded(null), 1500);
    } else {
      setAddError(result.error || "Failed to add widget");
      setTimeout(() => setAddError(null), 3000);
    }
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
              {/* Error banner */}
              {addError && (
                <div className="mb-4 px-3 py-2 rounded-md border border-accent-rose/30 bg-accent-rose/5 text-[11px] font-mono text-accent-rose">
                  {addError}
                </div>
              )}

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
                  const locked = !canAccessWidget(item);

                  return (
                    <div
                      key={`${item.type}-${item.name}`}
                      className={cn(
                        "group relative rounded-lg border bg-navy-900/40 transition-all duration-200",
                        locked
                          ? "border-navy-700/15 opacity-50"
                          : installed
                          ? "border-navy-700/20 opacity-60"
                          : "border-navy-700/30 hover:border-navy-600/50 hover:bg-navy-900/70"
                      )}
                    >
                      {/* Accent top bar */}
                      <div className={cn("h-0.5 rounded-t-lg", locked ? "bg-navy-700/30" : ac.dot)} />

                      <div className="p-3.5">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className={cn("text-[12px] font-semibold truncate", locked ? "text-navy-500" : "text-navy-100")}>{item.name}</h4>
                              <span className={cn(
                                "shrink-0 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider rounded",
                                locked ? "bg-navy-800/50 text-navy-600" : cn(ac.bg, ac.text)
                              )}>
                                {SIZE_LABELS[item.defaultWidth] || "sm"}
                              </span>
                              {locked && (
                                <span className="shrink-0 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider rounded bg-navy-800/50 text-navy-500 flex items-center gap-1">
                                  <Lock className="h-2.5 w-2.5" />
                                  {TIER_LABELS[item.minTier] || item.minTier}
                                </span>
                              )}
                            </div>
                            <p className={cn("text-[10px] mt-0.5 line-clamp-2 leading-relaxed", locked ? "text-navy-600" : "text-navy-400")}>
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-navy-800/50">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600">
                            {item.category}
                          </span>

                          {locked ? (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-navy-600">
                              <Lock className="h-2.5 w-2.5" />
                              Upgrade
                            </span>
                          ) : wasJustAdded ? (
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
