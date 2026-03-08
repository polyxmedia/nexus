"use client";

import "leaflet/dist/leaflet.css";

import { MapContainer, CircleMarker, TileLayer, Tooltip } from "react-leaflet";
import type { GeoCountry } from "@/lib/game-theory/countries";

interface GlobalScenarioMapProps {
  countries: GeoCountry[];
  teams: Record<string, "blue" | "red">;
  onCountryClick: (code: string) => void;
}

const TEAM_COLORS = {
  blue: { fill: "#06b6d4", stroke: "#22d3ee" },
  red: { fill: "#f43f5e", stroke: "#fb7185" },
  neutral: { fill: "#334155", stroke: "#475569" },
} as const;

export default function GlobalScenarioMap({
  countries,
  teams,
  onCountryClick,
}: GlobalScenarioMapProps) {
  return (
    <MapContainer
      center={[25, 30]}
      zoom={3}
      minZoom={2}
      maxZoom={7}
      className="h-full w-full"
      zoomControl={true}
      attributionControl={false}
      style={{ background: "#050505" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />

      {countries.map((country) => {
        const team = teams[country.code];
        const colors = team ? TEAM_COLORS[team] : TEAM_COLORS.neutral;
        const isAssigned = !!team;
        const baseRadius = country.weight === 3 ? 6 : country.weight === 2 ? 4.5 : 3.5;
        const radius = isAssigned ? baseRadius + 1.5 : baseRadius;

        return (
          <span key={country.code}>
            {/* Outer glow ring for assigned countries */}
            {isAssigned && (
              <CircleMarker
                center={[country.lat, country.lng]}
                radius={radius + 4}
                pathOptions={{
                  color: colors.stroke,
                  fillColor: colors.fill,
                  fillOpacity: 0.08,
                  weight: 0.5,
                  opacity: 0.3,
                }}
                interactive={false}
              />
            )}
            <CircleMarker
              center={[country.lat, country.lng]}
              radius={radius}
              pathOptions={{
                color: colors.stroke,
                fillColor: colors.fill,
                fillOpacity: isAssigned ? 0.85 : 0.25,
                weight: isAssigned ? 1.5 : 0.5,
                opacity: isAssigned ? 0.9 : 0.4,
              }}
              eventHandlers={{
                click: () => onCountryClick(country.code),
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -8]}
                className="warroom-tooltip"
              >
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px" }}>
                  <div style={{ fontWeight: 700, color: "#e5e5e5", marginBottom: "2px" }}>
                    {country.name}
                  </div>
                  <div style={{ fontSize: "9px", color: team === "blue" ? "#06b6d4" : team === "red" ? "#f43f5e" : "#666", letterSpacing: "0.08em" }}>
                    {team === "blue" ? "BLUE FORCE" : team === "red" ? "RED FORCE" : "UNALIGNED"}
                  </div>
                  {country.actorId && (
                    <div style={{ fontSize: "8px", color: "#555", marginTop: "2px" }}>
                      Core actor
                    </div>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          </span>
        );
      })}
    </MapContainer>
  );
}
