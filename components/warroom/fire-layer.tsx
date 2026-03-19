"use client";

import { CircleMarker, Tooltip } from "react-leaflet";
import type { FireDetection } from "@/lib/warroom/types";

interface FireLayerProps {
  fires: FireDetection[];
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

function getRadius(frp: number): number {
  if (frp > 100) return 6;
  if (frp > 50) return 5;
  if (frp > 20) return 4;
  return 3;
}

export function FireLayer({ fires, onFireClick }: FireLayerProps) {
  return (
    <>
      {fires.map((fire) => {
        const color = CONFIDENCE_COLORS[fire.confidence];
        const opacity = CONFIDENCE_OPACITY[fire.confidence];
        const radius = getRadius(fire.frp);

        return (
          <CircleMarker
            key={fire.id}
            center={[fire.lat, fire.lng]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: opacity,
              weight: 0.5,
              opacity: 0.8,
            }}
            eventHandlers={onFireClick ? {
              click: () => onFireClick(fire),
            } : undefined}
          >
            <Tooltip direction="top" className="warroom-tooltip">
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}>
                  <span style={{ color, fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em" }}>
                    FIRE / {fire.confidence.toUpperCase()}
                  </span>
                </div>
                <div style={{ color: "#e5e5e5", fontSize: "9px" }}>
                  FRP: {fire.frp.toFixed(1)} MW
                </div>
                <div style={{ color: "#737373", fontSize: "8px", marginTop: "1px" }}>
                  {fire.satellite} / {fire.dayNight === "D" ? "Day" : "Night"}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
