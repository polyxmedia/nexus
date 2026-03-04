"use client";

import { CircleMarker, Circle, Tooltip } from "react-leaflet";
import type { OsintEvent, OsintEventType } from "@/lib/warroom/types";

interface OsintMarkersLayerProps {
  events: OsintEvent[];
  onEventClick: (event: OsintEvent) => void;
}

const EVENT_COLORS: Record<OsintEventType, string> = {
  battles: "#ef4444",
  explosions: "#f97316",
  violence_against_civilians: "#f43f5e",
  protests: "#eab308",
  riots: "#f59e0b",
  strategic_developments: "#06b6d4",
};

const EVENT_LABELS: Record<OsintEventType, string> = {
  battles: "BATTLE",
  explosions: "EXPLOSION",
  violence_against_civilians: "VIOLENCE",
  protests: "PROTEST",
  riots: "RIOT",
  strategic_developments: "STRATEGIC",
};

function getRadius(fatalities: number): number {
  if (fatalities >= 50) return 8;
  if (fatalities >= 10) return 6;
  if (fatalities >= 1) return 4;
  return 3;
}

// Check if event happened in last 24 hours
function isRecent(dateStr: string): boolean {
  const eventDate = new Date(dateStr).getTime();
  return Date.now() - eventDate < 24 * 60 * 60 * 1000;
}

export function OsintMarkersLayer({ events, onEventClick }: OsintMarkersLayerProps) {
  return (
    <>
      {events.map((event) => {
        const color = EVENT_COLORS[event.eventType] || "#06b6d4";
        const label = EVENT_LABELS[event.eventType] || "EVENT";
        const radius = getRadius(event.fatalities);
        const recent = isRecent(event.date);
        const severe = event.fatalities >= 10;

        return (
          <span key={event.id}>
            {/* Outer pulse ring for recent or severe events */}
            {(recent || severe) && (
              <Circle
                center={[event.lat, event.lng]}
                radius={severe ? 25000 : 15000}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.04,
                  weight: 0.8,
                  opacity: 0.3,
                  className: severe ? "warroom-pulse" : "warroom-pulse-slow",
                }}
                interactive={false}
              />
            )}

            {/* Core marker */}
            <CircleMarker
              center={[event.lat, event.lng]}
              radius={radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: recent ? 0.85 : 0.6,
                weight: severe ? 2 : 1,
                opacity: recent ? 1 : 0.7,
              }}
              eventHandlers={{
                click: () => onEventClick(event),
              }}
            >
              <Tooltip direction="top" className="warroom-tooltip">
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", lineHeight: 1.5, minWidth: "140px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                    <span style={{ color, fontWeight: 700, fontSize: "9px", letterSpacing: "0.05em" }}>{label}</span>
                    {recent && (
                      <span style={{ color: "#f43f5e", fontSize: "8px", fontWeight: 600 }}>RECENT</span>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "11px", marginBottom: "2px", color: "#e5e5e5" }}>
                    {event.location}
                  </div>
                  <div style={{ color: "#666", fontSize: "9px", marginBottom: "3px" }}>{event.country}</div>
                  {event.actors && (
                    <div style={{ color: "#888", fontSize: "9px", marginBottom: "2px" }}>{event.actors}</div>
                  )}
                  {event.fatalities > 0 && (
                    <div style={{ color: "#ef4444", fontWeight: 600, fontSize: "9px" }}>
                      {event.fatalities} fatalities
                    </div>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          </span>
        );
      })}
    </>
  );
}
