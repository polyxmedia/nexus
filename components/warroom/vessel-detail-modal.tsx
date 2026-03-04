"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X, Ship, Eye } from "lucide-react";
import type { VesselState } from "@/lib/warroom/types";

interface VesselDetailModalProps {
  vessel: VesselState | null;
  onClose: () => void;
  onWatch?: (vessel: VesselState) => void;
  isWatched?: boolean;
}

const VESSEL_TYPE_LABELS: Record<string, string> = {
  military: "Military Vessel",
  tanker: "Oil/Gas Tanker",
  cargo: "Cargo Ship",
  passenger: "Passenger Vessel",
  fishing: "Fishing Vessel",
  other: "Other Vessel",
};

const VESSEL_TYPE_COLORS: Record<string, string> = {
  military: "text-accent-rose",
  tanker: "text-accent-amber",
  cargo: "text-navy-400",
  passenger: "text-accent-cyan",
  fishing: "text-accent-emerald",
  other: "text-navy-400",
};

export function VesselDetailModal({
  vessel,
  onClose,
  onWatch,
  isWatched,
}: VesselDetailModalProps) {
  if (!vessel) return null;

  return (
    <Dialog.Root open={!!vessel} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 wr-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-navy-700/60 bg-navy-900/95 backdrop-blur-md p-6 wr-shadow-lg wr-modal-enter">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${vessel.vesselType === "military" ? "bg-accent-rose/10" : "bg-accent-cyan/10"}`}>
                <Ship className={`h-5 w-5 ${VESSEL_TYPE_COLORS[vessel.vesselType] || "text-navy-400"}`} />
              </div>
              <div>
                <Dialog.Title className="text-sm font-semibold text-navy-100 font-mono">
                  {vessel.name}
                </Dialog.Title>
                <Dialog.Description className="text-[10px] text-navy-500 uppercase tracking-wider mt-0.5">
                  {VESSEL_TYPE_LABELS[vessel.vesselType] || "VESSEL"}
                </Dialog.Description>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onWatch && (
                <button
                  onClick={() => onWatch(vessel)}
                  className={`p-1.5 rounded transition-colors wr-focus-ring ${
                    isWatched
                      ? "bg-accent-cyan/15 text-accent-cyan"
                      : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/60"
                  }`}
                  title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}
              <Dialog.Close asChild>
                <button className="text-navy-500 hover:text-navy-300 hover:bg-navy-800/60 rounded p-1 transition-colors wr-focus-ring">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="space-y-4">
            {/* Identity */}
            <section>
              <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                Identity
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div className="text-navy-500">Name</div>
                <div className="text-navy-100 font-mono font-medium">{vessel.name}</div>
                <div className="text-navy-500">MMSI</div>
                <div className="text-navy-200 font-mono">{vessel.mmsi}</div>
                <div className="text-navy-500">Flag</div>
                <div className="text-navy-200">{vessel.flag}</div>
                <div className="text-navy-500">Type</div>
                <div className={VESSEL_TYPE_COLORS[vessel.vesselType] || "text-navy-200"}>
                  {vessel.vesselType.charAt(0).toUpperCase() + vessel.vesselType.slice(1)}
                </div>
              </div>
            </section>

            {/* Navigation */}
            <section>
              <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                Navigation
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-navy-800/40 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-navy-500 uppercase mb-1">Speed</div>
                  <div className="text-sm font-mono font-medium text-navy-100">{vessel.speed.toFixed(1)}</div>
                  <div className="text-[10px] text-navy-500">knots</div>
                </div>
                <div className="bg-navy-800/40 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-navy-500 uppercase mb-1">Course</div>
                  <div className="text-sm font-mono font-medium text-navy-100">{Math.round(vessel.course)}&deg;</div>
                  <div className="text-[10px] text-navy-500">{headingToCardinal(vessel.course)}</div>
                </div>
                <div className="bg-navy-800/40 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-navy-500 uppercase mb-1">Heading</div>
                  <div className="text-sm font-mono font-medium text-navy-100">{Math.round(vessel.heading)}&deg;</div>
                  <div className="text-[10px] text-navy-500">{headingToCardinal(vessel.heading)}</div>
                </div>
              </div>
            </section>

            {/* Position & Destination */}
            <section>
              <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                Position
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div className="text-navy-500">Latitude</div>
                <div className="text-navy-200 font-mono">{vessel.lat.toFixed(4)}&deg;</div>
                <div className="text-navy-500">Longitude</div>
                <div className="text-navy-200 font-mono">{vessel.lng.toFixed(4)}&deg;</div>
                {vessel.destination && (
                  <>
                    <div className="text-navy-500">Destination</div>
                    <div className="text-accent-cyan font-medium">{vessel.destination}</div>
                  </>
                )}
              </div>
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function headingToCardinal(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}
