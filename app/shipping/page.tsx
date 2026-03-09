"use client";

import { useState, useEffect, useRef } from "react";
import {
  Anchor,
  AlertTriangle,
  Bell,
  BellOff,
  Eye,
  RefreshCw,
  ExternalLink,
  Droplets,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Package,
  BarChart3,
  Search,
  X,
  Ship,
  Plus,
  Loader2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ───────────────────────────────────────────────────────────────────────

type ChokepointId = "hormuz" | "suez" | "malacca" | "mandeb" | "panama";
type ChokepointStatus = "normal" | "elevated" | "disrupted";
type AnomalySeverity = "low" | "medium" | "high" | "critical";

interface CommodityContext {
  name: string;
  globalShare: string;
}

interface FreightProxy {
  symbol: string;
  name: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
}

interface GdeltMaritimeEvent {
  title: string;
  url: string;
  source: string;
  date: string;
  relevance: number;
}

interface Chokepoint {
  id: ChokepointId;
  name: string;
  lat: number;
  lng: number;
  baselineDailyTransits: number;
  estimatedDailyTransits: number;
  transitDeltaPct: number;
  status: ChokepointStatus;
  riskFactors: string[];
  riskScore: number;
  commodities: CommodityContext[];
  annualTradeValue: string;
  recentArticles: GdeltMaritimeEvent[];
}

interface TrafficAnomaly {
  id: string;
  chokepoint: ChokepointId;
  chokepointName: string;
  type: string;
  severity: AnomalySeverity;
  detected: string;
  description: string;
}

interface DarkFleetAlert {
  id: string;
  description: string;
  source: string;
  confidence: number;
  commodities: string[];
  detected: string;
  chokepoint?: ChokepointId;
}

interface ShippingSnapshot {
  timestamp: string;
  chokepoints: Chokepoint[];
  anomalies: TrafficAnomaly[];
  darkFleetAlerts: DarkFleetAlert[];
  gdeltEvents: GdeltMaritimeEvent[];
  oilPrice: number | null;
  oilPriceChange: number | null;
  freightProxies: FreightProxy[];
  overallRiskScore: number;
}

interface WatchedVessel {
  mmsi: string;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  course: number;
  vesselType: string;
  flag: string;
  destination: string;
  lastUpdate: number;
}

interface VesselSearchResult {
  mmsi: string;
  name: string;
  type: string;
  flag: string;
}

// ── Style maps ──────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<ChokepointStatus, string> = {
  normal: "bg-navy-500",
  elevated: "bg-accent-amber",
  disrupted: "bg-accent-rose animate-pulse",
};

const STATUS_LABEL: Record<ChokepointStatus, string> = {
  normal: "Normal",
  elevated: "Elevated",
  disrupted: "Disrupted",
};

const STATUS_TEXT: Record<ChokepointStatus, string> = {
  normal: "text-navy-500",
  elevated: "text-accent-amber",
  disrupted: "text-accent-rose",
};

const STATUS_BORDER: Record<ChokepointStatus, string> = {
  normal: "border-navy-800/60",
  elevated: "border-accent-amber/30",
  disrupted: "border-accent-rose/40",
};

const SEVERITY_DOT: Record<AnomalySeverity, string> = {
  low: "bg-navy-500",
  medium: "bg-accent-amber",
  high: "bg-accent-rose",
  critical: "bg-accent-rose animate-pulse",
};

const SEVERITY_TEXT: Record<AnomalySeverity, string> = {
  low: "text-navy-400",
  medium: "text-accent-amber",
  high: "text-accent-rose",
  critical: "text-accent-rose",
};

// ── Helpers ─────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diffMins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const h = Math.floor(diffMins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function overallLabel(score: number): { label: string; color: string } {
  if (score >= 60) return { label: "HIGH RISK", color: "text-accent-rose" };
  if (score >= 30) return { label: "ELEVATED", color: "text-accent-amber" };
  return { label: "NORMAL", color: "text-accent-emerald" };
}

// ── Chokepoint Card ─────────────────────────────────────────────────────────────

function ChokepointCard({
  cp,
  subscribed,
  onToggleAlert,
}: {
  cp: Chokepoint;
  subscribed: boolean;
  onToggleAlert: (id: ChokepointId) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const pct = cp.estimatedDailyTransits / cp.baselineDailyTransits;
  const barColor = cp.status === "disrupted" ? "#f43f5e" : cp.status === "elevated" ? "#f59e0b" : "#10b981";

  return (
    <div className={`border rounded bg-navy-950/80 overflow-hidden transition-colors ${STATUS_BORDER[cp.status]}`}>
      {/* Header */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2.5">
          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${STATUS_DOT[cp.status]}`} />
          <span className="text-[10px] font-mono uppercase tracking-widest text-navy-300 truncate flex-1">
            {cp.name}
          </span>
          <span className={`text-[9px] font-mono uppercase tracking-wider ${STATUS_TEXT[cp.status]}`}>
            {STATUS_LABEL[cp.status]}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleAlert(cp.id); }}
            title={subscribed ? "Unsubscribe from alerts" : "Subscribe to alerts"}
            className={`p-0.5 rounded transition-colors ${subscribed ? "text-accent-amber hover:text-accent-amber/70" : "text-navy-700 hover:text-navy-500"}`}
          >
            {subscribed ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
          </button>
        </div>

        {/* Transit bar */}
        <div className="mb-2.5">
          <div className="flex items-baseline justify-between mb-1">
            <div className="flex items-baseline gap-1">
              <span className="font-mono font-light text-navy-100 text-xl tabular-nums">
                {cp.estimatedDailyTransits}
              </span>
              <span className="text-[9px] font-mono text-navy-600">/ {cp.baselineDailyTransits} baseline</span>
            </div>
            <span className={`font-mono text-[10px] tabular-nums ${cp.transitDeltaPct < 0 ? "text-accent-rose" : "text-navy-500"}`}>
              {cp.transitDeltaPct >= 0 ? "+" : ""}{cp.transitDeltaPct}%
            </span>
          </div>
          <div className="h-1 bg-navy-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(pct * 100, 100)}%`, backgroundColor: barColor }}
            />
          </div>
        </div>

        {/* Risk score */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider">Risk Score</span>
          <span className={`font-mono text-sm font-semibold tabular-nums ${STATUS_TEXT[cp.status]}`}>
            {cp.riskScore}
          </span>
        </div>

        {/* Trade value */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[9px] font-mono text-navy-600 uppercase tracking-wider">Annual Trade</span>
          <span className="font-mono text-[11px] text-navy-400">{cp.annualTradeValue}</span>
        </div>

        {/* Commodity chips */}
        <div className="flex flex-wrap gap-1 mb-2.5">
          {cp.commodities.map((c) => (
            <span
              key={c.name}
              className="text-[9px] font-mono text-navy-500 border border-navy-800/50 rounded px-1.5 py-0.5 flex items-center gap-1"
            >
              <Package className="h-2 w-2" />
              {c.name}
            </span>
          ))}
        </div>

        {/* Risk factors */}
        {cp.riskFactors.length > 0 && (
          <div className="space-y-0.5 mb-2">
            {cp.riskFactors.map((rf, i) => (
              <p key={i} className="text-[10px] font-mono text-navy-600 leading-relaxed flex items-start gap-1">
                <span className="text-navy-700 mt-0.5">›</span>
                {rf}
              </p>
            ))}
          </div>
        )}

        {/* Expand toggle */}
        {cp.recentArticles.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between pt-2 border-t border-navy-800/30 text-[9px] font-mono text-navy-600 hover:text-navy-400 transition-colors"
          >
            <span>{cp.recentArticles.length} related article{cp.recentArticles.length !== 1 ? "s" : ""}</span>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* Expandable articles */}
      {expanded && cp.recentArticles.length > 0 && (
        <div className="border-t border-navy-800/30 divide-y divide-navy-800/20">
          {cp.recentArticles.map((article, i) => (
            <a
              key={i}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2 px-3 py-2 hover:bg-navy-900/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono text-navy-400 group-hover:text-navy-200 transition-colors line-clamp-2 leading-relaxed">
                  {article.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-mono text-navy-700">{article.source}</span>
                  <span className="text-navy-800">·</span>
                  <span className="text-[9px] font-mono text-navy-700">{timeAgo(article.date)}</span>
                </div>
              </div>
              <ExternalLink className="h-2.5 w-2.5 text-navy-800 group-hover:text-navy-500 shrink-0 mt-0.5" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Freight proxy card ───────────────────────────────────────────────────────────

function FreightCard({ proxy }: { proxy: FreightProxy }) {
  const up = proxy.changePercent >= 0;
  return (
    <div className="border border-navy-800/60 rounded bg-navy-950/80 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-xs font-semibold text-navy-200">{proxy.symbol}</span>
        <span className="text-[9px] font-mono text-navy-600 border border-navy-800/40 rounded px-1.5 py-0.5">
          {proxy.label}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="font-mono text-lg font-light text-navy-100 tabular-nums">
          ${proxy.price.toFixed(2)}
        </span>
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-mono tabular-nums ${up ? "text-accent-emerald" : "text-accent-rose"}`}>
        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {up ? "+" : ""}{proxy.change.toFixed(2)} ({up ? "+" : ""}{proxy.changePercent.toFixed(2)}%)
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────────

export default function ShippingPage() {
  const [snapshot, setSnapshot] = useState<ShippingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Vessel watchlist
  const [watchlist, setWatchlist] = useState<WatchedVessel[]>([]);
  const [vesselSearch, setVesselSearch] = useState("");
  const [vesselResults, setVesselResults] = useState<VesselSearchResult[]>([]);
  const [searchingVessels, setSearchingVessels] = useState(false);
  const [addingVessel, setAddingVessel] = useState<string | null>(null);

  // Chokepoint alert subscriptions
  const [cpSubscriptions, setCpSubscriptions] = useState<ChokepointId[]>([]);

  async function fetchData() {
    try {
      const res = await fetch("/api/shipping");
      if (!res.ok) throw new Error("Failed to fetch");
      const data: ShippingSnapshot = await res.json();
      setSnapshot(data);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchWatchlist() {
    try {
      const res = await fetch("/api/shipping/watchlist");
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data.vessels || []);
      }
    } catch { /* silent */ }
  }

  async function fetchCpSubscriptions() {
    try {
      const res = await fetch("/api/shipping/chokepoint-alerts");
      if (res.ok) {
        const data = await res.json();
        setCpSubscriptions(data.chokepoints || []);
      }
    } catch { /* silent */ }
  }

  async function searchVessels(query: string) {
    if (query.length < 2) { setVesselResults([]); return; }
    setSearchingVessels(true);
    try {
      const res = await fetch(`/api/shipping/watchlist?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setVesselResults(data.results || []);
      }
    } catch { /* silent */ }
    setSearchingVessels(false);
  }

  async function addVessel(query: string) {
    setAddingVessel(query);
    try {
      const res = await fetch("/api/shipping/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (res.ok) {
        await fetchWatchlist();
        setVesselSearch("");
        setVesselResults([]);
      }
    } catch { /* silent */ }
    setAddingVessel(null);
  }

  async function removeVessel(mmsi: string) {
    try {
      await fetch("/api/shipping/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mmsi }),
      });
      setWatchlist((prev) => prev.filter((v) => v.mmsi !== mmsi));
    } catch { /* silent */ }
  }

  async function toggleCpAlert(cpId: ChokepointId) {
    const isSubscribed = cpSubscriptions.includes(cpId);
    try {
      if (isSubscribed) {
        await fetch("/api/shipping/chokepoint-alerts", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chokepoint: cpId }),
        });
        setCpSubscriptions((prev) => prev.filter((id) => id !== cpId));
      } else {
        await fetch("/api/shipping/chokepoint-alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chokepoint: cpId }),
        });
        setCpSubscriptions((prev) => [...prev, cpId]);
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchData();
    fetchWatchlist();
    fetchCpSubscriptions();
    intervalRef.current = setInterval(fetchData, 600_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    fetchData();
  }

  const oilLabel = snapshot?.oilPrice != null
    ? `WTI $${snapshot.oilPrice.toFixed(2)}${snapshot.oilPriceChange != null ? ` (${snapshot.oilPriceChange >= 0 ? "+" : ""}${snapshot.oilPriceChange.toFixed(1)}%)` : ""}`
    : null;

  const { label: riskLabel, color: riskColor } = snapshot
    ? overallLabel(snapshot.overallRiskScore)
    : { label: "—", color: "text-navy-500" };

  return (
    <PageContainer
      title="Shipping Intelligence"
      subtitle="Chokepoint monitoring, freight market signals, and dark fleet detection"
      actions={
        <div className="flex items-center gap-3">
          {oilLabel && (
            <span className="text-[10px] font-mono text-navy-500">
              <Droplets className="inline h-3 w-3 mr-1 opacity-50" />
              {oilLabel}
            </span>
          )}
          {snapshot && (
            <span className="text-[9px] font-mono text-navy-600">{timeAgo(snapshot.timestamp)}</span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono text-navy-500 hover:text-navy-300 hover:bg-navy-800/40 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      }
    >
      <UpgradeGate minTier="operator" feature="Shipping and dark fleet intelligence" blur>
      {loading ? (
        <LoadingSkeleton />
      ) : !snapshot ? (
        <div className="text-center py-20">
          <Anchor className="h-5 w-5 text-navy-700 mx-auto mb-3" />
          <p className="text-xs text-navy-500 font-mono">Unable to load shipping data</p>
        </div>
      ) : (
        <>
          {/* ── Global Risk Summary ── */}
          <div className="flex items-center gap-6 mb-6 px-4 py-3 border border-navy-800/60 rounded bg-navy-950/80">
            <div>
              <p className="text-[9px] font-mono uppercase tracking-wider text-navy-600 mb-0.5">System Status</p>
              <p className={`font-mono text-sm font-semibold ${riskColor}`}>{riskLabel}</p>
            </div>
            <div className="w-px h-8 bg-navy-800" />
            <div>
              <p className="text-[9px] font-mono uppercase tracking-wider text-navy-600 mb-0.5">Overall Risk Score</p>
              <p className={`font-mono text-sm font-semibold tabular-nums ${riskColor}`}>{snapshot.overallRiskScore} / 100</p>
            </div>
            <div className="w-px h-8 bg-navy-800" />
            <div>
              <p className="text-[9px] font-mono uppercase tracking-wider text-navy-600 mb-0.5">Anomalies</p>
              <p className="font-mono text-sm text-navy-200">{snapshot.anomalies.length}</p>
            </div>
            <div className="w-px h-8 bg-navy-800" />
            <div>
              <p className="text-[9px] font-mono uppercase tracking-wider text-navy-600 mb-0.5">Dark Fleet Alerts</p>
              <p className="font-mono text-sm text-navy-200">{snapshot.darkFleetAlerts.length}</p>
            </div>
            <div className="w-px h-8 bg-navy-800" />
            <div>
              <p className="text-[9px] font-mono uppercase tracking-wider text-navy-600 mb-0.5">Disrupted Chokepoints</p>
              <p className={`font-mono text-sm ${snapshot.chokepoints.filter(c => c.status === "disrupted").length > 0 ? "text-accent-rose" : "text-navy-400"}`}>
                {snapshot.chokepoints.filter(c => c.status === "disrupted").length} / {snapshot.chokepoints.length}
              </p>
            </div>
          </div>

          {/* ── Chokepoint Cards ── */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Anchor className="h-3.5 w-3.5 text-navy-600" />
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-navy-600">Chokepoints</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {snapshot.chokepoints.map((cp) => (
                <ChokepointCard
                  key={cp.id}
                  cp={cp}
                  subscribed={cpSubscriptions.includes(cp.id)}
                  onToggleAlert={toggleCpAlert}
                />
              ))}
            </div>
          </section>

          {/* ── Vessel Watchlist ── */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Ship className="h-3.5 w-3.5 text-navy-600" />
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-navy-600">Vessel Watchlist</h2>
              <span className="text-[9px] font-mono text-navy-700 ml-1">{watchlist.length} tracked</span>
            </div>

            {/* Search bar */}
            <div className="relative mb-3 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-navy-700" />
              <input
                type="text"
                value={vesselSearch}
                onChange={(e) => {
                  setVesselSearch(e.target.value);
                  searchVessels(e.target.value);
                }}
                placeholder="Search by MMSI or vessel name..."
                className="w-full bg-navy-950/80 border border-navy-800/60 rounded pl-8 pr-8 py-2 text-[11px] font-mono text-navy-300 placeholder:text-navy-700 focus:outline-none focus:border-navy-600 transition-colors"
              />
              {vesselSearch && (
                <button
                  onClick={() => { setVesselSearch(""); setVesselResults([]); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-navy-700 hover:text-navy-400"
                >
                  <X className="h-3 w-3" />
                </button>
              )}

              {/* Search results dropdown */}
              {vesselResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-navy-950 border border-navy-800/60 rounded shadow-lg max-h-48 overflow-y-auto">
                  {vesselResults.map((v) => (
                    <button
                      key={v.mmsi}
                      onClick={() => addVessel(v.mmsi)}
                      disabled={addingVessel === v.mmsi || watchlist.some((w) => w.mmsi === v.mmsi)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-navy-900/40 transition-colors disabled:opacity-50 border-b border-navy-800/20 last:border-0"
                    >
                      <div>
                        <p className="text-[11px] font-mono text-navy-300">{v.name}</p>
                        <p className="text-[9px] font-mono text-navy-600">MMSI {v.mmsi} · {v.type} · {v.flag}</p>
                      </div>
                      {addingVessel === v.mmsi ? (
                        <Loader2 className="h-3 w-3 text-navy-600 animate-spin" />
                      ) : watchlist.some((w) => w.mmsi === v.mmsi) ? (
                        <span className="text-[9px] font-mono text-navy-700">added</span>
                      ) : (
                        <Plus className="h-3 w-3 text-navy-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
              {searchingVessels && vesselResults.length === 0 && vesselSearch.length >= 2 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-navy-950 border border-navy-800/60 rounded px-3 py-3 flex items-center justify-center">
                  <Loader2 className="h-3 w-3 text-navy-600 animate-spin mr-2" />
                  <span className="text-[10px] font-mono text-navy-600">Searching...</span>
                </div>
              )}
            </div>

            {/* Vessel cards */}
            {watchlist.length === 0 ? (
              <p className="text-[11px] font-mono text-navy-700 py-4 px-3">No vessels tracked. Search above to add tankers or cargo ships.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {watchlist.map((v) => (
                  <div key={v.mmsi} className="border border-navy-800/60 rounded bg-navy-950/80 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-semibold text-navy-200 truncate">{v.name}</span>
                      <button
                        onClick={() => removeVessel(v.mmsi)}
                        className="text-navy-700 hover:text-accent-rose transition-colors p-0.5"
                        title="Remove from watchlist"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>
                        <span className="text-[9px] font-mono text-navy-700 uppercase">MMSI</span>
                        <p className="text-[10px] font-mono text-navy-400 tabular-nums">{v.mmsi}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-navy-700 uppercase">Type</span>
                        <p className="text-[10px] font-mono text-navy-400">{v.vesselType}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-navy-700 uppercase">Flag</span>
                        <p className="text-[10px] font-mono text-navy-400">{v.flag}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-navy-700 uppercase">Speed</span>
                        <p className="text-[10px] font-mono text-navy-400 tabular-nums">{v.speed.toFixed(1)} kn</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-navy-700 uppercase">Position</span>
                        <p className="text-[10px] font-mono text-navy-400 tabular-nums">{v.lat.toFixed(2)}, {v.lng.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-navy-700 uppercase">Dest</span>
                        <p className="text-[10px] font-mono text-navy-400 truncate">{v.destination || "---"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Freight Market Proxies ── */}
          {snapshot.freightProxies.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-3.5 w-3.5 text-navy-600" />
                <h2 className="text-[10px] font-mono uppercase tracking-widest text-navy-600">Freight Market</h2>
                <span className="text-[9px] font-mono text-navy-700 ml-1">shipping stocks as rate proxies</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {snapshot.freightProxies.map((p) => (
                  <FreightCard key={p.symbol} proxy={p} />
                ))}
              </div>
            </section>
          )}

          {/* ── Traffic Anomalies ── */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-3.5 w-3.5 text-navy-600" />
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-navy-600">Traffic Anomalies</h2>
              <span className="text-[9px] font-mono text-navy-700 ml-1">{snapshot.anomalies.length}</span>
            </div>
            {snapshot.anomalies.length === 0 ? (
              <p className="text-[11px] font-mono text-navy-700 py-4 px-3">No anomalies detected</p>
            ) : (
              <div className="border border-navy-800/60 rounded bg-navy-950/80 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-navy-800/40">
                      {["Chokepoint", "Type", "Severity", "Detected", "Description"].map((h, i) => (
                        <th key={h} className={`text-left text-[9px] font-mono uppercase tracking-widest text-navy-600 px-3 py-2 ${i >= 3 ? "hidden md:table-cell" : ""} ${i === 4 ? "hidden lg:table-cell" : ""}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.anomalies.map((a) => (
                      <tr key={a.id} className="border-b border-navy-800/20 last:border-0">
                        <td className="px-3 py-2.5 text-[11px] font-mono text-navy-300">{a.chokepointName}</td>
                        <td className="px-3 py-2.5 text-[11px] font-mono text-navy-400">{a.type}</td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[a.severity]}`} />
                            <span className={`text-[11px] font-mono uppercase tracking-wider ${SEVERITY_TEXT[a.severity]}`}>{a.severity}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[10px] font-mono text-navy-600 hidden md:table-cell">{timeAgo(a.detected)}</td>
                        <td className="px-3 py-2.5 text-[10px] font-mono text-navy-500 max-w-xs hidden lg:table-cell">
                          <span className="line-clamp-2">{a.description}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Dark Fleet Alerts ── */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-3.5 w-3.5 text-navy-600" />
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-navy-600">Dark Fleet Alerts</h2>
              <span className="text-[9px] font-mono text-navy-700 ml-1">{snapshot.darkFleetAlerts.length}</span>
            </div>
            {snapshot.darkFleetAlerts.length === 0 ? (
              <p className="text-[11px] font-mono text-navy-700 py-4 px-3">No dark fleet activity detected</p>
            ) : (
              <div className="border border-navy-800/60 rounded bg-navy-950/80 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-navy-800/40">
                      {["Event", "Source", "Confidence", "Commodities", "Detected"].map((h, i) => (
                        <th key={h} className={`text-left text-[9px] font-mono uppercase tracking-widest text-navy-600 px-3 py-2 ${[1, 3, 4].includes(i) ? "hidden md:table-cell" : ""} ${i === 3 ? "hidden lg:table-cell" : ""}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.darkFleetAlerts.map((alert) => (
                      <tr key={alert.id} className="border-b border-navy-800/20 last:border-0">
                        <td className="px-3 py-2.5 text-[11px] font-mono text-navy-300 max-w-sm">
                          <span className="line-clamp-2">{alert.description}</span>
                        </td>
                        <td className="px-3 py-2.5 text-[10px] font-mono text-navy-500 hidden md:table-cell">{alert.source}</td>
                        <td className="px-3 py-2.5 text-[11px] font-mono tabular-nums text-navy-300">
                          {(alert.confidence * 100).toFixed(0)}%
                        </td>
                        <td className="px-3 py-2.5 hidden lg:table-cell">
                          <div className="flex gap-1 flex-wrap">
                            {alert.commodities.map((c) => (
                              <span key={c} className="text-[9px] font-mono text-navy-500 border border-navy-800/40 rounded px-1.5 py-0.5">{c}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-[10px] font-mono text-navy-600 hidden md:table-cell">{timeAgo(alert.detected)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── GDELT Feed ── */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Anchor className="h-3.5 w-3.5 text-navy-600" />
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-navy-600">Maritime Intelligence Feed</h2>
              <span className="text-[9px] font-mono text-navy-700 ml-1">{snapshot.gdeltEvents.length} events via GDELT</span>
            </div>
            {snapshot.gdeltEvents.length === 0 ? (
              <p className="text-[11px] font-mono text-navy-700 py-4 px-3">No maritime events found</p>
            ) : (
              <div className="border border-navy-800/60 rounded bg-navy-950/80 divide-y divide-navy-800/30">
                {snapshot.gdeltEvents.map((event, idx) => (
                  <a
                    key={idx}
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 py-2.5 px-3 hover:bg-navy-900/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-mono text-navy-300 group-hover:text-navy-100 transition-colors line-clamp-2 leading-relaxed">
                        {event.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-mono text-navy-600">{event.source}</span>
                        <span className="text-navy-800">·</span>
                        <span className="text-[9px] font-mono text-navy-600">{timeAgo(event.date)}</span>
                        {event.relevance > 0.3 && (
                          <>
                            <span className="text-navy-800">·</span>
                            <span className="text-[9px] font-mono tabular-nums text-navy-600">
                              {(event.relevance * 100).toFixed(0)}% relevant
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="h-3 w-3 text-navy-800 group-hover:text-navy-500 transition-colors mt-0.5 shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </section>
        </>
      )}
      </UpgradeGate>
    </PageContainer>
  );
}

// ── Loading Skeleton ────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <>
      <div className="flex items-center gap-6 mb-6 px-4 py-3 border border-navy-800/60 rounded bg-navy-950/80">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <Skeleton className="h-2 w-20" />
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border border-navy-800/60 rounded bg-navy-950/80 p-3 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-1 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border border-navy-800/60 rounded bg-navy-950/80 p-3 space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
      <div className="mb-8">
        <Skeleton className="h-3 w-32 mb-3" />
        <div className="border border-navy-800/60 rounded bg-navy-950/80 p-3 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
        </div>
      </div>
    </>
  );
}
