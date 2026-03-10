"use client";

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
    <div className="absolute bottom-4 left-4 right-4 z-40 animate-[slideUp_200ms_ease-out]">
      <div className="mx-auto max-w-4xl border border-navy-700/60 rounded-lg bg-navy-950/95 backdrop-blur-md wr-shadow-lg">
        {/* Terminal header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-navy-800/60">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-navy-500">
              actor profile
            </span>
            <span className="font-mono text-[10px] text-navy-600">
              //
            </span>
            <span className="font-mono text-[10px] text-navy-300 font-medium">
              {actor.name}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                actor.colorGroup === "ally"
                  ? "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20"
                  : actor.colorGroup === "adversary"
                    ? "bg-accent-rose/10 text-accent-rose border-accent-rose/20"
                    : "bg-navy-700/30 text-navy-400 border-navy-700/40"
              }`}
            >
              {actor.colorGroup === "ally"
                ? "US-ALIGNED"
                : actor.colorGroup === "adversary"
                  ? "ADVERSARY"
                  : "NON-ALIGNED"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-navy-400 hover:text-white hover:bg-navy-700/80 rounded p-1.5 transition-colors border border-navy-700/50 hover:border-navy-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-4 gap-4 p-4 pb-6 max-h-[50vh] overflow-y-auto">
          {/* Objectives */}
          <section>
            <h4 className="text-[9px] uppercase tracking-wider text-navy-600 mb-2 font-mono">
              Objectives
            </h4>
            <ul className="space-y-1">
              {actor.objectives.map((obj, i) => (
                <li key={i} className="text-[11px] text-navy-300 flex items-start gap-1.5 leading-snug">
                  <span className="text-accent-cyan mt-px shrink-0 font-mono text-[10px]">&gt;</span>
                  {obj}
                </li>
              ))}
            </ul>
          </section>

          {/* Capabilities */}
          <section>
            <h4 className="text-[9px] uppercase tracking-wider text-navy-600 mb-2 font-mono">
              Capabilities
            </h4>
            <ul className="space-y-1">
              {actor.capabilities.map((cap, i) => (
                <li key={i} className="text-[11px] text-navy-300 flex items-start gap-1.5 leading-snug">
                  <span className="text-navy-500 mt-px shrink-0 font-mono text-[10px]">&gt;</span>
                  {cap}
                </li>
              ))}
            </ul>
          </section>

          {/* Constraints + Red Lines */}
          <section>
            <h4 className="text-[9px] uppercase tracking-wider text-navy-600 mb-2 font-mono">
              Constraints
            </h4>
            <ul className="space-y-1 mb-3">
              {actor.constraints.map((con, i) => (
                <li key={i} className="text-[11px] text-navy-400 flex items-start gap-1.5 leading-snug">
                  <span className="text-navy-600 mt-px shrink-0 font-mono text-[10px]">&gt;</span>
                  {con}
                </li>
              ))}
            </ul>
            <h4 className="text-[9px] uppercase tracking-wider text-accent-rose/70 mb-2 font-mono">
              Red Lines
            </h4>
            <ul className="space-y-1">
              {actor.redLines.map((line, i) => (
                <li
                  key={i}
                  className="text-[11px] text-navy-200 border-l border-accent-rose/40 pl-2 leading-snug"
                >
                  {line}
                </li>
              ))}
            </ul>
          </section>

          {/* Alliances & Adversaries */}
          <section>
            <h4 className="text-[9px] uppercase tracking-wider text-navy-600 mb-2 font-mono">
              Alliances
            </h4>
            <div className="flex flex-wrap gap-1 mb-3">
              {actor.alliances.map((id) => (
                <span
                  key={id}
                  className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20"
                >
                  {getActorName(id)}
                </span>
              ))}
            </div>
            <h4 className="text-[9px] uppercase tracking-wider text-navy-600 mb-2 font-mono">
              Adversaries
            </h4>
            <div className="flex flex-wrap gap-1">
              {actor.adversaries.map((id) => (
                <span
                  key={id}
                  className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent-rose/10 text-accent-rose border border-accent-rose/20"
                >
                  {getActorName(id)}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
