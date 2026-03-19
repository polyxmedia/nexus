"use client";

import { useState, useEffect, useRef } from "react";

// ── Scroll Reveal Hook ──

export function useReveal(threshold = 0.12) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Animation Constants ──

export const anim = "transition-all duration-700 ease-out";
export const hidden = "opacity-0 translate-y-6";
export const shown = "opacity-100 translate-y-0";

// ── Section Divider ──

export function Ruled({ maxWidth = "max-w-4xl" }: { maxWidth?: string } = {}) {
  return (
    <div className={`${maxWidth} mx-auto px-6`}>
      <div className="h-px bg-navy-700/40" />
    </div>
  );
}

// ── Section Header ──

export function SectionHead({
  number,
  label,
  visible,
  delay = 0,
}: {
  number: string;
  label: string;
  visible: boolean;
  delay?: number;
}) {
  return (
    <div
      className={`flex items-center gap-4 mb-10 ${anim} ${visible ? shown : hidden}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span className="font-mono text-[10px] text-navy-600 tabular-nums">
        {number}
      </span>
      <div className="h-px w-8 bg-navy-600/50" />
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-500">
        {label}
      </span>
    </div>
  );
}
