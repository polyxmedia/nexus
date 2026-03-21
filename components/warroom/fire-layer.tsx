"use client";

import { CircleMarker, Tooltip } from "react-leaflet";
import type { FireDetection } from "@/lib/warroom/types";

interface FireLayerProps {
  fires: FireDetection[];
  militaryOnly?: boolean;
  onFireClick?: (fire: FireDetection) => void;
}

const CONFIDENCE_COLORS = {
  high: "#ef4444",
  nominal: "#f97316",
  low: "#eab308",
};

const CONFIDENCE_OPACITY = {
  high: 0.9,
  nominal: 0.7,
  low: 0.5,
};

const MILITARY_COLOR = "#ff2d2d";
const MILITARY_GLOW = "#ff000060";

function getRadius(frp: number, isMilitary: boolean): number {
  const base = frp > 100 ? 6 : frp > 50 ? 5 : frp > 20 ? 4 : 3;
  return isMilitary ? base + 2 : base;
}

export function FireLayer({ fires, militaryOnly = false, onFireClick }: FireLayerProps) {
  const filtered = militaryOnly ? fires.filter((f) => f.military) : fires;

  return (
    <>
      {filtered.map((fire) => {
        const isMil = !!fire.military;
        const color = isMil ? MILITARY_COLOR : CONFIDENCE_COLORS[fire.confidence];
        const opacity = isMil ? 1 : CONFIDENCE_OPACITY[fire.confidence];
        const radius = getRadius(fire.frp, isMil);

        return (
          <CircleMarker
            key={fire.id}
            center={[fire.lat, fire.lng]}
            radius={radius}
            pathOptions={{
              color: isMil ? MILITARY_GLOW : color,
              fillColor: color,
              fillOpacity: opacity,
              weight: isMil ? 2 : 0.5,
              opacity: isMil ? 0.9 : 0.8,
            }}
            eventHandlers={onFireClick ? {
              click: () => onFireClick(fire),
            } : undefined}
          >
            <Tooltip direction="top" className="warroom-tooltip">
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px" }}>
                {isMil && (
                  <div style={{ color: MILITARY_COLOR, fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", marginBottom: "3px", borderBottom: "1px solid #ff2d2d30", paddingBottom: "3px" }}>
                    MILITARY INSTALLATION
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}>
                  <span style={{ color: isMil ? MILITARY_COLOR : color, fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em" }}>
                    {isMil ? "MIL FIRE" : "FIRE"} / {fire.confidence.toUpperCase()}
                  </span>
                </div>
                {fire.military && (
                  <>
                    <div style={{ color: "#e5e5e5", fontSize: "9px" }}>
                      {fire.military.baseName}
                    </div>
                    <div style={{ color: "#a3a3a3", fontSize: "8px" }}>
                      {fire.military.baseType} / {fire.military.distanceKm}km from center
                    </div>
                  </>
                )}
                <div style={{ color: "#e5e5e5", fontSize: "9px", marginTop: "2px" }}>
                  FRP: {fire.frp.toFixed(1)} MW
                </div>
                <div style={{ color: "#737373", fontSize: "8px", marginTop: "1px" }}>
                  {fire.satellite} / {fire.dayNight === "D" ? "Day" : "Night"}
                </div>
                <div style={{ color: "#525252", fontSize: "7px", marginTop: "2px" }}>
                  {new Date(fire.acquiredAt).toLocaleString()}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
