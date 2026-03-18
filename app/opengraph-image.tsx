import { ImageResponse } from "next/og";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { RADAR_PATHS, RADAR_CIRCLE } from "@/lib/icons/radar-paths";

export const alt = "NEXUS Intelligence — Geopolitical-Market Signal Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface OGConfig {
  title: string;
  subtitle: string;
  label: string;
  topBar: string;
  tags: { tag: string; color: string }[];
  accentColor: string;
  backgroundColor: string;
  backgroundImage: string;
  backgroundOverlay: number;
  gradientEnabled: boolean;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  titleColor: string;
  subtitleColor: string;
  labelColor: string;
  topBarColor: string;
  bottomBarColor: string;
  showGrid: boolean;
  showAccentLine: boolean;
  showRadar: boolean;
  gridSpacing: number;
  gridOpacity: number;
  bottomLeft: string;
  bottomRight: string;
  titleSize: number;
  titleWeight: number;
  subtitleSize: number;
  labelSize: number;
  tagSize: number;
  contentPaddingLeft: number;
  radarColor: string;
  radarOpacity: number;
  radarSize: number;
}

const DEFAULT_CONFIG: OGConfig = {
  title: "NEXUS Intelligence",
  subtitle: "Geopolitical-market convergence analysis. Four primary signal layers. AI-driven intelligence before consensus.",
  label: "Signal Intelligence",
  topBar: "NEXUS / Intelligence Platform",
  tags: [
    { tag: "GEO", color: "#06b6d4" },
    { tag: "MKT", color: "#f43f5e" },
    { tag: "OSI", color: "#8b5cf6" },
    { tag: "SYS", color: "#f59e0b" },
  ],
  accentColor: "#06b6d4",
  backgroundColor: "#000000",
  backgroundImage: "",
  backgroundOverlay: 0.6,
  gradientEnabled: false,
  gradientFrom: "#000000",
  gradientTo: "#0a0a1a",
  gradientAngle: 135,
  titleColor: "#e8e8e8",
  subtitleColor: "#555555",
  labelColor: "#06b6d4",
  topBarColor: "#555555",
  bottomBarColor: "#333333",
  showGrid: true,
  showAccentLine: true,
  showRadar: true,
  gridSpacing: 60,
  gridOpacity: 0.03,
  bottomLeft: "nexushq.xyz",
  bottomRight: "A Polyxmedia Product",
  titleSize: 64,
  titleWeight: 700,
  subtitleSize: 20,
  labelSize: 14,
  tagSize: 13,
  contentPaddingLeft: 100,
  radarColor: "#06b6d4",
  radarOpacity: 0.08,
  radarSize: 420,
};

async function getConfig(): Promise<OGConfig> {
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "og-image-config"));
    if (rows.length > 0) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(rows[0].value) };
    }
  } catch {
    // Fall back to defaults
  }
  return DEFAULT_CONFIG;
}

export default async function OGImage() {
  const c = await getConfig();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: c.gradientEnabled
            ? `linear-gradient(${c.gradientAngle}deg, ${c.gradientFrom}, ${c.gradientTo})`
            : c.backgroundColor,
          fontFamily: "monospace",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background image */}
        {c.backgroundImage && (
          <img
            src={c.backgroundImage}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        {/* Dark overlay on background image */}
        {c.backgroundImage && c.backgroundOverlay > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background: `rgba(0,0,0,${c.backgroundOverlay})`,
            }}
          />
        )}

        {/* Grid overlay */}
        {c.showGrid && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              backgroundImage: `linear-gradient(rgba(255,255,255,${c.gridOpacity}) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,${c.gridOpacity}) 1px, transparent 1px)`,
              backgroundSize: `${c.gridSpacing}px ${c.gridSpacing}px`,
            }}
          />
        )}

        {/* Left accent line */}
        {c.showAccentLine && (
          <div
            style={{
              position: "absolute",
              left: c.contentPaddingLeft - 20,
              top: 0,
              bottom: 0,
              width: 1,
              display: "flex",
              background: `linear-gradient(to bottom, transparent, ${c.accentColor}66, transparent)`,
            }}
          />
        )}

        {/* Bottom accent line */}
        {c.showAccentLine && (
          <div
            style={{
              position: "absolute",
              bottom: 70,
              left: 0,
              right: 0,
              height: 1,
              display: "flex",
              background: `linear-gradient(to right, transparent, ${c.accentColor}33, transparent)`,
            }}
          />
        )}

        {/* Radar icon */}
        {c.showRadar && (
          <div
            style={{
              position: "absolute",
              right: 60,
              top: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "translateY(-50%)",
              opacity: c.radarOpacity,
            }}
          >
            <svg
              width={c.radarSize}
              height={c.radarSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke={c.radarColor}
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {RADAR_PATHS.map((d) => (
                <path key={d} d={d} />
              ))}
              <circle cx={RADAR_CIRCLE.cx} cy={RADAR_CIRCLE.cy} r={RADAR_CIRCLE.r} />
            </svg>
          </div>
        )}

        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: `44px ${c.contentPaddingLeft}px 0`,
            position: "relative",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={c.accentColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {RADAR_PATHS.map((d) => (
              <path key={d} d={d} />
            ))}
            <circle cx={RADAR_CIRCLE.cx} cy={RADAR_CIRCLE.cy} r={RADAR_CIRCLE.r} />
          </svg>
          <span style={{ color: c.topBarColor, fontSize: 13, letterSpacing: "0.25em", textTransform: "uppercase" as const }}>
            {c.topBar}
          </span>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            padding: `0 ${c.contentPaddingLeft}px`,
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: c.labelSize,
              letterSpacing: "0.3em",
              color: c.labelColor,
              textTransform: "uppercase" as const,
              marginBottom: 24,
              display: "flex",
            }}
          >
            {c.label}
          </div>

          <div
            style={{
              fontSize: c.titleSize,
              fontWeight: c.titleWeight,
              color: c.titleColor,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              marginBottom: 28,
              maxWidth: 750,
              display: "flex",
            }}
          >
            {c.title}
          </div>

          <div
            style={{
              fontSize: c.subtitleSize,
              color: c.subtitleColor,
              lineHeight: 1.5,
              maxWidth: 600,
              marginBottom: 44,
              display: "flex",
            }}
          >
            {c.subtitle}
          </div>

          {/* Signal layer tags */}
          <div style={{ display: "flex", gap: 14 }}>
            {c.tags.map(({ tag, color }) => (
              <div
                key={tag}
                style={{
                  padding: "8px 18px",
                  borderRadius: 6,
                  border: `1px solid ${color}40`,
                  background: `${color}15`,
                  color,
                  fontSize: c.tagSize,
                  letterSpacing: "0.2em",
                  fontWeight: 700,
                  display: "flex",
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
            padding: `0 ${c.contentPaddingLeft}px 36px`,
            position: "relative",
          }}
        >
          <span style={{ color: c.bottomBarColor, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase" as const }}>
            {c.bottomLeft}
          </span>
          <span style={{ color: c.bottomBarColor, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase" as const }}>
            {c.bottomRight}
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
