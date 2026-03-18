"use client";

import { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: string;
  className?: string;
  iconClassName?: string;
  side?: "top" | "bottom" | "left" | "right";
  maxWidth?: number;
}

export function InfoTooltip({
  content,
  className,
  iconClassName,
  side = "top",
  maxWidth = 280,
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }

  function handleLeave() {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-navy-800 border-x-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-navy-800 border-x-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-navy-800 border-y-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-navy-800 border-y-transparent border-l-transparent",
  };

  return (
    <div
      ref={ref}
      className={cn("relative inline-flex", className)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={() => setOpen(!open)}
    >
      <Info
        className={cn(
          "h-3 w-3 text-navy-600 hover:text-navy-400 transition-colors cursor-help",
          iconClassName
        )}
      />
      {open && (
        <div
          className={cn(
            "absolute z-50 pointer-events-none",
            positionClasses[side]
          )}
          style={{ width: maxWidth }}
        >
          <div className="rounded-md border border-navy-700/60 bg-navy-800 px-3 py-2 shadow-xl">
            <p className="text-[11px] leading-relaxed text-navy-200 font-normal normal-case tracking-normal">
              {content}
            </p>
          </div>
          <div
            className={cn(
              "absolute w-0 h-0 border-[5px]",
              arrowClasses[side]
            )}
          />
        </div>
      )}
    </div>
  );
}
