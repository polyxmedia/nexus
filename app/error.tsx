"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Home } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [glitchText, setGlitchText] = useState("SYSTEM FAULT");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  useEffect(() => {
    setMounted(true);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*";
    const target = "SYSTEM FAULT";
    let frame = 0;

    const interval = setInterval(() => {
      frame++;
      if (frame > 30) {
        setGlitchText(target);
        clearInterval(interval);
        return;
      }
      setGlitchText(
        target
          .split("")
          .map((ch, i) =>
            i < frame / 2.5 ? ch : chars[Math.floor(Math.random() * chars.length)]
          )
          .join("")
      );
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const base = "transition-all duration-700 ease-out";
  const hidden = "opacity-0 translate-y-4";
  const visible = "opacity-100 translate-y-0";

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.4) 2px, rgba(6,182,212,0.4) 4px)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, transparent 0%, var(--color-navy-950) 70%)",
          }}
        />
      </div>

      {/* Rose ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-rose/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-md px-6">
        {/* Error code label */}
        <div
          className={`mb-8 ${base} ${mounted ? visible : hidden}`}
        >
          <span className="text-[10px] text-accent-rose/80 tracking-[0.3em] uppercase font-mono">
            ERR::500 // Internal Fault
          </span>
        </div>

        {/* Main heading */}
        <h1
          className={`text-[36px] sm:text-[44px] font-light tracking-tight leading-none text-navy-100 font-sans mb-4 ${base} ${mounted ? visible : hidden}`}
          style={{ transitionDelay: "100ms" }}
        >
          {glitchText}
        </h1>

        {/* Divider */}
        <div
          className={`w-10 h-px mx-auto my-6 ${base} ${mounted ? "opacity-100" : "opacity-0"}`}
          style={{
            background: "linear-gradient(90deg, transparent, rgba(244,63,94,0.4), transparent)",
            transitionDelay: "200ms",
          }}
        />

        {/* Description */}
        <p
          className={`text-[13px] leading-relaxed text-navy-500 mb-3 font-sans ${base} ${mounted ? visible : hidden}`}
          style={{ transitionDelay: "250ms" }}
        >
          An unrecoverable error occurred in the intelligence pipeline.
          Subsystems are attempting automatic recovery.
        </p>

        {/* Digest */}
        {error?.digest && (
          <p className="text-[10px] text-navy-700 font-mono mb-8">
            DIGEST: {error.digest}
          </p>
        )}

        {/* Status indicators */}
        <div
          className={`flex justify-center gap-6 mb-10 ${base} ${mounted ? visible : hidden}`}
          style={{ transitionDelay: "350ms" }}
        >
          <span className="text-[10px] tracking-[0.15em] uppercase font-mono text-accent-rose/70 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-rose animate-pulse" />
            Core offline
          </span>
          <span className="text-navy-800">|</span>
          <span className="text-[10px] tracking-[0.15em] uppercase font-mono text-accent-amber/70 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse [animation-delay:0.5s]" />
            Recovering
          </span>
        </div>

        {/* Actions */}
        <div
          className={`flex gap-3 justify-center ${base} ${mounted ? visible : hidden}`}
          style={{ transitionDelay: "450ms" }}
        >
          <button
            onClick={reset}
            className="group flex items-center gap-2 px-5 py-2.5 text-[11px] tracking-widest uppercase font-mono text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
          >
            <RotateCcw className="w-3 h-3 text-navy-500 group-hover:text-navy-300 group-hover:rotate-[-90deg] transition-all duration-300" />
            Retry
          </button>
          <a
            href="/"
            className="group flex items-center gap-2 px-5 py-2.5 text-[11px] tracking-widest uppercase font-mono text-navy-400 bg-transparent border border-navy-800/40 rounded-lg hover:border-navy-700/60 hover:text-navy-200 transition-all"
          >
            <Home className="w-3 h-3" />
            Return to base
          </a>
        </div>
      </div>
    </div>
  );
}
