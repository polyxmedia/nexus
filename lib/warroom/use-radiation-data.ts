"use client";

import { useSwrFetch } from "@/lib/hooks/use-swr-fetch";
import { useDocumentVisible } from "@/lib/hooks/use-visibility";
import type { RadiationResponse } from "./types";

const POLL_INTERVAL = 1_800_000; // 30 minutes (radiation data is slow-moving)

export function useRadiationData(enabled: boolean) {
  const visible = useDocumentVisible();
  const { data, isLoading: loading } = useSwrFetch<RadiationResponse>(
    enabled ? "/api/warroom/radiation" : null,
    {
      refreshInterval: visible ? POLL_INTERVAL : 0,
      dedupingInterval: 600_000,
    }
  );

  return { data: data ?? null, loading };
}
