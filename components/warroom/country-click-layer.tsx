"use client";

import { useMap, useMapEvents } from "react-leaflet";
import { COUNTRIES } from "@/lib/game-theory/countries";

interface CountryClickLayerProps {
  onCountryClick: (code: string) => void;
}

// Find nearest country center to a lat/lng within a reasonable distance
function findNearestCountry(
  lat: number,
  lng: number,
  zoomLevel: number
): string | null {
  // At low zoom (zoomed out), require closer proximity
  // At high zoom (zoomed in), allow wider matching since countries fill more screen
  const maxDistDeg = zoomLevel <= 3 ? 8 : zoomLevel <= 5 ? 12 : 18;

  let nearest: string | null = null;
  let minDist = Infinity;

  for (const country of COUNTRIES) {
    const dlat = lat - country.lat;
    const dlng = lng - country.lng;
    // Weight-adjusted distance: bigger countries (weight 3) have larger click radius
    const weightFactor = 1 + (country.weight - 1) * 0.5;
    const dist = Math.sqrt(dlat * dlat + dlng * dlng) / weightFactor;

    if (dist < minDist && dist < maxDistDeg) {
      minDist = dist;
      nearest = country.code;
    }
  }

  return nearest;
}

export function CountryClickLayer({ onCountryClick }: CountryClickLayerProps) {
  const map = useMap();

  useMapEvents({
    click(e) {
      // Don't trigger country click if clicking on an existing marker/layer
      // Check if the click target is the map tile itself
      const target = e.originalEvent?.target as HTMLElement;
      if (target && !target.classList.contains("leaflet-container") &&
          !target.classList.contains("leaflet-tile") &&
          !target.closest(".leaflet-tile-pane")) {
        return;
      }

      const code = findNearestCountry(
        e.latlng.lat,
        e.latlng.lng,
        map.getZoom()
      );

      if (code) {
        onCountryClick(code);
      }
    },
  });

  return null;
}
