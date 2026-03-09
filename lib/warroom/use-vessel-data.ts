"use client";

import { useSwrFetch } from "@/lib/hooks/use-swr-fetch";
import { useDocumentVisible } from "@/lib/hooks/use-visibility";
import type { VesselResponse } from "./types";

const POLL_INTERVAL = 30_000; // 30s

export function useVesselData(enabled: boolean) {
  const visible = useDocumentVisible();
  const { data, isLoading: loading } = useSwrFetch<VesselResponse>(
    enabled ? "/api/warroom/vessels" : null,
    {
      refreshInterval: visible ? POLL_INTERVAL : 0,
      dedupingInterval: 20_000,
    }
  );

  return { data: data ?? null, loading };
}
