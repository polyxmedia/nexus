"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  ArrowRight,
  Calendar,
  ChevronRight,
  Filter,
  Layers,
  Search,
  TrendingUp,
  Zap,
  AlertTriangle,
  Radio,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from "recharts";

interface Signal {
  id: number;
  uuid: string;
  title: string;
  description: string;
  date: string;
  endDate: string | null;
  intensity: number;
  category: string;
  status: string;
  layers: string;
  marketSectors: string | null;
  hebrewHoliday: string | null;
  celestialType: string | null;
  geopoliticalContext: string | null;
  createdAt: string;
}

const INTENSITY_COLORS = ["#3b82f6", "#06b6d4", "#f59e0b", "#f97316", "#ef4444"];
const INTENSITY_LABELS = ["Low", "Moderate", "Elevated", "High", "Critical"];

const CATEGORY_COLORS: Record<string, string> = {
  convergence: "#06b6d4",
  celestial: "#8b5cf6",
  hebrew: "#f59e0b",
  geopolitical: "#ef4444",
  islamic: "#10b981",
  economic: "#3b82f6",
};

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  upcoming: { color: "text-accent-cyan", bg: "bg-accent-cyan/10" },
  active: { color: "text-accent-emerald", bg: "bg-accent-emerald/10" },
  passed: { color: "text-navy-500", bg: "bg-navy-800/50" },
};

export default function SignalsPage() {
  const router = useRouter();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterIntensity, setFilterIntensity] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterLayer, setFilterLayer] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "intensity">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetch("/api/signals")
      .then((r) => r.json())
      .then((data) => {
        setSignals(Array.isArray(data) ? data : data.signals || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Derived analytics
  const analytics = useMemo(() => {
    if (signals.length === 0) return null;

    // Intensity distribution
    const intensityDist = [0, 0, 0, 0, 0];
    signals.forEach((s) => {
      if (s.intensity >= 1 && s.intensity <= 5) intensityDist[s.intensity - 1]++;
    });

    // Category breakdown
    const catCounts: Record<string, number> = {};
    signals.forEach((s) => {
      catCounts[s.category] = (catCounts[s.category] || 0) + 1;
    });

    // Layer frequency
    const layerCounts: Record<string, number> = {};
    signals.forEach((s) => {
      try {
        const layers: string[] = JSON.parse(s.layers);
        layers.forEach((l) => {
          layerCounts[l] = (layerCounts[l] || 0) + 1;
        });
      } catch {}
    });

    // Monthly timeline
    const monthly: Record<string, { month: string; count: number; avgIntensity: number; total: number }> = {};
    signals.forEach((s) => {
      const m = s.date.slice(0, 7);
      if (!monthly[m]) monthly[m] = { month: m, count: 0, avgIntensity: 0, total: 0 };
      monthly[m].count++;
      monthly[m].total += s.intensity;
      monthly[m].avgIntensity = monthly[m].total / monthly[m].count;
    });

    // Status counts
    const statusCounts = { upcoming: 0, active: 0, passed: 0 };
    signals.forEach((s) => {
      if (s.status in statusCounts) statusCounts[s.status as keyof typeof statusCounts]++;
    });

    // Average intensity
    const avgIntensity = signals.reduce((sum, s) => sum + s.intensity, 0) / signals.length;

    // Multi-layer convergences (intensity >= 3)
    const convergences = signals.filter((s) => s.intensity >= 3).length;

    return {
      intensityDist: intensityDist.map((count, i) => ({
        level: `L${i + 1}`,
        label: INTENSITY_LABELS[i],
        count,
        color: INTENSITY_COLORS[i],
      })),
      categories: Object.entries(catCounts)
        .map(([name, count]) => ({ name, count, color: CATEGORY_COLORS[name] || "#6b7280" }))
        .sort((a, b) => b.count - a.count),
      layers: Object.entries(layerCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      timeline: Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)),
      statusCounts,
      avgIntensity,
      convergences,
      total: signals.length,
    };
  }, [signals]);

  // Filtered signals
  const filtered = useMemo(() => {
    let result = signals;
    if (filterIntensity !== null) result = result.filter((s) => s.intensity === filterIntensity);
    if (filterStatus) result = result.filter((s) => s.status === filterStatus);
    if (filterCategory) result = result.filter((s) => s.category === filterCategory);
    if (filterLayer) {
      result = result.filter((s) => {
        try {
          const layers: string[] = JSON.parse(s.layers);
          return layers.includes(filterLayer!);
        } catch {
          return false;
        }
      });
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.hebrewHoliday?.toLowerCase().includes(q) ?? false) ||
          (s.celestialType?.toLowerCase().includes(q) ?? false) ||
          (s.geopoliticalContext?.toLowerCase().includes(q) ?? false)
      );
    }
    result = [...result].sort((a, b) => {
      if (sortBy === "intensity") {
        return sortDir === "desc" ? b.intensity - a.intensity : a.intensity - b.intensity;
      }
      return sortDir === "desc"
        ? new Date(b.date).getTime() - new Date(a.date).getTime()
        : new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    return result;
  }, [signals, filterIntensity, filterStatus, filterCategory, filterLayer, search, sortBy, sortDir]);

  const clearFilters = () => {
    setFilterIntensity(null);
    setFilterStatus(null);
    setFilterCategory(null);
    setFilterLayer(null);
    setSearch("");
  };

  const hasFilters = filterIntensity !== null || filterStatus !== null || filterCategory !== null || filterLayer !== null || search !== "";

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const formatMonth = (m: string) => {
    const [year, month] = m.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(month) - 1]} '${year.slice(2)}`;
  };

  if (loading) {
    return (
      <PageContainer title="Signal Intelligence" subtitle="Multi-layer convergence detection">
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Signal Intelligence" subtitle="Multi-layer convergence detection">
      {/* Overview Metrics */}
      {analytics && (
        <>
          <div className="grid grid-cols-5 gap-3 mb-6">
            {[
              { label: "Total Signals", value: analytics.total, sub: "detected", accent: "accent-cyan" },
              { label: "Avg Intensity", value: analytics.avgIntensity.toFixed(1), sub: "out of 5", accent: "accent-amber" },
              { label: "Convergences", value: analytics.convergences, sub: "L3+ events", accent: "accent-rose" },
              { label: "Active", value: analytics.statusCounts.active, sub: "in progress", accent: "accent-emerald" },
              { label: "Upcoming", value: analytics.statusCounts.upcoming, sub: "pending", accent: "accent-cyan" },
            ].map((m) => (
              <div key={m.label} className="border border-navy-700/30 rounded-lg bg-navy-900/20 px-3 py-2.5 relative overflow-hidden group hover:border-navy-700/50 transition-colors">
                <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-${m.accent}/20 to-transparent`} />
                <div className="text-[9px] font-mono uppercase tracking-wider text-navy-500 mb-0.5">{m.label}</div>
                <div className="text-xl font-mono font-bold text-navy-100 tabular-nums leading-tight">{m.value}</div>
                <div className="text-[9px] font-mono text-navy-600">{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Analytics Row */}
          <div className="grid grid-cols-12 gap-4 mb-6">
            {/* Intensity Distribution */}
            <div className="col-span-3 border border-navy-700/30 rounded-lg bg-navy-900/20 p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-amber/20 to-transparent" />
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Intensity Distribution</div>
              <div className="space-y-2">
                {analytics.intensityDist.map((d) => (
                  <button
                    key={d.level}
                    onClick={() => setFilterIntensity(filterIntensity === parseInt(d.level.slice(1)) ? null : parseInt(d.level.slice(1)))}
                    className={`w-full flex items-center gap-2 group transition-colors ${
                      filterIntensity === parseInt(d.level.slice(1)) ? "opacity-100" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <span className="text-[10px] font-mono text-navy-500 w-5">{d.level}</span>
                    <div className="flex-1 h-4 bg-navy-800/50 rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all duration-300"
                        style={{
                          width: `${analytics.total > 0 ? (d.count / analytics.total) * 100 : 0}%`,
                          backgroundColor: d.color,
                          opacity: filterIntensity === parseInt(d.level.slice(1)) ? 1 : 0.6,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-navy-500 w-6 text-right tabular-nums">{d.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="col-span-5 border border-navy-700/30 rounded-lg bg-navy-900/20 p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/20 to-transparent" />
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Signal Frequency</div>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.timeline} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="signalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 8, fill: "#5c5c5c" }} stroke="#1a1a1a" tickFormatter={formatMonth} />
                    <YAxis tick={{ fontSize: 8, fill: "#5c5c5c" }} stroke="#1a1a1a" />
                    <Tooltip
                      contentStyle={{ background: "rgba(10,10,10,0.95)", border: "1px solid #1f1f1f", borderRadius: "4px", fontSize: "10px", fontFamily: "IBM Plex Mono" }}
                      labelFormatter={formatMonth}
                    />
                    <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={1.5} fill="url(#signalGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Layer & Category Breakdown */}
            <div className="col-span-4 border border-navy-700/30 rounded-lg bg-navy-900/20 p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-emerald/20 to-transparent" />
              <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 mb-3">Signal Layers</div>
              <div className="space-y-1.5">
                {analytics.layers.slice(0, 7).map((l) => (
                  <button
                    key={l.name}
                    onClick={() => setFilterLayer(filterLayer === l.name ? null : l.name)}
                    className={`w-full flex items-center justify-between py-1 px-2 rounded transition-colors ${
                      filterLayer === l.name ? "bg-navy-800/60" : "hover:bg-navy-800/30"
                    }`}
                  >
                    <span className="text-[10px] text-navy-300 capitalize">{l.name.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-navy-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-emerald/50 rounded-full"
                          style={{ width: `${(l.count / analytics.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-navy-500 w-5 text-right tabular-nums">{l.count}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Filters & Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-navy-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search signals, categories, events..."
            className="w-full h-8 pl-8 pr-3 rounded bg-navy-900/40 border border-navy-700/40 text-[11px] font-mono text-navy-300 placeholder:text-navy-600 focus:outline-none focus:border-navy-600 transition-colors"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1 rounded border border-navy-700/40 overflow-hidden">
          <button
            onClick={() => setFilterCategory(null)}
            className={`px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
              !filterCategory ? "bg-navy-800/60 text-navy-100" : "text-navy-500 hover:text-navy-300"
            }`}
          >
            All
          </button>
          {analytics?.categories.slice(0, 5).map((c, i) => (
            <button
              key={c.name}
              onClick={() => setFilterCategory(filterCategory === c.name ? null : c.name)}
              className={`px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                i > 0 || !filterCategory ? "border-l border-navy-700/40" : ""
              } ${filterCategory === c.name ? "bg-navy-800/60 text-navy-100" : "text-navy-500 hover:text-navy-300"}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 rounded border border-navy-700/40 overflow-hidden">
          {[null, "upcoming", "active", "passed"].map((s, i) => (
            <button
              key={s ?? "all"}
              onClick={() => setFilterStatus(s)}
              className={`px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                i > 0 ? "border-l border-navy-700/40" : ""
              } ${filterStatus === s ? "bg-navy-800/60 text-navy-100" : "text-navy-500 hover:text-navy-300"}`}
            >
              {s ?? "All"}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={`${sortBy}-${sortDir}`}
          onChange={(e) => {
            const [by, dir] = e.target.value.split("-") as ["date" | "intensity", "asc" | "desc"];
            setSortBy(by);
            setSortDir(dir);
          }}
          className="h-8 px-2 rounded bg-navy-900/40 border border-navy-700/40 text-[10px] font-mono text-navy-400 focus:outline-none"
        >
          <option value="date-desc">Newest first</option>
          <option value="date-asc">Oldest first</option>
          <option value="intensity-desc">Highest intensity</option>
          <option value="intensity-asc">Lowest intensity</option>
        </select>

        {hasFilters && (
          <button onClick={clearFilters} className="text-[10px] font-mono text-navy-500 hover:text-navy-300 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-navy-500">
          {filtered.length} signal{filtered.length !== 1 ? "s" : ""}
          {hasFilters ? ` (filtered from ${signals.length})` : ""}
        </span>
      </div>

      {/* Signal List */}
      {filtered.length === 0 ? (
        <div className="border border-navy-700/30 border-dashed rounded-lg p-12 text-center">
          <Radio className="h-6 w-6 text-navy-600 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-navy-400 mb-1">No signals match your filters</p>
          <p className="text-[10px] text-navy-500">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((signal) => {
            let layers: string[] = [];
            try { layers = JSON.parse(signal.layers); } catch {}
            let sectors: string[] = [];
            try { if (signal.marketSectors) sectors = JSON.parse(signal.marketSectors); } catch {}
            const statusCfg = STATUS_CONFIG[signal.status] || STATUS_CONFIG.passed;
            const isConvergence = signal.category === "convergence";
            const isHighIntensity = signal.intensity >= 4;
            const intensityColor = INTENSITY_COLORS[signal.intensity - 1] || "#6b7280";
            const descriptionPreview = signal.description?.split(" | ")[0] || "";

            return (
              <Link
                key={signal.id}
                href={`/signals/${signal.uuid}`}
                className={`block rounded-lg transition-all group relative overflow-hidden ${
                  isConvergence
                    ? "border border-accent-cyan/20 bg-accent-cyan/[0.02] hover:bg-accent-cyan/[0.05] hover:border-accent-cyan/30"
                    : "border border-navy-700/30 bg-navy-900/20 hover:bg-navy-800/30 hover:border-navy-700/50"
                }`}
              >
                {/* Top accent line for high-intensity signals */}
                {isHighIntensity && (
                  <div
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(to right, transparent, ${intensityColor}40, transparent)` }}
                  />
                )}

                <div className="flex items-stretch">
                  {/* Intensity bar - thicker for convergences */}
                  <div
                    className={`${isConvergence ? "w-1.5" : "w-1"} rounded-l-lg shrink-0`}
                    style={{ backgroundColor: intensityColor }}
                  />

                  <div className="flex-1 px-4 py-3">
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono text-navy-600">#{signal.id}</span>
                        {isConvergence && (
                          <Layers className="h-3 w-3 text-accent-cyan/60 shrink-0" />
                        )}
                        <span className="text-sm text-navy-200 font-medium truncate">{signal.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${statusCfg.bg} ${statusCfg.color}`}>
                          {signal.status}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-navy-700 group-hover:text-navy-400 transition-colors" />
                      </div>
                    </div>

                    {/* Description preview */}
                    {descriptionPreview && (
                      <p className="text-[11px] text-navy-500 mb-2 line-clamp-1 font-sans leading-relaxed">
                        {descriptionPreview}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-mono text-navy-500">{formatDate(signal.date)}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-navy-600">INT</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <div
                              key={n}
                              className="h-1.5 w-3 rounded-sm transition-colors"
                              style={{
                                backgroundColor: n <= signal.intensity
                                  ? intensityColor
                                  : "#1a1a1a",
                              }}
                            />
                          ))}
                        </div>
                        <span
                          className="text-[9px] font-mono ml-0.5 tabular-nums"
                          style={{ color: intensityColor }}
                        >
                          {signal.intensity}
                        </span>
                      </div>
                      <span
                        className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          color: CATEGORY_COLORS[signal.category] || "#6b7280",
                          backgroundColor: `${CATEGORY_COLORS[signal.category] || "#6b7280"}15`,
                        }}
                      >
                        {signal.category}
                      </span>
                      {isHighIntensity && (
                        <span className="text-[9px] font-mono uppercase tracking-wider text-accent-rose/70 flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {INTENSITY_LABELS[signal.intensity - 1]}
                        </span>
                      )}
                    </div>

                    {/* Layers + Sectors */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {layers.map((l) => (
                        <span
                          key={l}
                          className="text-[9px] font-mono text-navy-500 px-1.5 py-0.5 rounded bg-navy-800/40 capitalize"
                        >
                          {l.replace(/_/g, " ")}
                        </span>
                      ))}
                      {sectors.length > 0 && (
                        <>
                          <span className="text-navy-700/50">|</span>
                          {sectors.slice(0, 3).map((s) => (
                            <span key={s} className="text-[9px] font-mono text-navy-600 italic">
                              {s}
                            </span>
                          ))}
                          {sectors.length > 3 && (
                            <span className="text-[9px] font-mono text-navy-700">+{sectors.length - 3}</span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Extra context */}
                    {(signal.hebrewHoliday || signal.celestialType) && (
                      <div className="flex items-center gap-3 mt-1.5">
                        {signal.hebrewHoliday && (
                          <span className="text-[9px] text-accent-amber/70 font-mono">
                            {signal.hebrewHoliday}
                          </span>
                        )}
                        {signal.celestialType && (
                          <span className="text-[9px] text-accent-cyan/70 font-mono capitalize">
                            {signal.celestialType.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
