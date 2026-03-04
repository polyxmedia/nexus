"use client";

import { useEffect, useRef, useState } from "react";
import type { OsintResponse } from "./types";

const POLL_INTERVAL = 300_000; // 5 minutes

export function useOsintData() {
  const [data, setData] = useState<OsintResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchOsint = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/warroom/osint");
        if (res.ok) {
          const json: OsintResponse = await res.json();
          setData(json);
        }
      } catch {
        // Silently fail, keep previous data
      } finally {
        setLoading(false);
      }
    };

    fetchOsint();
    intervalRef.current = setInterval(fetchOsint, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return { data, loading };
}
