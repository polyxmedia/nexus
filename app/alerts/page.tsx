"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Bell,
  Plus,
  RefreshCw,
  Loader2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  AlertTriangle,
  Check,
  X,
  TrendingUp,
  Activity,
  Target,
  Search as SearchIcon,
  Gauge,
  Sparkles,
  Zap,
  ChevronRight,
  MessageSquare,
  Smartphone,
} from "lucide-react";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";

interface Alert {
  id: number;
  name: string;
  type: string;
  condition: string;
  enabled: number;
  lastTriggered: string | null;
  triggerCount: number;
  cooldownMinutes: number;
  notifyTelegram: number;
  notifySms: number;
  createdAt: string;
}

interface AlertHistoryItem {
  id: number;
  uid: string;
  alertId: number;
  triggeredAt: string;
  title: string;
  message: string;
  severity: number;
  data: string | null;
  dismissed: number;
}

interface AlertSuggestion {
  name: string;
  type: string;
  condition: Record<string, unknown>;
  cooldownMinutes: number;
  reasoning: string;
  urgency: "high" | "medium" | "low";
  relatedSignals: string[];
}

const ALERT_TYPES = [
  { value: "price_threshold", label: "Price Threshold", icon: TrendingUp, description: "Trigger when a ticker crosses a price level" },
  { value: "vix_level", label: "VIX Level", icon: Gauge, description: "Trigger when VIX exceeds a level" },
  { value: "signal_intensity", label: "Signal Intensity", icon: Activity, description: "Trigger on high-intensity signals" },
  { value: "prediction_due", label: "Prediction Due", icon: Target, description: "Alert when predictions approach deadline" },
  { value: "osint_keyword", label: "OSINT Keyword", icon: SearchIcon, description: "Monitor GDELT for keywords" },
];

const SEVERITY_BADGE = [
  "",
  "bg-navy-700 text-navy-300",
  "bg-accent-cyan/15 text-accent-cyan",
  "bg-accent-amber/15 text-accent-amber",
  "bg-accent-rose/15 text-accent-rose",
  "bg-signal-5/15 text-signal-5",
];

const URGENCY_STYLES = {
  high: "border-accent-rose/30 bg-accent-rose/[0.04]",
  medium: "border-accent-amber/30 bg-accent-amber/[0.04]",
  low: "border-navy-700 bg-navy-900/60",
};

const URGENCY_BADGE = {
  high: "bg-accent-rose/15 text-accent-rose",
  medium: "bg-accent-amber/15 text-accent-amber",
  low: "bg-navy-700 text-navy-400",
};

// Popular tickers for client-side autocomplete (no API call needed)
const TICKER_LIST: Array<[string, string]> = [
  // Major indices / ETFs
  ["SPY", "S&P 500 ETF"], ["QQQ", "Nasdaq 100 ETF"], ["DIA", "Dow Jones ETF"], ["IWM", "Russell 2000 ETF"],
  ["VTI", "Total Stock Market ETF"], ["VOO", "Vanguard S&P 500"], ["VXX", "VIX Short-Term Futures"],
  ["UVXY", "Ultra VIX Short-Term"], ["SQQQ", "UltraPro Short QQQ"], ["TQQQ", "UltraPro QQQ"],
  ["TLT", "20+ Year Treasury Bond"], ["HYG", "High Yield Corporate Bond"], ["LQD", "Investment Grade Bond"],
  ["GLD", "Gold ETF"], ["SLV", "Silver ETF"], ["USO", "Oil ETF"], ["UNG", "Natural Gas ETF"],
  ["XLE", "Energy Select Sector"], ["XLF", "Financial Select Sector"], ["XLK", "Technology Select Sector"],
  ["XLV", "Health Care Select Sector"], ["XLI", "Industrial Select Sector"], ["XLP", "Consumer Staples Sector"],
  ["XLY", "Consumer Discretionary Sector"], ["XLU", "Utilities Select Sector"], ["XLB", "Materials Select Sector"],
  ["XLRE", "Real Estate Select Sector"], ["XLC", "Communication Services Sector"],
  ["EEM", "Emerging Markets ETF"], ["EFA", "EAFE ETF"], ["FXI", "China Large-Cap ETF"],
  ["EWJ", "Japan ETF"], ["EWZ", "Brazil ETF"], ["EWG", "Germany ETF"], ["EWU", "United Kingdom ETF"],
  ["ARKK", "ARK Innovation ETF"], ["ARKG", "ARK Genomic Revolution"],
  ["SMH", "Semiconductor ETF"], ["SOXX", "Semiconductor Index ETF"], ["ITA", "Aerospace & Defense ETF"],
  ["KWEB", "China Internet ETF"], ["BITO", "Bitcoin ETF"],
  // Mega caps
  ["AAPL", "Apple"], ["MSFT", "Microsoft"], ["GOOGL", "Alphabet (Google)"], ["GOOG", "Alphabet Class C"],
  ["AMZN", "Amazon"], ["NVDA", "NVIDIA"], ["META", "Meta Platforms"], ["TSLA", "Tesla"],
  ["BRK.B", "Berkshire Hathaway B"], ["JPM", "JPMorgan Chase"], ["V", "Visa"],
  ["UNH", "UnitedHealth Group"], ["MA", "Mastercard"], ["JNJ", "Johnson & Johnson"],
  ["XOM", "Exxon Mobil"], ["PG", "Procter & Gamble"], ["HD", "Home Depot"],
  ["CVX", "Chevron"], ["LLY", "Eli Lilly"], ["ABBV", "AbbVie"], ["MRK", "Merck"],
  ["AVGO", "Broadcom"], ["KO", "Coca-Cola"], ["PEP", "PepsiCo"], ["COST", "Costco"],
  ["WMT", "Walmart"], ["TMO", "Thermo Fisher"], ["ADBE", "Adobe"], ["CRM", "Salesforce"],
  ["NFLX", "Netflix"], ["AMD", "AMD"], ["INTC", "Intel"], ["QCOM", "Qualcomm"],
  ["TXN", "Texas Instruments"], ["ORCL", "Oracle"], ["IBM", "IBM"],
  // Financials
  ["BAC", "Bank of America"], ["WFC", "Wells Fargo"], ["GS", "Goldman Sachs"], ["MS", "Morgan Stanley"],
  ["C", "Citigroup"], ["SCHW", "Charles Schwab"], ["BLK", "BlackRock"], ["AXP", "American Express"],
  // Defense / Geo
  ["LMT", "Lockheed Martin"], ["RTX", "RTX (Raytheon)"], ["BA", "Boeing"], ["NOC", "Northrop Grumman"],
  ["GD", "General Dynamics"], ["GE", "GE Aerospace"],
  // Energy
  ["COP", "ConocoPhillips"], ["SLB", "Schlumberger"], ["OXY", "Occidental Petroleum"],
  ["MPC", "Marathon Petroleum"], ["PSX", "Phillips 66"], ["VLO", "Valero Energy"],
  // Other notable
  ["DIS", "Walt Disney"], ["NKE", "Nike"], ["SBUX", "Starbucks"], ["MCD", "McDonald's"],
  ["CAT", "Caterpillar"], ["DE", "Deere & Co"], ["UPS", "UPS"], ["FDX", "FedEx"],
  ["F", "Ford Motor"], ["GM", "General Motors"], ["RIVN", "Rivian"], ["LCID", "Lucid Group"],
  ["COIN", "Coinbase"], ["SQ", "Block (Square)"], ["PYPL", "PayPal"], ["SHOP", "Shopify"],
  ["SNOW", "Snowflake"], ["PLTR", "Palantir"], ["NET", "Cloudflare"], ["CRWD", "CrowdStrike"],
  ["ZS", "Zscaler"], ["PANW", "Palo Alto Networks"], ["DDOG", "Datadog"], ["MDB", "MongoDB"],
  ["U", "Unity Software"], ["RBLX", "Roblox"], ["ABNB", "Airbnb"], ["UBER", "Uber"],
  ["LYFT", "Lyft"], ["DASH", "DoorDash"], ["SNAP", "Snap"], ["PINS", "Pinterest"],
  ["TTD", "The Trade Desk"], ["ROKU", "Roku"], ["SE", "Sea Limited"],
  ["BABA", "Alibaba"], ["JD", "JD.com"], ["PDD", "PDD Holdings"], ["NIO", "NIO"],
  ["TSM", "Taiwan Semiconductor"], ["ASML", "ASML Holdings"], ["SMCI", "Super Micro Computer"],
  ["ARM", "Arm Holdings"], ["MRVL", "Marvell Technology"], ["MU", "Micron Technology"],
  ["LRCX", "Lam Research"], ["AMAT", "Applied Materials"], ["KLAC", "KLA Corporation"],
  // Crypto
  ["BTC", "Bitcoin"], ["ETH", "Ethereum"], ["XRP", "XRP"], ["SOL", "Solana"],
  ["ADA", "Cardano"], ["DOGE", "Dogecoin"], ["DOT", "Polkadot"], ["AVAX", "Avalanche"],
  ["MATIC", "Polygon"], ["LINK", "Chainlink"], ["BNB", "BNB"], ["LTC", "Litecoin"],
];

function TickerAutocomplete({
  value,
  onChange,
}: {
  value: string;
  onChange: (ticker: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => { setQuery(value); }, [value]);

  const filtered = query.length > 0
    ? TICKER_LIST.filter(([sym, name]) => {
        const q = query.toUpperCase();
        return sym.startsWith(q) || name.toUpperCase().includes(q);
      }).slice(0, 8)
    : [];

  function handleInput(val: string) {
    const upper = val.toUpperCase();
    setQuery(upper);
    onChange(upper);
    setOpen(true);
  }

  function select(symbol: string) {
    setQuery(symbol);
    onChange(symbol);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => query.length > 0 && setOpen(true)}
        placeholder="SPY"
        className="w-full bg-navy-800 border border-navy-700 rounded px-2 py-1.5 text-xs text-navy-200 outline-none focus:border-accent-cyan/50"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-[60] top-full left-0 right-0 mt-1 bg-navy-800 border border-navy-700 rounded shadow-xl max-h-48 overflow-y-auto">
          {filtered.map(([sym, name]) => (
            <button
              key={sym}
              type="button"
              onClick={() => select(sym)}
              className="w-full text-left px-2.5 py-1.5 hover:bg-navy-700/60 transition-colors flex items-center justify-between gap-2"
            >
              <div className="min-w-0 flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-navy-100">{sym}</span>
                <span className="text-[10px] text-navy-500 truncate">{name}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function safeParse(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

export default function AlertsPage() {
  return (
    <Suspense fallback={null}>
      <AlertsPageInner />
    </Suspense>
  );
}

function AlertsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<AlertSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"rules" | "history">("rules");
  const [addingIdx, setAddingIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("signal_intensity");
  const [newCooldown, setNewCooldown] = useState(60);
  const [newCondition, setNewCondition] = useState<Record<string, unknown>>({});
  const [newNotifyTelegram, setNewNotifyTelegram] = useState(false);
  const [newNotifySms, setNewNotifySms] = useState(false);

  // Handle prefill from timeline "Create Alert" action
  useEffect(() => {
    const prefill = searchParams.get("prefill");
    if (prefill) {
      try {
        const data = JSON.parse(prefill);
        if (data.name) setNewName(data.name);
        if (data.type) setNewType(data.type);
        if (data.condition) setNewCondition(data.condition);
        if (data.cooldownMinutes) setNewCooldown(data.cooldownMinutes);
        setShowCreate(true);
      } catch { /* invalid prefill */ }
    }
  }, [searchParams]);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [alertsRes, historyRes] = await Promise.all([
        fetch("/api/alerts"),
        fetch("/api/alerts?view=history"),
      ]);
      if (!alertsRes.ok) {
        const data = await alertsRes.json().catch(() => ({}));
        setError(data.error || "Failed to load alerts");
        setLoading(false);
        return;
      }
      const alertsJson = await alertsRes.json();
      const historyJson = await historyRes.json();
      setAlerts(alertsJson.alerts || []);
      setHistory(historyJson.history || []);
      setError(null);
    } catch {
      // fail
    }
    setLoading(false);
  }, []);

  const fetchSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/alerts/suggestions");
      const json = await res.json();
      setSuggestions(json.suggestions || []);
    } catch {
      // fail
    }
    setLoadingSuggestions(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
    fetchSuggestions();
  }, [fetchAlerts, fetchSuggestions]);

  const evaluateNow = async () => {
    setEvaluating(true);
    try {
      await fetch("/api/alerts?action=evaluate", { method: "POST" });
      await fetchAlerts();
    } catch {
      // fail
    }
    setEvaluating(false);
  };

  const createAlert = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          type: newType,
          condition: newCondition,
          cooldownMinutes: newCooldown,
          notifyTelegram: newNotifyTelegram ? 1 : 0,
          notifySms: newNotifySms ? 1 : 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create alert");
        return;
      }
      setShowCreate(false);
      setNewName("");
      setNewCondition({});
      setNewNotifyTelegram(false);
      setNewNotifySms(false);
      setError(null);
      await fetchAlerts();
    } catch {
      setError("Network error creating alert");
    }
  };

  const addSuggestion = async (suggestion: AlertSuggestion, idx: number) => {
    setAddingIdx(idx);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: suggestion.name,
          type: suggestion.type,
          condition: suggestion.condition,
          cooldownMinutes: suggestion.cooldownMinutes,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to add alert");
        setAddingIdx(null);
        return;
      }
      setSuggestions((prev) => prev.filter((_, i) => i !== idx));
      setError(null);
      await fetchAlerts();
    } catch {
      setError("Network error adding alert");
    }
    setAddingIdx(null);
  };

  const toggleAlert = async (alert: Alert) => {
    try {
      await fetch("/api/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alert.id, enabled: alert.enabled ? 0 : 1 }),
      });
      await fetchAlerts();
    } catch {
      // fail
    }
  };

  const removeAlert = async (id: number) => {
    try {
      await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
      await fetchAlerts();
    } catch {
      // fail
    }
  };

  const dismissHistoryItem = async (id: number) => {
    try {
      await fetch("/api/alerts?action=dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await fetchAlerts();
    } catch {
      // fail
    }
  };

  const undismissedCount = history.filter(h => !h.dismissed).length;

  // Render condition fields based on type
  function renderConditionFields() {
    switch (newType) {
      case "price_threshold":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider">Ticker</label>
              <div className="mt-1">
                <TickerAutocomplete
                  value={(newCondition.ticker as string) || ""}
                  onChange={(ticker) => setNewCondition(c => ({ ...c, ticker }))}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider">Direction</label>
              <select
                value={(newCondition.direction as string) || "above"}
                onChange={(e) => setNewCondition(c => ({ ...c, direction: e.target.value }))}
                className="mt-1 w-full bg-navy-800 border border-navy-700 rounded px-2 py-1.5 text-xs text-navy-200 outline-none"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-navy-500 uppercase tracking-wider">Price</label>
              <input
                type="number"
                value={(newCondition.threshold as number) || ""}
                onChange={(e) => setNewCondition(c => ({ ...c, threshold: parseFloat(e.target.value) }))}
                placeholder="500.00"
                className="mt-1 w-full bg-navy-800 border border-navy-700 rounded px-2 py-1.5 text-xs text-navy-200 outline-none"
              />
            </div>
          </div>
        );
      case "vix_level":
        return (
          <div>
            <label className="text-[10px] text-navy-500 uppercase tracking-wider">VIX Threshold</label>
            <input
              type="number"
              value={(newCondition.vixLevel as number) || ""}
              onChange={(e) => setNewCondition(c => ({ ...c, vixLevel: parseFloat(e.target.value) }))}
              placeholder="25"
              className="mt-1 w-48 bg-navy-800 border border-navy-700 rounded px-2 py-1.5 text-xs text-navy-200 outline-none"
            />
          </div>
        );
      case "signal_intensity":
        return (
          <div>
            <label className="text-[10px] text-navy-500 uppercase tracking-wider">Min Intensity (1-5)</label>
            <input
              type="number"
              min={1}
              max={5}
              value={(newCondition.minIntensity as number) || 4}
              onChange={(e) => setNewCondition(c => ({ ...c, minIntensity: parseInt(e.target.value) }))}
              className="mt-1 w-48 bg-navy-800 border border-navy-700 rounded px-2 py-1.5 text-xs text-navy-200 outline-none"
            />
          </div>
        );
      case "prediction_due":
        return (
          <div>
            <label className="text-[10px] text-navy-500 uppercase tracking-wider">Days before deadline</label>
            <input
              type="number"
              value={(newCondition.daysBeforeDeadline as number) || 3}
              onChange={(e) => setNewCondition(c => ({ ...c, daysBeforeDeadline: parseInt(e.target.value) }))}
              className="mt-1 w-48 bg-navy-800 border border-navy-700 rounded px-2 py-1.5 text-xs text-navy-200 outline-none"
            />
          </div>
        );
      case "osint_keyword":
        return (
          <div>
            <label className="text-[10px] text-navy-500 uppercase tracking-wider">Keywords (comma-separated)</label>
            <input
              type="text"
              value={((newCondition.keywords as string[]) || []).join(", ")}
              onChange={(e) => setNewCondition(c => ({ ...c, keywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean) }))}
              placeholder="nuclear, sanctions, OPEC"
              className="mt-1 w-full bg-navy-800 border border-navy-700 rounded px-2 py-1.5 text-xs text-navy-200 outline-none"
            />
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="ml-0 md:ml-48 min-h-screen bg-navy-950 pt-12 md:pt-0">
      <UpgradeGate minTier="analyst" feature="Alert configuration">
      {/* Header */}
      <div className="border-b border-navy-700 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-5 w-5 text-accent-cyan" />
            {undismissedCount > 0 && (
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent-rose text-white text-[8px] flex items-center justify-center font-bold">
                {undismissedCount}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-sm font-bold text-navy-100 tracking-wide">Alerts</h1>
            <p className="text-[10px] text-navy-500 uppercase tracking-wider">
              {alerts.length} rules, {history.length} triggered
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={evaluateNow}
            disabled={evaluating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-amber/10 border border-accent-amber/30 text-xs text-accent-amber hover:bg-accent-amber/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${evaluating ? "animate-spin" : ""}`} />
            Evaluate Now
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-navy-100 text-navy-950 text-xs font-medium hover:bg-white transition-colors"
          >
            <Plus className="h-3 w-3" />
            New Alert
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-3 px-3 py-2 rounded-md border border-accent-rose/30 bg-accent-rose/5 text-[11px] font-mono text-accent-rose flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-accent-rose/60 hover:text-accent-rose ml-3">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Suggested Alerts */}
      <div className="px-6 pt-5 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-amber" />
            <h2 className="text-xs font-bold text-navy-200 uppercase tracking-wider">
              AI Suggested Alerts
            </h2>
            {suggestions.length > 0 && (
              <span className="text-[9px] font-mono text-navy-500 bg-navy-800 px-1.5 py-0.5 rounded">
                {suggestions.length} suggestions
              </span>
            )}
          </div>
          <button
            onClick={fetchSuggestions}
            disabled={loadingSuggestions}
            className="flex items-center gap-1.5 text-[10px] text-navy-500 hover:text-navy-300 transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loadingSuggestions ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loadingSuggestions && suggestions.length === 0 ? (
          <div className="flex items-center justify-center py-10 gap-2 text-navy-500 text-xs border border-navy-800/50 rounded-lg bg-navy-900/30">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing signals and generating suggestions...
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-6 border border-navy-800/50 rounded-lg bg-navy-900/30">
            <Sparkles className="h-5 w-5 text-navy-700 mx-auto mb-2" />
            <p className="text-[11px] text-navy-500">No suggestions right now. Click refresh to generate based on current signals.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {suggestions.map((suggestion, idx) => {
              const typeConfig = ALERT_TYPES.find(t => t.value === suggestion.type);
              const Icon = typeConfig?.icon || Bell;
              const isAdding = addingIdx === idx;

              return (
                <div
                  key={idx}
                  className={`border rounded-lg p-3.5 transition-all ${URGENCY_STYLES[suggestion.urgency]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="mt-0.5 shrink-0">
                        <Icon className="h-3.5 w-3.5 text-accent-cyan" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xs font-semibold text-navy-100">{suggestion.name}</h3>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${URGENCY_BADGE[suggestion.urgency]}`}>
                            {suggestion.urgency}
                          </span>
                        </div>
                        <p className="text-[10px] text-navy-400 mt-1 leading-relaxed">
                          {suggestion.reasoning}
                        </p>
                        {suggestion.relatedSignals && suggestion.relatedSignals.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            <Zap className="h-2.5 w-2.5 text-navy-600 shrink-0" />
                            {suggestion.relatedSignals.slice(0, 2).map((sig, i) => (
                              <span key={i} className="text-[8px] font-mono text-navy-500 bg-navy-800/60 px-1.5 py-0.5 rounded truncate max-w-[180px]">
                                {sig}
                              </span>
                            ))}
                            {suggestion.relatedSignals.length > 2 && (
                              <span className="text-[8px] text-navy-600">+{suggestion.relatedSignals.length - 2}</span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[9px] font-mono text-navy-500">{typeConfig?.label || suggestion.type}</span>
                          <span className="text-[9px] font-mono text-navy-600">Cooldown: {suggestion.cooldownMinutes}min</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => addSuggestion(suggestion, idx)}
                      disabled={isAdding}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded bg-navy-100 text-navy-950 text-[10px] font-mono font-medium hover:bg-white transition-colors disabled:opacity-50"
                    >
                      {isAdding ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-3 w-3" />
                          Add
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="px-6 py-2">
        <div className="border-t border-navy-800/50" />
      </div>

      {/* Tabs */}
      <div className="px-6 flex gap-4 border-b border-navy-800">
        <button
          onClick={() => setTab("rules")}
          className={`pb-3 text-xs font-medium border-b-2 transition-colors ${
            tab === "rules"
              ? "border-accent-cyan text-accent-cyan"
              : "border-transparent text-navy-500 hover:text-navy-300"
          }`}
        >
          Alert Rules ({alerts.length})
        </button>
        <button
          onClick={() => setTab("history")}
          className={`pb-3 text-xs font-medium border-b-2 transition-colors relative ${
            tab === "history"
              ? "border-accent-cyan text-accent-cyan"
              : "border-transparent text-navy-500 hover:text-navy-300"
          }`}
        >
          History ({history.length})
          {undismissedCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[9px] rounded-full bg-accent-rose/20 text-accent-rose">
              {undismissedCount}
            </span>
          )}
        </button>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-navy-500 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading alerts...
          </div>
        ) : tab === "rules" ? (
          /* Rules tab */
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-16">
                <Bell className="h-8 w-8 text-navy-700 mx-auto mb-3" />
                <p className="text-sm text-navy-500">No alert rules configured</p>
                <p className="text-[10px] text-navy-600 mt-1">Create one to start monitoring, or add a suggestion above</p>
              </div>
            ) : (
              alerts.map((alert) => {
                const condition = safeParse(alert.condition);
                const typeConfig = ALERT_TYPES.find(t => t.value === alert.type);
                const Icon = typeConfig?.icon || Bell;

                return (
                  <div
                    key={alert.id}
                    className={`border rounded-lg px-4 py-3 transition-colors ${
                      alert.enabled
                        ? "border-navy-700 bg-navy-900/60"
                        : "border-navy-800 bg-navy-900/30 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-accent-cyan" />
                        <div>
                          <h3 className="text-xs font-semibold text-navy-100">{alert.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-navy-500 uppercase">{typeConfig?.label || alert.type}</span>
                            <span className="text-[9px] text-navy-600">
                              Cooldown: {alert.cooldownMinutes}min
                            </span>
                            {alert.notifyTelegram ? (
                              <span className="text-[9px] text-accent-cyan flex items-center gap-0.5">
                                <MessageSquare className="h-2.5 w-2.5" /> TG
                              </span>
                            ) : null}
                            {alert.notifySms ? (
                              <span className="text-[9px] text-accent-cyan flex items-center gap-0.5">
                                <Smartphone className="h-2.5 w-2.5" /> SMS
                              </span>
                            ) : null}
                            {alert.triggerCount > 0 && (
                              <span className="text-[9px] text-accent-amber">
                                Triggered {alert.triggerCount}x
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {alert.lastTriggered && (
                          <span className="text-[9px] text-navy-600 font-mono">
                            Last: {new Date(alert.lastTriggered).toLocaleDateString()}
                          </span>
                        )}
                        <button
                          onClick={() => toggleAlert(alert)}
                          className="text-navy-500 hover:text-navy-300 transition-colors"
                        >
                          {alert.enabled ? (
                            <ToggleRight className="h-5 w-5 text-accent-emerald" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => removeAlert(alert.id)}
                          className="text-navy-600 hover:text-accent-rose transition-colors p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Condition summary */}
                    <div className="mt-2 text-[10px] text-navy-500 font-mono bg-navy-800/40 rounded px-2 py-1">
                      {Object.entries(condition).map(([k, v]) => (
                        <span key={k} className="mr-3">
                          {k}: <span className="text-navy-300">{String(v)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* History tab */
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-16">
                <Clock className="h-8 w-8 text-navy-700 mx-auto mb-3" />
                <p className="text-sm text-navy-500">No alert history</p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => router.push(`/alerts/${item.uid}`)}
                  className={`border rounded-lg px-4 py-3 transition-colors cursor-pointer hover:border-navy-600 ${
                    item.dismissed
                      ? "border-navy-800 bg-navy-900/30 opacity-50"
                      : "border-navy-700 bg-navy-900/60"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className="h-3.5 w-3.5 mt-0.5 shrink-0"
                        style={{ color: ["", "#64748b", "#06b6d4", "#f59e0b", "#f43f5e", "#ef4444"][item.severity] || "#64748b" }}
                      />
                      <div>
                        <h3 className="text-xs font-medium text-navy-100">{item.title}</h3>
                        <p className="text-[10px] text-navy-500 mt-0.5 line-clamp-1">{item.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] font-mono text-navy-600">
                            {new Date(item.triggeredAt).toLocaleString()}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${SEVERITY_BADGE[item.severity] || SEVERITY_BADGE[1]}`}>
                            Severity {item.severity}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!item.dismissed && (
                        <button
                          onClick={(e) => { e.stopPropagation(); dismissHistoryItem(item.id); }}
                          className="text-navy-600 hover:text-navy-300 transition-colors p-1"
                          title="Dismiss"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <ChevronRight className="h-3.5 w-3.5 text-navy-700" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Alert Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[500px] bg-navy-900 border border-navy-700 rounded-xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-navy-700">
              <h2 className="text-sm font-bold text-navy-100">Create Alert Rule</h2>
              <button onClick={() => setShowCreate(false)} className="text-navy-500 hover:text-navy-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Name */}
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="My alert rule..."
                  className="mt-1 w-full bg-navy-800 border border-navy-700 rounded px-3 py-2 text-xs text-navy-200 outline-none focus:border-accent-cyan/50"
                />
              </div>

              {/* Type */}
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider">Alert Type</label>
                <div className="grid grid-cols-1 gap-2 mt-1.5">
                  {ALERT_TYPES.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => { setNewType(type.value); setNewCondition({}); }}
                        className={`flex items-center gap-3 px-3 py-2 rounded border text-left transition-colors ${
                          newType === type.value
                            ? "border-accent-cyan/40 bg-accent-cyan/5"
                            : "border-navy-700 bg-navy-800/50 hover:border-navy-600"
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${newType === type.value ? "text-accent-cyan" : "text-navy-500"}`} />
                        <div>
                          <div className="text-xs text-navy-200">{type.label}</div>
                          <div className="text-[9px] text-navy-500">{type.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Condition fields */}
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider">Condition</label>
                <div className="mt-1.5">
                  {renderConditionFields()}
                </div>
              </div>

              {/* Notifications */}
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider mb-2 block">Notify via</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNewNotifyTelegram(!newNotifyTelegram)}
                    className={`flex items-center gap-2 px-3 py-2 rounded border text-xs transition-colors ${
                      newNotifyTelegram
                        ? "border-accent-cyan/40 bg-accent-cyan/5 text-accent-cyan"
                        : "border-navy-700 bg-navy-800/50 text-navy-500 hover:border-navy-600"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Telegram
                    {newNotifyTelegram ? <Check className="h-3 w-3" /> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewNotifySms(!newNotifySms)}
                    className={`flex items-center gap-2 px-3 py-2 rounded border text-xs transition-colors ${
                      newNotifySms
                        ? "border-accent-cyan/40 bg-accent-cyan/5 text-accent-cyan"
                        : "border-navy-700 bg-navy-800/50 text-navy-500 hover:border-navy-600"
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    SMS
                    {newNotifySms ? <Check className="h-3 w-3" /> : null}
                  </button>
                </div>
                <p className="text-[9px] text-navy-600 mt-1.5">Configure Telegram and SMS in Settings to receive notifications</p>
              </div>

              {/* Cooldown */}
              <div>
                <label className="text-[10px] text-navy-500 uppercase tracking-wider">Cooldown (minutes)</label>
                <input
                  type="number"
                  value={newCooldown}
                  onChange={(e) => setNewCooldown(parseInt(e.target.value) || 60)}
                  className="mt-1 w-32 bg-navy-800 border border-navy-700 rounded px-2 py-1.5 text-xs text-navy-200 outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="mx-5 px-3 py-2 rounded-md border border-accent-rose/30 bg-accent-rose/5 text-[11px] font-mono text-accent-rose">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-navy-700">
              <button
                onClick={() => { setShowCreate(false); setError(null); }}
                className="px-4 py-2 rounded text-xs text-navy-400 hover:text-navy-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createAlert}
                disabled={!newName.trim()}
                className="px-4 py-2 rounded bg-navy-100 text-navy-950 text-xs font-medium hover:bg-white transition-colors disabled:opacity-50"
              >
                Create Alert
              </button>
            </div>
          </div>
        </div>
      )}
      </UpgradeGate>
    </div>
  );
}
