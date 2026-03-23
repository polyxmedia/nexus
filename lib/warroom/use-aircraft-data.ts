"use client";

import { useSwrFetch } from "@/lib/hooks/use-swr-fetch";
import { useDocumentVisible } from "@/lib/hooks/use-visibility";
import type { AircraftResponse } from "./types";

const POLL_INTERVAL = 300_000; // 5min - reduced from 60s to cut Vercel bandwidth

export interface AircraftBounds {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}

export function useAircraftData(enabled: boolean, bounds?: AircraftBounds | null) {
  const visible = useDocumentVisible();

  // Round bounds to 1 decimal place so small pans don't trigger new fetches
  // A 0.1 degree grid is ~11km, plenty granular for aircraft
  let url: string | null = null;
  if (enabled) {
    if (bounds) {
      const r = (n: number) => Math.round(n * 10) / 10;
      url = `/api/warroom/aircraft?lamin=${r(bounds.lamin)}&lomin=${r(bounds.lomin)}&lamax=${r(bounds.lamax)}&lomax=${r(bounds.lomax)}`;
    } else {
      url = "/api/warroom/aircraft";
    }
  }

  const { data, isLoading: loading } = useSwrFetch<AircraftResponse>(
    url,
    {
      refreshInterval: visible ? POLL_INTERVAL : 0,
      dedupingInterval: 15_000,
    }
  );

  return { data: data ?? null, loading };
}
