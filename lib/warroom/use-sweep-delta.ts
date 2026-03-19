"use client";

import { useSwrFetch } from "@/lib/hooks/use-swr-fetch";
import { useDocumentVisible } from "@/lib/hooks/use-visibility";
import type { SweepDeltaResponse } from "./types";

const POLL_INTERVAL = 300_000; // 5 minutes

export function useSweepDelta() {
  const visible = useDocumentVisible();
  const { data, isLoading: loading } = useSwrFetch<SweepDeltaResponse>(
    "/api/warroom/sweep-delta",
    {
      refreshInterval: visible ? POLL_INTERVAL : 0,
      dedupingInterval: 120_000,
    }
  );

  return { data: data ?? null, loading };
}
