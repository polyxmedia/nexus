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

  // Build URL with optional bounding box
  let url: string | null = null;
  if (enabled) {
    if (bounds) {
      url = `/api/warroom/aircraft?lamin=${bounds.lamin}&lomin=${bounds.lomin}&lamax=${bounds.lamax}&lomax=${bounds.lomax}`;
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
