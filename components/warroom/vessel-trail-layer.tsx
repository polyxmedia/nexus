"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { VesselTrailPoint } from "@/lib/warroom/use-vessel-tracker";

interface VesselTrailLayerProps {
  trails: Map<string, VesselTrailPoint[]>;
}

export function VesselTrailLayer({ trails }: VesselTrailLayerProps) {
  const map = useMap();
  const layerGroup = useRef<L.LayerGroup>(L.layerGroup());

  useEffect(() => {
    layerGroup.current.addTo(map);
    return () => {
      layerGroup.current.remove();
    };
  }, [map]);

  useEffect(() => {
    layerGroup.current.clearLayers();

    trails.forEach((points) => {
      if (points.length < 2) return;

      const latlngs: L.LatLngTuple[] = points.map((p) => [p.lat, p.lng]);

      // Main trail line
      const trail = L.polyline(latlngs, {
        color: "#22d3ee",
        weight: 2.5,
        opacity: 0.8,
        dashArray: "6 4",
        lineCap: "round",
        lineJoin: "round",
      });

      // Faded history tail (older portion)
      if (points.length > 4) {
        const fadeLen = Math.floor(points.length * 0.4);
        const fadeLatlngs = latlngs.slice(0, fadeLen + 1);
        const fadeLine = L.polyline(fadeLatlngs, {
          color: "#22d3ee",
          weight: 1.5,
          opacity: 0.25,
          dashArray: "3 6",
          lineCap: "round",
        });
        layerGroup.current.addLayer(fadeLine);
      }

      // Dot markers at each recorded position
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const isLatest = i === points.length - 1;
        const age = (points.length - 1 - i) / Math.max(points.length - 1, 1);
        const opacity = isLatest ? 1 : 0.3 + 0.5 * (1 - age);
        const radius = isLatest ? 4 : 2;

        const dot = L.circleMarker([p.lat, p.lng], {
          radius,
          fillColor: "#22d3ee",
          fillOpacity: opacity,
          color: "#22d3ee",
          weight: isLatest ? 1.5 : 0.5,
          opacity: opacity * 0.8,
        });

        layerGroup.current.addLayer(dot);
      }

      layerGroup.current.addLayer(trail);
    });
  }, [trails]);

  return null;
}
