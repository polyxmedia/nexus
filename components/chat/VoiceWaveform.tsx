"use client";

import { useEffect, useRef } from "react";

interface VoiceWaveformProps {
  stream: MediaStream;
}

export function VoiceWaveform({ stream }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const BAR_COUNT = 32;
    const GAP = 2;
    const ACCENT = [34, 211, 238]; // accent-cyan #22d3ee

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);
      }

      ctx.clearRect(0, 0, w, h);

      const barW = Math.max(1, (w - GAP * (BAR_COUNT - 1)) / BAR_COUNT);
      const centerY = h / 2;

      // Sample frequencies into bar values
      const step = Math.floor(bufferLength / BAR_COUNT);

      for (let i = 0; i < BAR_COUNT; i++) {
        // Average a few frequency bins per bar
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j] || 0;
        }
        const avg = sum / step;
        const normalized = avg / 255;

        // Min bar height of 2px, max is half the canvas height
        const barH = Math.max(2, normalized * (h * 0.45));

        const x = i * (barW + GAP);
        const alpha = 0.3 + normalized * 0.7;

        // Draw bar from center, mirrored
        ctx.fillStyle = `rgba(${ACCENT[0]}, ${ACCENT[1]}, ${ACCENT[2]}, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, centerY - barH, barW, barH * 2, barW / 2);
        ctx.fill();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      source.disconnect();
      audioCtx.close();
    };
  }, [stream]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-10"
      style={{ display: "block" }}
    />
  );
}
