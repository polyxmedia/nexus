"use client";

import { X } from "lucide-react";
import type { OsintEvent, OsintEventType } from "@/lib/warroom/types";

interface OsintEventModalProps {
  event: OsintEvent | null;
  onClose: () => void;
}

const EVENT_BADGE_STYLES: Record<OsintEventType, string> = {
  battles: "bg-signal-5/20 text-signal-5 border-signal-5/30",
  explosions: "bg-signal-4/20 text-signal-4 border-signal-4/30",
  violence_against_civilians: "bg-accent-rose/20 text-accent-rose border-accent-rose/30",
  protests: "bg-signal-3/20 text-signal-3 border-signal-3/30",
  riots: "bg-accent-amber/20 text-accent-amber border-accent-amber/30",
  strategic_developments: "bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30",
};

const EVENT_LABELS: Record<OsintEventType, string> = {
  battles: "Battle",
  explosions: "Explosion",
  violence_against_civilians: "Violence Against Civilians",
  protests: "Protest",
  riots: "Riot",
  strategic_developments: "Strategic Development",
};

export function OsintEventModal({ event, onClose }: OsintEventModalProps) {
  if (!event) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 animate-[slideUp_200ms_ease-out]">
      <div className="mx-auto max-w-3xl border-t border-x border-navy-700/60 rounded-t-lg bg-navy-950/95 backdrop-blur-md wr-shadow-lg">
        {/* Terminal header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-navy-800/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-accent-amber/60" />
              <div className="w-2 h-2 rounded-full bg-navy-700/60" />
              <div className="w-2 h-2 rounded-full bg-navy-700/60" />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-navy-500">
              osint event
            </span>
            <span className="font-mono text-[10px] text-navy-600">
              //
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${EVENT_BADGE_STYLES[event.eventType]}`}
            >
              {EVENT_LABELS[event.eventType]}
            </span>
            {event.fatalities > 0 && (
              <span className="text-[10px] text-signal-5 font-mono font-medium">
                {event.fatalities} fatalities
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-navy-500 hover:text-navy-300 hover:bg-navy-800/60 rounded p-1 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[30vh] overflow-y-auto">
          {/* Location header */}
          <div className="mb-3">
            <div className="text-sm font-semibold text-navy-100">
              {event.location}
            </div>
            <div className="text-[10px] text-navy-500 font-mono mt-0.5">
              {event.country} | {new Date(event.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })} | {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Actors */}
            {event.actors && (
              <section>
                <h4 className="text-[9px] uppercase tracking-wider text-navy-600 mb-1.5 font-mono">
                  Actors
                </h4>
                <p className="text-[11px] text-navy-300 leading-snug">{event.actors}</p>
              </section>
            )}

            {/* Details */}
            {event.notes && (
              <section className={event.actors ? "" : "col-span-2"}>
                <h4 className="text-[9px] uppercase tracking-wider text-navy-600 mb-1.5 font-mono">
                  Details
                </h4>
                <p className="text-[11px] text-navy-300 leading-relaxed">{event.notes}</p>
              </section>
            )}

            {/* Source */}
            {event.sourceUrl && (
              <section>
                <h4 className="text-[9px] uppercase tracking-wider text-navy-600 mb-1.5 font-mono">
                  Source
                </h4>
                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-accent-cyan hover:text-accent-cyan/80 transition-colors break-all font-mono"
                >
                  {event.source || event.sourceUrl}
                </a>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
