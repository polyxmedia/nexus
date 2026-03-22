"use client";

import { useSwrFetch } from "@/lib/hooks/use-swr-fetch";
import { useDocumentVisible } from "@/lib/hooks/use-visibility";
import type { SocialIntelResponse } from "./social-intel";

const POLL_INTERVAL = 600_000; // 10 minutes

export function useSocialData(enabled: boolean) {
  const visible = useDocumentVisible();
  const { data, isLoading: loading } = useSwrFetch<SocialIntelResponse>(
    enabled ? "/api/warroom/social" : null,
    {
      refreshInterval: visible ? POLL_INTERVAL : 0,
      dedupingInterval: 300_000,
    }
  );

  return { data: data ?? null, loading };
}
