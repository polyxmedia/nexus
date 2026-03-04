"use client";

import * as Dialog from "@radix-ui/react-dialog";
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
    <Dialog.Root open={!!event} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 wr-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-navy-700/60 bg-navy-900/95 backdrop-blur-md p-6 wr-shadow-lg wr-modal-enter">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${EVENT_BADGE_STYLES[event.eventType]}`}
              >
                {EVENT_LABELS[event.eventType]}
              </span>
              {event.fatalities > 0 && (
                <span className="text-[10px] text-signal-5 font-medium">
                  {event.fatalities} fatalities
                </span>
              )}
            </div>
            <Dialog.Close asChild>
              <button className="text-navy-500 hover:text-navy-300 hover:bg-navy-800/60 rounded p-1 transition-colors wr-focus-ring">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Title className="text-sm font-semibold text-navy-100 mb-1">
            {event.location}
          </Dialog.Title>
          <Dialog.Description className="text-[10px] text-navy-500 mb-4">
            {event.country} | {new Date(event.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Dialog.Description>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {event.actors && (
              <section>
                <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                  Actors
                </h4>
                <p className="text-xs text-navy-200">{event.actors}</p>
              </section>
            )}

            {event.notes && (
              <section>
                <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                  Details
                </h4>
                <p className="text-xs text-navy-200 leading-relaxed">{event.notes}</p>
              </section>
            )}

            <section>
              <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                Coordinates
              </h4>
              <p className="text-xs text-navy-300 font-mono">
                {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
              </p>
            </section>

            {event.sourceUrl && (
              <section>
                <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                  Source
                </h4>
                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent-cyan hover:text-accent-cyan/80 transition-colors break-all"
                >
                  {event.source || event.sourceUrl}
                </a>
              </section>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
