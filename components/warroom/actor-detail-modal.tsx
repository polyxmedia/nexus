"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ActorWithGeo } from "@/lib/warroom/types";
import { ACTORS } from "@/lib/game-theory/actors";

interface ActorDetailModalProps {
  actorId: string | null;
  actors: ActorWithGeo[];
  onClose: () => void;
}

export function ActorDetailModal({ actorId, actors, onClose }: ActorDetailModalProps) {
  const actor = actors.find((a) => a.id === actorId);
  if (!actor) return null;

  const getActorName = (id: string) => {
    const a = ACTORS.find((x) => x.id === id);
    return a?.shortName || id.toUpperCase();
  };

  return (
    <Dialog.Root open={!!actorId} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 wr-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-navy-700/60 bg-navy-900/95 backdrop-blur-md p-6 wr-shadow-lg wr-modal-enter">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Dialog.Title className="text-sm font-semibold text-navy-100">
                {actor.name}
              </Dialog.Title>
              <Dialog.Description className="text-[10px] text-navy-500 uppercase tracking-wider mt-0.5">
                {actor.colorGroup === "ally"
                  ? "US-ALIGNED"
                  : actor.colorGroup === "adversary"
                    ? "ADVERSARY"
                    : "NON-ALIGNED"}{" "}
                ACTOR
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="text-navy-500 hover:text-navy-300 hover:bg-navy-800/60 rounded p-1 transition-colors wr-focus-ring">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Objectives */}
            <section>
              <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                Objectives
              </h4>
              <ul className="space-y-1">
                {actor.objectives.map((obj, i) => (
                  <li key={i} className="text-xs text-navy-200 flex items-start gap-2">
                    <span className="text-accent-cyan mt-0.5 shrink-0">-</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </section>

            {/* Capabilities */}
            <section>
              <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                Capabilities
              </h4>
              <ul className="space-y-1">
                {actor.capabilities.map((cap, i) => (
                  <li key={i} className="text-xs text-navy-200 flex items-start gap-2">
                    <span className="text-navy-400 mt-0.5 shrink-0">-</span>
                    {cap}
                  </li>
                ))}
              </ul>
            </section>

            {/* Constraints */}
            <section>
              <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                Constraints
              </h4>
              <ul className="space-y-1">
                {actor.constraints.map((con, i) => (
                  <li key={i} className="text-xs text-navy-300 flex items-start gap-2">
                    <span className="text-navy-400 mt-0.5 shrink-0">-</span>
                    {con}
                  </li>
                ))}
              </ul>
            </section>

            {/* Red Lines */}
            <section>
              <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                Red Lines
              </h4>
              <ul className="space-y-1">
                {actor.redLines.map((line, i) => (
                  <li
                    key={i}
                    className="text-xs text-navy-200 flex items-start gap-2 border-l-2 border-accent-rose pl-2"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </section>

            {/* Alliances & Adversaries */}
            <div className="grid grid-cols-2 gap-4">
              <section>
                <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                  Alliances
                </h4>
                <div className="flex flex-wrap gap-1">
                  {actor.alliances.map((id) => (
                    <span
                      key={id}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20"
                    >
                      {getActorName(id)}
                    </span>
                  ))}
                </div>
              </section>
              <section>
                <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2 pb-1 border-b border-navy-700/20">
                  Adversaries
                </h4>
                <div className="flex flex-wrap gap-1">
                  {actor.adversaries.map((id) => (
                    <span
                      key={id}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-rose/10 text-accent-rose border border-accent-rose/20"
                    >
                      {getActorName(id)}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
