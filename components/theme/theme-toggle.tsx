"use client";

import { useState, useRef, useEffect } from "react";
import { Moon, Sun, Monitor, SunMedium } from "lucide-react";
import { useTheme, type Theme } from "@/lib/hooks/useTheme";

const OPTIONS: { value: Theme; label: string; icon: typeof Moon }[] = [
  { value: "dim", label: "Dim", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "soft", label: "Soft", icon: SunMedium },
];

export function ThemeToggle({
  className,
  dropdownDirection = "up",
}: {
  className?: string;
  dropdownDirection?: "up" | "down";
}) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = OPTIONS.find((o) => o.value === theme) || OPTIONS[0];
  const Icon = current.icon;

  const positionClass =
    dropdownDirection === "up"
      ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
      : "top-full left-1/2 -translate-x-1/2 mt-2";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Change theme"
        className={className}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className={`absolute ${positionClass} w-28 rounded border border-navy-700/50 bg-navy-900 shadow-lg overflow-hidden z-50`}>
          {OPTIONS.map((opt) => {
            const OptIcon = opt.icon;
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { setTheme(opt.value); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  active ? "text-navy-100 bg-navy-800/60" : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/30"
                }`}
              >
                <OptIcon className="h-3 w-3" />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
