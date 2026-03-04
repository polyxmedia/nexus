"use client";

import { cn } from "@/lib/utils";
import type { OsintEvent, OsintEventType } from "@/lib/warroom/types";

interface OsintFeedProps {
  events: OsintEvent[];
  onEventClick: (event: OsintEvent) => void;
}

const EVENT_BORDER_COLORS: Record<OsintEventType, string> = {
  battles: "border-l-signal-5",
  explosions: "border-l-signal-4",
  violence_against_civilians: "border-l-accent-rose",
  protests: "border-l-signal-3",
  riots: "border-l-accent-amber",
  strategic_developments: "border-l-accent-cyan",
};

const EVENT_LABELS: Record<OsintEventType, string> = {
  battles: "Battle",
  explosions: "Explosion",
  violence_against_civilians: "Violence",
  protests: "Protest",
  riots: "Riot",
  strategic_developments: "Strategic",
};

export function OsintFeed({ events, onEventClick }: OsintFeedProps) {
  if (events.length === 0) {
    return (
      <div className="text-[10px] text-navy-500 text-center py-4">
        No OSINT events available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <button
          key={event.id}
          onClick={() => onEventClick(event)}
          className={cn(
            "w-full text-left block rounded-md border border-navy-700/30 bg-navy-800/40 px-3 py-2 border-l-2 transition-all duration-200 wr-card",
            EVENT_BORDER_COLORS[event.eventType] || "border-l-navy-600"
          )}
        >
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-navy-200 font-medium truncate mr-2">
              {event.location}
            </span>
            <span className="text-[10px] text-navy-500 uppercase tracking-wider shrink-0">
              {EVENT_LABELS[event.eventType]}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {event.country && (
              <span className="text-[10px] text-navy-400">{event.country}</span>
            )}
            {event.actors && (
              <span className="text-[10px] text-navy-500 truncate">{event.actors}</span>
            )}
            <span className="text-[10px] text-navy-500 ml-auto shrink-0">
              {new Date(event.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
            {event.fatalities > 0 && (
              <span className="text-[10px] text-signal-5 font-medium shrink-0">
                {event.fatalities} KIA
              </span>
            )}
          </div>
          {event.notes && event.notes !== event.location && (
            <p className="text-[10px] text-navy-500 mt-1 line-clamp-2 leading-relaxed">
              {event.notes}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}
