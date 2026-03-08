import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "NEXUS Intelligence — Geopolitical-Market Signal Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#000000",
          fontFamily: "monospace",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Left accent line */}
        <div
          style={{
            position: "absolute",
            left: 60,
            top: 0,
            bottom: 0,
            width: 1,
            background: "linear-gradient(to bottom, transparent, rgba(6,182,212,0.4), transparent)",
          }}
        />

        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "40px 60px 0",
            position: "relative",
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#06b6d4" }} />
          <span style={{ color: "#4a4a4a", fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase" }}>
            NEXUS / Intelligence Platform
          </span>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            padding: "0 80px",
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.3em",
              color: "#06b6d4",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            Signal Intelligence
          </div>

          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#e8e8e8",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              marginBottom: 24,
              maxWidth: 800,
            }}
          >
            NEXUS Intelligence
          </div>

          <div
            style={{
              fontSize: 18,
              color: "#666666",
              lineHeight: 1.6,
              maxWidth: 640,
              marginBottom: 48,
            }}
          >
            Geopolitical-market convergence analysis. Five independent signal layers.
            AI-driven intelligence before consensus.
          </div>

          {/* Signal layer tags */}
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { tag: "GEO", color: "#06b6d4" },
              { tag: "CAL", color: "#f59e0b" },
              { tag: "CEL", color: "#10b981" },
              { tag: "MKT", color: "#f43f5e" },
              { tag: "OSI", color: "#8b5cf6" },
            ].map(({ tag, color }) => (
              <div
                key={tag}
                style={{
                  padding: "6px 14px",
                  borderRadius: 4,
                  border: `1px solid ${color}30`,
                  background: `${color}10`,
                  color,
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  fontWeight: 700,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 60px 40px",
            position: "relative",
          }}
        >
          <span style={{ color: "#2a2a2a", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            nexusintel.io
          </span>
          <span style={{ color: "#2a2a2a", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            A Polyxmedia Product
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
