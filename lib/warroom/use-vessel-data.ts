"use client";

import { useEffect, useRef, useState } from "react";
import type { VesselResponse } from "./types";

const POLL_INTERVAL = 30_000; // 30s

export function useVesselData(enabled: boolean) {
  const [data, setData] = useState<VesselResponse | null>(null);
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

    const fetchVessels = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/warroom/vessels");
        if (res.ok) {
          const json: VesselResponse = await res.json();
          setData(json);
        }
      } catch {
        // Silently fail, keep previous data
      } finally {
        setLoading(false);
      }
    };

    fetchVessels();
    intervalRef.current = setInterval(fetchVessels, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled]);

  return { data, loading };
}
