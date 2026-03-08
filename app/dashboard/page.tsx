"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { WidgetRenderer, AVAILABLE_WIDGETS } from "@/components/dashboard/widget-renderer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GripVertical,
  Pencil,
  Plus,
  RotateCcw,
  Store,
  X,
} from "lucide-react";

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

const METRIC_OPTIONS = [
  { value: "threat_level", label: "Threat Level" },
  { value: "market_regime", label: "Market Regime" },
  { value: "portfolio_value", label: "Portfolio Value" },
  { value: "thesis_confidence", label: "Thesis Confidence" },
  { value: "prediction_accuracy", label: "Prediction Accuracy" },
  { value: "convergence_density", label: "Convergence Density" },
  { value: "vix", label: "VIX" },
];

// ── Marketplace data ──

interface MarketplaceItem {
  type: string;
  name: string;
  description: string;
  longDescription: string;
  category: string;
  defaultWidth: number;
  defaultConfig: Record<string, unknown>;
  tags: string[];
  color: string;
  popularity: number;
}

const MARKETPLACE_CATEGORIES = ["All", "Intelligence", "Markets", "Analytics", "Data Feeds", "AI"] as const;

const MARKETPLACE_ITEMS: MarketplaceItem[] = [
  {
    type: "metric", name: "VIX Gauge", description: "CBOE Volatility Index",
    longDescription: "Track the CBOE Volatility Index in real-time. Shows current VIX level with trend direction and fear/greed classification.",
    category: "Markets", defaultWidth: 1, defaultConfig: { metric: "vix" },
    tags: ["volatility", "risk", "options"], color: "accent-rose", popularity: 5,
  },
  {
    type: "metric", name: "Threat Level", description: "Geopolitical escalation indicator",
    longDescription: "Composite threat level derived from active conflict zones, military movements, and OSINT signal feeds.",
    category: "Intelligence", defaultWidth: 1, defaultConfig: { metric: "threat_level" },
    tags: ["geopolitical", "risk"], color: "accent-rose", popularity: 5,
  },
  {
    type: "metric", name: "Market Regime", description: "Risk-on/risk-off classification",
    longDescription: "AI-determined market regime classification based on cross-asset correlation and volatility term structure.",
    category: "Markets", defaultWidth: 1, defaultConfig: { metric: "market_regime" },
    tags: ["regime", "macro"], color: "accent-cyan", popularity: 4,
  },
  {
    type: "metric", name: "Portfolio Value", description: "Live portfolio value with P&L",
    longDescription: "Real-time portfolio value from your connected broker. Shows total value, unrealised P&L, and percentage return.",
    category: "Analytics", defaultWidth: 1, defaultConfig: { metric: "portfolio_value" },
    tags: ["portfolio", "p&l"], color: "accent-emerald", popularity: 4,
  },
  {
    type: "thesis", name: "Active Thesis", description: "AI-generated market thesis",
    longDescription: "Displays the active investment thesis with executive summary, market regime, convergence density, and confidence score.",
    category: "Intelligence", defaultWidth: 2, defaultConfig: {},
    tags: ["thesis", "ai", "strategy"], color: "accent-cyan", popularity: 5,
  },
  {
    type: "predictions", name: "Prediction Scorecard", description: "Accuracy tracking",
    longDescription: "Full prediction tracking with pending, overdue, confirmed, denied, and partial outcomes plus Brier scoring.",
    category: "Analytics", defaultWidth: 1, defaultConfig: {},
    tags: ["predictions", "accuracy"], color: "accent-amber", popularity: 4,
  },
  {
    type: "signals", name: "Signal Feed", description: "Filtered intelligence signals",
    longDescription: "Live feed of active intelligence signals filtered by intensity. Multi-layer detection across all sources.",
    category: "Intelligence", defaultWidth: 1, defaultConfig: { minIntensity: 4 },
    tags: ["signals", "detection"], color: "accent-amber", popularity: 5,
  },
  {
    type: "chart", name: "Price Chart", description: "Candlestick chart for any ticker",
    longDescription: "Interactive candlestick chart with volume overlay. Supports stocks, ETFs, and crypto symbols.",
    category: "Markets", defaultWidth: 2, defaultConfig: { symbol: "SPY", range: "3m" },
    tags: ["chart", "technical"], color: "accent-cyan", popularity: 5,
  },
  {
    type: "news", name: "News Feed", description: "Reuters, BBC, Al Jazeera",
    longDescription: "Aggregated news feed from major international sources with category filtering. Auto-refreshes every 5 minutes.",
    category: "Data Feeds", defaultWidth: 2, defaultConfig: { category: "all", maxItems: 15 },
    tags: ["news", "rss", "osint"], color: "accent-cyan", popularity: 4,
  },
  {
    type: "macro", name: "Macro Dashboard", description: "Economic indicators from FRED",
    longDescription: "Customisable macro economic indicators from the Federal Reserve Economic Data API.",
    category: "Markets", defaultWidth: 2, defaultConfig: { series: ["UNRATE", "ICSA", "CPIAUCSL", "VIXCLS", "GOLDAMGBD228NLBM", "DCOILWTICO"] },
    tags: ["macro", "economics"], color: "accent-emerald", popularity: 4,
  },
  {
    type: "options", name: "Put/Call Ratio", description: "Options sentiment",
    longDescription: "CBOE equity put/call ratio. Values above 1.0 bearish, below 0.7 bullish.",
    category: "Markets", defaultWidth: 1, defaultConfig: { view: "pcr" },
    tags: ["options", "sentiment"], color: "accent-amber", popularity: 3,
  },
  {
    type: "risk", name: "Portfolio Risk", description: "VaR, Sharpe, drawdown",
    longDescription: "Portfolio risk analytics including Value at Risk, Sharpe ratio, and maximum drawdown.",
    category: "Analytics", defaultWidth: 1, defaultConfig: { view: "var" },
    tags: ["risk", "var"], color: "accent-rose", popularity: 3,
  },
  {
    type: "calendar", name: "Calendar", description: "Hebrew, Islamic & economic",
    longDescription: "Multi-calendar view combining Hebrew, Islamic, and economic events with market significance ratings.",
    category: "Intelligence", defaultWidth: 1, defaultConfig: {},
    tags: ["calendar", "events"], color: "accent-emerald", popularity: 3,
  },
  // Tier 1 - Institutional
  {
    type: "credit_stress", name: "Credit Stress Monitor", description: "HY & IG OAS spreads",
    longDescription: "Track high-yield and investment-grade credit spreads with stress regime classification. Early warning for credit market dislocation.",
    category: "Analytics", defaultWidth: 1, defaultConfig: {},
    tags: ["credit", "spreads", "institutional", "risk"], color: "accent-rose", popularity: 5,
  },
  {
    type: "liquidity", name: "Dollar Liquidity Index", description: "Net liquidity tracker",
    longDescription: "Net dollar liquidity derived from Fed balance sheet minus reverse repo facility. Tracks M2 money supply and liquidity regime.",
    category: "Analytics", defaultWidth: 1, defaultConfig: {},
    tags: ["liquidity", "fed", "institutional", "macro"], color: "accent-cyan", popularity: 5,
  },
  {
    type: "inflation_pulse", name: "Inflation Pulse", description: "Breakeven inflation rates",
    longDescription: "5Y and 10Y breakeven inflation rates with trend analysis. Monitors real-time inflation expectations and spread dynamics.",
    category: "Analytics", defaultWidth: 1, defaultConfig: {},
    tags: ["inflation", "rates", "institutional", "macro"], color: "accent-amber", popularity: 5,
  },
  {
    type: "vol_term", name: "Volatility Regime", description: "VIX fear gauge with regime",
    longDescription: "VIX with regime classification (Crisis/Fear/Elevated/Normal/Complacent), fear gauge bar, and historical sparkline.",
    category: "Analytics", defaultWidth: 1, defaultConfig: {},
    tags: ["volatility", "vix", "institutional", "risk"], color: "accent-rose", popularity: 5,
  },
  // Tier 2
  {
    type: "currency_stress", name: "Currency Stress", description: "Dollar, EUR, JPY, CNY",
    longDescription: "Trade-weighted dollar index with major FX pairs. Dollar strength/weakness regime and directional signals.",
    category: "Markets", defaultWidth: 1, defaultConfig: {},
    tags: ["fx", "currency", "institutional", "macro"], color: "accent-cyan", popularity: 4,
  },
  {
    type: "labor_market", name: "Labor Market Pulse", description: "Claims, unemployment, payrolls",
    longDescription: "Initial claims, continuing claims, unemployment rate, and nonfarm payrolls with labor market health classification.",
    category: "Analytics", defaultWidth: 1, defaultConfig: {},
    tags: ["labor", "employment", "institutional", "macro"], color: "accent-emerald", popularity: 4,
  },
  {
    type: "commodities", name: "Commodity Complex", description: "Gold, oil, natural gas",
    longDescription: "Gold, WTI crude, Brent crude, and natural gas with price changes and sparkline charts.",
    category: "Markets", defaultWidth: 1, defaultConfig: {},
    tags: ["commodities", "gold", "oil", "institutional"], color: "accent-amber", popularity: 4,
  },
  // Tier 3
  {
    type: "housing_consumer", name: "Housing & Consumer", description: "Starts, sentiment, retail",
    longDescription: "Housing starts, consumer sentiment index, and retail sales. Consumer health pulse for macro regime assessment.",
    category: "Analytics", defaultWidth: 1, defaultConfig: {},
    tags: ["housing", "consumer", "institutional", "macro"], color: "accent-emerald", popularity: 3,
  },
  {
    type: "gdp_nowcast", name: "GDP Nowcast", description: "Real GDP growth regime",
    longDescription: "Real GDP quarter-over-quarter growth with regime classification (Contraction/Stall/Below Trend/Above Trend) and industrial production.",
    category: "Analytics", defaultWidth: 1, defaultConfig: {},
    tags: ["gdp", "growth", "institutional", "macro"], color: "accent-cyan", popularity: 3,
  },
  // AI
  {
    type: "ai_progression", name: "AI Progression Tracker", description: "Remote Labor Index, METR horizons, sector risk",
    longDescription: "Tracks AI automation capability via the Remote Labor Index (remotelabor.ai), METR task-completion time horizons, AI 2027 scenario milestones, labor displacement indicators, and sector-level automation risk. Key indicator for unemployment and workforce disruption.",
    category: "AI", defaultWidth: 2, defaultConfig: {},
    tags: ["ai", "labor", "automation", "unemployment", "sectors", "rli"], color: "accent-cyan", popularity: 5,
  },
];

// ── Component ──

export default function DashboardPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [subPicker, setSubPicker] = useState<{ type: string; name: string; description: string; defaultWidth: number; defaultConfig: Record<string, unknown> } | null>(null);
  const [chartSymbol, setChartSymbol] = useState("SPY");

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

  // ── Picker handlers ──

  function handlePickWidget(widget: typeof AVAILABLE_WIDGETS[number]) {
    if (widget.type === "metric") {
      setSubPicker({ ...widget, defaultConfig: widget.defaultConfig as Record<string, unknown> });
      return;
    }
    if (widget.type === "chart") {
      setSubPicker({ ...widget, defaultConfig: widget.defaultConfig as Record<string, unknown> });
      setChartSymbol("SPY");
      return;
    }
    addWidget(widget.type, widget.name, widget.defaultConfig as Record<string, unknown>, widget.defaultWidth);
    setPickerOpen(false);
  }

  function handleMetricSelect(metric: string, label: string) {
    addWidget("metric", label, { metric }, 1);
    setSubPicker(null);
    setPickerOpen(false);
  }

  function handleChartConfirm() {
    const sym = chartSymbol.trim().toUpperCase() || "SPY";
    addWidget("chart", sym, { symbol: sym, range: "3m" }, 2);
    setSubPicker(null);
    setPickerOpen(false);
  }

  function handleMarketplaceInstall(item: MarketplaceItem) {
    addWidget(item.type, item.name, item.defaultConfig, item.defaultWidth);
    setMarketplaceOpen(false);
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
            <>
              <button
                onClick={() => setPickerOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add Widget
              </button>
              <button
                onClick={resetWidgets}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded border border-navy-700/40 text-navy-400 hover:text-navy-200 hover:border-navy-600/40 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </>
          )}
          <button
            onClick={() => setMarketplaceOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded border border-navy-700/40 text-navy-400 hover:text-navy-200 hover:border-navy-600/40 transition-colors"
          >
            <Store className="h-3 w-3" />
            Marketplace
          </button>
          <button
            onClick={() => {
              setEditMode(!editMode);
              setPickerOpen(false);
              setSubPicker(null);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded border transition-colors ${
              editMode
                ? "border-accent-amber/40 bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20"
                : "border-navy-700/40 text-navy-400 hover:text-navy-200 hover:border-navy-600/40"
            }`}
          >
            <Pencil className="h-3 w-3" />
            {editMode ? "Done" : "Edit"}
          </button>
        </div>
      }
    >
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
              className={`${colSpan} relative transition-all duration-200 ${
                isDragging ? "opacity-30 scale-[0.97]" : ""
              } ${isDragOver ? "before:absolute before:inset-0 before:rounded-md before:border-2 before:border-accent-cyan/40 before:pointer-events-none before:z-10" : ""}`}
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
              {/* Drag handle - only in edit mode */}
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
            onClick={() => { setEditMode(true); setPickerOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
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

      {/* ── Add Widget Picker Modal ── */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 border border-navy-700/40 rounded-lg bg-navy-900 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-navy-700/30">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-navy-300">
                {subPicker ? subPicker.name : "Add Widget"}
              </h2>
              <button onClick={() => { setPickerOpen(false); setSubPicker(null); }} className="text-navy-500 hover:text-navy-200 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              {subPicker?.type === "metric" ? (
                <div className="space-y-2">
                  <p className="text-[10px] text-navy-500 uppercase tracking-wider mb-3">Select metric</p>
                  {METRIC_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleMetricSelect(opt.value, opt.label)}
                      className="w-full text-left px-3 py-2.5 rounded border border-navy-700/30 bg-navy-800/40 hover:bg-navy-800/80 hover:border-navy-600/40 transition-colors"
                    >
                      <span className="text-sm text-navy-200">{opt.label}</span>
                    </button>
                  ))}
                  <button onClick={() => setSubPicker(null)} className="mt-2 text-[10px] text-navy-500 hover:text-navy-300 transition-colors">
                    Back to widgets
                  </button>
                </div>
              ) : subPicker?.type === "chart" ? (
                <div className="space-y-4">
                  <p className="text-[10px] text-navy-500 uppercase tracking-wider">Enter ticker symbol</p>
                  <input
                    type="text"
                    value={chartSymbol}
                    onChange={(e) => setChartSymbol(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleChartConfirm()}
                    placeholder="SPY"
                    className="w-full px-3 py-2 rounded border border-navy-700/40 bg-navy-800/60 text-sm text-navy-100 font-mono placeholder:text-navy-600 focus:outline-none focus:border-accent-cyan/40"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button onClick={handleChartConfirm} className="px-4 py-2 text-xs font-mono uppercase tracking-wider rounded border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 transition-colors">
                      Add Chart
                    </button>
                    <button onClick={() => setSubPicker(null)} className="text-[10px] text-navy-500 hover:text-navy-300 transition-colors">Back</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {AVAILABLE_WIDGETS.map((w) => (
                    <button
                      key={w.type}
                      onClick={() => handlePickWidget(w)}
                      className="w-full text-left px-4 py-3 rounded border border-navy-700/30 bg-navy-800/40 hover:bg-navy-800/80 hover:border-navy-600/40 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-navy-200 group-hover:text-navy-100">{w.name}</span>
                          <p className="text-[10px] text-navy-500 mt-0.5">{w.description}</p>
                        </div>
                        <span className="text-[9px] font-mono text-navy-600 border border-navy-700/30 rounded px-1.5 py-0.5">
                          {w.defaultWidth === 3 ? "full" : w.defaultWidth === 2 ? "2/3" : "1/3"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Widget Marketplace Modal ── */}
      {marketplaceOpen && (
        <MarketplaceModal
          onClose={() => setMarketplaceOpen(false)}
          onInstall={handleMarketplaceInstall}
          installedTypes={widgets.map((w) => {
            try { const c = JSON.parse(w.config); return `${w.widgetType}:${c.metric || ""}`; } catch { return w.widgetType; }
          })}
        />
      )}
    </PageContainer>
  );
}

// ── Marketplace Modal ──

function MarketplaceModal({
  onClose,
  onInstall,
  installedTypes,
}: {
  onClose: () => void;
  onInstall: (item: MarketplaceItem) => void;
  installedTypes: string[];
}) {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState("");

  const filtered = MARKETPLACE_ITEMS.filter((item) => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesSearch = search === "" ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some((t) => t.includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  function isInstalled(item: MarketplaceItem) {
    const key = item.type === "metric"
      ? `metric:${(item.defaultConfig as { metric?: string }).metric || ""}`
      : item.type;
    return installedTypes.includes(key);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl mx-4 max-h-[85vh] border border-navy-700/40 rounded-lg bg-navy-900 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700/30 shrink-0">
          <div className="flex items-center gap-3">
            <Store className="h-4 w-4 text-accent-cyan" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-navy-200">Widget Marketplace</h2>
          </div>
          <button onClick={onClose} className="text-navy-500 hover:text-navy-200 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-navy-700/20 shrink-0">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search widgets..."
              className="flex-1 px-3 py-1.5 rounded border border-navy-700/40 bg-navy-800/60 text-xs text-navy-100 font-mono placeholder:text-navy-600 focus:outline-none focus:border-accent-cyan/40"
            />
            <div className="flex items-center gap-1">
              {MARKETPLACE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition-colors ${
                    activeCategory === cat
                      ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20"
                      : "text-navy-500 hover:text-navy-300 border border-transparent"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => {
              const installed = isInstalled(item);
              return (
                <div key={`${item.type}-${item.name}`} className="border border-navy-700/30 rounded-lg bg-navy-800/30 hover:bg-navy-800/50 hover:border-navy-600/40 transition-all duration-300 flex flex-col">
                  <div className={`h-1 rounded-t-lg bg-${item.color}/30`} />
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-bold text-navy-100">{item.name}</h3>
                        <span className="text-[9px] font-mono text-navy-500 uppercase tracking-wider">{item.category}</span>
                      </div>
                      <span className="text-[9px] font-mono text-navy-600 border border-navy-700/30 rounded px-1.5 py-0.5">
                        {item.defaultWidth === 3 ? "full" : item.defaultWidth === 2 ? "2/3" : "1/3"}
                      </span>
                    </div>
                    <p className="text-[11px] text-navy-400 leading-relaxed mb-3 flex-1">{item.longDescription}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.tags.map((tag) => (
                        <span key={tag} className="text-[9px] font-mono text-navy-500 bg-navy-800/60 rounded px-1.5 py-0.5">{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-navy-700/20">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className={`h-1 w-3 rounded-full ${i < item.popularity ? `bg-${item.color}/50` : "bg-navy-700/40"}`} />
                        ))}
                      </div>
                      <button
                        onClick={() => onInstall(item)}
                        disabled={installed}
                        className={`text-[10px] font-mono uppercase tracking-wider px-3 py-1 rounded transition-colors ${
                          installed
                            ? "border border-accent-emerald/20 text-accent-emerald/60 bg-accent-emerald/5 cursor-default"
                            : "border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20"
                        }`}
                      >
                        {installed ? "Added" : "Install"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-navy-500">No widgets match your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
