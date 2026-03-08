"use client";

import { useEffect, useState, useRef } from "react";
import { Radar, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const [scramble, setScramble] = useState("SIGNAL LOST");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Text scramble effect
  useEffect(() => {
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

  return (
    <div className="ml-48 min-h-screen bg-navy-950 flex items-center justify-center relative overflow-hidden">
      {/* Scan lines */}
      <div
        className="fixed inset-0 pointer-events-none z-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6, 182, 212, 0.012) 2px, rgba(6, 182, 212, 0.012) 4px)",
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

      <div className="relative z-5 text-center max-w-[560px] px-6">
        {/* Radar canvas */}
        <div className="flex justify-center mb-8 opacity-60">
          <canvas ref={canvasRef} className="w-[200px] h-[200px]" />
        </div>

        {/* Error code */}
        <div className="text-[10px] tracking-[4px] uppercase text-accent-cyan font-mono mb-6">
          ERR::404 // NOT FOUND
        </div>

        {/* Main heading */}
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-none text-navy-100 font-sans mb-4">
          {scramble}
        </h1>

        {/* Divider */}
        <div
          className="w-12 h-px mx-auto my-6"
          style={{
            background: "linear-gradient(90deg, transparent, #06b6d4, transparent)",
          }}
        />

        {/* Description */}
        <p className="text-sm leading-relaxed text-navy-400 mb-3 font-sans">
          The requested intelligence asset could not be located.
          It may have been archived, relocated, or never existed.
        </p>

        <p className="text-[11px] text-navy-600 font-mono mb-10">
          Scan complete. Zero matches across all sectors.
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <a
            href="/"
            className="group flex items-center gap-2 px-6 py-2.5 text-[12px] tracking-[1.5px] uppercase font-mono font-medium text-navy-950 bg-accent-cyan hover:bg-cyan-400 transition-all duration-200 hover:-translate-y-px"
          >
            <Home className="w-3.5 h-3.5" />
            Return to base
          </a>
          <button
            onClick={() => window.history.back()}
            className="group flex items-center gap-2 px-6 py-2.5 text-[12px] tracking-[1.5px] uppercase font-mono font-medium text-navy-300 bg-transparent border border-navy-800 hover:border-navy-600 hover:text-navy-100 transition-all duration-200"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
