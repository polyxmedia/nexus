"use client";

import { useEffect, useRef, useState } from "react";
import type { SatelliteResponse } from "./types";

const POLL_INTERVAL = 60_000; // 60s, satellite positions change slowly

export function useSatelliteData(enabled: boolean) {
  const [data, setData] = useState<SatelliteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const fetchSatellites = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/warroom/satellites");
        if (res.ok) {
          const json: SatelliteResponse = await res.json();
          setData(json);
        }
      } catch {
        // Silently fail, keep previous data
      } finally {
        setLoading(false);
      }
    };

    fetchSatellites();
    intervalRef.current = setInterval(fetchSatellites, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled]);

  return { data, loading };
}
