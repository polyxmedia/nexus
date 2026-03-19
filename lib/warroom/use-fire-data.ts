"use client";

import { useSwrFetch } from "@/lib/hooks/use-swr-fetch";
import { useDocumentVisible } from "@/lib/hooks/use-visibility";
import type { FireResponse } from "./types";

const POLL_INTERVAL = 900_000; // 15 minutes (satellite passes are infrequent)

export function useFireData(enabled: boolean) {
  const visible = useDocumentVisible();
  const { data, isLoading: loading } = useSwrFetch<FireResponse>(
    enabled ? "/api/warroom/fires" : null,
    {
      refreshInterval: visible ? POLL_INTERVAL : 0,
      dedupingInterval: 300_000,
    }
  );

  return { data: data ?? null, loading };
}
