"use client";

import { CircleMarker, Tooltip } from "react-leaflet";
import type { RadiationReading } from "@/lib/warroom/types";

interface RadiationLayerProps {
  readings: RadiationReading[];
  onReadingClick?: (reading: RadiationReading) => void;
}

function getRadiationColor(cpm: number): string {
  if (cpm > 200) return "#ef4444"; // Dangerous
  if (cpm > 100) return "#f97316"; // Elevated
  if (cpm > 50) return "#eab308";  // Above normal
  return "#22c55e";                 // Normal
}

function getRadiationLevel(cpm: number): string {
  if (cpm > 200) return "DANGER";
  if (cpm > 100) return "ELEVATED";
  if (cpm > 50) return "ABOVE NORMAL";
  return "NORMAL";
}

function getRadius(cpm: number): number {
  if (cpm > 200) return 8;
  if (cpm > 100) return 6;
  if (cpm > 50) return 5;
  return 4;
}

export function RadiationLayer({ readings, onReadingClick }: RadiationLayerProps) {
  return (
    <>
      {readings.map((reading) => {
        const color = getRadiationColor(reading.value);
        const radius = getRadius(reading.value);
        const isElevated = reading.value > 100;

        return (
          <CircleMarker
            key={reading.id}
            center={[reading.lat, reading.lng]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: isElevated ? 0.8 : 0.4,
              weight: isElevated ? 1.5 : 0.5,
              opacity: isElevated ? 0.9 : 0.6,
            }}
            eventHandlers={onReadingClick ? {
              click: () => onReadingClick(reading),
            } : undefined}
          >
            <Tooltip direction="top" className="warroom-tooltip">
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}>
                  <span style={{ color, fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em" }}>
                    RAD / {getRadiationLevel(reading.value)}
                  </span>
                </div>
                <div style={{ color: "#e5e5e5", fontSize: "9px" }}>
                  {reading.value} {reading.unit.toUpperCase()}
                </div>
                {reading.locationName && (
                  <div style={{ color: "#737373", fontSize: "8px", marginTop: "1px" }}>
                    {reading.locationName}
                  </div>
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
