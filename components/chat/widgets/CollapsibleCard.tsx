"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CollapsibleCardProps {
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleCard({
  title,
  badge,
  defaultOpen = true,
  children,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="my-2 border border-navy-700 rounded bg-navy-900/80 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-navy-800/40 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-navy-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-navy-500 flex-shrink-0" />
        )}
        <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
          {title}
        </span>
        {badge}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/**
 * Generic collapsible wrapper for widgets that don't have CollapsibleCard built-in.
 * Wraps any widget content with a toggle header.
 */
interface CollapsibleWrapperProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleWrapper({
  title,
  defaultOpen = true,
  children,
}: CollapsibleWrapperProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="my-2 relative">
      <button
        onClick={() => setOpen(!open)}
        className="absolute top-0 right-0 z-10 flex items-center gap-1 px-2 py-1.5 text-navy-600 hover:text-navy-400 transition-colors"
        title={open ? "Collapse" : "Expand"}
      >
        {open ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <span className="text-[9px] font-mono uppercase tracking-wider">
          {open ? "hide" : title}
        </span>
      </button>
      {open ? children : (
        <div className="border border-navy-700 rounded bg-navy-900/80 px-4 py-2.5 cursor-pointer hover:bg-navy-800/40 transition-colors"
          onClick={() => setOpen(true)}
        >
          <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
