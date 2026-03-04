"use client";

import { useEffect, useRef, useState } from "react";
import type { AircraftResponse } from "./types";

const POLL_INTERVAL = 20_000; // 20s, within OpenSky 10 req/min limit

export function useAircraftData(enabled: boolean) {
  const [data, setData] = useState<AircraftResponse | null>(null);
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

    const fetchAircraft = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/warroom/aircraft");
        if (res.ok) {
          const json: AircraftResponse = await res.json();
          setData(json);
        }
      } catch {
        // Silently fail, keep previous data
      } finally {
        setLoading(false);
      }
    };

    fetchAircraft();
    intervalRef.current = setInterval(fetchAircraft, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled]);

  return { data, loading };
}
