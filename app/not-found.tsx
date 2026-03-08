"use client";

import { useEffect, useState, useRef } from "react";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const [scramble, setScramble] = useState("SIGNAL LOST");
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Text scramble effect
  useEffect(() => {
    setMounted(true);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*";
    const target = "SIGNAL LOST";
    let frame = 0;

    const interval = setInterval(() => {
      frame++;
      if (frame > 30) {
        setScramble(target);
        clearInterval(interval);
        return;
      }
      setScramble(
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

  // Radar sweep canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 200;
    canvas.width = size;
    canvas.height = size;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 80;
    let angle = 0;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // Concentric rings
      for (let r = 20; r <= radius; r += 20) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(6, 182, 212, 0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Cross hairs
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.06)";
      ctx.stroke();

      // Sweep line
      const sweepX = cx + Math.cos(angle) * radius;
      const sweepY = cy + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sweepX, sweepY);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Sweep trail (gradient arc)
      const trailAngle = 0.8;
      const gradient = ctx.createConicGradient(angle - trailAngle, cx, cy);
      gradient.addColorStop(0, "rgba(6, 182, 212, 0)");
      gradient.addColorStop(trailAngle / (Math.PI * 2), "rgba(6, 182, 212, 0.08)");
      gradient.addColorStop(trailAngle / (Math.PI * 2) + 0.001, "rgba(6, 182, 212, 0)");

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, angle - trailAngle, angle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(6, 182, 212, 0.6)";
      ctx.fill();

      angle += 0.02;
    };

    const id = setInterval(draw, 1000 / 30);
    return () => clearInterval(id);
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

      <div className="relative z-10 text-center max-w-md px-6">
        {/* Radar canvas */}
        <div
          className={`flex justify-center mb-8 ${base} ${mounted ? "opacity-50" : "opacity-0"}`}
        >
          <canvas ref={canvasRef} className="w-[200px] h-[200px]" />
        </div>

        {/* Error code label */}
        <div
          className={`mb-6 ${base} ${mounted ? visible : hidden}`}
          style={{ transitionDelay: "100ms" }}
        >
          <span className="text-[10px] text-accent-cyan/60 tracking-[0.3em] uppercase font-mono">
            ERR::404 // Not Found
          </span>
        </div>

        {/* Main heading */}
        <h1
          className={`text-[36px] sm:text-[44px] font-light tracking-tight leading-none text-navy-100 font-sans mb-4 ${base} ${mounted ? visible : hidden}`}
          style={{ transitionDelay: "150ms" }}
        >
          {scramble}
        </h1>

        {/* Divider */}
        <div
          className={`w-10 h-px mx-auto my-6 ${base} ${mounted ? "opacity-100" : "opacity-0"}`}
          style={{
            background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.3), transparent)",
            transitionDelay: "200ms",
          }}
        />

        {/* Description */}
        <p
          className={`text-[13px] leading-relaxed text-navy-500 mb-3 font-sans ${base} ${mounted ? visible : hidden}`}
          style={{ transitionDelay: "250ms" }}
        >
          The requested intelligence asset could not be located.
          It may have been archived, relocated, or never existed.
        </p>

        <p
          className={`text-[10px] text-navy-700 font-mono mb-10 ${base} ${mounted ? visible : hidden}`}
          style={{ transitionDelay: "300ms" }}
        >
          Scan complete. Zero matches across all sectors.
        </p>

        {/* Actions */}
        <div
          className={`flex gap-3 justify-center ${base} ${mounted ? visible : hidden}`}
          style={{ transitionDelay: "400ms" }}
        >
          <a
            href="/"
            className="group flex items-center gap-2 px-5 py-2.5 text-[11px] tracking-widest uppercase font-mono text-navy-100 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
          >
            <Home className="w-3 h-3 text-navy-500 group-hover:text-navy-300 transition-colors" />
            Return to base
          </a>
          <button
            onClick={() => window.history.back()}
            className="group flex items-center gap-2 px-5 py-2.5 text-[11px] tracking-widest uppercase font-mono text-navy-400 bg-transparent border border-navy-800/40 rounded-lg hover:border-navy-700/60 hover:text-navy-200 transition-all"
          >
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
