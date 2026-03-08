"use client";

import { useEffect, useState } from "react";

export default function GlobalError({
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
    <html lang="en" className="dark">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#000",
          color: "#d4d4d4",
          fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            opacity: 0.03,
            backgroundImage:
              "linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            pointerEvents: "none",
          }}
        />

        {/* Scanlines */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            opacity: 0.015,
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.4) 2px, rgba(6,182,212,0.4) 4px)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* Rose ambient glow */}
        <div
          style={{
            position: "fixed",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(244, 63, 94, 0.03) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 5,
            textAlign: "center",
            maxWidth: "480px",
            padding: "0 24px",
          }}
        >
          {/* Error code */}
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "4px",
              textTransform: "uppercase",
              color: "rgba(244, 63, 94, 0.7)",
              marginBottom: "32px",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            ERR::500 // Internal Fault
          </div>

          {/* Main heading */}
          <h1
            style={{
              fontSize: "clamp(36px, 5vw, 44px)",
              fontWeight: 300,
              letterSpacing: "-0.5px",
              lineHeight: 1.1,
              margin: "0 0 16px 0",
              color: "#d4d4d4",
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {glitchText}
          </h1>

          {/* Divider */}
          <div
            style={{
              width: "40px",
              height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(244,63,94,0.4), transparent)",
              margin: "24px auto",
            }}
          />

          {/* Description */}
          <p
            style={{
              fontSize: "13px",
              lineHeight: 1.7,
              color: "#525252",
              margin: "0 0 12px 0",
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            An unrecoverable error occurred in the intelligence pipeline.
            Subsystems are attempting automatic recovery.
          </p>

          {/* Digest */}
          {error?.digest && (
            <p
              style={{
                fontSize: "10px",
                color: "#333",
                fontFamily: "'IBM Plex Mono', monospace",
                margin: "0 0 32px 0",
              }}
            >
              DIGEST: {error.digest}
            </p>
          )}

          {/* Status indicators */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "16px",
              marginBottom: "40px",
              fontSize: "10px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            <span style={{ color: "rgba(244, 63, 94, 0.7)", display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#f43f5e",
                  animation: "pulse-dot 2s infinite",
                }}
              />
              Core offline
            </span>
            <span style={{ color: "#1a1a1a" }}>|</span>
            <span style={{ color: "rgba(245, 158, 11, 0.7)", display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#f59e0b",
                  animation: "pulse-dot 2s infinite 0.5s",
                }}
              />
              Recovering
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                padding: "10px 20px",
                fontSize: "11px",
                letterSpacing: "2px",
                textTransform: "uppercase",
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 400,
                color: "#d4d4d4",
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              Retry
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              style={{
                padding: "10px 20px",
                fontSize: "11px",
                letterSpacing: "2px",
                textTransform: "uppercase",
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 400,
                color: "#737373",
                backgroundColor: "transparent",
                border: "1px solid rgba(55,55,55,0.4)",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "rgba(55,55,55,0.6)";
                e.currentTarget.style.color = "#a3a3a3";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "rgba(55,55,55,0.4)";
                e.currentTarget.style.color = "#737373";
              }}
            >
              Return to base
            </button>
          </div>
        </div>

        <style>{`
          @keyframes pulse-dot {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </body>
    </html>
  );
}
