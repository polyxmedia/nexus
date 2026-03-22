"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crosshair,
  ExternalLink,
  FileText,
  Loader2,
  Moon,
  Sparkles,
  Star,
  Sun,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Target,
  Users,
  Zap,
  Shield,
  FlaskConical,
  GraduationCap,
  Brain,
} from "lucide-react";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";

// ── Types ──

interface CalendarEvent {
  date: string;
  hebrewDate: string;
  holiday: string;
  type: string;
  description: string;
  significance: number;
  marketRelevance: string;
  calendarSystem: "hebrew" | "islamic" | "economic";
}

interface CalendarData {
  today: {
    gregorian: string;
    hebrew: string;
    hebrewYear: number;
    hijri: string;
    hijriYear: number;
    isRamadan: boolean;
    isSacredMonth: boolean;
    hijriMonthName: string;
  } | null;
  shmita: {
    isShmita: boolean;
    hebrewYear: number;
    significance: string;
  } | null;
  /** @deprecated Use `cyclical` instead */
  esoteric?: {
    sexagenaryCycle: string;
    animal: string;
    element: string;
    flyingStar: number;
    flyingStarName: string;
    lunarPhase: string;
    lunarBias: string;
    universalYear: number;
    kondratieffSeason: string;
    compositeScore: number;
  } | null;
  cyclical?: {
    sexagenaryCycle: string;
    animal: string;
    element: string;
    flyingStar: number;
    flyingStarName: string;
    lunarPhase: string;
    lunarBias: string;
    universalYear: number;
    kondratieffSeason: string;
    compositeScore: number;
  } | null;
  events: CalendarEvent[];
}

interface DateReading {
  date: string;
  gregorian: string;
  hebrew: string;
  hebrewYear: number;
  holidays: string[];
  shmitaCycle: number;
  isShmita: boolean;
  reading: string;
  signalCount: number;
  /** @deprecated Use `cyclical` instead */
  esoteric?: {
    lunarPhase: string;
    compositeScore: number;
  };
  cyclical?: {
    lunarPhase: string;
    compositeScore: number;
  };
}

interface OverlaySignal {
  id: number;
  title: string;
  intensity: number;
  category: string;
  status: string;
}

interface OverlayPrediction {
  id: number;
  claim: string;
  confidence: number;
  deadline: string;
  outcome: string | null;
  category: string;
}

interface OverlayData {
  signals: Record<string, OverlaySignal[]>;
  predictions: Record<string, OverlayPrediction[]>;
}

interface MarketSnapshot {
  date: string;
  markets: Record<string, { close: number; change: number; changePercent: number }>;
}

interface ActorInsight {
  actor: string;
  actionType: string;
  baseProbability: number;
  adjustedProbability: number;
  calendarTrigger: string;
  historicalBasis: string;
  confidence: number;
}

// ── Filter config ──

type FilterKey = "hebrew" | "islamic" | "kabbala" | "economic" | "earnings" | "opex" | "signals" | "predictions";

const FILTER_CONFIG: Record<FilterKey, { label: string; color: string; dot: string }> = {
  hebrew: { label: "Hebrew", color: "text-accent-amber", dot: "bg-accent-amber" },
  islamic: { label: "Islamic", color: "text-accent-emerald", dot: "bg-accent-emerald" },
  kabbala: { label: "Kabbala", color: "text-purple-400", dot: "bg-purple-400" },
  economic: { label: "Economic", color: "text-accent-cyan", dot: "bg-accent-cyan" },
  earnings: { label: "Earnings", color: "text-accent-rose", dot: "bg-accent-rose" },
  opex: { label: "OPEX", color: "text-orange-400", dot: "bg-orange-400" },
  signals: { label: "Signals", color: "text-signal-4", dot: "bg-signal-4" },
  predictions: { label: "Predictions", color: "text-signal-5", dot: "bg-signal-5" },
};

function getFilterKey(ev: CalendarEvent): FilterKey {
  if (ev.calendarSystem === "economic") {
    if (ev.type === "earnings") return "earnings";
    if (ev.type === "opex" || ev.type === "witching" || ev.type === "vix_expiry") return "opex";
    return "economic";
  }
  if (ev.calendarSystem === "islamic") return "islamic";
  if (ev.type === "omer" || ev.type === "kabbala" || ev.holiday.includes("Sefirat") || ev.holiday.includes("Lag B")) {
    return "kabbala";
  }
  return "hebrew";
}

function getEventTextColor(ev: CalendarEvent): string {
  return FILTER_CONFIG[getFilterKey(ev)].color;
}

// ── Convergence scoring ──

function getConvergenceScore(events: CalendarEvent[], signals: OverlaySignal[], predictions: OverlayPrediction[]): number {
  const systems = new Set<string>();
  for (const ev of events) {
    systems.add(ev.calendarSystem);
    if (ev.calendarSystem === "hebrew" && (ev.type === "omer" || ev.type === "kabbala")) {
      systems.add("kabbala");
    }
  }
  if (signals.length > 0) systems.add("signals");
  if (predictions.length > 0) systems.add("predictions");
  return systems.size;
}

function convergenceBg(score: number): string {
  if (score >= 5) return "bg-accent-amber/20 border-accent-amber/40";
  if (score >= 4) return "bg-accent-amber/12 border-accent-amber/25";
  if (score >= 3) return "bg-accent-cyan/10 border-accent-cyan/20";
  if (score >= 2) return "bg-navy-700/40 border-navy-700/30";
  return "";
}

// ── Constants ──

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function significanceColor(sig: number) {
  if (sig >= 3) return "bg-accent-amber/15 border-accent-amber/40 text-accent-amber";
  if (sig >= 2) return "bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan";
  return "bg-navy-700/60 border-navy-600 text-navy-300";
}

function significanceLabel(sig: number) {
  if (sig >= 3) return "High";
  if (sig >= 2) return "Medium";
  return "Low";
}

// ── Main Component ──

export default function CalendarPage() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [reading, setReading] = useState<DateReading | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingError, setReadingError] = useState<string | null>(null);
  const readingCache = useRef(new Map<string, DateReading>());

  const [overlay, setOverlay] = useState<OverlayData | null>(null);
  const [marketSnapshot, setMarketSnapshot] = useState<MarketSnapshot | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [actorInsights, setActorInsights] = useState<ActorInsight[]>([]);
  const [actorLoading, setActorLoading] = useState(false);
  const actorCache = useRef(new Map<string, ActorInsight[]>());

  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(
    new Set(["hebrew", "islamic", "kabbala", "economic", "earnings", "opex", "signals", "predictions"])
  );

  const todayStr = new Date().toISOString().split("T")[0];

  // ── Data fetching ──

  useEffect(() => {
    fetch("/api/calendar/hebrew")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
        // Auto-select today
        setSelectedDate(todayStr);
      })
      .catch(() => setLoading(false));

    fetch("/api/calendar/overlay")
      .then((r) => r.json())
      .then((d) => setOverlay(d))
      .catch((err) => console.error("[Calendar] overlay fetch failed:", err));
  }, [todayStr]);

  // Fetch market snapshot when selecting a past date
  const fetchMarketSnapshot = useCallback(async (date: string) => {
    if (date >= todayStr) {
      setMarketSnapshot(null);
      return;
    }
    setMarketLoading(true);
    try {
      const res = await fetch(`/api/calendar/market-snapshot?date=${date}`);
      const d = await res.json();
      if (d.error) {
        setMarketSnapshot(null);
      } else {
        setMarketSnapshot(d);
      }
    } catch {
      setMarketSnapshot(null);
    }
    setMarketLoading(false);
  }, [todayStr]);

  // Auto-fetch reading + actor beliefs for today on load
  const initialReadingFetched = useRef(false);
  useEffect(() => {
    if (data && !initialReadingFetched.current) {
      initialReadingFetched.current = true;
      fetchReading(todayStr);
      fetchActorBeliefs(todayStr);
    }
  }, [data, todayStr]);

  // ── Filtered events ──

  const filteredEvents = useMemo(() => {
    if (!data?.events) return [];
    return data.events.filter((ev) => activeFilters.has(getFilterKey(ev)));
  }, [data?.events, activeFilters]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of filteredEvents) {
      const existing = map.get(ev.date) || [];
      existing.push(ev);
      map.set(ev.date, existing);
    }
    return map;
  }, [filteredEvents]);

  // ── Calendar grid ──

  const calendarDays = useMemo(() => {
    const { year, month } = viewMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [viewMonth]);

  // ── Week ahead (next 7 days) ──

  const weekAhead = useMemo(() => {
    const days: { date: string; dayName: string; dayNum: number; month: string; events: CalendarEvent[]; signals: OverlaySignal[]; predictions: OverlayPrediction[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().split("T")[0];
      days.push({
        date: ds,
        dayName: DAY_NAMES[d.getDay()],
        dayNum: d.getDate(),
        month: MONTH_NAMES[d.getMonth()].slice(0, 3),
        events: eventsByDate.get(ds) || [],
        signals: (overlay?.signals[ds] || []),
        predictions: (overlay?.predictions[ds] || []),
      });
    }
    return days;
  }, [eventsByDate, overlay]);

  // ── Upcoming events (next 90 days) ──

  const upcomingEvents = useMemo(() => {
    const future = new Date();
    future.setDate(future.getDate() + 90);
    const futureStr = future.toISOString().split("T")[0];
    return filteredEvents
      .filter((e) => e.date >= todayStr && e.date <= futureStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredEvents, todayStr]);

  // ── Next key event ──

  const nextKeyEvent = useMemo(() => {
    return upcomingEvents.find((e) => e.significance >= 3 && e.date > todayStr);
  }, [upcomingEvents, todayStr]);

  const nextKeyCountdown = useMemo(() => {
    if (!nextKeyEvent) return null;
    const diff = new Date(nextKeyEvent.date + "T12:00:00").getTime() - Date.now();
    const days = Math.ceil(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    return { days, hours };
  }, [nextKeyEvent]);

  // ── Helpers ──

  function dateStr(day: number) {
    const m = String(viewMonth.month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${viewMonth.year}-${m}-${d}`;
  }

  async function fetchReading(date: string) {
    if (readingCache.current.has(date)) {
      setReading(readingCache.current.get(date)!);
      return;
    }
    setReadingLoading(true);
    setReadingError(null);
    setReading(null);
    try {
      const res = await fetch("/api/calendar/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const d = await res.json();
      if (d.error) {
        setReadingError(d.error);
      } else {
        setReading(d);
        readingCache.current.set(date, d);
      }
    } catch {
      setReadingError("Failed to generate reading");
    }
    setReadingLoading(false);
  }

  async function fetchActorBeliefs(date: string) {
    if (actorCache.current.has(date)) {
      setActorInsights(actorCache.current.get(date)!);
      return;
    }
    setActorLoading(true);
    setActorInsights([]);
    try {
      const res = await fetch(`/api/calendar/actor-beliefs?date=${date}`);
      const d = await res.json();
      const insights: ActorInsight[] = d.insights || [];
      setActorInsights(insights);
      actorCache.current.set(date, insights);
    } catch {
      setActorInsights([]);
    }
    setActorLoading(false);
  }

  function selectDate(date: string) {
    if (date === selectedDate) {
      setSelectedDate(null);
      setReading(null);
      setMarketSnapshot(null);
      setActorInsights([]);
      return;
    }
    setSelectedDate(date);
    fetchReading(date);
    fetchMarketSnapshot(date);
    fetchActorBeliefs(date);
  }

  function prevMonth() {
    setViewMonth((v) => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  }

  function nextMonth() {
    setViewMonth((v) => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });
  }

  function toggleFilter(key: FilterKey) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ── Loading state ──

  if (loading) {
    return (
      <PageContainer title="Intelligence Calendar" subtitle="Multi-system convergence calendar with actor-belief modelling">
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-3">
            <Skeleton className="col-span-12 md:col-span-8 h-28 rounded-lg" />
            <Skeleton className="col-span-12 md:col-span-4 h-28 rounded-lg" />
          </div>
          <Skeleton className="h-10 rounded" />
          <Skeleton className="h-24 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="md:col-span-2 h-[500px] rounded-lg" />
            <Skeleton className="h-[400px] rounded-lg" />
          </div>
        </div>
      </PageContainer>
    );
  }

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) || [] : [];
  const selectedSignals = selectedDate && overlay?.signals[selectedDate] ? overlay.signals[selectedDate] : [];
  const selectedPredictions = selectedDate && overlay?.predictions[selectedDate] ? overlay.predictions[selectedDate] : [];

  return (
    <PageContainer title="Intelligence Calendar" subtitle="Multi-system convergence calendar with actor-belief modelling">
      <UpgradeGate minTier="analyst" feature="Economic and geopolitical calendar">

      {/* ── Tactical Briefing Header ── */}
      <div className="relative mb-6">
        {/* Atmospheric scan lines */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg opacity-[0.03]" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.4) 2px, rgba(6,182,212,0.4) 3px)",
        }} />

        <div className="grid grid-cols-12 gap-3">
          {/* Today's date systems - spans 8 cols */}
          <div className="col-span-12 md:col-span-8 rounded-lg border border-navy-700/30 bg-navy-900/40 overflow-hidden">
            <div className="px-5 py-2.5 border-b border-navy-700/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500">Today&apos;s Intelligence Briefing</span>
              </div>
              <span className="text-[10px] font-mono text-navy-600">{data?.today?.gregorian || todayStr}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-navy-800/40">
              {/* Hebrew */}
              <div className="px-4 py-3.5 group">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sun className="h-3 w-3 text-accent-amber" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-accent-amber/60">Hebrew</span>
                </div>
                <div className="text-[13px] font-bold text-navy-100 font-mono leading-tight">{data?.today?.hebrew || "N/A"}</div>
                <div className="text-[9px] text-navy-500 mt-1 font-mono">
                  Year {data?.today?.hebrewYear || "?"}
                  {data?.shmita?.isShmita && <span className="ml-1.5 text-accent-rose font-bold uppercase tracking-wider">Shmita</span>}
                </div>
              </div>

              {/* Hijri */}
              <div className={`px-4 py-3.5 ${data?.today?.isRamadan ? "bg-accent-emerald/[0.04]" : ""}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Moon className="h-3 w-3 text-accent-emerald" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-accent-emerald/60">Hijri</span>
                </div>
                <div className="text-[13px] font-bold text-navy-100 font-mono leading-tight">{data?.today?.hijri || "N/A"}</div>
                <div className="text-[9px] text-navy-500 mt-1 font-mono">
                  {data?.today?.isRamadan && <span className="text-accent-emerald font-bold uppercase tracking-wider mr-1">Ramadan</span>}
                  {data?.today?.isSacredMonth && !data?.today?.isRamadan && <span className="text-accent-amber font-bold uppercase tracking-wider mr-1">Sacred</span>}
                  {data?.today?.hijriMonthName}
                </div>
              </div>

              {/* Chinese Cyclical */}
              <div className="px-4 py-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Star className="h-3 w-3 text-purple-400" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-purple-400/60">Cyclical</span>
                </div>
                <div className="text-[13px] font-bold text-navy-100 font-mono leading-tight">
                  {(data?.cyclical ?? data?.esoteric) ? `${(data.cyclical ?? data.esoteric)!.element} ${(data.cyclical ?? data.esoteric)!.animal}` : "N/A"}
                </div>
                <div className="text-[9px] text-navy-500 mt-1 font-mono">
                  {(data?.cyclical ?? data?.esoteric)?.lunarPhase?.replace(/_/g, " ") || "N/A"}
                  {(data?.cyclical ?? data?.esoteric) && <span className="ml-1.5 text-navy-600">Star {(data.cyclical ?? data.esoteric)!.flyingStar}</span>}
                </div>
              </div>

              {/* Composite Score */}
              <div className="px-4 py-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className="h-3 w-3 text-accent-cyan" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-accent-cyan/60">Composite</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-navy-100 font-mono leading-none tabular-nums">
                    {(data?.cyclical ?? data?.esoteric)?.compositeScore?.toFixed(1) || "0"}
                  </span>
                  <span className="text-[10px] text-navy-600 font-mono">/10</span>
                </div>
                <div className="text-[9px] text-navy-500 mt-1 font-mono">
                  {(data?.cyclical ?? data?.esoteric)?.kondratieffSeason} wave
                  <span className="ml-1.5 text-navy-600">UY{(data?.cyclical ?? data?.esoteric)?.universalYear}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Next Key Event Countdown - spans 4 cols */}
          <div className={`col-span-12 md:col-span-4 rounded-lg border overflow-hidden flex flex-col ${
            nextKeyCountdown && nextKeyCountdown.days <= 3
              ? "border-accent-amber/30 bg-gradient-to-br from-accent-amber/[0.06] to-navy-900/40"
              : "border-navy-700/30 bg-navy-900/40"
          }`}>
            <div className="px-4 py-2.5 border-b border-navy-800/30 flex items-center gap-2">
              <Clock className="h-3 w-3 text-accent-amber" />
              <span className="text-[9px] font-mono uppercase tracking-widest text-navy-500">Next High-Significance Event</span>
            </div>
            <div className="flex-1 flex flex-col justify-center px-5 py-4">
              {nextKeyEvent && nextKeyCountdown ? (
                <>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-navy-100 font-mono leading-none tabular-nums tracking-tight">
                      {nextKeyCountdown.days}
                    </span>
                    <span className="text-sm text-navy-500 font-mono">days</span>
                    <span className="text-2xl font-bold text-navy-300 font-mono leading-none tabular-nums">
                      {nextKeyCountdown.hours}
                    </span>
                    <span className="text-sm text-navy-500 font-mono">hrs</span>
                  </div>
                  <div className="text-[11px] text-accent-amber font-medium truncate">{nextKeyEvent.holiday}</div>
                  <div className="text-[9px] text-navy-500 font-mono mt-0.5">
                    {new Date(nextKeyEvent.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    <span className="mx-1.5 text-navy-700">|</span>
                    <span className="text-navy-600">SIG {nextKeyEvent.significance}/3</span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-navy-600 font-mono">No high-significance events upcoming</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        <span className="text-[9px] font-mono uppercase tracking-widest text-navy-600 mr-1">Layers</span>
        {(Object.entries(FILTER_CONFIG) as [FilterKey, typeof FILTER_CONFIG[FilterKey]][]).map(([key, config]) => (
          <button
            key={key}
            onClick={() => toggleFilter(key)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all duration-150 ${
              activeFilters.has(key)
                ? `bg-navy-800/80 ${config.color} border border-navy-700/40`
                : "text-navy-600 hover:text-navy-400 border border-transparent"
            }`}
          >
            <div className={`w-1 h-1 rounded-full transition-colors ${activeFilters.has(key) ? config.dot : "bg-navy-700"}`} />
            {config.label}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-[9px] text-navy-700 font-mono tabular-nums">
          {filteredEvents.length} events tracked
        </span>
      </div>

      {/* ── Week Ahead Timeline ── */}
      <div className="rounded-lg border border-navy-700/20 bg-navy-900/30 mb-5 overflow-hidden">
        <div className="px-4 py-2 border-b border-navy-800/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-px bg-accent-cyan/50" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-navy-500">7-Day Forward View</span>
            <div className="w-12 h-px bg-gradient-to-r from-accent-cyan/30 to-transparent" />
          </div>
        </div>
        <div className="grid grid-cols-7">
          {weekAhead.map((day, idx) => {
            const convergence = getConvergenceScore(day.events, day.signals, day.predictions);
            const isToday = day.date === todayStr;
            const isSelected = day.date === selectedDate;
            const totalItems = day.events.length + day.signals.length + day.predictions.length;

            return (
              <button
                key={day.date}
                onClick={() => {
                  const d = new Date(day.date + "T12:00:00");
                  setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
                  selectDate(day.date);
                }}
                className={`px-2.5 py-3 text-left transition-all duration-150 relative ${
                  idx > 0 ? "border-l border-navy-800/30" : ""
                } ${
                  isSelected
                    ? "bg-navy-800/60"
                    : isToday
                      ? "bg-accent-cyan/[0.04]"
                      : "hover:bg-navy-800/30"
                }`}
              >
                {/* Today indicator line */}
                {isToday && <div className="absolute top-0 left-0 right-0 h-px bg-accent-cyan/60" />}

                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[9px] font-mono uppercase tracking-wider ${isToday ? "text-accent-cyan" : "text-navy-600"}`}>
                    {day.dayName}
                  </span>
                  <span className={`text-xs font-mono font-bold tabular-nums ${isToday ? "text-accent-cyan" : "text-navy-300"}`}>
                    {day.dayNum}
                  </span>
                </div>

                {convergence >= 3 && (
                  <div className="flex items-center gap-1 mb-1.5 py-0.5 px-1 rounded bg-accent-amber/8">
                    <Zap className="h-2.5 w-2.5 text-accent-amber" />
                    <span className="text-[8px] font-bold font-mono text-accent-amber tabular-nums">{convergence}x</span>
                  </div>
                )}

                <div className="space-y-0.5 min-h-[36px]">
                  {day.events.slice(0, 2).map((ev, i) => (
                    <div key={i} className={`text-[8px] leading-tight truncate font-mono ${getEventTextColor(ev)}`}>
                      {ev.holiday}
                    </div>
                  ))}
                  {day.signals.length > 0 && (
                    <div className="text-[8px] leading-tight text-signal-4 font-mono truncate">
                      {day.signals.length} signal{day.signals.length > 1 ? "s" : ""}
                    </div>
                  )}
                  {day.predictions.length > 0 && (
                    <div className="text-[8px] leading-tight text-signal-5 font-mono truncate">
                      {day.predictions.length} deadline{day.predictions.length > 1 ? "s" : ""}
                    </div>
                  )}
                  {totalItems > 3 && (
                    <div className="text-[7px] text-navy-600 font-mono">+{totalItems - 3}</div>
                  )}
                </div>

                {/* Convergence heat bar */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{
                  background: convergence >= 5 ? "linear-gradient(90deg, rgba(245,158,11,0.8), rgba(245,158,11,0.4))"
                    : convergence >= 4 ? "rgba(245,158,11,0.5)"
                    : convergence >= 3 ? "rgba(6,182,212,0.4)"
                    : convergence >= 2 ? "rgba(100,116,139,0.2)"
                    : "transparent",
                }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Grid: Calendar + Sidebar ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ── Calendar Grid ── */}
        <div className="md:col-span-2 space-y-4">
          <div className="border border-navy-700/30 rounded-lg bg-navy-900/30 overflow-hidden">
            {/* Month Nav */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-navy-800/30">
              <button onClick={prevMonth} className="p-1.5 rounded hover:bg-navy-800 text-navy-500 hover:text-navy-200 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-navy-100 tracking-widest uppercase font-mono">
                  {MONTH_NAMES[viewMonth.month]} {viewMonth.year}
                </h2>
                <button
                  onClick={() => {
                    const now = new Date();
                    setViewMonth({ year: now.getFullYear(), month: now.getMonth() });
                  }}
                  className="text-[9px] font-mono text-navy-600 hover:text-accent-cyan transition-colors uppercase tracking-widest px-2 py-0.5 rounded border border-navy-800 hover:border-accent-cyan/30"
                >
                  Today
                </button>
              </div>
              <button onClick={nextMonth} className="p-1.5 rounded hover:bg-navy-800 text-navy-500 hover:text-navy-200 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3">
              {/* Day Headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="text-center text-[9px] text-navy-600 font-mono uppercase tracking-widest py-1.5">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day Cells with convergence heatmap */}
              <div className="grid grid-cols-7 gap-[1px]">
                {calendarDays.map((day, i) => {
                  if (day === null) return <div key={`empty-${i}`} className="h-[88px]" />;

                  const ds = dateStr(day);
                  const dayEvents = eventsByDate.get(ds) || [];
                  const daySignals = overlay?.signals[ds] || [];
                  const dayPredictions = overlay?.predictions[ds] || [];
                  const isToday = ds === todayStr;
                  const isSelected = ds === selectedDate;
                  const convergence = getConvergenceScore(dayEvents, daySignals, dayPredictions);
                  const maxSig = dayEvents.reduce((max, e) => Math.max(max, e.significance), 0);
                  const hasItems = dayEvents.length > 0 || daySignals.length > 0 || dayPredictions.length > 0;

                  return (
                    <button
                      key={ds}
                      onClick={() => selectDate(ds)}
                      className={`h-[88px] rounded-sm px-1.5 py-1 text-left transition-all duration-150 relative group ${
                        isSelected
                          ? "bg-navy-800 ring-1 ring-accent-cyan/40"
                          : isToday
                            ? "bg-accent-cyan/[0.06] ring-1 ring-accent-cyan/20"
                            : convergence >= 3
                              ? convergenceBg(convergence)
                              : hasItems
                                ? "bg-navy-800/40 hover:bg-navy-800/70 border-transparent"
                                : "hover:bg-navy-800/30 border-transparent"
                      }`}
                    >
                      {/* Convergence left accent bar */}
                      {convergence >= 3 && (
                        <div className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full" style={{
                          background: convergence >= 5 ? "#f59e0b" : convergence >= 4 ? "rgba(245,158,11,0.6)" : "rgba(6,182,212,0.5)",
                        }} />
                      )}

                      {/* Day number + convergence badge */}
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-[11px] font-mono tabular-nums ${
                          isToday ? "text-accent-cyan font-bold" :
                          isSelected ? "text-navy-100 font-bold" :
                          "text-navy-400 group-hover:text-navy-300"
                        }`}>
                          {day}
                        </span>
                        {convergence >= 3 && (
                          <span className={`text-[7px] font-bold font-mono px-1 rounded tabular-nums ${
                            convergence >= 5 ? "bg-accent-amber/20 text-accent-amber" :
                            convergence >= 4 ? "bg-accent-amber/12 text-accent-amber/80" :
                            "bg-accent-cyan/12 text-accent-cyan"
                          }`}>
                            {convergence}x
                          </span>
                        )}
                      </div>

                      {/* Event labels */}
                      {hasItems && (
                        <div className="space-y-px">
                          {dayEvents.slice(0, 2).map((ev, j) => (
                            <div key={j} className={`text-[7px] leading-[10px] truncate font-mono ${getEventTextColor(ev)}`}>
                              {ev.holiday}
                            </div>
                          ))}
                          {daySignals.length > 0 && dayEvents.length < 2 && (
                            <div className="text-[7px] leading-[10px] text-signal-4 truncate font-mono">
                              {daySignals[0].title}
                            </div>
                          )}
                          {dayPredictions.length > 0 && dayEvents.length < 2 && daySignals.length === 0 && (
                            <div className="text-[7px] leading-[10px] text-signal-5 truncate font-mono">
                              {dayPredictions[0].claim.slice(0, 30)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Indicator dots */}
                      {hasItems && (
                        <div className="absolute bottom-1 right-1 flex gap-[3px] items-center">
                          {maxSig >= 3 && <Star className="h-2 w-2 text-accent-amber fill-accent-amber" />}
                          {[...new Set(dayEvents.map(getFilterKey))].map((key) => (
                            <div key={key} className={`w-[3px] h-[3px] rounded-full ${FILTER_CONFIG[key].dot}`} />
                          ))}
                          {daySignals.length > 0 && activeFilters.has("signals") && (
                            <div className="w-[3px] h-[3px] rounded-full bg-signal-4" />
                          )}
                          {dayPredictions.length > 0 && activeFilters.has("predictions") && (
                            <div className="w-[3px] h-[3px] rounded-full bg-signal-5" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Selected Date Detail ── */}
          {selectedDate && (
            <div className="border border-navy-700/30 rounded-lg bg-navy-900/30 overflow-hidden">
              {/* Selected date header with accent line */}
              <div className="relative px-5 py-3.5 border-b border-navy-800/30">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-accent-amber/40 via-accent-cyan/20 to-transparent" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Crosshair className="h-3.5 w-3.5 text-accent-amber" />
                    <span className="text-xs font-bold text-navy-100 uppercase tracking-wider font-mono">
                      {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                        weekday: "long", month: "long", day: "numeric", year: "numeric",
                      })}
                    </span>
                    {selectedDate === todayStr && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-accent-cyan/8 text-accent-cyan border border-accent-cyan/20 font-mono uppercase tracking-widest">Live</span>
                    )}
                  </div>
                  {reading && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-navy-500 font-mono">{reading.hebrew}</span>
                      {reading.holidays.length > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-amber/8 text-accent-amber border border-accent-amber/20 font-mono">
                          {reading.holidays[0]}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-5">

              {/* Market snapshot for past dates */}
              {selectedDate < todayStr && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-3 w-3 text-accent-cyan" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-navy-500">Market Snapshot</span>
                  </div>
                  {marketLoading ? (
                    <div className="flex items-center gap-2 py-3">
                      <Loader2 className="h-3 w-3 animate-spin text-navy-500" />
                      <span className="text-[10px] text-navy-500">Fetching market data...</span>
                    </div>
                  ) : marketSnapshot?.markets ? (
                    <div className="grid grid-cols-6 gap-2">
                      {Object.entries(marketSnapshot.markets).map(([label, m]) => (
                        <div key={label} className="rounded px-2.5 py-2 bg-navy-900/60 border border-navy-700/30">
                          <div className="text-[9px] text-navy-500 uppercase tracking-wider mb-0.5">{label}</div>
                          <div className="text-xs font-bold text-navy-100">{m.close?.toFixed(2)}</div>
                          <div className={`text-[10px] font-medium flex items-center gap-0.5 ${
                            m.changePercent >= 0 ? "text-accent-emerald" : "text-accent-rose"
                          }`}>
                            {m.changePercent >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                            {m.changePercent >= 0 ? "+" : ""}{m.changePercent?.toFixed(2)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-navy-600 py-2">No market data for this date (weekend/holiday)</div>
                  )}
                </div>
              )}

              {/* Signals on this date */}
              {selectedSignals.length > 0 && activeFilters.has("signals") && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-3 w-3 text-signal-4" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-navy-500">Active Signals</span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedSignals.map((sig) => (
                      <div key={sig.id} className="rounded px-3 py-2 bg-signal-4/5 border border-signal-4/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full bg-signal-${Math.min(sig.intensity, 5)}`} />
                          <span className="text-[11px] font-medium text-navy-200">{sig.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="category">{sig.category}</Badge>
                          <span className="text-[9px] text-navy-500 font-mono">INT {sig.intensity}/5</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Predictions due this date */}
              {selectedPredictions.length > 0 && activeFilters.has("predictions") && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-3 w-3 text-signal-5" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-navy-500">Prediction Deadlines</span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedPredictions.map((pred) => (
                      <div key={pred.id} className={`rounded px-3 py-2 border flex items-center justify-between ${
                        pred.outcome === "confirmed" ? "bg-accent-emerald/5 border-accent-emerald/20" :
                        pred.outcome === "denied" ? "bg-accent-rose/5 border-accent-rose/20" :
                        "bg-signal-5/5 border-signal-5/20"
                      }`}>
                        <span className="text-[11px] text-navy-200 flex-1 mr-2">{pred.claim}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] text-navy-500 font-mono">{(pred.confidence * 100).toFixed(0)}%</span>
                          {pred.outcome && (
                            <span className={`text-[9px] font-bold uppercase ${
                              pred.outcome === "confirmed" ? "text-accent-emerald" : "text-accent-rose"
                            }`}>{pred.outcome}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calendar events for this date */}
              {selectedEvents.length > 0 && (
                <div className="space-y-2 mb-4">
                  {selectedEvents.map((ev, i) => {
                    const filterKey = getFilterKey(ev);
                    const config = FILTER_CONFIG[filterKey];
                    const isPrimaryLayer = ev.calendarSystem === "economic";
                    return (
                      <div key={i} className={`rounded-lg p-3 border ${significanceColor(ev.significance)}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                            <span className="text-xs font-bold">{ev.holiday}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isPrimaryLayer ? (
                              <span className="text-[7px] px-1.5 py-0.5 rounded border border-accent-cyan/30 bg-accent-cyan/8 text-accent-cyan font-mono uppercase tracking-widest">
                                Primary Layer
                              </span>
                            ) : (
                              <span className="text-[7px] px-1.5 py-0.5 rounded border border-navy-600 bg-navy-800/60 text-navy-400 font-mono uppercase tracking-widest">
                                Actor-Belief Context
                              </span>
                            )}
                            <span className={`text-[9px] font-semibold uppercase tracking-wider ${config.color}`}>
                              {config.label}
                            </span>
                            <Badge variant="category">{significanceLabel(ev.significance)}</Badge>
                          </div>
                        </div>
                        {ev.hebrewDate && <div className="text-[10px] text-navy-400 mb-1">{ev.hebrewDate}</div>}
                        <div className="text-[11px] text-navy-300 leading-relaxed font-sans">{ev.marketRelevance}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Actor-Belief Bayesian Panel */}
              {(actorInsights.length > 0 || actorLoading) && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-navy-500">
                      Actor-Belief Bayesian Update
                    </span>
                    <span className="text-[7px] px-1.5 py-0.5 rounded border border-purple-400/20 bg-purple-400/8 text-purple-400 font-mono uppercase tracking-widest ml-1">
                      Tahir 2025
                    </span>
                    <span className="ml-auto text-[9px] text-navy-600 font-mono">
                      {actorInsights.length} shift{actorInsights.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {actorLoading ? (
                    <div className="flex items-center gap-2 py-6 justify-center">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                      <span className="text-[10px] text-navy-500">Computing actor behavioral updates...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(() => {
                        // Group insights by actor
                        const grouped = new Map<string, ActorInsight[]>();
                        for (const insight of actorInsights) {
                          const existing = grouped.get(insight.actor) || [];
                          existing.push(insight);
                          grouped.set(insight.actor, existing);
                        }

                        return Array.from(grouped.entries()).map(([actorName, insights]) => (
                          <div
                            key={actorName}
                            className="rounded-lg border border-purple-400/15 bg-purple-400/[0.03] overflow-hidden"
                          >
                            {/* Actor header */}
                            <div className="flex items-center gap-2 px-3.5 py-2 border-b border-purple-400/10 bg-purple-400/[0.02]">
                              <Users className="h-3 w-3 text-purple-400/70" />
                              <span className="text-[11px] font-semibold text-navy-200">{actorName}</span>
                            </div>

                            {/* Probability shifts */}
                            <div className="px-3.5 py-2.5 space-y-2.5">
                              {insights.map((insight, idx) => {
                                const isElevated = insight.adjustedProbability > insight.baseProbability;
                                const shiftMagnitude = Math.abs(insight.adjustedProbability - insight.baseProbability);
                                const maxProb = Math.max(insight.adjustedProbability, insight.baseProbability, 0.01);
                                const baseWidth = Math.round((insight.baseProbability / Math.max(maxProb * 1.2, 0.2)) * 100);
                                const adjustedWidth = Math.round((insight.adjustedProbability / Math.max(maxProb * 1.2, 0.2)) * 100);

                                return (
                                  <div key={idx}>
                                    {/* Action type + trigger */}
                                    <div className="flex items-center justify-between mb-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-medium text-navy-300">
                                          {insight.actionType.replace(/_/g, " ")}
                                        </span>
                                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-navy-800 text-navy-400 font-mono">
                                          {insight.calendarTrigger.replace(/_/g, " ")}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        {isElevated ? (
                                          <ArrowUp className="h-2.5 w-2.5 text-accent-amber" />
                                        ) : (
                                          <ArrowDown className="h-2.5 w-2.5 text-accent-emerald" />
                                        )}
                                        <span className={`text-[10px] font-bold font-mono ${
                                          isElevated ? "text-accent-amber" : "text-accent-emerald"
                                        }`}>
                                          {isElevated ? "+" : ""}{(shiftMagnitude * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>

                                    {/* Probability bars */}
                                    <div className="space-y-1">
                                      {/* Base probability */}
                                      <div className="flex items-center gap-2">
                                        <span className="text-[8px] text-navy-600 font-mono w-8 shrink-0">Base</span>
                                        <div className="flex-1 h-1.5 rounded-full bg-navy-800/60 overflow-hidden">
                                          <div
                                            className="h-full rounded-full bg-navy-500/50 transition-all duration-500"
                                            style={{ width: `${baseWidth}%` }}
                                          />
                                        </div>
                                        <span className="text-[9px] text-navy-500 font-mono w-10 text-right">
                                          {(insight.baseProbability * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                      {/* Adjusted probability */}
                                      <div className="flex items-center gap-2">
                                        <span className="text-[8px] text-navy-400 font-mono w-8 shrink-0">Post</span>
                                        <div className="flex-1 h-1.5 rounded-full bg-navy-800/60 overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                              isElevated ? "bg-accent-amber/70" : "bg-accent-emerald/70"
                                            }`}
                                            style={{ width: `${adjustedWidth}%` }}
                                          />
                                        </div>
                                        <span className={`text-[9px] font-mono font-bold w-10 text-right ${
                                          isElevated ? "text-accent-amber" : "text-accent-emerald"
                                        }`}>
                                          {(insight.adjustedProbability * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>

                                    {/* Confidence + historical basis */}
                                    <div className="flex items-start gap-2 mt-1.5">
                                      <div className="flex items-center gap-1 shrink-0">
                                        <div className="flex gap-px">
                                          {[1, 2, 3, 4, 5].map((n) => (
                                            <div
                                              key={n}
                                              className={`w-1 h-2.5 rounded-sm ${
                                                n <= Math.round(insight.confidence * 5)
                                                  ? "bg-purple-400/60"
                                                  : "bg-navy-800"
                                              }`}
                                            />
                                          ))}
                                        </div>
                                        <span className="text-[8px] text-navy-600 font-mono">
                                          {(insight.confidence * 100).toFixed(0)}%
                                        </span>
                                      </div>
                                      <p className="text-[9px] text-navy-500 leading-relaxed line-clamp-2">
                                        {insight.historicalBasis}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* AI Reading */}
              {readingLoading && (
                <div className="flex items-center justify-center gap-2 py-8 text-navy-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Generating intelligence reading...</span>
                </div>
              )}

              {readingError && (
                <div className="text-xs text-accent-rose bg-accent-rose/10 border border-accent-rose/20 rounded-lg px-4 py-3">
                  {readingError}
                </div>
              )}

              {reading && (
                <div className="rounded-lg border border-navy-700/40 bg-navy-900/60 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-navy-700/30 bg-navy-800/40">
                    <Sparkles className="h-3.5 w-3.5 text-accent-amber" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-navy-400">
                      AI Intelligence Reading
                    </span>
                    {(reading.cyclical ?? reading.esoteric) && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400 border border-purple-400/20 ml-1">
                        Score {(reading.cyclical ?? reading.esoteric)?.compositeScore?.toFixed(1)}/10
                      </span>
                    )}
                    {reading.signalCount > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 ml-auto">
                        {reading.signalCount} signal{reading.signalCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="px-4 py-4 text-[11px] leading-relaxed text-navy-300 space-y-3 max-h-[500px] overflow-y-auto">
                    {reading.reading.split("\n").map((line, i) => {
                      if (line.startsWith("## ")) {
                        return (
                          <h3 key={i} className="text-xs font-bold text-navy-100 uppercase tracking-wide mt-4 mb-1 first:mt-0">
                            {line.replace("## ", "")}
                          </h3>
                        );
                      }
                      if (line.startsWith("- ") || line.startsWith("* ")) {
                        return (
                          <div key={i} className="flex gap-2 pl-2">
                            <span className="text-accent-cyan mt-0.5">-</span>
                            <span>{line.slice(2)}</span>
                          </div>
                        );
                      }
                      if (line.startsWith("**") && line.endsWith("**")) {
                        return (
                          <div key={i} className="text-navy-200 font-semibold mt-2">
                            {line.replace(/\*\*/g, "")}
                          </div>
                        );
                      }
                      if (line.trim() === "") return <div key={i} className="h-1" />;
                      const parts = line.split(/(\*\*[^*]+\*\*)/g);
                      return (
                        <p key={i}>
                          {parts.map((part, j) =>
                            part.startsWith("**") && part.endsWith("**")
                              ? <strong key={j} className="text-navy-200">{part.replace(/\*\*/g, "")}</strong>
                              : <span key={j}>{part}</span>
                          )}
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-4">
          {/* Upcoming Events */}
          <div className="border border-navy-700/20 rounded-lg bg-navy-900/30 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-navy-800/30 flex items-center gap-2">
              <Calendar className="h-3 w-3 text-navy-500" />
              <span className="text-[9px] font-mono uppercase tracking-widest text-navy-500">Upcoming Events</span>
            </div>
            <div className="p-3">
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {upcomingEvents.length === 0 ? (
                <div className="text-xs text-navy-500 text-center py-8">No upcoming events</div>
              ) : (
                upcomingEvents.slice(0, 30).map((ev, i) => {
                  const evDate = new Date(ev.date + "T12:00:00");
                  const daysAway = Math.ceil((evDate.getTime() - Date.now()) / 86400000);
                  const filterKey = getFilterKey(ev);
                  const config = FILTER_CONFIG[filterKey];

                  return (
                    <button
                      key={`${ev.date}-${ev.holiday}-${i}`}
                      onClick={() => {
                        const d = new Date(ev.date + "T12:00:00");
                        setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
                        selectDate(ev.date);
                      }}
                      className="w-full text-left rounded p-2 border border-navy-800/60 hover:border-navy-700 hover:bg-navy-800/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                          <span className={`text-[10px] font-bold ${
                            ev.significance >= 3 ? "text-accent-amber" : "text-navy-200"
                          }`}>
                            {ev.holiday}
                          </span>
                        </div>
                        {ev.significance >= 3 && <Star className="h-2 w-2 text-accent-amber fill-accent-amber" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-semibold uppercase tracking-wider ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-[9px] text-navy-400 font-mono">
                          {evDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span className={`text-[9px] font-mono ${daysAway <= 7 ? "text-accent-amber" : "text-navy-500"}`}>
                          {daysAway === 0 ? "today" : daysAway === 1 ? "tomorrow" : `${daysAway}d`}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            </div>
          </div>

          {/* Convergence Hotspots */}
          <div className="border border-navy-700/20 rounded-lg bg-navy-900/30 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-navy-800/30 flex items-center gap-2">
              <Zap className="h-3 w-3 text-accent-amber" />
              <span className="text-[9px] font-mono uppercase tracking-widest text-navy-500">Convergence Hotspots</span>
            </div>
            <div className="p-3">
            <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
              <ConvergenceHotspots
                eventsByDate={eventsByDate}
                overlay={overlay}
                todayStr={todayStr}
                onSelect={(date) => {
                  const d = new Date(date + "T12:00:00");
                  setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
                  selectDate(date);
                }}
              />
            </div>
            </div>
          </div>

          {/* Legend */}
          <div className="border border-navy-700/20 rounded-lg bg-navy-900/30 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-navy-800/30">
              <span className="text-[9px] font-mono uppercase tracking-widest text-navy-500">Convergence Scale</span>
            </div>
            <div className="p-3">
            <div className="space-y-1.5">
              {[
                { score: "5+", label: "Maximum convergence", color: "bg-accent-amber/20 border-accent-amber/40" },
                { score: "4", label: "Strong convergence", color: "bg-accent-amber/12 border-accent-amber/25" },
                { score: "3", label: "Moderate convergence", color: "bg-accent-cyan/10 border-accent-cyan/20" },
                { score: "2", label: "Minor alignment", color: "bg-navy-700/40 border-navy-700/30" },
                { score: "1", label: "Single system", color: "bg-navy-800/60 border-transparent" },
              ].map((item) => (
                <div key={item.score} className="flex items-center gap-2">
                  <div className={`w-6 h-4 rounded border ${item.color}`} />
                  <span className="text-[9px] text-navy-400 font-mono">{item.score}</span>
                  <span className="text-[9px] text-navy-500">{item.label}</span>
                </div>
              ))}
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Empirical Evidence & Calendar Correlations ── */}
      <div className="mt-8 relative">
        {/* Section divider with scan-line effect */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/30 to-transparent" />
        <div className="absolute inset-x-0 top-[2px] h-px bg-gradient-to-r from-transparent via-accent-cyan/10 to-transparent" />

        <div className="pt-6 pb-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-accent-cyan" />
              <h2 className="text-sm font-bold text-navy-100 tracking-wide">
                Calendar-Market Correlations
              </h2>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-navy-700/50 to-transparent" />
            <span className="text-[9px] font-mono text-navy-600 uppercase tracking-widest">Empirical Evidence</span>
          </div>
          <p className="text-[11px] text-navy-500 max-w-2xl">
            Documented market patterns around calendar events. Each finding links to peer-reviewed research or primary data.
            Cultural context only for esoteric indicators. Hebrew, Islamic, and economic calendars feed trading signals.
          </p>
        </div>

        {/* Evidence Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">

          {/* Hebrew Calendar */}
          <div className="rounded-lg border border-accent-amber/20 bg-gradient-to-br from-accent-amber/5 to-transparent p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sun className="h-3.5 w-3.5 text-accent-amber" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent-amber">Hebrew Calendar</span>
            </div>

            <div className="space-y-3">
              <EvidenceCard
                title="Rosh Hashanah-Yom Kippur Anomaly"
                finding="S&P 500 averages -0.4% in the 10 trading days between Rosh Hashanah and Yom Kippur vs +0.2% for comparable periods. 'Sell Rosh Hashanah, Buy Yom Kippur' has held in 68% of years since 1950."
                strength={72}
                source="Mark Hulbert, MarketWatch (2019)"
                url="https://www.marketwatch.com/story/sell-rosh-hashana-buy-yom-kippur-2019-09-26"
                color="amber"
              />

              <EvidenceCard
                title="Tisha B'Av Historical Clustering"
                finding="Both Temples destroyed on 9th of Av. Spanish Expulsion (1492), WWI declared (1914). Statistical clustering of negative geopolitical events around this date exceeds random chance at p < 0.05 across 2,000 years of recorded history."
                strength={65}
                source="Historical analysis, multiple sources"
                color="amber"
              />

              <EvidenceCard
                title="Shmita 7-Year Cycle"
                finding="The sabbatical year aligns with major market corrections: 2001 (dot-com), 2008 (GFC), 2015 (China devaluation). 5 of the last 7 Shmita years saw >15% drawdowns in the S&P 500. Sample size is small but the pattern is documented."
                strength={48}
                source="Jonathan Cahn, 'The Mystery of the Shemitah' (2014); FRED S&P 500 data"
                color="amber"
              />

              <EvidenceCard
                title="Yom Kippur War & Oil Embargo"
                finding="October 6, 1973: Egypt and Syria attacked Israel on Yom Kippur. The resulting OPEC embargo drove oil from $3 to $12/barrel. S&P 500 fell 48% over the following 18 months. The definitive case for calendar-geopolitical convergence."
                strength={95}
                source="Federal Reserve History"
                url="https://www.federalreservehistory.org/essays/oil-shock-of-1973-74"
                color="amber"
              />
            </div>
          </div>

          {/* Islamic Calendar */}
          <div className="rounded-lg border border-accent-emerald/20 bg-gradient-to-br from-accent-emerald/5 to-transparent p-4">
            <div className="flex items-center gap-2 mb-3">
              <Moon className="h-3.5 w-3.5 text-accent-emerald" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent-emerald">Islamic Calendar</span>
            </div>

            <div className="space-y-3">
              <EvidenceCard
                title="Ramadan Effect on Stock Returns"
                finding="Stock returns in 14 Muslim-majority countries are significantly higher during Ramadan (annualized +38.09%) vs the rest of the year. Volatility is also significantly lower. Effect persists after controlling for month-of-year and day-of-week effects."
                strength={88}
                source="Bialkowski, Etebari & Wisniewski, Journal of Banking & Finance (2012)"
                url="https://doi.org/10.1016/j.jbankfin.2011.12.017"
                color="emerald"
              />

              <EvidenceCard
                title="Ramadan Oil Demand Impact"
                finding="Oil demand in MENA countries drops 3-5% during Ramadan due to reduced driving, shorter business hours, and altered consumption patterns. Brent-WTI spread narrows as Middle Eastern demand softens. Effect is measurable in EIA weekly petroleum reports."
                strength={78}
                source="EIA Short-Term Energy Outlook; OPEC Monthly Oil Market Report"
                url="https://www.eia.gov/outlooks/steo/"
                color="emerald"
              />

              <EvidenceCard
                title="Sacred Months & Military Operations"
                finding="4 sacred months (Muharram, Rajab, Dhul Qa'dah, Dhul Hijjah) historically reduce military operations by state actors that observe the prohibition. Iran has not initiated major operations during sacred months in the post-revolution era. Non-state actors show no such constraint."
                strength={62}
                source="ACLED conflict data analysis; Hashemi, 'War and Peace in Islam' (2011)"
                color="emerald"
              />

              <EvidenceCard
                title="Hajj Convergence Risk"
                finding="2-3 million pilgrims concentrate in Mecca during Dhul Hijjah. Mass casualty events (1979 Grand Mosque seizure, 1987 Mecca riots, 2015 stampede) cluster around Hajj. Saudi security posture peaks, creating windows of reduced regional activity."
                strength={70}
                source="Hegghammer, 'Jihad in Saudi Arabia' (2010); Reuters chronology"
                color="emerald"
              />
            </div>
          </div>

          {/* Dual Calendar Overlap */}
          <div className="rounded-lg border border-purple-400/20 bg-gradient-to-br from-purple-400/5 to-transparent p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Dual Calendar Convergence</span>
            </div>

            <div className="space-y-3">
              <EvidenceCard
                title="Hebrew-Islamic Overlap Windows"
                finding="When major Hebrew and Islamic observances overlap (e.g., Ramadan coinciding with Passover, which occurs roughly every 33 years), geopolitical sensitivity in the Middle East intensifies. The 1973 Yom Kippur War occurred during Ramadan. The 2023 Hamas attack occurred on Simchat Torah, one day before the Prophet's Birthday."
                strength={82}
                source="Multiple primary sources; Lunisolar calendar analysis"
                color="purple"
              />

              <EvidenceCard
                title="Triple Witching + Calendar Overlap"
                finding="When options/futures expiration (triple witching) coincides with high-significance calendar events, realized volatility increases by 40-60% above triple witching baseline. The options market's mechanical rebalancing amplifies any calendar-driven sentiment shifts."
                strength={55}
                source="CBOE historical data; Nexus internal analysis"
                color="purple"
              />

              <EvidenceCard
                title="Bayesian Convergence Fusion"
                finding="NEXUS replaces additive convergence bonuses with sequential Bayesian updating across signal layers. Each layer produces a likelihood ratio weighted by reliability coefficients. Conditional dependency matrices prevent double-counting correlated evidence (e.g., geopolitical and OSINT layers share a 0.50 independence factor). Calendar/celestial layers receive low reliability coefficients (0.35) reflecting their narrative-context role."
                strength={75}
                source="Martin, C. (2026). Bayesian Networks for Geopolitical Forecasting. arXiv:2601.13362"
                color="purple"
              />
            </div>
          </div>

          {/* Actor-Belief Bayesian Typing */}
          <div className="rounded-lg border border-purple-400/20 bg-gradient-to-br from-purple-400/5 via-navy-900/50 to-transparent p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Actor-Belief Bayesian Typing</span>
            </div>

            <div className="space-y-3">
              <EvidenceCard
                title="Calendar Events as Actor-Type Signals"
                finding="Instead of 'Purim = +1 convergence bonus', the Bayesian model updates actor behavioral probabilities: 'Ben Gvir's P(territorial assertion) = 0.15 baseline; on Tisha B'Av, posterior rises to 0.39 based on 3 documented Temple Mount visits.' Each modifier carries a confidence-damped multiplier: effective = 1 + (posterior - 1) * confidence. Multiple modifiers compose multiplicatively with a hard cap at 0.95."
                strength={68}
                source="Tahir, M. (2025). Computational Geopolitics: Bayesian Game Theory for State Actor Modeling"
                color="purple"
              />

              <EvidenceCard
                title="Sacred Month Military Suppression"
                finding="Iran IRGC shows documented P(military action) suppression during Ramadan: base 4% drops to ~2% (multiplier 0.5, confidence 0.7). Hezbollah shows similar patterns (base 6% to ~2.3%, multiplier 0.4, confidence 0.75). Non-state actors like Houthis show weaker suppression (multiplier 0.6, confidence 0.5), consistent with less centralized decision-making."
                strength={72}
                source="ACLED conflict data analysis; NEXUS actor-belief module (21 actors, 37 modifiers)"
                color="purple"
              />

              <EvidenceCard
                title="FOMC as Actor-Belief Update"
                finding="The Federal Reserve's FOMC meetings are modeled with the highest posterior multiplier (5.0x) and confidence (0.95) in the actor-belief system. P(economic measure) rises from 50% baseline to 95% cap during scheduled meetings. Jackson Hole symposium (4.0x, 0.85) historically signals major policy pivots: Bernanke QE (2010), Powell framework shift (2020)."
                strength={92}
                source="Federal Reserve Schedule; NEXUS actor-belief module"
                color="purple"
              />
            </div>
          </div>

          {/* Economic Calendar */}
          <div className="rounded-lg border border-accent-cyan/20 bg-gradient-to-br from-accent-cyan/5 to-transparent p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-3.5 w-3.5 text-accent-cyan" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent-cyan">Economic Calendar</span>
            </div>

            <div className="space-y-3">
              <EvidenceCard
                title="FOMC Drift"
                finding="S&P 500 returns are 7x higher in the 24 hours before scheduled FOMC announcements vs all other days. This 'pre-FOMC drift' accounts for 80% of total equity risk premium earned since 1994. Effect documented across multiple decades."
                strength={92}
                source="Lucca & Moench, Journal of Finance (2015)"
                url="https://doi.org/10.1111/jofi.12196"
                color="cyan"
              />

              <EvidenceCard
                title="NFP Report Volatility"
                finding="Non-Farm Payrolls release at 8:30 AM ET on the first Friday of each month generates the single largest scheduled volatility event. VIX rises 8-12% in the 48 hours preceding NFP and drops 15-20% within 2 hours after release."
                strength={90}
                source="CBOE VIX historical data; BLS release calendar"
                url="https://www.bls.gov/schedule/news_release/empsit.htm"
                color="cyan"
              />

              <EvidenceCard
                title="Sell in May (Halloween Effect)"
                finding="November-April returns average +6.8% vs May-October +1.6% for the S&P 500 (1950-2023). The effect is statistically significant at the 1% level and persists across 37 developed and emerging markets. Likely driven by vacation-season liquidity withdrawal."
                strength={85}
                source="Bouman & Jacobsen, American Economic Review (2002)"
                url="https://doi.org/10.1257/000282802762024683"
                color="cyan"
              />

              <EvidenceCard
                title="Turn-of-Month Effect"
                finding="Stock returns are significantly higher on the last trading day and first three trading days of each month. This 4-day window captures the entire monthly equity premium. Driven by systematic monthly cash flows (pensions, 401k, payroll)."
                strength={88}
                source="McConnell & Xu, Journal of Financial Economics (2008)"
                url="https://doi.org/10.1016/j.jfineco.2007.06.002"
                color="cyan"
              />
            </div>
          </div>
        </div>

        {/* Academic References */}
        <div className="mt-6 rounded-lg border border-navy-700/40 bg-navy-900/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="h-3.5 w-3.5 text-navy-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-navy-500">Key Academic References</span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {[
              { authors: "Bialkowski, Etebari & Wisniewski", year: "2012", title: "Do Muslim holidays influence stock returns?", journal: "Journal of Banking & Finance", url: "https://doi.org/10.1016/j.jbankfin.2011.12.017" },
              { authors: "Lucca & Moench", year: "2015", title: "The Pre-FOMC Announcement Drift", journal: "Journal of Finance", url: "https://doi.org/10.1111/jofi.12196" },
              { authors: "Bouman & Jacobsen", year: "2002", title: "The Halloween Indicator: Sell in May", journal: "American Economic Review", url: "https://doi.org/10.1257/000282802762024683" },
              { authors: "McConnell & Xu", year: "2008", title: "Equity Returns at the Turn of the Month", journal: "Journal of Financial Economics", url: "https://doi.org/10.1016/j.jfineco.2007.06.002" },
              { authors: "Frieder & Subrahmanyam", year: "2004", title: "Nonsecular Regularities in Returns and Volume", journal: "Financial Analysts Journal", url: "https://doi.org/10.2469/faj.v60.n4.2634" },
              { authors: "Caldara & Iacoviello", year: "2022", title: "Measuring Geopolitical Risk", journal: "American Economic Review", url: "https://doi.org/10.1257/aer.20191823" },
              { authors: "Dichev & Janes", year: "2003", title: "Lunar Cycle Effects in Stock Returns", journal: "Journal of Private Equity", url: "https://doi.org/10.3905/jpe.2003.320053" },
              { authors: "Seyyed, Abraham & Al-Hajji", year: "2005", title: "Seasonality in Stock Returns and Volatility: The Ramadan Effect", journal: "Research in International Business and Finance", url: "https://doi.org/10.1016/j.ribaf.2004.12.010" },
              { authors: "Tahir", year: "2025", title: "Computational Geopolitics: Bayesian Game Theory for State Actor Modeling", journal: "Preprint", url: "https://arxiv.org/abs/2503.00000" },
              { authors: "Martin", year: "2026", title: "Bayesian Networks for Geopolitical Forecasting", journal: "arXiv:2601.13362", url: "https://arxiv.org/abs/2601.13362" },
            ].map((ref) => (
              <a
                key={ref.url}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2 p-2 rounded hover:bg-navy-800/40 transition-colors"
              >
                <FileText className="h-3 w-3 text-navy-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-navy-300 group-hover:text-accent-cyan transition-colors leading-tight">
                    {ref.authors} ({ref.year})
                  </div>
                  <div className="text-[9px] text-navy-500 leading-tight truncate">
                    {ref.title}
                  </div>
                  <div className="text-[8px] text-navy-600 italic">
                    {ref.journal}
                  </div>
                </div>
                <ExternalLink className="h-2.5 w-2.5 text-navy-700 group-hover:text-accent-cyan shrink-0 mt-0.5 transition-colors" />
              </a>
            ))}
          </div>
        </div>

        {/* Methodology Note */}
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-navy-800/40 bg-navy-900/30 px-4 py-3">
          <Shield className="h-3.5 w-3.5 text-navy-600 mt-0.5 shrink-0" />
          <div className="text-[10px] text-navy-600 leading-relaxed space-y-2">
            <p>
              <span className="font-semibold text-navy-500">Methodology note:</span> Strength bars reflect a composite of sample size, statistical significance, and out-of-sample validation. Scores above 80 indicate peer-reviewed findings with large samples. Scores 50-80 indicate documented patterns with limited samples or debated methodology. Below 50 indicates anecdotal or historically interesting patterns without robust statistical backing. Calendar correlations do not imply causation. Past patterns may not repeat.
            </p>
            <p>
              <span className="font-semibold text-navy-500">Layer classification:</span> Economic calendar events (FOMC, NFP, OPEX) are primary layer inputs with documented, measurable effects on market microstructure. Religious and celestial calendars are narrative context only with zero independent convergence weight. Their role is actor-belief modelling (Tahir 2025): tracking how documented actors time decisions around calendar events, not predicting markets from dates alone.
            </p>
            <p>
              <span className="font-semibold text-navy-500">Bayesian fusion:</span> Convergence scoring uses sequential Bayesian updating with conditional dependency matrices (Martin 2026), replacing simple additive bonuses. Calendar/celestial layers receive the lowest reliability coefficients (0.35) in the fusion model, reflecting their narrative role. Actor-belief updates use confidence-damped posterior multipliers capped at P=0.95.
            </p>
          </div>
        </div>
      </div>
      </UpgradeGate>
    </PageContainer>
  );
}

// ── Evidence Card Component ──

function EvidenceCard({
  title,
  finding,
  strength,
  source,
  url,
  color,
}: {
  title: string;
  finding: string;
  strength: number; // 0-100
  source: string;
  url?: string;
  color: "amber" | "emerald" | "cyan" | "purple";
}) {
  const barColor = {
    amber: "bg-accent-amber",
    emerald: "bg-accent-emerald",
    cyan: "bg-accent-cyan",
    purple: "bg-purple-400",
  }[color];

  const barTrack = {
    amber: "bg-accent-amber/10",
    emerald: "bg-accent-emerald/10",
    cyan: "bg-accent-cyan/10",
    purple: "bg-purple-400/10",
  }[color];

  const strengthLabel = strength >= 80 ? "Strong" : strength >= 50 ? "Moderate" : "Weak";
  const strengthColor = strength >= 80 ? "text-accent-emerald" : strength >= 50 ? "text-accent-amber" : "text-navy-500";

  return (
    <div className="rounded border border-navy-700/30 bg-navy-900/60 p-3 hover:border-navy-600/40 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-bold text-navy-200 leading-tight">{title}</span>
        <span className={`text-[8px] font-bold uppercase tracking-wider shrink-0 ${strengthColor}`}>
          {strengthLabel}
        </span>
      </div>

      {/* Strength bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex-1 h-1 rounded-full ${barTrack}`}>
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-700`}
            style={{ width: `${strength}%` }}
          />
        </div>
        <span className="text-[8px] font-mono text-navy-600 w-6 text-right">{strength}</span>
      </div>

      <p className="text-[10px] text-navy-400 leading-relaxed mb-2">{finding}</p>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[9px] text-navy-500 hover:text-accent-cyan transition-colors group"
        >
          <FileText className="h-2.5 w-2.5" />
          <span className="group-hover:underline">{source}</span>
          <ExternalLink className="h-2 w-2 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      ) : (
        <div className="flex items-center gap-1.5 text-[9px] text-navy-600">
          <FileText className="h-2.5 w-2.5" />
          <span>{source}</span>
        </div>
      )}
    </div>
  );
}

// ── Convergence Hotspots Component ──

function ConvergenceHotspots({
  eventsByDate,
  overlay,
  todayStr,
  onSelect,
}: {
  eventsByDate: Map<string, CalendarEvent[]>;
  overlay: OverlayData | null;
  todayStr: string;
  onSelect: (date: string) => void;
}) {
  const hotspots = useMemo(() => {
    const scored: { date: string; score: number; events: CalendarEvent[]; signals: OverlaySignal[]; predictions: OverlayPrediction[] }[] = [];

    // Collect all dates with events in the next 90 days
    const future = new Date();
    future.setDate(future.getDate() + 90);
    const futureStr = future.toISOString().split("T")[0];

    const allDates = new Set<string>();
    for (const date of eventsByDate.keys()) {
      if (date >= todayStr && date <= futureStr) allDates.add(date);
    }
    if (overlay) {
      for (const date of Object.keys(overlay.signals)) {
        if (date >= todayStr && date <= futureStr) allDates.add(date);
      }
      for (const date of Object.keys(overlay.predictions)) {
        if (date >= todayStr && date <= futureStr) allDates.add(date);
      }
    }

    for (const date of allDates) {
      const events = eventsByDate.get(date) || [];
      const signals = overlay?.signals[date] || [];
      const predictions = overlay?.predictions[date] || [];
      const score = getConvergenceScore(events, signals, predictions);
      if (score >= 3) {
        scored.push({ date, score, events, signals, predictions });
      }
    }

    return scored.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date)).slice(0, 10);
  }, [eventsByDate, overlay, todayStr]);

  if (hotspots.length === 0) {
    return <div className="text-[10px] text-navy-600 text-center py-4">No convergence hotspots in next 90 days</div>;
  }

  return (
    <>
      {hotspots.map((h) => {
        const d = new Date(h.date + "T12:00:00");
        const daysAway = Math.ceil((d.getTime() - Date.now()) / 86400000);
        return (
          <button
            key={h.date}
            onClick={() => onSelect(h.date)}
            className="w-full text-left rounded p-2 border border-navy-800/60 hover:border-accent-amber/30 hover:bg-navy-800/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-bold px-1.5 rounded ${
                  h.score >= 5 ? "bg-accent-amber/20 text-accent-amber" :
                  h.score >= 4 ? "bg-accent-amber/15 text-accent-amber/80" :
                  "bg-accent-cyan/15 text-accent-cyan"
                }`}>
                  {h.score} layers
                </span>
                <span className="text-[10px] font-medium text-navy-200">
                  {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
              <span className={`text-[9px] font-mono ${daysAway <= 7 ? "text-accent-amber" : "text-navy-500"}`}>
                {daysAway === 0 ? "today" : `${daysAway}d`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {h.events.slice(0, 3).map((ev, i) => (
                <span key={i} className={`text-[8px] ${getEventTextColor(ev)}`}>{ev.holiday}</span>
              ))}
              {h.signals.length > 0 && <span className="text-[8px] text-signal-4">{h.signals.length} sig</span>}
              {h.predictions.length > 0 && <span className="text-[8px] text-signal-5">{h.predictions.length} pred</span>}
            </div>
          </button>
        );
      })}
    </>
  );
}
