"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [glitchText, setGlitchText] = useState("SYSTEM FAULT");

  useEffect(() => {
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

  return (
    <div className="ml-48 min-h-screen bg-navy-950 flex items-center justify-center relative overflow-hidden">
      {/* Scan lines */}
      <div
        className="fixed inset-0 pointer-events-none z-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6, 182, 212, 0.015) 2px, rgba(6, 182, 212, 0.015) 4px)",
        }}
      />

      {/* Grid */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial glow */}
      <div
        className="fixed pointer-events-none z-[1]"
        style={{
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(244, 63, 94, 0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-5 text-center max-w-[560px] px-6">
        {/* Warning icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <AlertTriangle className="w-10 h-10 text-accent-rose/60" strokeWidth={1.5} />
            <div className="absolute inset-0 animate-ping">
              <AlertTriangle className="w-10 h-10 text-accent-rose/20" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Error code */}
        <div className="text-[10px] tracking-[4px] uppercase text-accent-rose font-mono mb-6">
          ERR::500 // INTERNAL
        </div>

        {/* Main heading */}
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-none text-navy-100 font-sans mb-4">
          {glitchText}
        </h1>

        {/* Divider */}
        <div
          className="w-12 h-px mx-auto my-6"
          style={{
            background: "linear-gradient(90deg, transparent, #f43f5e, transparent)",
          }}
        />

        {/* Description */}
        <p className="text-sm leading-relaxed text-navy-400 mb-3 font-sans">
          An unrecoverable error occurred in the intelligence pipeline.
          Subsystems are attempting automatic recovery.
        </p>

        {/* Digest */}
        {error?.digest && (
          <p className="text-[11px] text-navy-600 font-mono mb-8">
            DIGEST: {error.digest}
          </p>
        )}

        {/* Status indicators */}
        <div className="flex justify-center gap-8 mb-10 text-[10px] tracking-[2px] uppercase font-mono">
          <span className="text-accent-rose flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-rose animate-pulse" />
            Core offline
          </span>
          <span className="text-accent-amber flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse [animation-delay:0.5s]" />
            Recovering
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="group flex items-center gap-2 px-6 py-2.5 text-[12px] tracking-[1.5px] uppercase font-mono font-medium text-navy-950 bg-accent-cyan hover:bg-cyan-400 transition-all duration-200 hover:-translate-y-px"
          >
            <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-90deg] transition-transform duration-300" />
            Retry
          </button>
          <a
            href="/"
            className="group flex items-center gap-2 px-6 py-2.5 text-[12px] tracking-[1.5px] uppercase font-mono font-medium text-navy-300 bg-transparent border border-navy-800 hover:border-navy-600 hover:text-navy-100 transition-all duration-200"
          >
            <Home className="w-3.5 h-3.5" />
            Return to base
          </a>
        </div>
      </div>
    </div>
  );
}
