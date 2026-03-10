"use client";

import { useSwrFetch } from "@/lib/hooks/use-swr-fetch";
import { useDocumentVisible } from "@/lib/hooks/use-visibility";
import type { VipAircraftResponse } from "./types";

const POLL_INTERVAL = 60_000; // 60s - VIP positions change slowly

export function useVipAircraftData(enabled: boolean) {
  const visible = useDocumentVisible();
  const { data, isLoading: loading } = useSwrFetch<VipAircraftResponse>(
    enabled ? "/api/warroom/vip-aircraft" : null,
    {
      refreshInterval: visible ? POLL_INTERVAL : 0,
      dedupingInterval: 30_000,
    }
  );

  return { data: data ?? null, loading };
}
