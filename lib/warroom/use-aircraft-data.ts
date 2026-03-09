"use client";

import { useSwrFetch } from "@/lib/hooks/use-swr-fetch";
import { useDocumentVisible } from "@/lib/hooks/use-visibility";
import type { AircraftResponse } from "./types";

const POLL_INTERVAL = 20_000; // 20s, within OpenSky 10 req/min limit

export function useAircraftData(enabled: boolean) {
  const visible = useDocumentVisible();
  const { data, isLoading: loading } = useSwrFetch<AircraftResponse>(
    enabled ? "/api/warroom/aircraft" : null,
    {
      refreshInterval: visible ? POLL_INTERVAL : 0,
      dedupingInterval: 15_000,
    }
  );

  return { data: data ?? null, loading };
}
