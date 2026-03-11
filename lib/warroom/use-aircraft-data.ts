"use client";

import { useSwrFetch } from "@/lib/hooks/use-swr-fetch";
import { useDocumentVisible } from "@/lib/hooks/use-visibility";
import type { AircraftResponse } from "./types";

const POLL_INTERVAL = 60_000; // 60s - reduced from 20s to cut Vercel invocations

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
