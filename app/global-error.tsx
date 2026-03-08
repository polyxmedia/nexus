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
        {/* Scan lines overlay */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6, 182, 212, 0.015) 2px, rgba(6, 182, 212, 0.015) 4px)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />

        {/* Subtle grid */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* Radial glow */}
        <div
          style={{
            position: "fixed",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(244, 63, 94, 0.06) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 5,
            textAlign: "center",
            maxWidth: "560px",
            padding: "0 24px",
          }}
        >
          {/* Error code */}
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "4px",
              textTransform: "uppercase",
              color: "#f43f5e",
              marginBottom: "24px",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            ERR::500 // INTERNAL
          </div>

          {/* Main heading with glitch */}
          <h1
            style={{
              fontSize: "clamp(36px, 6vw, 56px)",
              fontWeight: 600,
              letterSpacing: "-1px",
              lineHeight: 1.1,
              margin: "0 0 16px 0",
              color: "#e5e5e5",
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {glitchText}
          </h1>

          {/* Divider line */}
          <div
            style={{
              width: "48px",
              height: "1px",
              background: "linear-gradient(90deg, transparent, #f43f5e, transparent)",
              margin: "24px auto",
            }}
          />

          {/* Description */}
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.7,
              color: "#737373",
              margin: "0 0 12px 0",
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            An unrecoverable error occurred in the intelligence pipeline.
            Subsystems are attempting automatic recovery.
          </p>

          {/* Digest code */}
          {error?.digest && (
            <p
              style={{
                fontSize: "11px",
                color: "#404040",
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
              gap: "32px",
              marginBottom: "40px",
              fontSize: "10px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            <span style={{ color: "#f43f5e" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#f43f5e",
                  marginRight: "8px",
                  animation: "pulse-dot 2s infinite",
                }}
              />
              Core offline
            </span>
            <span style={{ color: "#f59e0b" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#f59e0b",
                  marginRight: "8px",
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
                padding: "10px 24px",
                fontSize: "12px",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 500,
                color: "#000",
                backgroundColor: "#06b6d4",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#22d3ee";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#06b6d4";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Retry
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              style={{
                padding: "10px 24px",
                fontSize: "12px",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 500,
                color: "#a3a3a3",
                backgroundColor: "transparent",
                border: "1px solid #262626",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "#404040";
                e.currentTarget.style.color = "#d4d4d4";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "#262626";
                e.currentTarget.style.color = "#a3a3a3";
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
