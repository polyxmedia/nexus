"use client";

import { CircleMarker, Circle, Tooltip } from "react-leaflet";
import type { OsintEvent, OsintEventType } from "@/lib/warroom/types";

interface OsintMarkersLayerProps {
  events: OsintEvent[];
  onEventClick: (event: OsintEvent) => void;
}

const EVENT_STYLES: Record<OsintEventType, { color: string; label: string; icon: string }> = {
  battles: { color: "#ef4444", label: "KINETIC", icon: "crosshair" },
  explosions: { color: "#f97316", label: "DETONATION", icon: "explosion" },
  violence_against_civilians: { color: "#f43f5e", label: "ATROCITY", icon: "alert" },
  protests: { color: "#eab308", label: "CIVIL UNREST", icon: "protest" },
  riots: { color: "#f59e0b", label: "RIOT", icon: "fire" },
  strategic_developments: { color: "#06b6d4", label: "INTEL", icon: "signal" },
};

function getRadius(fatalities: number): number {
  if (fatalities >= 50) return 7;
  if (fatalities >= 10) return 5;
  if (fatalities >= 1) return 4;
  return 3;
}

function isRecent(dateStr: string): boolean {
  const eventDate = new Date(dateStr).getTime();
  return Date.now() - eventDate < 24 * 60 * 60 * 1000;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "< 1h ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function OsintMarkersLayer({ events, onEventClick }: OsintMarkersLayerProps) {
  return (
    <>
      {events.map((event) => {
        const style = EVENT_STYLES[event.eventType] || EVENT_STYLES.strategic_developments;
        const radius = getRadius(event.fatalities);
        const recent = isRecent(event.date);
        const severe = event.fatalities >= 10;

        return (
          <span key={event.id}>
            {/* Outer pulse for active/severe events */}
            {(recent || severe) && (
              <Circle
                center={[event.lat, event.lng]}
                radius={severe ? 30000 : 18000}
                pathOptions={{
                  color: style.color,
                  fillColor: style.color,
                  fillOpacity: 0.03,
                  weight: 0.5,
                  opacity: 0.2,
                  className: severe ? "warroom-zone-pulse" : "warroom-pulse-slow",
                }}
                interactive={false}
              />
            )}

            {/* Secondary ring for severe */}
            {severe && (
              <CircleMarker
                center={[event.lat, event.lng]}
                radius={radius + 4}
                pathOptions={{
                  color: style.color,
                  fillColor: "transparent",
                  fillOpacity: 0,
                  weight: 0.8,
                  opacity: 0.3,
                  dashArray: "2 3",
                }}
                interactive={false}
              />
            )}

            {/* Core marker */}
            <CircleMarker
              center={[event.lat, event.lng]}
              radius={radius}
              pathOptions={{
                color: recent ? style.color : `${style.color}cc`,
                fillColor: style.color,
                fillOpacity: recent ? 0.9 : 0.5,
                weight: severe ? 1.5 : 1,
                opacity: recent ? 1 : 0.6,
              }}
              eventHandlers={{
                click: () => onEventClick(event),
              }}
            >
              <Tooltip direction="top" className="warroom-tooltip">
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", lineHeight: 1.6, minWidth: "160px", maxWidth: "220px" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ color: style.color, fontWeight: 700, fontSize: "8px", letterSpacing: "0.1em" }}>
                      {style.label}
                    </span>
                    <span style={{ color: recent ? "#ef4444" : "#555", fontSize: "8px", fontWeight: 500 }}>
                      {formatTimeAgo(event.date)}
                    </span>
                  </div>

                  {/* Location */}
                  <div style={{ fontWeight: 600, fontSize: "11px", color: "#e5e5e5", marginBottom: "2px" }}>
                    {event.location}
                  </div>
                  <div style={{ color: "#666", fontSize: "9px", marginBottom: "4px" }}>{event.country}</div>

                  {/* Actors */}
                  {event.actors && (
                    <div style={{ color: "#888", fontSize: "9px", marginBottom: "4px", borderTop: "1px solid #1f1f1f", paddingTop: "4px" }}>
                      {event.actors}
                    </div>
                  )}

                  {/* Fatalities */}
                  {event.fatalities > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#ef4444", fontWeight: 600, fontSize: "9px" }}>
                      <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                      {event.fatalities} confirmed fatalities
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
