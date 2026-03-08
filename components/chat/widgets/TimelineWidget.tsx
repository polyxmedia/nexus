"use client";

import {
  Activity,
  Target,
  TrendingUp,
  FileText,
  Bell,
  CheckCircle2,
  XCircle,
  CircleDot,
  Clock4,
  Clock,
} from "lucide-react";

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
  metadata?: Record<string, unknown>;
}

interface TimelineData {
  events: TimelineEntry[];
  count: number;
  error?: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  signal:     { icon: Activity,   color: "#f59e0b", label: "Signal" },
  prediction: { icon: Target,     color: "#8b5cf6", label: "Prediction" },
  trade:      { icon: TrendingUp, color: "#10b981", label: "Trade" },
  thesis:     { icon: FileText,   color: "#06b6d4", label: "Thesis" },
  alert:      { icon: Bell,       color: "#ef4444", label: "Alert" },
};

const SEVERITY_COLORS = ["", "bg-navy-700", "bg-accent-cyan/60", "bg-accent-amber/60", "bg-accent-rose/60", "bg-signal-5"];

function formatTimestamp(ts: string): { date: string; time: string } {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

function groupByDate(events: TimelineEntry[]) {
  return events.reduce<Record<string, TimelineEntry[]>>((acc, event) => {
    const { date } = formatTimestamp(event.timestamp);
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});
}

export function TimelineWidget({ data }: { data: TimelineData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded-lg bg-accent-rose/5 px-3 py-2.5 text-[11px] text-accent-rose">
        {data.error}
      </div>
    );
  }

  if (!data.events || data.events.length === 0) {
    return (
      <div className="my-2 flex items-center gap-2 border border-navy-700 rounded-lg bg-navy-900/60 px-3 py-2.5">
        <Clock className="h-3.5 w-3.5 text-navy-600" />
        <span className="text-[11px] text-navy-500">No timeline events found.</span>
      </div>
    );
  }

  const grouped = groupByDate(data.events);

  return (
    <div className="my-2 border border-navy-700/60 rounded-lg bg-navy-900/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-navy-800">
        <Clock className="h-3.5 w-3.5 text-accent-cyan opacity-70" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400">Timeline</span>
        <span className="ml-auto text-[9px] font-mono text-navy-600">{data.count} events</span>
      </div>

      {/* Timeline body */}
      <div className="px-4 py-3">
        <div className="relative">
          {/* Vertical spine */}
          <div className="absolute left-[5.5rem] top-0 bottom-0 w-px bg-navy-800" />

          {Object.entries(grouped).map(([date, dayEvents]) => (
            <div key={date} className="mb-5 last:mb-0">
              {/* Date header */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-[5.5rem] text-right">
                  <span className="text-[10px] font-semibold text-navy-400">{date}</span>
                </div>
                <div className="w-2 h-2 rounded-full border-2 border-accent-cyan bg-navy-950 z-10 shrink-0" />
                <span className="text-[9px] text-navy-600 font-mono">{dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Events */}
              <div className="space-y-1.5">
                {dayEvents.map((event) => {
                  const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.signal;
                  const Icon = config.icon;
                  const { time } = formatTimestamp(event.timestamp);
                  const outcome = event.metadata?.outcome as string | null | undefined;
                  const score = event.metadata?.score as number | null | undefined;
                  const isPrediction = event.type === "prediction";

                  const outcomeBorderClass = outcome === "confirmed"
                    ? "border-l-[3px] border-l-accent-emerald"
                    : outcome === "denied"
                      ? "border-l-[3px] border-l-accent-rose"
                      : outcome === "partial"
                        ? "border-l-[3px] border-l-accent-amber"
                        : "";

                  return (
                    <div key={event.id} className="flex items-start gap-3">
                      {/* Time */}
                      <div className="w-[5.5rem] text-right pt-2 shrink-0">
                        <span className="text-[9px] font-mono text-navy-600">{time}</span>
                      </div>

                      {/* Dot */}
                      <div className="flex items-center justify-center w-2 pt-2.5 z-10 shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
                      </div>

                      {/* Card */}
                      <div className={`flex-1 bg-navy-900/70 border border-navy-800 rounded-lg px-3 py-2 ${outcomeBorderClass}`}>
                        {/* Type row */}
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <Icon className="h-2.5 w-2.5 shrink-0" style={{ color: config.color }} />
                          <span className="text-[9px] font-mono font-semibold uppercase tracking-wider" style={{ color: config.color }}>
                            {config.label}
                          </span>
                          {event.category && (
                            <span className="text-[9px] text-navy-600 uppercase font-mono">{event.category}</span>
                          )}

                          {/* Prediction outcome badge */}
                          {isPrediction && outcome && (
                            <span className={`flex items-center gap-0.5 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full ${
                              outcome === "confirmed" ? "bg-accent-emerald/15 text-accent-emerald"
                                : outcome === "denied" ? "bg-accent-rose/15 text-accent-rose"
                                : outcome === "partial" ? "bg-accent-amber/15 text-accent-amber"
                                : "bg-navy-700/50 text-navy-400"
                            }`}>
                              {outcome === "confirmed" && <CheckCircle2 className="h-2.5 w-2.5" />}
                              {outcome === "denied" && <XCircle className="h-2.5 w-2.5" />}
                              {outcome === "partial" && <CircleDot className="h-2.5 w-2.5" />}
                              {outcome === "expired" && <Clock4 className="h-2.5 w-2.5" />}
                              {outcome}{score != null && ` · ${(score * 100).toFixed(0)}%`}
                            </span>
                          )}
                          {isPrediction && !outcome && (
                            <span className="flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-navy-800 text-navy-500">
                              <Clock4 className="h-2.5 w-2.5" />
                              pending
                            </span>
                          )}

                          {/* Severity pips */}
                          <div className="ml-auto flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-1 h-2.5 rounded-full ${i < event.severity ? SEVERITY_COLORS[event.severity] : "bg-navy-800"}`}
                              />
                            ))}
                          </div>
                        </div>

                        <h4 className="text-[11px] font-medium text-navy-100 leading-snug">{event.title}</h4>
                        {event.description && (
                          <p className="text-[10px] text-navy-500 mt-0.5 line-clamp-2 leading-relaxed">{event.description}</p>
                        )}
                        {event.sourceType && (
                          <p className="text-[9px] font-mono text-navy-700 mt-1">
                            {event.sourceType} #{event.sourceId}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
