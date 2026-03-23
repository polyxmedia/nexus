"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export function MapTileUpdater({
  tileUrl,
  attribution,
}: {
  tileUrl: string;
  attribution: string;
}) {
  const map = useMap();
  const layerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const newLayer = L.tileLayer(tileUrl, { attribution, maxZoom: 20 });
    newLayer.addTo(map);
    layerRef.current = newLayer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, tileUrl, attribution]);

  return null;
}
