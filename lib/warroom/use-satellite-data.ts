"use client";

import { useSwrFetch } from "@/lib/hooks/use-swr-fetch";
import { useDocumentVisible } from "@/lib/hooks/use-visibility";
import type { SatelliteResponse } from "./types";

const POLL_INTERVAL = 60_000; // 60s, satellite positions change slowly

export function useSatelliteData(enabled: boolean) {
  const visible = useDocumentVisible();
  const { data, isLoading: loading } = useSwrFetch<SatelliteResponse>(
    enabled ? "/api/warroom/satellites" : null,
    {
      refreshInterval: visible ? POLL_INTERVAL : 0,
      dedupingInterval: 30_000,
    }
  );

  return { data: data ?? null, loading };
}
