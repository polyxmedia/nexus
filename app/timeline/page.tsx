"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  RefreshCw,
  Filter,
  Loader2,
  Activity,
  Target,
  TrendingUp,
  FileText,
  Bell,
  ChevronDown,
  CheckCircle2,
  XCircle,
  CircleDot,
  Clock4,
  MoreHorizontal,
  MessageSquare,
  BookOpen,
  Crosshair,
  ExternalLink,
} from "lucide-react";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";

interface TimelineEntry {
  id: number;
  timestamp: string;
  type: string;
  title: string;
  description: string | null;
  severity: number;
  category: string | null;
  sourceType: string | null;
  sourceId: number | null;
  entityIds: number[];
  metadata: Record<string, unknown>;
}

const TYPE_CONFIG: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  signal: { icon: Activity, color: "#f59e0b", label: "Signal" },
  prediction: { icon: Target, color: "#8b5cf6", label: "Prediction" },
  trade: { icon: TrendingUp, color: "#10b981", label: "Trade" },
  thesis: { icon: FileText, color: "#06b6d4", label: "Thesis" },
  alert: { icon: Bell, color: "#ef4444", label: "Alert" },
};

const SEVERITY_COLORS = [
  "",
  "bg-navy-700",
  "bg-accent-cyan/60",
  "bg-accent-amber/60",
  "bg-accent-rose/60",
  "bg-signal-5",
];

function formatTimestamp(ts: string): { date: string; time: string } {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

function ActionMenu({ event, onAction }: { event: TimelineEntry; onAction: (action: string, event: TimelineEntry) => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const actions = [
    { id: "discuss", label: "Discuss in Chat", icon: MessageSquare, color: "#06b6d4" },
    { id: "knowledge", label: "Add to Knowledge", icon: BookOpen, color: "#8b5cf6" },
    { id: "predict", label: "Create Prediction", icon: Crosshair, color: "#f59e0b" },
    { id: "alert", label: "Create Alert", icon: Bell, color: "#ef4444" },
    { id: "trade", label: "Create Position", icon: TrendingUp, color: "#10b981" },
    ...(event.sourceType && event.sourceId
      ? [{ id: "source", label: `View ${event.sourceType}`, icon: ExternalLink, color: "#94a3b8" }]
      : []),
  ];

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1 rounded hover:bg-navy-700/60 text-navy-600 hover:text-navy-300 transition-colors opacity-0 group-hover:opacity-100"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-navy-700 bg-navy-900 shadow-xl py-1">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={(e) => { e.stopPropagation(); setOpen(false); onAction(action.id, event); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-[11px] text-navy-300 hover:bg-navy-800 hover:text-navy-100 transition-colors"
            >
              <action.icon className="h-3 w-3 flex-shrink-0" style={{ color: action.color }} />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TimelinePage() {
  const router = useRouter();
  const [events, setEvents] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<"recent" | "upcoming">("recent");
  const [filters, setFilters] = useState({
    types: [] as string[],
    categories: [] as string[],
    minSeverity: 1,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [limit, setLimit] = useState(100);

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.types.length > 0) params.set("types", filters.types.join(","));
      if (filters.categories.length > 0) params.set("categories", filters.categories.join(","));
      if (filters.minSeverity > 1) params.set("minSeverity", String(filters.minSeverity));
      params.set("limit", String(limit));

      const res = await fetch(`/api/timeline?${params.toString()}`);
      const json = await res.json();
      setEvents(json.events || []);
    } catch {
      // fail silently
    }
    setLoading(false);
  }, [filters, limit]);

  const syncTimeline = async () => {
    setSyncing(true);
    try {
      await fetch("/api/timeline", { method: "POST" });
      await fetchTimeline();
    } catch {
      // fail
    }
    setSyncing(false);
  };

  const handleAction = async (action: string, event: TimelineEntry) => {
    switch (action) {
      case "discuss": {
        const res = await fetch("/api/chat/sessions", { method: "POST" });
        const data = await res.json();
        if (data.session) {
          const prompt = `Analyze this timeline event and provide intelligence assessment:\n\n**${event.title}**\n${event.description || ""}\n\nType: ${event.type} | Severity: ${event.severity}/5 | Category: ${event.category || "N/A"}`;
          router.push(`/chat/${data.session.uuid}?prompt=${encodeURIComponent(prompt)}`);
        }
        break;
      }
      case "knowledge": {
        await fetch("/api/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: event.title,
            content: `${event.description || event.title}\n\nSource: Timeline ${event.type} event (severity ${event.severity}/5)\nTimestamp: ${event.timestamp}${event.category ? `\nCategory: ${event.category}` : ""}`,
            category: event.type === "trade" ? "market" : event.type === "signal" ? "event" : event.type === "thesis" ? "thesis" : "geopolitical",
            tags: JSON.stringify([event.type, event.category, "timeline"].filter(Boolean)),
            confidence: 0.7,
            status: "active",
          }),
        });
        alert("Added to knowledge bank");
        break;
      }
      case "predict": {
        const res = await fetch("/api/chat/sessions", { method: "POST" });
        const data = await res.json();
        if (data.session) {
          const prompt = `Based on this event, generate a formal prediction with target, timeframe, and confidence:\n\n**${event.title}**\n${event.description || ""}\n\nSeverity: ${event.severity}/5 | Category: ${event.category || "N/A"}`;
          router.push(`/chat/${data.session.uuid}?prompt=${encodeURIComponent(prompt)}`);
        }
        break;
      }
      case "alert": {
        // Build a sensible alert from the event context
        const alertBody: Record<string, unknown> = {
          name: `Alert: ${event.title.slice(0, 60)}`,
          type: "signal_intensity",
          condition: { minIntensity: Math.max(event.severity, 3) },
          cooldownMinutes: 60,
        };

        // If event has ticker metadata, create a price alert instead
        const eventTicker = event.metadata?.ticker || event.metadata?.symbol;
        if (eventTicker) {
          alertBody.type = "price_threshold";
          alertBody.condition = { ticker: String(eventTicker), direction: "above", threshold: 0 };
        } else if (event.type === "prediction") {
          alertBody.type = "prediction_due";
          alertBody.condition = { daysBeforeDeadline: 3 };
        }

        // Navigate to alerts page with pre-filled data
        router.push(`/alerts?prefill=${encodeURIComponent(JSON.stringify(alertBody))}`);
        break;
      }
      case "trade": {
        const ticker = event.metadata?.ticker || event.metadata?.symbol;
        if (ticker) {
          router.push(`/trading?symbol=${encodeURIComponent(String(ticker))}`);
        } else {
          const res = await fetch("/api/chat/sessions", { method: "POST" });
          const data = await res.json();
          if (data.session) {
            const prompt = `Based on this event, suggest trading positions with specific tickers, entry/exit levels, and sizing:\n\n**${event.title}**\n${event.description || ""}`;
            router.push(`/chat/${data.session.uuid}?prompt=${encodeURIComponent(prompt)}`);
          }
        }
        break;
      }
      case "source": {
        const sourceRoutes: Record<string, string> = {
          signal: "/signals",
          prediction: "/predictions",
          trade: "/trading",
          thesis: "/knowledge",
          alert: "/alerts",
        };
        const route = sourceRoutes[event.sourceType || ""] || "/";
        router.push(event.sourceId ? `${route}/${event.sourceId}` : route);
        break;
      }
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // Split into past and upcoming, then group by date
  const now = new Date().toISOString();
  const pastEvents = events.filter(e => e.timestamp <= now).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const upcomingEvents = events.filter(e => e.timestamp > now).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const groupByDate = (items: TimelineEntry[]) =>
    items.reduce<Record<string, TimelineEntry[]>>((acc, event) => {
      const { date } = formatTimestamp(event.timestamp);
      if (!acc[date]) acc[date] = [];
      acc[date].push(event);
      return acc;
    }, {});

  const pastGrouped = groupByDate(pastEvents);
  const upcomingGrouped = groupByDate(upcomingEvents);

  function renderDateGroups(grouped: Record<string, TimelineEntry[]>) {
    return Object.entries(grouped).map(([date, dayEvents]) => (
      <div key={date} className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-[7rem] text-right">
            <span className="text-xs font-semibold text-navy-300">{date}</span>
          </div>
          <div className="w-3 h-3 rounded-full border-2 border-accent-cyan bg-navy-950 z-10" />
          <span className="text-[10px] text-navy-500">{dayEvents.length} events</span>
        </div>
        <div className="space-y-2">
          {dayEvents.map((event) => {
            const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.signal;
            const Icon = config.icon;
            const { time } = formatTimestamp(event.timestamp);
            const outcome = event.type === "prediction" ? (event.metadata?.outcome as string | null) : null;
            const score = event.type === "prediction" ? (event.metadata?.score as number | null) : null;
            const isPrediction = event.type === "prediction";

            // Prediction outcome styling
            const outcomeBorder = outcome === "confirmed"
              ? "border-l-accent-emerald border-l-[3px]"
              : outcome === "denied"
                ? "border-l-accent-rose border-l-[3px]"
                : outcome === "partial"
                  ? "border-l-accent-amber border-l-[3px]"
                  : "";

            return (
              <div key={event.id} className="flex items-start gap-3 group">
                <div className="w-[7rem] text-right pt-2">
                  <span className="text-[10px] font-mono text-navy-600">{time}</span>
                </div>
                <div className="flex items-center justify-center w-3 pt-2 z-10">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                </div>
                <div className={`flex-1 bg-navy-900/60 border border-navy-800 rounded-lg px-4 py-3 hover:border-navy-700 transition-colors group-hover:bg-navy-900/80 max-w-2xl ${outcomeBorder}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-3 w-3" style={{ color: config.color }} />
                    <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: config.color }}>
                      {config.label}
                    </span>
                    {event.category && (
                      <span className="text-[9px] text-navy-600 uppercase">{event.category}</span>
                    )}

                    {/* Prediction outcome badge */}
                    {isPrediction && outcome && (
                      <span className={`flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        outcome === "confirmed"
                          ? "bg-accent-emerald/15 text-accent-emerald"
                          : outcome === "denied"
                            ? "bg-accent-rose/15 text-accent-rose"
                            : outcome === "partial"
                              ? "bg-accent-amber/15 text-accent-amber"
                              : "bg-navy-700/50 text-navy-400"
                      }`}>
                        {outcome === "confirmed" && <CheckCircle2 className="h-3 w-3" />}
                        {outcome === "denied" && <XCircle className="h-3 w-3" />}
                        {outcome === "partial" && <CircleDot className="h-3 w-3" />}
                        {outcome === "expired" && <Clock4 className="h-3 w-3" />}
                        {outcome}
                        {score != null && ` (${(score * 100).toFixed(0)}%)`}
                      </span>
                    )}

                    {isPrediction && !outcome && (
                      <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-navy-700/40 text-navy-500">
                        <Clock4 className="h-2.5 w-2.5" />
                        pending
                      </span>
                    )}

                    <div className="flex-1" />
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 h-3 rounded-full ${
                              i < event.severity ? SEVERITY_COLORS[event.severity] : "bg-navy-800"
                            }`}
                          />
                        ))}
                      </div>
                      <ActionMenu event={event} onAction={handleAction} />
                    </div>
                  </div>
                  <h3 className="text-xs font-medium text-navy-100">{event.title}</h3>
                  {event.description && (
                    <p className="text-[10px] text-navy-500 mt-1 line-clamp-2">{event.description}</p>
                  )}
                  {event.sourceType && (
                    <div className="mt-2 text-[9px] text-navy-600 font-mono">
                      {event.sourceType} #{event.sourceId}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ));
  }

  const toggleType = (type: string) => {
    setFilters(f => ({
      ...f,
      types: f.types.includes(type)
        ? f.types.filter(t => t !== type)
        : [...f.types, type],
    }));
  };

  return (
    <div className="ml-0 md:ml-48 min-h-screen bg-navy-950 pt-12 md:pt-0">
      <UpgradeGate minTier="analyst" feature="Event timeline">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-navy-700 bg-navy-950/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-accent-cyan" />
            <div>
              <h1 className="text-sm font-bold text-navy-100 tracking-wide">Timeline</h1>
              <p className="text-[10px] text-navy-500 uppercase tracking-wider">
                {pastEvents.length} recent, {upcomingEvents.length} upcoming
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs transition-colors ${
                showFilters || filters.types.length > 0
                  ? "bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan"
                  : "bg-navy-900 border-navy-700 text-navy-400 hover:text-navy-200"
              }`}
            >
              <Filter className="h-3 w-3" />
              Filters
              {filters.types.length > 0 && (
                <span className="bg-accent-cyan/20 text-accent-cyan text-[9px] px-1.5 py-0.5 rounded-full">
                  {filters.types.length}
                </span>
              )}
            </button>

            {/* Sync */}
            <button
              onClick={syncTimeline}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-navy-800 border border-navy-600 text-xs text-navy-200 hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
              Sync
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="px-6 pb-3 flex items-center gap-4 border-t border-navy-700/50 pt-3">
            <span className="text-[10px] text-navy-500 uppercase tracking-wider">Type:</span>
            <div className="flex gap-1.5">
              {Object.entries(TYPE_CONFIG).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${
                    filters.types.length === 0 || filters.types.includes(type)
                      ? "border-navy-600 text-navy-200 bg-navy-800"
                      : "border-navy-800 text-navy-600 bg-navy-900/50"
                  }`}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
                  {config.label}
                </button>
              ))}
            </div>

            <span className="text-[10px] text-navy-500 uppercase tracking-wider ml-4">Min Severity:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setFilters(f => ({ ...f, minSeverity: s }))}
                  className={`w-6 h-6 rounded text-[10px] font-mono border transition-colors ${
                    filters.minSeverity === s
                      ? "border-accent-cyan text-accent-cyan bg-accent-cyan/10"
                      : "border-navy-700 text-navy-500 bg-navy-900 hover:text-navy-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-navy-700/50 px-6">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab("recent")}
            className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "recent"
                ? "text-accent-emerald border-accent-emerald"
                : "text-navy-500 border-transparent hover:text-navy-300"
            }`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />
            Recent
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
              activeTab === "recent" ? "bg-accent-emerald/15 text-accent-emerald" : "bg-navy-800 text-navy-500"
            }`}>
              {pastEvents.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "upcoming"
                ? "text-accent-amber border-accent-amber"
                : "text-navy-500 border-transparent hover:text-navy-300"
            }`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-accent-amber" />
            Upcoming
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
              activeTab === "upcoming" ? "bg-accent-amber/15 text-accent-amber" : "bg-navy-800 text-navy-500"
            }`}>
              {upcomingEvents.length}
            </span>
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-navy-500 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading timeline...
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="h-8 w-8 text-navy-700 mx-auto mb-3" />
            <p className="text-sm text-navy-500">No timeline events yet</p>
            <p className="text-[10px] text-navy-600 mt-1">Click Sync to populate from existing data</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[7.5rem] top-0 bottom-0 w-px bg-navy-800" />

            {activeTab === "recent" ? (
              Object.keys(pastGrouped).length > 0 ? (
                <div>
                  {renderDateGroups(pastGrouped)}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-xs text-navy-500">No recent events</p>
                </div>
              )
            ) : (
              Object.keys(upcomingGrouped).length > 0 ? (
                <div>
                  {renderDateGroups(upcomingGrouped)}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-xs text-navy-500">No upcoming events</p>
                </div>
              )
            )}

            {/* Load more */}
            {events.length >= limit && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setLimit(l => l + 100)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded bg-navy-900 border border-navy-700 text-xs text-navy-400 hover:text-navy-200 transition-colors"
                >
                  <ChevronDown className="h-3 w-3" />
                  Load more
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </UpgradeGate>
    </div>
  );
}
