"use client";

import { useSwrFetch } from "@/lib/hooks/use-swr-fetch";
import { useDocumentVisible } from "@/lib/hooks/use-visibility";
import type { OsintResponse } from "./types";

const POLL_INTERVAL = 300_000; // 5 minutes

export function useOsintData() {
  const visible = useDocumentVisible();
  const { data, isLoading: loading } = useSwrFetch<OsintResponse>(
    "/api/warroom/osint",
    {
      refreshInterval: visible ? POLL_INTERVAL : 0,
      dedupingInterval: 60_000,
    }
  );

  return { data: data ?? null, loading };
}
