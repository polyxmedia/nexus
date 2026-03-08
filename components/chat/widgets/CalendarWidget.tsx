"use client";

import { Badge } from "@/components/ui/badge";

interface CalendarEvent {
  date: string;
  name: string;
  type: string;
  significance: string;
  marketRelevance: string;
}

interface CalendarData {
  daysAhead: number;
  eventCount: number;
  events: CalendarEvent[];
  error?: string;
}

const significanceStyles: Record<string, string> = {
  high: "bg-accent-rose/20 text-accent-rose border-accent-rose/30",
  medium: "bg-accent-amber/20 text-accent-amber border-accent-amber/30",
  low: "bg-navy-800 text-navy-400 border-navy-700",
};

export function CalendarWidget({ data }: { data: CalendarData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const events = data.events ?? [];

  // Group events by date
  const grouped: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    const key = event.date;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(event);
  }

  const dateKeys = Object.keys(grouped).sort();

  return (
    <div className="my-2 border border-navy-700 rounded bg-navy-900/80 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
          Economic Calendar
        </span>
        <Badge className="bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30">
          {data.eventCount} event{data.eventCount !== 1 ? "s" : ""}
        </Badge>
        <span className="text-[10px] font-mono text-navy-500">
          {data.daysAhead}d ahead
        </span>
      </div>

      <div className="space-y-3">
        {dateKeys.map((date) => (
          <div key={date}>
            <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono mb-1">
              {date}
            </div>
            <div className="space-y-1">
              {grouped[date].map((event, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 text-[11px] font-mono"
                >
                  <span className="text-navy-300 leading-snug">
                    {event.name}
                  </span>
                  <Badge
                    className={`shrink-0 text-[9px] ${significanceStyles[String(event.significance || "low").toLowerCase()] ?? significanceStyles.low}`}
                  >
                    {String(event.significance || "low")}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
